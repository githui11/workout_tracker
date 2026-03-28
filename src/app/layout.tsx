import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import NavBar from '@/components/nav-bar';
import OrientationLock from '@/components/orientation-lock';
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
  title: 'Workout Tracker',
  description: 'Track running and cycling progress',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0a0a',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full bg-zinc-950 text-white pb-24">
        <OrientationLock />
        {/* Ambient top glow */}
        <div
          className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.03) 0%, transparent 70%)' }}
        />
        <main className="relative max-w-lg mx-auto px-5 py-6">{children}</main>
        <NavBar />
      </body>
    </html>
  );
}
