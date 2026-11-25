'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import styles from './home-scroll-story.module.css'

export function HomeScrollStory({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = root.current
    if (!element) return
    const media = window.matchMedia(
      '(min-width: 1024px) and (min-height: 650px) and (prefers-reduced-motion: no-preference)',
    )
    const scenes = Array.from(element.querySelectorAll<HTMLElement>('[data-story-scene]'))
    const last = scenes.length - 1
    let frame = 0

    const update = () => {
      frame = 0
      const header = Number.parseFloat(
        getComputedStyle(element).getPropertyValue('--header-height'),
      )
      let active = 0
      if (media.matches) {
        element.dataset.animated = 'true'
        const travel = element.offsetHeight - (window.innerHeight - header)
        const progress = Math.max(
          0,
          Math.min(last, ((header - element.getBoundingClientRect().top) / travel) * last),
        )
        active = Math.round(progress)
        scenes.forEach((scene, index) => {
          const distance = index - progress
          const opacity = Math.max(0, 1 - Math.max(0, Math.abs(distance) - 0.15) / 0.7)
          scene.style.setProperty('--scene-opacity', String(opacity))
          scene.style.setProperty('--scene-shift', `${distance * 45}px`)
          scene.style.setProperty(
            '--scene-scale',
            String(1 - Math.min(1, Math.abs(distance)) * 0.025),
          )
          scene.inert = index !== active
          scene.setAttribute('aria-hidden', String(index !== active))
        })
      } else {
        delete element.dataset.animated
        scenes.forEach((scene, index) => {
          scene.style.removeProperty('--scene-opacity')
          scene.style.removeProperty('--scene-shift')
          scene.style.removeProperty('--scene-scale')
          scene.inert = false
          scene.removeAttribute('aria-hidden')
          if (scene.getBoundingClientRect().top <= header + window.innerHeight * 0.3) active = index
        })
      }
      element.dataset.scene = scenes[active].dataset.storyScene
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    media.addEventListener('change', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      media.removeEventListener('change', schedule)
    }
  }, [])

  return (
    <section ref={root} className={styles.story}>
      <div className={styles.stage}>{children}</div>
    </section>
  )
}
