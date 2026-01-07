"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DeleteAccount from '../../components/DeleteAccount';

export default function ProfilePage(){
  const [user,setUser] = useState(null);
  const [onboarding,setOnboarding] = useState(null);
  const [loading,setLoading] = useState(true);
  const [totals,setTotals] = useState({ income:0, expenses:0 });
  const [goals,setGoals] = useState([]);
  const [activity,setActivity] = useState({ transactions: 0, categories: 0, daysActive: 0 });
  const [goalProgress, setGoalProgress] = useState({ percent: 0, current: 0, target: 0 });
  const router = useRouter();

  useEffect(()=>{
    async function load(){
      setLoading(true);
      const r1 = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
      const d1 = await r1.json();
      if (!d1.user){
        router.push('/auth');
        return;
      }
      setUser(d1.user);
      const r2 = await fetch('/api/onboarding', { credentials: 'same-origin', cache: 'no-store' });
      if (r2.ok){
        const d2 = await r2.json();
        if (!d2.error) setOnboarding(d2.onboarding || null);
      }

      // fetch transactions totals
      try{
        const rt = await fetch('/api/transactions', { credentials: 'same-origin', cache: 'no-store' });
        if (rt.ok){
          const td = await rt.json();
          setTotals(td.totals || { income: 0, expenses: 0 });
          if (td.transactions && Array.isArray(td.transactions)){
            const txs = td.transactions;
            const txCount = txs.length;
            const categoryIds = new Set(txs.map(t => t.categoryId).filter(Boolean));
            const days = new Set(txs.map(t => {
              try { return new Date(t.occurredAt).toISOString().slice(0,10); } catch(e){ return null; }
            }).filter(Boolean));
            setActivity({ transactions: txCount, categories: categoryIds.size, daysActive: days.size });
          }
        }
      }catch(e){}

      // fetch goals
      try{
        const rg = await fetch('/api/goals', { credentials: 'same-origin', cache: 'no-store' });
        if (rg.ok){
          const gd = await rg.json();
          if (!gd.error && Array.isArray(gd.goals)) setGoals(gd.goals || []);
        }
      }catch(e){}
      setLoading(false);
    }
    load();
  },[]);

  // listen for onboarding updates from other pages and re-fetch
  useEffect(()=>{
    function onUpdate(e){
      fetch('/api/onboarding', { credentials: 'same-origin', cache: 'no-store' }).then(r=>r.json()).then(d=>{ if (!d.error) setOnboarding(d.onboarding || null); }).catch(()=>{});
    }
    window.addEventListener('onboarding:updated', onUpdate);
    return () => window.removeEventListener('onboarding:updated', onUpdate);
  }, []);

  // compute goal progress when goals or totals change
  useEffect(()=>{
    // prefer explicit Goal record if present
    if (goals && goals.length > 0){
      const g = goals[0];
      const current = Number(g.currentAmount || 0);
      const target = Number(g.targetAmount || 0) || 0;
      const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
      setGoalProgress({ percent, current, target });
      return;
    }

    // fallback to onboarding-based parsing (look for a numeric target in the goal text)
    if (onboarding && onboarding.goal){
      const m = String(onboarding.goal).match(/\$?\s*(\d{1,3}(?:[\,\d]*))(?:\.\d{1,2})?/);
      if (m){
        const target = Number(m[1].replace(/,/g, '')) || 0;
        // approximate current as sum of income - expenses (savings)
        const current = Math.max(0, (totals.income || 0) - (totals.expenses || 0));
        const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
        setGoalProgress({ percent, current, target });
        return;
      }
    }

    // default placeholder
    setGoalProgress({ percent: 66, current: 330, target: 500 });
  }, [goals, onboarding, totals]);

  if (loading) return <div className="container"><div className="card">Loading...</div></div>;

  return (
    <div className="container app-main">
      <div style={{maxWidth:980,margin:'28px auto'}}>
        <div className="page-hero card profile-hero">
          <div style={{display:'flex',gap:16,alignItems:'center'}}>
            <div style={{width:86,height:86,borderRadius:999,background:'linear-gradient(90deg, rgba(255,255,255,0.02), rgba(0,0,0,0.04))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:34,color:'rgba(255,255,255,0.9)'}}>👤</div>
            <div style={{flex:1}}>
              <h2 style={{margin:0}}>{user?.name || user?.email?.split('@')[0] || 'User'}</h2>
              <div style={{marginTop:6,display:'flex',gap:8,alignItems:'center'}}>
                <div className="badge">{user?.role || 'Student'}</div>
                <div className="muted-note">{user?.email}</div>
              </div>
            </div>
            <div>
              <Link href="/auth/edit" className="btn">Edit</Link>
            </div>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginTop:18}}>
          <div className="card stat-card">
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div className="stat-emoji">💰</div>
              <div>
                <div className="muted-note">TOTAL INCOME</div>
                <div style={{fontSize:22,fontWeight:700,color: 'var(--accent)'}}>${(totals.income||0).toFixed(2)}</div>
                <div className="muted-note">This month</div>
              </div>
            </div>
          </div>
          <div className="card stat-card">
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div className="stat-emoji">💸</div>
              <div>
                <div className="muted-note">TOTAL SPENT</div>
                <div style={{fontSize:22,fontWeight:700,color: 'var(--accent)'}}>${(totals.expenses||0).toFixed(2)}</div>
                <div className="muted-note">This month</div>
              </div>
            </div>
          </div>
          <div className="card stat-card">
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div className="stat-emoji">💚</div>
              <div>
                <div className="muted-note">NET BALANCE</div>
                <div style={{fontSize:22,fontWeight:700,color: 'var(--accent)'}}>${( (totals.income||0) - (totals.expenses||0) ).toFixed(2)}</div>
                <div className="muted-note">Available to save</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{marginTop:18}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h3>Your Goals</h3>
            <div>
              <button className="btn ghost" onClick={()=>router.push('/auth/onboarding')}>Edit goals</button>
            </div>
          </div>
          <div style={{display:'grid',gap:12,marginTop:12}}>
            <div className="goal-card">
              <div style={{fontWeight:700}}>Primary Goal</div>
              <div style={{marginTop:8}}>{onboarding?.goal || (goals[0] ? goals[0].title : 'Save $500 by June for a summer trip')}</div>
            </div>
            <div className="goal-card">
              <div style={{fontWeight:700}}>Monthly Savings Target</div>
              <div style={{marginTop:8}}>{onboarding?.monthly ? `$${onboarding.monthly}/month` : (goals[0] && goals[0].targetAmount ? `$${goals[0].targetAmount}/month` : '$200/month')}</div>
            </div>
            <div>
              <div style={{fontWeight:700}}>Current Progress</div>
              <div style={{marginTop:8}} className="progress-wrap">
                <div className="progress-bar"><div style={{width: `${goalProgress.percent}%`}}/></div>
                <div className="muted-note" style={{marginTop:8}}>${Number(goalProgress.current||0).toFixed(2)} saved out of ${Number(goalProgress.target||0).toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

            <div className="card" style={{marginTop:18}}>
          <h3>Activity Summary</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginTop:12}}>
            <div className="card small stat-mini"><div style={{textAlign:'center',fontSize:22,color:'var(--accent)'}}>{activity.transactions}</div><div className="muted-note">Transactions logged</div></div>
            <div className="card small stat-mini"><div style={{textAlign:'center',fontSize:22,color:'var(--accent)'}}>{activity.categories}</div><div className="muted-note">Categories used</div></div>
            <div className="card small stat-mini"><div style={{textAlign:'center',fontSize:22,color:'var(--accent)'}}>{activity.daysActive}</div><div className="muted-note">Days active</div></div>
          </div>

          <div style={{marginTop:18}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <h4>Why You Joined</h4>
              <button className="btn ghost" onClick={()=>router.push('/auth/onboarding')}>Edit answers</button>
            </div>
            <div style={{padding:12,background:'rgba(255,255,255,0.02)',borderRadius:8,marginTop:8}}>
              {onboarding?.reasons && onboarding.reasons.length ? (
                <ul>
                  {onboarding.reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              ) : (
                <ul>
                  <li>Learn budgeting</li>
                  <li>Save for a goal</li>
                  <li>Track spending</li>
                  <li>Build better habits</li>
                </ul>
              )}
            </div>
          </div>

          <div style={{marginTop:12}} className="danger-zone">
            <div style={{fontWeight:700}}>Danger Zone</div>
            <div className="muted-note" style={{marginTop:6}}>Once you delete your account, there is no going back.</div>
            <div style={{marginTop:12}}>
              <DeleteAccount />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
