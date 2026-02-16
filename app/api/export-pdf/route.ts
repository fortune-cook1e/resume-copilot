import { NextRequest, NextResponse } from 'next/server';
import puppeteerCore from 'puppeteer-core';
import puppeteer from 'puppeteer';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { COOKIE_NAMES } from '@/constants/cookies';

// Detect runtime environment
const isDevelop = process.env.NODE_ENV === 'development';

export async function POST(request: NextRequest) {
  try {
    const { title = 'Resume' } = await request.json();

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // Get base URL - use localhost in production since puppeteer runs in same container
    const baseUrl = isDevelop
      ? (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
      : 'http://localhost:3000';

    let browser;

    if (isDevelop) {
      // Development: use puppeteer with bundled Chromium
      browser = await puppeteer.launch({
        headless: true,
      });
    } else {
      // Production (Docker): use system Chromium
      browser = await puppeteerCore.launch({
        executablePath: '/usr/bin/chromium-browser',
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
    }

    const page = await browser.newPage();

    // Set session cookie (authenticated via middleware)
    if (session?.session?.token) {
      const url = new URL(baseUrl);
      await page.setCookie({
        name: COOKIE_NAMES.SESSION_TOKEN,
        value: session.session.token,
        domain: url.hostname,
        path: '/',
        httpOnly: true,
        secure: url.protocol === 'https:',
        sameSite: 'Lax',
      });
    }

    // Set viewport to A4 paper size (96 DPI: 210mm = 794px, 297mm = 1123px)
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 1,
    });

    // Navigate to print page
    await page.goto(`${baseUrl}/resume/print`, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Wait for content to be ready
    await page.waitForFunction(
      () => document.querySelector('#resume-document')?.getAttribute('data-ready') === 'true',
      { timeout: 60000 },
    );

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      },
      displayHeaderFooter: false,
    });

    await browser.close();

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
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: String(error) },
      { status: 500 },
    );
  }
}

// Configure API route options
export const runtime = 'nodejs';
export const maxDuration = 30; // Vercel Pro: max 30 seconds
