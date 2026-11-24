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
    <div data-theme="oryzo" className={styles.page}>
      <a className={styles.skipLink} href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.brand}>
          <WorkspaceBrand />
        </div>
        <nav aria-label="Main navigation" className={styles.navigation}>
          <a href={repository} className={styles.sourceLink}>
            GitHub <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </a>
          <Button asChild variant="outline" className={styles.signIn}>
            <Link href={destination}>{user ? 'My resumes' : 'Sign in'}</Link>
          </Button>
        </nav>
      </header>
      <main id="main" className={styles.hero}>
        <div className={styles.content}>
          <h1 className={styles.title}>Edit your resume in ChatGPT.</h1>
          <p className={styles.intro}>
            Create and refine your resume with ChatGPT, connected through MCP.
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
