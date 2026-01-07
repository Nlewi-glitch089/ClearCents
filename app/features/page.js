import Icon from '../components/Icon';
import Link from 'next/link';

export default function Features() {
  const features = [
    {
      title: 'Income Tracking',
      icon: 'wallet',
      bullets: ['Add multiple income sources (jobs, allowances, gifts)', 'Mark income as one-time or recurring', 'View total monthly income at a glance']
    },
    {
      title: 'Expense Tracking',
      icon: 'receipt',
      bullets: ['Categorize expenses (food, transport, subscriptions)', 'Log daily spending quickly', 'See total spending by category']
    },
    {
      title: 'Savings Goals',
      icon: 'target',
      bullets: ['Create short-term and long-term goals', 'Track progress toward each goal', 'Visual progress indicators to stay motivated']
    },
    {
      title: 'Visual Insights',
      icon: 'chart',
      bullets: ['Simple charts showing income vs expenses', 'Category-based spending breakdowns', 'Monthly summaries for reflection']
    },
    {
      title: 'AI-Powered Coaching',
      icon: 'bot',
      bullets: ['Personalized spending insights', 'Actionable suggestions for improvement', 'Ask questions about your finances anytime']
    }
  ];

  function hrefFor(title){
    const key = title.toLowerCase();
    if (key.includes('income')) return '/product#income';
    if (key.includes('expense')) return '/product#expenses';
    if (key.includes('savings')) return '/product#savings';
    if (key.includes('visual')) return '/product#visual-insights';
    if (key.includes('ai')) return '/product#ai';
    return '/product';
  }

  return (
    <>
      <div className="page-hero card why-hero">
        <h2>Features Built for Students</h2>
        <p className="lead">Everything you need to take control of your finances — nothing you don't.</p>
      </div>

      <div className="card features-grid" style={{padding:24}}>
        <div className="grid-3" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:18}}>
          {features.map(f => (
            <div key={f.title} className="feature-card" style={{padding:18,borderRadius:12}}>
              <Link href={hrefFor(f.title)} className="feature-link">
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:56,height:56,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:10,background:'linear-gradient(90deg,var(--accent),var(--accent-2))'}}>
                    <Icon name={f.icon} />
                  </div>
                  <h4 style={{margin:0,color:'var(--heading-blue)'}}>{f.title}</h4>
                </div>
              </Link>
              <ul style={{marginTop:12}}>
                {f.bullets.map((b,i)=>(<li key={i} className="feature-bullet">{b}</li>))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{marginTop:18,textAlign:'center'}}>
          <p className="lead">ClearCents focuses on simple, teachable features that fit student life — tracking, goals, reflection, and supportive coaching.</p>
        </div>
      </div>
    </>
  );
}
