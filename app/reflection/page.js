import { cookies } from 'next/headers';
import { verifyToken } from '../../lib/auth.js';
import prisma from '../../lib/prisma.js';

export default async function ReflectionPage() {
  const cookieJar = cookies();
  const token = cookieJar.get('session')?.value;

  let user = null;
  try {
    if (token) {
      const payload = verifyToken(token);
      user = await prisma.user.findUnique({ where: { id: payload.id } });
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

  return (
    <div style={{padding:24, maxWidth:1100, margin:'0 auto'}}>
      <header style={{background:'#3f1f3f', padding:20, borderRadius:10, color:'#fff', marginBottom:20}}>
        <div style={{fontSize:12, background:'#f3cc00', color:'#2b1b00', display:'inline-block', padding:'6px 10px', borderRadius:6, marginBottom:8}}>LAUNCHPAD STAFF ONLY</div>
        <h1 style={{margin:8, fontSize:28}}>Project Reflection - ClearCents</h1>
        <p style={{opacity:0.9, margin:0}}>Developer insights on challenges, decisions, and future improvements</p>
      </header>

      <section style={{display:'grid', gap:18}}>
        <div style={{background:'#0f2f2f', color:'#7ee7d8', padding:18, borderRadius:12}}>
          <h2 style={{marginTop:0}}>What Went Well</h2>
          <ul style={{lineHeight:1.6}}>
            <li>Successfully integrated AI features with a working database connection and comprehensive UI.</li>
            <li>Completed careful request handling and data flow for the AI, making the app interactive rather than static.</li>
            <li>Established the database early which made it easier to expand functionality as features were added.</li>
            <li>Consistent styles and modular React components improved maintainability and scalability.</li>
          </ul>
        </div>

        <div style={{background:'#3b1b1b', color:'#ffb6b6', padding:18, borderRadius:12}}>
          <h2 style={{marginTop:0}}>What Didn't Go Well</h2>
          <ul style={{lineHeight:1.6}}>
            <li>The AI and server-side integration required more time than anticipated, slowing other work.</li>
            <li>Polishing responsiveness and React state at multiple screen sizes required several iterations.</li>
            <li>Some features (profile refinements) were deprioritized to ensure core AI stability.</li>
          </ul>
        </div>

        <div style={{background:'#3f2b00', color:'#ffe28a', padding:18, borderRadius:12}}>
          <h2 style={{marginTop:0}}>What Changed During the Project and Why</h2>
          <p style={{lineHeight:1.6}}>I shifted focus from splitting time evenly between AI and customization to prioritizing the AI feature until it was stable. This change improved the quality of the main interactive experience, though it meant scaling back secondary UI polish until later.</p>
        </div>

        <div style={{background:'#0b2b4f', color:'#9cd1ff', padding:18, borderRadius:12}}>
          <h2 style={{marginTop:0}}>What I Would Build Next with More Time</h2>
          <ul style={{lineHeight:1.6}}>
            <li>Expand the profile and customization options (preferences, saved settings).</li>
            <li>Add downloadable reports and richer historical views of spending and goals.</li>
            <li>Improve collaborative features for shared budgets and group analytics.</li>
          </ul>
        </div>

        <div style={{display:'flex', gap:12, marginTop:6}}>
          <div style={{flex:1, background:'#2b0b2b', color:'#9ef0c7', padding:18, borderRadius:10, textAlign:'center'}}>
            <div style={{fontSize:20, fontWeight:700}}>15+</div>
            <div style={{opacity:0.8}}>Total Components</div>
          </div>
          <div style={{flex:1, background:'#2b1430', color:'#c8ddff', padding:18, borderRadius:10, textAlign:'center'}}>
            <div style={{fontSize:20, fontWeight:700}}>9</div>
            <div style={{opacity:0.8}}>Pages Built</div>
          </div>
          <div style={{flex:1, background:'#301a1a', color:'#ffd6c6', padding:18, borderRadius:10, textAlign:'center'}}>
            <div style={{fontSize:20, fontWeight:700}}>12</div>
            <div style={{opacity:0.8}}>Backend Routes</div>
          </div>
          <div style={{flex:1, background:'#3b0f23', color:'#ffd0ff', padding:18, borderRadius:10, textAlign:'center'}}>
            <div style={{fontSize:20, fontWeight:700}}>3000+</div>
            <div style={{opacity:0.8}}>Lines of Code</div>
          </div>
        </div>
      </section>
    </div>
  );
}
