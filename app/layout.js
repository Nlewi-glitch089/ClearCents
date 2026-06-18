import { Inter } from 'next/font/google';
import './globals.css';
import AppearanceInit from '../components/AppearanceInit';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'ClearCents',
  description: 'Track spending, set goals, and get AI-powered guidance.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AppearanceInit />
        {children}
      </body>
    </html>
  );
}
