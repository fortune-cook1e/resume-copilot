import Link from 'next/link';
import { ArrowRight, ArrowUpRight, FileText } from 'lucide-react';
import styles from './home.module.css';

const repository = 'https://github.com/fortune-cook1e/resume-copilot';

export default function Home() {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main">Skip to content</a>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="Resume Copilot home">
            <span className={styles.monogram} aria-hidden="true"><FileText size={19} /></span>
            Resume Copilot
          </Link>
          <nav aria-label="Main navigation">
            <a href={repository} className={styles.sourceLink}>
              GitHub <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </nav>
        </header>

        <main id="main" className={styles.main}>
          <section className={styles.hero} aria-labelledby="hero-title">
            <p className={styles.eyebrow}>Your next chapter starts here</p>
            <h1 id="hero-title">Your story.<br />A clearer <em>resume.</em></h1>
            <p className={styles.intro}>
              A little help turning your experience into a resume that feels like you.
            </p>
            <Link href="/dashboard/resumes" className={styles.primaryAction}>
              Open workspace <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <p className={styles.finePrint}>Sign in to save your work.</p>
            <p className={styles.developmentNote}>
              <span className={styles.statusDot} aria-hidden="true" />
              A conversational resume experience is in development.
            </p>
          </section>
        </main>

        <footer className={styles.footer}>
          <span>Open source. Your words, your final say.</span>
          <span>Made by <a href="https://github.com/fortune-cook1e">fortune-cook1e</a></span>
        </footer>
      </div>
    </div>
  );
}
