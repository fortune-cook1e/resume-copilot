import { existsSync } from 'node:fs'
import { Inject, Injectable } from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import puppeteer from 'puppeteer-core'
import { appConfig } from '../config/app.config'

@Injectable()
export class PdfRenderer {
  constructor(@Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>) {}

  async render(resumeId: string, data: unknown): Promise<Uint8Array> {
    const browser = await puppeteer.launch({
      executablePath: this.chromePath(),
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
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
    })

    let page
    try {
      page = await browser.newPage()
      await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 })
      await page.evaluateOnNewDocument(
        (payload) => {
          Object.assign(globalThis, { __RESUME_DATA__: payload })
        },
        { id: resumeId, data, isPrint: true },
      )

      const printUrl = new URL('/resume/print', this.config.BETTER_AUTH_URL)
      printUrl.searchParams.set('id', resumeId)
      await page.goto(printUrl.href, { waitUntil: 'load', timeout: 60000 })
      if (new URL(page.url()).pathname !== '/resume/print') {
        throw new Error('PDF print page redirected')
      }
      await page.waitForFunction(
        "document.querySelector('#resume-document')?.getAttribute('data-ready') === 'true'",
        { timeout: 60000 },
      )
      return await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        displayHeaderFooter: false,
      })
    } finally {
      await page?.close().catch(() => {})
      await browser.close().catch(() => {})
    }
  }

  private chromePath(): string {
    if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH

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
    }
    const path = platformPaths[process.platform]?.find(existsSync)
    if (!path) throw new Error('Chrome/Chromium executable is unavailable')
    return path
  }
}
