import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorkspaceBrand } from '@/components/WorkspaceBrand'
import { HomeScrollStory } from '@/components/HomeScrollStory'
import { getCurrentUser } from '@/lib/current-user'
import storyStyles from '@/components/home-scroll-story.module.css'
import styles from './home.module.css'

const repository = 'https://github.com/fortune-cook1e/resume-copilot'
const scenes = [
  {
    id: 'start',
    title: 'Create your resume with AI tools.',
    alt: 'A person with glasses struggles to write a resume, looking at a blank document beside notes about React, TypeScript and web development.',
  },
  {
    id: 'discover',
    title: 'Meet Resume Copilot.',
    alt: 'The same person discovers Resume Copilot on their laptop and smiles at the resume-building platform.',
  },
  {
    id: 'connect',
    title: 'Connect your AI tool through MCP.',
    alt: 'The person joins a cable between Resume Copilot and an AI tool, illustrating an authorized MCP connection.',
  },
  {
    id: 'prompt',
    title: 'Tell it what you need.',
    alt: 'ChatGPT example. The person types: Create a frontend developer resume. React, TypeScript, 3 years building web apps.',
  },
  {
    id: 'create',
    title: 'Your experience becomes a resume.',
    alt: 'Their experience notes and project sketches become an illustrated sample resume, with Experience, Projects, Education and Skills sections.',
  },
  {
    id: 'export',
    title: 'Choose a template. Export PDF.',
    alt: 'The person chooses from three resume layouts, selects one and proudly holds the exported PDF resume.',
  },
]

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
      <main id="main">
        <HomeScrollStory>
          {scenes.map((scene, index) => (
            <section
              key={scene.id}
              data-story-scene={scene.id}
              className={`${storyStyles.scene} ${index > 0 ? storyStyles.illustrationOnly : ''} ${index === scenes.length - 1 ? storyStyles.ending : ''}`}
              aria-labelledby={`story-${scene.id}`}
            >
              {index === 0 ? (
                <h1 id={`story-${scene.id}`} className={storyStyles.title}>
                  {scene.title}
                </h1>
              ) : (
                <h2 id={`story-${scene.id}`} className="sr-only">
                  {scene.title}
                </h2>
              )}
              <figure className={storyStyles.art}>
                <Image
                  src={`/illustrations/story/${scene.id}.webp`}
                  alt={scene.alt}
                  width={1536}
                  height={1024}
                  preload={index === 0}
                  unoptimized
                />
              </figure>
              {index === scenes.length - 1 && (
                <Button asChild size="lg" className={styles.action}>
                  <Link href={destination}>
                    Create your resume <ArrowUpRight aria-hidden="true" />
                  </Link>
                </Button>
              )}
            </section>
          ))}
        </HomeScrollStory>
      </main>
    </div>
  )
}
