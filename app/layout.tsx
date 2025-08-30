import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './global.css';
import { Providers } from '~/app/providers';
import { APP_NAME, APP_DESCRIPTION } from '~/lib/constants';

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
      <body className={inter.className + " bg-background text-foreground"}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
