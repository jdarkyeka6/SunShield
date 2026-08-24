import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SunShield',
  description: 'Pick the cooler side of the car before the trip starts.',
  themeColor: '#ffb703'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}