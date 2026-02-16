import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';

export async function POST(request: NextRequest) {
  let browser;
  let page;

  const isDev = process.env.NODE_ENV !== 'production';

  try {
    const { title = 'Resume' } = await request.json();

    // CHROME_WS_ENDPOINT: ws endpoint of the remote Chrome
    // CHROME_TARGET_URL: URL that Chrome container uses to reach this app
    //   - Production (docker-compose): ws://chrome:3000 + http://app:3000
    //   - Development: ws://localhost:3006 + http://host.docker.internal:3000
    const chromeWsEndpoint = process.env.CHROME_WS_ENDPOINT;
    const chromeTargetUrl = process.env.CHROME_TARGET_URL ?? 'http://host.docker.internal:3000';

    if (!chromeWsEndpoint) {
      throw new Error('CHROME_WS_ENDPOINT not set. Start Chrome via: docker-compose up -d chrome');
    }

    // Connect to remote Chrome
    browser = await puppeteer.connect({
      browserWSEndpoint: chromeWsEndpoint,
    });

    page = await browser.newPage();

    // Set viewport to A4 paper size (96 DPI: 210mm = 794px, 297mm = 1123px)
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 1,
    });

    // Navigate to print page
    await page.goto(`${chromeTargetUrl}/resume/print`, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Verify page loaded correctly (not redirected to login)
    const currentUrl = page.url();
    if (!currentUrl.includes('/resume/print')) {
      throw new Error(`Redirected to: ${currentUrl}. Session cookie may not be working.`);
    }

    // Wait for content to be ready
    await page.waitForFunction(
      () => document.querySelector('#resume-document')?.getAttribute('data-ready') === 'true',
      { timeout: 60000 },
    );

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      displayHeaderFooter: false,
    });

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
export const maxDuration = 30;
