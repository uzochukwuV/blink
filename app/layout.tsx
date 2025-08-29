import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '~/app/providers';
import { APP_NAME, APP_DESCRIPTION } from '~/lib/constants';
import Script from 'next/script';

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <Script src="https://cdn.jsdelivr.net/npm/tw-elements/dist/js/index.min.js" strategy="beforeInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4" strategy="beforeInteractive" />
      <style type=' type="text/tailwindcss"'>{`
        @theme {
        --color-clifford: #da373d;
      }
        @import "tailwindcss";
      `}</style>
      <body className={inter.className + " bg-bg  text-textPrimary"}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
