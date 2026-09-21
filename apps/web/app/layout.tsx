import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://resume-copilot.fortuncookie.xyz'),
  title: {
    default: 'Resume Copilot — Build a resume for your next role',
    template: '%s | Resume Copilot',
  },
  description:
    'Write and refine your resume, compare it with a job description, and export a PDF. An open-source resume workspace with AI assistance.',
  openGraph: {
    type: 'website',
    siteName: 'Resume Copilot',
    title: 'Resume Copilot — Build a resume for your next role',
    description:
      'Write, preview, and refine your resume in one workspace. Compare it with a job description and export a PDF.',
  },
  twitter: {
    card: 'summary',
    title: 'Resume Copilot',
    description: 'A workspace for writing and refining your resume for your next role.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
