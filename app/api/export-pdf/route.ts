import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';

export async function POST(request: NextRequest) {
  let browser;
  let page;

  try {
    const { title = 'Resume' } = await request.json();

    // CHROME_WS_ENDPOINT: ws endpoint of the remote Chrome (browserless v2)
    // CHROME_TARGET_URL: URL that Chrome container uses to reach this app
    //   - Production (docker-compose): ws://chrome:3000/chrome + http://app:3000
    //   - Development: ws://localhost:3006/chrome + http://host.docker.internal:3000
    const chromeWsEndpoint = process.env.CHROME_WS_ENDPOINT;
    const chromeTargetUrl = process.env.CHROME_TARGET_URL ?? 'http://host.docker.internal:3000';

    if (!chromeWsEndpoint) {
      throw new Error('CHROME_WS_ENDPOINT not set. Start Chrome via: docker-compose up -d chrome');
    }

    const startTime = Date.now();
    console.log('[PDF] Connecting to Chrome:', chromeWsEndpoint);
    console.log('[PDF] Target URL:', chromeTargetUrl);

    // Connect to remote Chrome (browserless v2 uses /chrome path)
    browser = await puppeteer.connect({
      browserWSEndpoint: chromeWsEndpoint,
    });
    console.log('[PDF] Connected in', Date.now() - startTime, 'ms');

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

    const printUrl = `${chromeTargetUrl}/resume/print`;
    console.log('[PDF] Navigating to:', printUrl);

    const navStart = Date.now();
    // Use 'domcontentloaded' instead of 'networkidle0'
    // networkidle0 waits for 0 network connections for 500ms which hangs on
    // resource-constrained servers. domcontentloaded is sufficient because
    // we then explicitly wait for #resume-document[data-ready] below.
    await page.goto(printUrl, {
      waitUntil: 'domcontentloaded',
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
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: String(error) },
      { status: 500 },
    );
  } finally {
    // Always clean up: close page and disconnect
    await page?.close().catch(() => {});
    await browser?.disconnect().catch(() => {});
  }
}

// Configure API route options
export const runtime = 'nodejs';
export const maxDuration = 120;
