import { cookies, headers } from 'next/headers';
import { verifyToken } from '../../lib/auth.js';
import prisma from '../../lib/prisma.js';
import SignOutButton from '../../components/SignOutButton';

export default async function ReflectionPage() {
  const cookieJar = await cookies();
  let token = null;

  // Try several strategies to read the `session` cookie in different
  // environments/turbopack shims.
  try {
    if (cookieJar && typeof cookieJar.get === 'function') {
      token = cookieJar.get('session')?.value ?? null;
    } else if (cookieJar && typeof cookieJar.getAll === 'function') {
      // getAll returns an array of cookie objects { name, value }
      const found = cookieJar.getAll().find((c) => c.name === 'session');
      token = found?.value ?? null;
    } else if (cookieJar && typeof cookieJar[Symbol.iterator] === 'function') {
      for (const c of cookieJar) {
        if (c?.name === 'session') { token = c.value; break; }
      }
    } else {
      // Fallback to headers parsing; headers() may be a Headers-like
      // or a plain object depending on the runtime. Await it here.
      const hdrs = await headers();
      let cookieHeader = '';
      if (hdrs && typeof hdrs.get === 'function') {
        cookieHeader = hdrs.get('cookie') || '';
      } else if (hdrs && hdrs.cookie) {
        cookieHeader = hdrs.cookie;
      } else if (typeof hdrs === 'object') {
        // try common header name casing
        cookieHeader = hdrs['cookie'] || hdrs['Cookie'] || '';
      }

      const m = cookieHeader.match(/(?:^|; )session=([^;]+)/);
      token = m?.[1] ?? null;
    }
  } catch (e) {
    token = null;
  }

    // Debugging: log cookie/token detection to server console.
    try {
      const hdrs = await headers();
      const rawCookieHeader = hdrs && typeof hdrs.get === 'function' ? hdrs.get('cookie') : (hdrs && (hdrs.cookie || hdrs.Cookie)) || null;
      console.log('ReflectionPage debug: rawCookieHeader=', rawCookieHeader ? '[present]' : rawCookieHeader, 'extractedToken=', !!token);
      try {
        const payload = token ? verifyToken(token) : null;
        console.log('ReflectionPage debug: tokenPayload=', payload ? { id: payload.id, role: payload.role, email: payload.email } : null);
      } catch (e) {
        console.log('ReflectionPage debug: token verify failed:', e && e.message);
      }
    } catch (e) {
      // ignore logging errors
    }

  let user = null;
  try {
    if (token) {
      let payload = null;
      try { payload = verifyToken(token); } catch (e) { payload = null; }
      if (payload) {
        user = await prisma.user.findUnique({ where: { id: payload.id } });
        if (!user && process.env.NODE_ENV !== 'production' && payload.role) {
          user = { id: payload.id || null, email: payload.email || null, name: payload.name || null, role: payload.role };
        }
      }
    }
  } catch (e) {
    user = null;
  }

  // Temporary server-side debug log
  try {
    console.log('ReflectionPage request — token present:', !!token, 'userEmail:', user?.email || null);
  } catch (e) {
    // ignore logging errors
  }

  const allowed = user && (user.role === 'coach' || user.role === 'instructor');
  if (!allowed) {
    return (
      <div style={{padding:24, maxWidth:900, margin:'0 auto', textAlign:'center'}}>
        <h1 style={{marginTop:20}}>Access Denied</h1>
        <p style={{opacity:0.9}}>This page is for Launchpad staff (coach or instructor) only.</p>
        <div style={{marginTop:18}}>
          <a href="/" style={{color:'#0070f3'}}>Return to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="container app-main" style={{paddingTop:8, paddingBottom:40}}>
      <header className="page-hero card rubric-hero" style={{padding:20}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
          <div style={{fontSize:12, background:'#f3cc00', color:'#2b1b00', display:'inline-block', padding:'6px 10px', borderRadius:6, marginBottom:8}}>LAUNCHPAD STAFF ONLY</div>
          {user ? <SignOutButton /> : null}
        </div>
        <h1 style={{margin:8, fontSize:28}}>Project Reflection - ClearCents</h1>
        <p style={{opacity:0.9, margin:0}}>Developer insights on challenges, decisions, and future improvements</p>
      </header>

      <div className="split-row">
        <div>
          <div className="card feature-card" style={{padding:20, marginBottom:18}}>
            <h3 className="feature-title">What Went Well</h3>
            <div style={{marginTop:12, color:'#9ff2de'}}>
              <p>One of the strongest successes in this project was successfully integrating the AI feature alongside a working database connection and comprehensive UI. Getting the AI functionality to work required careful handling of requests and data flow, and completing it gave the project meaningful, interactive value rather than just static features.</p>
              <ul style={{marginTop:8, color:'var(--muted)'}}>
                <li>Establishing the Supabase backend early helped keep the project organized and made it easier to expand functionality as new features were added.</li>
                <li>The authentication flow worked smoothly from the start, preventing major roadblocks later in development.</li>
                <li>The component architecture and design system came together cohesively, making the codebase maintainable and scalable.</li>
              </ul>
            </div>
          </div>

          <div className="card" style={{padding:18}}>
            <h3 className="callout">Highlights</h3>
            <div className="mini-grid" style={{marginTop:12}}>
              <div className="mini-card">
                <h4>15+</h4>
                <div className="muted-note">Total Components</div>
              </div>
              <div className="mini-card">
                <h4>9</h4>
                <div className="muted-note">Pages Built</div>
              </div>
              <div className="mini-card">
                <h4>12</h4>
                <div className="muted-note">Backend Routes</div>
              </div>
            </div>
          </div>
        </div>

        <aside>
          <div className="card" style={{padding:18, marginBottom:14, background:'linear-gradient(180deg, rgba(255,255,255,0.01), rgba(0,0,0,0.02))'}}>
            <h3 className="feature-title" style={{color:'var(--accent)'}}>What Didn't Go Well</h3>
            <p style={{color:'var(--muted)'}}>While the AI feature was completed, it significantly slowed overall progress due to its complexity. Debugging the integration between the frontend, server-side processing, and API required more time than anticipated.</p>
            <ul style={{marginTop:8, color:'var(--muted)'}}>
              <li>Data visualizations took longer to implement than expected.</li>
              <li>Balancing scope caused some planned UX refinements to be deprioritized.</li>
            </ul>
          </div>

          <div className="card" style={{padding:18, marginBottom:14, background:'linear-gradient(180deg, rgba(255,255,255,0.01), rgba(0,0,0,0.02))'}}>
            <h3 className="feature-title" style={{color:'#ffb86b'}}>What Changed During the Project and Why</h3>
            <p style={{color:'var(--muted)'}}>I prioritized the AI integration and stability over secondary visual polish. This allowed the app to deliver interactive insights earlier, but some UI niceties were deferred.</p>
          </div>

          <div className="card" style={{padding:18, background:'linear-gradient(180deg, rgba(255,255,255,0.01), rgba(0,0,0,0.02))'}}>
            <h3 className="feature-title" style={{color:'#9cd1ff'}}>What I Would Build Next with More Time</h3>
            <ul style={{marginTop:8, color:'var(--muted)'}}>
              <li>Enhanced data visualizations and reporting features.</li>
              <li>Improved onboarding and personalized goal guidance.</li>
              <li>Exportable reports and deeper transaction insights.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
