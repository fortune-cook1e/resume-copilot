import { NextRequest, NextResponse } from 'next/server';
import puppeteerCore from 'puppeteer-core';
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';

export async function POST(request: NextRequest) {
  try {
    const { title = '简历' } = await request.json();

    // 判断是否在 Vercel 环境
    const isVercel = process.env.VERCEL === '1';

    // 获取基础 URL
    const baseUrl = isVercel ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

    let browser;

    if (isVercel) {
      // Vercel/Lambda 环境：使用 puppeteer-core + @sparticuz/chromium
      const chromiumConfig = chromium as unknown as {
        setHeadlessMode?: boolean;
        setGraphicsMode?: boolean;
        defaultViewport?: { width: number; height: number; deviceScaleFactor?: number } | null;
        headless?: boolean;
      };

      if (chromiumConfig.setHeadlessMode !== undefined) {
        chromiumConfig.setHeadlessMode = true;
      }

      if (chromiumConfig.setGraphicsMode !== undefined) {
        chromiumConfig.setGraphicsMode = false;
      }

      browser = await puppeteerCore.launch({
        args: [
          ...chromium.args,
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-first-run',
          '--no-sandbox',
          '--no-zygote',
          '--single-process',
        ],
        defaultViewport: chromiumConfig.defaultViewport ?? {
          width: 794,
          height: 1123,
          deviceScaleFactor: 1,
        },
        executablePath: await chromium.executablePath(),
        headless: chromiumConfig.headless ?? true,
      });
    } else {
      // 本地开发环境：使用 puppeteer 自带的 Chromium
      browser = await puppeteer.launch({
        headless: true,
      });
    }

    const page = await browser.newPage();

    // 设置视口为 A4 纸张尺寸 (96 DPI: 210mm = 794px, 297mm = 1123px)
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 1,
    });

    // 直接访问打印页面
    await page.goto(`${baseUrl}/resume/print`, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // 等待内容加载完成
    await page.waitForFunction(
      () => document.querySelector('#resume-document')?.getAttribute('data-ready') === 'true',
      { timeout: 20000 },
    );

    // 生成 PDF
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

    // 返回 PDF 文件
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

// 配置 API 路由选项
export const runtime = 'nodejs';
export const maxDuration = 30; // Vercel Pro 最多 30 秒
