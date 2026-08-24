import './globals.css';
import 'leaflet/dist/leaflet.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'SunShield',
  description: 'Pick the cooler side of the car before the trip starts.'
};

export const viewport: Viewport = {
  themeColor: '#ffb703',
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
