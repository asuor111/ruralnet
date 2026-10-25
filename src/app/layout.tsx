import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { getConfig } from '@/services/config';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RuralNet — rural connectivity intelligence for Nigeria',
  description:
    'Open-source research tool that maps population, connectivity, fibre, electricity and facilities for Nigerian communities and LGAs.',
};

function MockBanner() {
  const cfg = getConfig();
  if (cfg.mode !== 'mock') return null;
  return (
    <div
      className="w-full border border-[#7c3aed]/40 bg-[#141414] text-[#f4f2ee] text-xs font-label tracking-wide py-2 px-4"
      role="status"
    >
      DEVELOPMENT / MOCK DATA
      <span className="hidden md:inline text-[#9a9a9a] font-normal">
        — all values below come from RuralNet&apos;s clearly-labelled mock providers. Set RURALNET_MODE=live to use real public datasets.
      </span>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen antialiased">
        <MockBanner />
        <header className="border-b border-[#2a2a2a] px-6 md:px-12 py-5 flex flex-wrap items-center gap-x-6 gap-y-2">
          <a href="/" className="font-display text-xl leading-none">
            RuralNet
          </a>
          <span className="hidden sm:inline text-xs text-[#8e8e8e]">
            rural connectivity intelligence · Nigeria
          </span>
          <nav className="ml-auto flex items-center gap-5 text-sm">
            <a className="text-[#c8c8c8] hover:text-white" href="/methodology">
              Methodology
            </a>
            <a className="text-[#c8c8c8] hover:text-white" href="/about">
              Data &amp; sources
            </a>
            <a
              className="text-[#c8c8c8] hover:text-white"
              href="https://github.com/ruralnet/ruralnet"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub ↗
            </a>
          </nav>
        </header>
        <main className="px-6 md:px-12">{children}</main>
        <footer className="mt-20 border-t border-[#2a2a2a] px-6 md:px-12 py-10 text-sm text-[#8e8e8e]">
          <div className="font-display text-base">RuralNet</div>
          <p className="mt-3">
            An open-source engineering experiment. RuralNet provides data-supported indicators from public
            datasets — not engineering surveys, coverage guarantees, investment advice, or feasibility studies.
            Where data is missing it says so.
          </p>
          <p className="mt-3 text-xs">
            MIT License · Built on OpenStreetMap, World Bank Open Data, HDX (OCHA) and other public datasets ·
            Uses Leaflet + OpenStreetMap tiles.
          </p>
        </footer>
      </body>
    </html>
  );
}