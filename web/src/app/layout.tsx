import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'India Under-50 Stock Analyzer',
  description: 'Momentum-based analyzer for NSE stocks priced under ?50',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif', color: '#0f172a' }}>
        {children}
      </body>
    </html>
  );
}
