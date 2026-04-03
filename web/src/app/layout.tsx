import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'MDComments — An Open File Format for Human-AI Collaboration on Markdown',
  description:
    'MDComments is an open file format that lets humans and AI agents collaborate on Markdown files through threaded comments and suggested edits — like Google Docs, but for .md files.',
  openGraph: {
    title: 'MDComments',
    description:
      'An open file format for collaborating with humans and AI agents via comments and suggested edits on Markdown files.',
    type: 'website',
    siteName: 'MDComments',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MDComments — An Open File Format for Human-AI Collaboration on Markdown',
    description:
      'An open file format for collaborating with humans and AI agents via threaded comments and suggested edits on Markdown files.',
  },
  keywords: [
    'markdown',
    'comments',
    'collaboration',
    'AI agents',
    'suggested edits',
    'open format',
    'open file format',
    'code review',
    'document review',
    'human-AI collaboration',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
