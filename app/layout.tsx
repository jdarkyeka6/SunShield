import './globals.css';
import './release.css';
import 'leaflet/dist/leaflet.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'SunShield',
  description: 'Plan the side of the car with less direct sun and screen glare for your route.'
};

export const viewport: Viewport = {
  themeColor: '#ffb703',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
