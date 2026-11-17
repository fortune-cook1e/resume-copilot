import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorkspaceBrand } from '@/components/WorkspaceBrand'
import { getCurrentUser } from '@/lib/current-user'
import { ResumeMcpDemo } from '@/components/ResumeMcpDemo'
import styles from './home.module.css'

const repository = 'https://github.com/fortune-cook1e/resume-copilot'

export default async function Home() {
  const { user } = await getCurrentUser()
  const destination = user ? '/dashboard/resumes' : '/login'

  return (
    <div className={styles.page}>
      <a className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3" href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <WorkspaceBrand />
        <nav aria-label="Main navigation" className="flex items-center gap-3 sm:gap-6">
          <a href={repository} className="inline-flex items-center gap-1 text-sm hover:underline">
            GitHub <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </a>
          <Button asChild variant="outline" className="rounded-full bg-transparent">
            <Link href={destination}>{user ? 'My resumes' : 'Sign in'}</Link>
          </Button>
        </nav>
      </header>
      <main id="main" className={styles.hero}>
        <div className={styles.content}>
          <h1 className={styles.title}>Edit your resume in ChatGPT.</h1>
          <p className={styles.intro}>
            Connect Resume Copilot via MCP to create and edit resumes from your ChatGPT
            conversations.
          </p>
          <Button asChild size="lg" className={styles.action}>
            <Link href={destination}>
              Build a resume <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <div className={styles.demo}>
            <ResumeMcpDemo />
          </div>
        </div>
        <div className={styles.previewPanel}>
          <Image
            className={styles.paper}
            src="/resume-templates/onyx.webp"
            alt="Example resume in the Onyx template"
            width={794}
            height={1123}
            sizes="(max-width: 720px) 80vw, 420px"
            preload
            unoptimized
          />
        </div>
      </main>
    </div>
  )
}
