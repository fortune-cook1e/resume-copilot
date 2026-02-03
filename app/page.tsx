import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, Wand2, Download, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100">
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            <span>AI-Powered Resume Builder</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 tracking-tight">
            Resume Copilot
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Create professional, ATS-friendly resumes with AI-powered content enhancement
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link href="/resume">
              <Button size="lg" className="text-lg px-8 gap-2">
                <FileText className="h-5 w-5" />
                Start Building
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Wand2 className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">AI Content Polish</h3>
            <p className="text-gray-600">
              Enhance your resume content with AI-powered suggestions and professional writing
              assistance
            </p>
          </Card>

          <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Real-time Preview</h3>
            <p className="text-gray-600">
              Split-screen design lets you see changes instantly as you edit your resume
            </p>
          </Card>

          <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Download className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Export to PDF</h3>
            <p className="text-gray-600">
              Download your polished resume as a professional PDF with one click
            </p>
          </Card>
        </div>

        {/* AI Features Explanation */}
        <div className="mt-16 max-w-3xl mx-auto">
          <Card className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">AI-Powered Features</h2>
            </div>
            <div className="space-y-4 text-gray-700">
              <p className="text-lg">
                Our AI assistant helps you craft compelling resume content that stands out to
                recruiters and passes ATS systems.
              </p>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="font-semibold text-blue-600">✨</span>
                  <span>
                    <strong>Smart Content Enhancement:</strong> Transform bullet points into
                    impactful achievement statements
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-blue-600">✨</span>
                  <span>
                    <strong>Professional Tone:</strong> Adjust language to match industry standards
                    and job requirements
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-blue-600">✨</span>
                  <span>
                    <strong>ATS Optimization:</strong> Ensure your resume is formatted for applicant
                    tracking systems
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-blue-600">✨</span>
                  <span>
                    <strong>Action Verb Suggestions:</strong> Get recommendations for powerful verbs
                    that highlight your contributions
                  </span>
                </li>
              </ul>
            </div>
          </Card>
        </div>
      </main>

      <footer className="border-t border-gray-200 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600">
          <p>© 2026 Resume Copilot. Empowering your career journey.</p>
        </div>
      </footer>
    </div>
  );
}
