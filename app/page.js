import Link from 'next/link';
import SignedOutCTA from '../components/SignedOutCTA';

export default function Home() {
  return (
    <>
      <div className="hero" style={{padding:72}}>
        <h2 style={{fontSize:64,marginBottom:8}}>ClearCents</h2>
        <p className="lead" style={{fontSize:18,maxWidth:980}}>Master your money as a student. Track income and expenses, understand your spending patterns, and get AI-powered insights to build healthier financial habits over time.</p>
        <div className="cta">
          <SignedOutCTA />
        </div>
      </div>

      <div className="card">
        <h3>Welcome</h3>
        <p>ClearCents helps students track income and expenses, set savings goals, and get AI-powered guidance to build healthy money habits.</p>
        <div style={{marginTop:10}}>
          <ul style={{color:'var(--muted)',marginTop:6}}>
            <li>Log transactions quickly and categorize spending</li>
            <li>Set goals and track monthly progress</li>
            <li>Receive tailored AI insights and tips</li>
            <li>Safe, student-focused defaults and privacy-first design</li>
          </ul>
        </div>
        
      </div>
    </>
  );
}
