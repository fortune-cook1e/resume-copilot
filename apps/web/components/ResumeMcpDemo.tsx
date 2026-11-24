'use client'

import { useState } from 'react'
import { ArrowRight, Check, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import styles from './resume-mcp-demo.module.css'

export function ResumeMcpDemo() {
  const [showEdit, setShowEdit] = useState(true)

  return (
    <figure className={styles.demo}>
      <figcaption className={styles.caption}>
        <span>ChatGPT</span>
        <span className={styles.connection}>
          <Link2 aria-hidden="true" className="size-3.5" /> MCP demo
        </span>
      </figcaption>
      <blockquote className={styles.prompt}>
        Turn my Field Notes project into two resume bullets.
      </blockquote>
      <div className={styles.resultHeader}>
        <span>Field Notes</span>
        <Button
          variant="ghost"
          size="sm"
          className={styles.toggle}
          onClick={() => setShowEdit(!showEdit)}
        >
          {showEdit ? 'View original' : 'Show edit'} <ArrowRight aria-hidden="true" />
        </Button>
      </div>
      <div aria-live="polite" className={styles.result}>
        {showEdit ? (
          <div key="edited" className={styles.edited}>
            <p className={styles.status}>
              <Check aria-hidden="true" className="size-3.5" /> Resume updated
            </p>
            <ul>
              <li>Built a searchable library for 80+ research interviews.</li>
              <li>Created reusable templates for three product teams.</li>
            </ul>
          </div>
        ) : (
          <p key="original" className={styles.original}>
            Worked on Field Notes, a research library with 80+ interviews and templates for three
            product teams.
          </p>
        )}
      </div>
    </figure>
  )
}
