import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tide Island — Natural 3D Environment',
  description: 'An interactive natural island shaped by tide, wind, stone, and native growth.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
