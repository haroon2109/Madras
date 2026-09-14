import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { GradientMesh } from '@/components/motion/GradientMesh';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Madras — Chennai Rainfall Forecasting & Flood Decision Support',
    template: '%s — Madras',
  },
  description:
    'Zone-wise rainfall forecasts, flood-risk alerts and decision support for Greater Chennai, built on open data from Open-Meteo (ECMWF & GFS models).',
  // Favicon uses the app-router file convention: src/app/icon.png + apple-icon.png
};

export const viewport: Viewport = {
  themeColor: '#F8F9FA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' className={inter.variable}>
      <body className='min-h-screen bg-[#F8F9FA] font-sans text-[#202124] antialiased'>
        <GradientMesh />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
