import Link from 'next/link';
import { Space_Grotesk, Sora } from 'next/font/google';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  FileText,
  Wand2,
  Download,
  Sparkles,
  ArrowRight,
  Shield,
  Gauge,
  Layers,
} from 'lucide-react';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });
const sora = Sora({ subsets: ['latin'], weight: ['400', '500', '600'] });

export default function Home() {
  return (
    <div className={`${sora.className} min-h-screen bg-slate-950 text-white`}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 right-0 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.35),rgba(15,23,42,0))] blur-2xl" />
        <div className="absolute top-32 -left-20 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.25),rgba(15,23,42,0))] blur-2xl" />
      </div>

      <header className="relative z-10">
        <nav className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-teal-400 text-slate-950 grid place-items-center font-bold">
              RC
            </div>
            <div className="text-lg font-semibold tracking-wide">Resume Copilot</div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-200">
            <a className="hover:text-white" href="#features">
              Features
            </a>
            <a className="hover:text-white" href="#workflow">
              Workflow
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/resume">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">Launch Builder</Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10">
        <section className="container mx-auto px-4 pt-10 pb-20">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-teal-200">
                <Sparkles className="h-4 w-4" />
                AI Resume Studio
              </div>
              <h1
                className={`${spaceGrotesk.className} text-4xl md:text-6xl font-semibold leading-tight`}
              >
                Build polished resumes faster with a SaaS-grade editor.
              </h1>
              <p className="text-lg text-slate-200 max-w-xl">
                Craft ATS-ready resumes, refine language with AI, and export crisp PDFs in minutes.
                Designed for modern hiring workflows and calm, focused editing.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/resume">
                  <Button
                    size="lg"
                    className="text-base px-8 gap-2 bg-teal-300 text-slate-950 hover:bg-teal-200"
                  >
                    <FileText className="h-5 w-5" />
                    Start Building
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm text-slate-300">
                <div>
                  <div className="text-2xl font-semibold text-white">4x</div>
                  Faster drafting
                </div>
                <div>
                  <div className="text-2xl font-semibold text-white">98%</div>
                  ATS compatibility
                </div>
                <div>
                  <div className="text-2xl font-semibold text-white">1-click</div>
                  PDF export
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Live Preview</span>
                  <span className="rounded-full bg-teal-400/20 px-3 py-1 text-teal-200">
                    Synced
                  </span>
                </div>
                <div className="mt-6 space-y-4">
                  <div className="h-3 w-40 rounded-full bg-white/30" />
                  <div className="space-y-2">
                    <div className="h-2 w-full rounded-full bg-white/20" />
                    <div className="h-2 w-5/6 rounded-full bg-white/20" />
                    <div className="h-2 w-3/4 rounded-full bg-white/20" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                      <div className="text-sm text-white">AI polish</div>
                      <div className="text-xs text-slate-300">Rewrite bullets in one click</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                      <div className="text-sm text-white">PDF output</div>
                      <div className="text-xs text-slate-300">Print-ready, brandable</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="container mx-auto px-4 pb-20">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 space-y-4 bg-white/5 border-white/10 text-white">
              <div className="h-12 w-12 bg-teal-300/20 rounded-lg flex items-center justify-center">
                <Wand2 className="h-6 w-6 text-teal-200" />
              </div>
              <h3 className="text-xl font-semibold">AI Content Polish</h3>
              <p className="text-slate-300">
                Turn raw bullets into impact-driven statements with industry-aligned tone.
              </p>
            </Card>
            <Card className="p-6 space-y-4 bg-white/5 border-white/10 text-white">
              <div className="h-12 w-12 bg-amber-300/20 rounded-lg flex items-center justify-center">
                <Gauge className="h-6 w-6 text-amber-200" />
              </div>
              <h3 className="text-xl font-semibold">Instant Preview</h3>
              <p className="text-slate-300">
                Split-screen editing with real-time layout and spacing feedback.
              </p>
            </Card>
            <Card className="p-6 space-y-4 bg-white/5 border-white/10 text-white">
              <div className="h-12 w-12 bg-sky-300/20 rounded-lg flex items-center justify-center">
                <Download className="h-6 w-6 text-sky-200" />
              </div>
              <h3 className="text-xl font-semibold">Studio-grade PDF</h3>
              <p className="text-slate-300">
                Export crisp PDFs with consistent margins and print-ready formatting.
              </p>
            </Card>
          </div>
        </section>

        <section id="workflow" className="container mx-auto px-4 pb-20">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-center">
            <div className="space-y-6">
              <div className="text-sm uppercase tracking-[0.3em] text-slate-400">Workflow</div>
              <h2 className="text-3xl md:text-4xl font-semibold">
                From draft to hire-ready in one flow.
              </h2>
              <p className="text-slate-300">
                Organize modules, refine language, and export instantly. Designed to match how
                modern teams review and shortlist candidates.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/10 grid place-items-center">
                    <Layers className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold">Modular sections</div>
                    <div className="text-sm text-slate-300">
                      Skills, projects, experience, custom blocks.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/10 grid place-items-center">
                    <Wand2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold">AI upgrades</div>
                    <div className="text-sm text-slate-300">
                      Rewrite bullets, tighten tone, boost clarity.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/10 grid place-items-center">
                    <Download className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold">Export-ready</div>
                    <div className="text-sm text-slate-300">
                      PDFs optimized for ATS and recruiters.
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <div className="grid gap-4">
                {[
                  'Connect LinkedIn',
                  'Draft experience bullets',
                  'Polish with AI',
                  'Export PDF',
                ].map((step, index) => (
                  <div
                    key={step}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/40 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-teal-300 text-slate-950 grid place-items-center text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div className="text-sm font-medium">{step}</div>
                    </div>
                    <span className="text-xs text-slate-400">Done</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="container mx-auto px-4 py-8 text-center text-slate-400">
          <p>© 2026 Resume Copilot. Empowering your career journey.</p>
        </div>
      </footer>
    </div>
  );
}
