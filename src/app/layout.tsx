import type { Metadata, Viewport } from 'next';
import './globals.css';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://jarvis-portfolio.vercel.app';
const DESC =
  "Cockpit IA façon Iron Man : Marouane Oulabass, full-stack & data engineer. Jarvis parle, écoute, orchestre les projets dans une constellation 3D gestuelle.";
const TITLE = 'J.A.R.V.I.S — Marouane Oulabass';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESC,
  applicationName: 'Jarvis Portfolio',
  authors: [{ name: 'Marouane Oulabass', url: 'https://github.com/MarouaneOulabass' }],
  creator: 'Marouane Oulabass',
  keywords: [
    'Marouane Oulabass',
    'full-stack developer',
    'data engineer',
    'portfolio',
    'Jarvis',
    'Claude AI',
    'Next.js',
    'Three.js',
    'Rabat',
    'Morocco',
  ],
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: SITE_URL,
    title: TITLE,
    description: DESC,
    siteName: 'Jarvis Portfolio',
    images: [
      {
        url: '/og.svg',
        width: 1200,
        height: 630,
        alt: 'J.A.R.V.I.S — Cockpit IA de Marouane Oulabass',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESC,
    images: ['/og.svg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#06060a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-jarvis-darker antialiased">{children}</body>
    </html>
  );
}
