"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage(){
  const [why,setWhy] = useState('');
  const [goal,setGoal] = useState('');
  const [monthly,setMonthly] = useState('');
  const [isExisting, setIsExisting] = useState(false);
  const [saved, setSaved] = useState(false);
  // prefill from existing onboarding if available
  useEffect(()=>{
    let mounted = true;
    async function load(){
      try{
        const r = await fetch('/api/onboarding');
        if (!r.ok) return;
        const d = await r.json();
        if (!mounted) return;
        if (d.onboarding){
          setIsExisting(true);
          const ob = d.onboarding;
          setGoal(ob.goal || '');
          setMonthly(ob.monthly || '');
          if (ob.why) setWhy(ob.why || '');
          if (ob.reasons && Array.isArray(ob.reasons)) setSelected(ob.reasons);
        }
      }catch(e){}
    }
    load();
    return ()=> mounted = false;
  }, []);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e){
    e.preventDefault();
    setError(''); setLoading(true);
    const body = { why, goal, monthly, reasons: selected };
    const res = await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || 'Failed to save onboarding');
    // If editing existing onboarding, show a saved state and return to profile
    if (isExisting) {
      setSaved(true);
      setTimeout(()=>router.push('/profile'),800);
      return;
    }
    router.push('/product');
  }

  const options = [
    ['Learn budgeting','💰'],
    ['Save for a goal','🏠'],
    ['Track spending','📊'],
    ['Class requirement','🎓'],
    ['Reduce impulse buying','🛒'],
    ['Build better habits','🎯']
  ];
  const [selected, setSelected] = useState([]);

  function toggleOption(label){
    setSelected(s => s.includes(label) ? s.filter(x => x !== label) : [...s, label]);
  }

  return (
    <div className="container app-main">
      <div style={{maxWidth:900,margin:'18px auto'}}>
        <div className="page-hero card">
          <h2>Welcome to ClearCents</h2>
          <p className="lead">{isExisting ? 'Update your onboarding answers' : "Let's personalize your experience"}</p>
          <div style={{height:6,background:'rgba(255,255,255,0.04)',borderRadius:6,overflow:'hidden',marginTop:12}}>
            <div style={{width:'28%',height:6,background: 'linear-gradient(90deg,var(--accent), rgba(255,255,255,0.04))'}} />
          </div>
        </div>

        <div className="onboarding-card">
          <form onSubmit={handleSubmit} className="onboarding-form">
            <div style={{display:'grid',gridTemplateColumns: '1fr 1fr',gap:12}}>
              {options.map(([label,emoji]) => (
                <div key={label} className={`option-tile ${selected.includes(label) ? 'selected' : ''}`} onClick={() => toggleOption(label)} role="button" tabIndex={0} onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' ') toggleOption(label); }}>
                  <div className="tile-content">
                    <div className="tile-emoji">{emoji}</div>
                    <div className="tile-label">{label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{marginTop:12}}>
              <label className="form-label">What's your main financial goal?</label>
              <input className="form-control" value={goal} onChange={e=>setGoal(e.target.value)} placeholder="E.g., Save $500 by June, Pay off credit card" />
            </div>

            <div style={{display:'flex',gap:12,marginTop:12}}>
              <div style={{flex:1}}>
                <label className="form-label">Monthly savings goal (optional)</label>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <div style={{padding:'10px 8px',borderRadius:8,background:'rgba(255,255,255,0.02)'}}>$</div>
                  <input className="form-control" value={monthly} onChange={e=>setMonthly(e.target.value)} type="number" />
                </div>
              </div>
              <div style={{width:220}}>
                <label className="form-label">Time frame</label>
                <select className="form-control">
                  <option>-- Select --</option>
                  <option>1 month</option>
                  <option>3 months</option>
                  <option>6 months</option>
                  <option>1 year</option>
                </select>
              </div>
            </div>

            <div style={{marginTop:12}}>
              <label className="form-label">Tell us about your financial situation</label>
              <textarea className="form-control" value={why} onChange={e=>setWhy(e.target.value)} placeholder="E.g., I work part-time and get an allowance. I'm struggling with food delivery spending..." />
            </div>

            {error && <div style={{color:'#ffb4b4',marginTop:8}}>{error}</div>}

            {saved && <div style={{color:'#86efac',marginTop:8}}>Changes saved — returning to profile…</div>}

            <div style={{display:'flex',gap:18,marginTop:18}}>
              <button type="button" className="btn ghost" onClick={() => (window.location = '/product')} style={{minWidth:140}}>Skip for now</button>
              <button className="btn save" type="submit" disabled={loading} style={{flex:1,textAlign:'center',minWidth:180}}>{loading ? 'Saving...' : (isExisting ? 'Save changes' : 'Get Started →')}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
