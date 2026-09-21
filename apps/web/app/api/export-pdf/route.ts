import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import { db } from '@/db';
import { resume } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { error, success } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

/**
 * Detect Chrome/Chromium executable path based on environment:
 * - Production (Docker Alpine): system chromium via PUPPETEER_EXECUTABLE_PATH env
 * - Development: auto-detect local Chrome installation
 */
async function getChromePath(): Promise<string> {
  // Allow explicit override via environment variable (set in Dockerfile)
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  // Auto-detect local Chrome by platform
  const platformPaths: Record<string, string[]> = {
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ],
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ],
    linux: ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome'],
  };

  const fs = await import('fs');
  for (const p of platformPaths[process.platform] || []) {
    if (fs.existsSync(p)) return p;
  }

  throw new Error(
    `Chrome/Chromium not found on ${process.platform}. ` +
      `Set PUPPETEER_EXECUTABLE_PATH or install Google Chrome.`,
  );
}

export async function POST(request: NextRequest) {
  let browser;
  let page;

  try {
    const { title = 'Resume', resumeId } = await request.json();
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return error('Unauthorized', 401);
    }

    if (!resumeId) {
      return NextResponse.json(
        { code: 1, msg: 'resumeId is required', data: null },
        { status: 400 },
      );
    }

    const startTime = Date.now();
    const executablePath = await getChromePath();
    console.log('[PDF] Using Chrome:', executablePath);

    // Fetch resume data directly from DB (no auth needed, server-side)
    const [found] = await db
      .select()
      .from(resume)
      .where(and(eq(resume.id, resumeId), eq(resume.userId, session.user.id)));
    if (!found) {
      return error('Resume not found', 404);
    }

    console.log('[PDF] Resume fetched from DB:', found.id);

    // Launch Chromium with memory-optimized flags
    // These flags minimize RAM usage on low-spec servers (2C2G)
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Write shared memory to /tmp instead of /dev/shm
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // Run all in one process to reduce memory (~50MB savings)
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-default-browser-check',
        '--hide-scrollbars',
      ],
    });
    console.log('[PDF] Browser launched in', Date.now() - startTime, 'ms');

    page = await browser.newPage();

    // Set viewport to A4 paper size (96 DPI: 210mm = 794px, 297mm = 1123px)
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 1,
    });

    // Log browser page events for debugging
    page.on('console', msg => console.log('[Browser]', msg.text()));
    page.on('pageerror', error => console.error('[Browser Error]', error));
    page.on('requestfailed', req =>
      console.warn('[Browser Request Failed]', req.url(), req.failure()?.errorText),
    );

    // Always use localhost — Chromium runs in the same container/machine as Next.js
    const port = process.env.PORT || '3000';
    const printUrl = `${process.env.NEXT_PUBLIC_APP_URL}/resume/print?id=${resumeId}`;
    // const printUrl = `http://localhost:${port}/resume/print?id=${resumeId}`;
    console.log('[PDF] Navigating to:', printUrl);

    // Inject resume data into page before it loads
    // This avoids the print page needing to call /api/resumes (which requires auth)
    await page.evaluateOnNewDocument(
      data => {
        (window as any).__RESUME_DATA__ = data;
      },
      { id: found.id, data: found.data, isPrint: true },
    );

    const navStart = Date.now();
    // Use 'load' to wait for all resources (images, fonts, CSS) to finish loading.
    // - 'domcontentloaded': too early, images not loaded yet (avatar missing)
    // - 'networkidle0': too strict, hangs on persistent connections (timeout on 2C2G server)
    // - 'load': waits for images/fonts but doesn't require 0 network connections
    await page.goto(printUrl, {
      waitUntil: 'load',
      timeout: 60000, // 60s — generous for 2 vCPU / 2 GiB server
    });
    console.log('[PDF] Navigation took', Date.now() - navStart, 'ms');

    const currentUrl = page.url();
    console.log('[PDF] Current URL:', currentUrl);

    // Verify page loaded correctly (not redirected to login)
    if (!currentUrl.includes('/resume/print')) {
      throw new Error(`Redirected to: ${currentUrl}`);
    }

    // Wait for React to finish rendering the resume
    console.log('[PDF] Waiting for document ready...');
    await page.waitForFunction(
      () => document.querySelector('#resume-document')?.getAttribute('data-ready') === 'true',
      { timeout: 60000 }, // 60s — React hydration can be slow on low-memory server
    );

    // Wait for all images to settle (loaded or errored) — don't block on broken URLs
    console.log('[PDF] Document ready in', Date.now() - navStart, 'ms');

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      displayHeaderFooter: false,
    });
    console.log('[PDF] Total time:', Date.now() - startTime, 'ms');

    // Return PDF file
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ code: 1, msg: String(error), data: null }, { status: 500 });
  } finally {
    // Always clean up: close page and browser
    await page?.close().catch(() => {});
    await browser?.close().catch(() => {});
  }
}

// Configure API route options
export const runtime = 'nodejs';
export const maxDuration = 120;
