import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'ElectroFire Studio',
  description: 'Create games and stories with the ElectroFire visual editor.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
