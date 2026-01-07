import './globals.css';
import Link from 'next/link';
import Nav from '../components/Nav';
import StaffLinks from '../components/StaffLinks';
import { cookies } from 'next/headers';
import { verifyToken } from '../lib/auth.js';
import prisma from '../lib/prisma.js';

export const metadata = {
  title: 'ClearCents',
  description: 'Track smarter. Build better habits.'
};

export default async function RootLayout({ children }) {
  const cookieJar = await cookies();
  const token = cookieJar.get('session')?.value;

  let user = null;
  try {
    if (token) {
      const payload = verifyToken(token);
      user = await prisma.user.findUnique({ where: { id: payload.id }, select: { id: true, email: true, role: true } });
    }
  } catch (e) {
    user = null;
  }

  const isStaff = user && (user.role === 'coach' || user.role === 'instructor');

  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="brand">
            <div className="logo">$</div>
            <h1>ClearCents</h1>
          </div>
          <nav className="site-nav">
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
            <Link href="/why">Why ClearCents?</Link>
            <Link href="/features">Features</Link>
            <Link href="/product">Product</Link>
            <StaffLinks />
            <Nav />
          </nav>
        </header>
        <main>
          <div className="container">{children}</div>
        </main>
        <footer className="site-footer">
          <div>© 2025 ClearCents. Track smarter. Build better habits.</div>
          <div style={{marginTop:6,fontSize:13,color:'rgba(255,255,255,0.65)'}}>Made with care for students learning financial independence.</div>
        </footer>
      </body>
    </html>
  );
}
