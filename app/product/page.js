"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import CategorySelect from '../components/CategorySelect';
import AIChat from '../../components/AIChat';

export default function Product() {
  const [categories, setCategories] = useState([]);
  const [user, setUser] = useState(null);
  const [previewGuest, setPreviewGuest] = useState(false);
  const [type, setType] = useState('expense');
  const [amounts, setAmounts] = useState({ income: '0.00', expense: '0.00' });
  const [categoryId, setCategoryId] = useState('');
  const [desc, setDesc] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [totals, setTotals] = useState({ income: 0, expenses: 0 });
  const [insight, setInsight] = useState('');
  const [insightDetails, setInsightDetails] = useState(null);
  const [onboarding, setOnboarding] = useState(null);

  useEffect(() => {
     fetch('/api/auth/me', { credentials: 'same-origin' }).then(r=>r.json()).then(async d=>{ if (d.user) { setUser(d.user);
       // fetch onboarding for signed-in users (force fresh copy)
       try{
         const ob = await fetch('/api/onboarding', { credentials: 'same-origin', cache: 'no-store' });
         if (ob.ok){ const od = await ob.json(); if (!od.error) setOnboarding(od.onboarding || null); }
       }catch(e){ console.error('Silent failure detected [product:fetch-onboarding]', e); }
     }}).catch(e=>{ console.error('Silent failure detected [product:fetch-me]', e); });
     fetch('/api/categories', { credentials: 'same-origin' }).then(r => r.json()).then(d => { if (d.categories) { setCategories(d.categories); if (d.categories[0]) setCategoryId(d.categories[0].id); }}).catch(e=>{ console.error('Silent failure detected [product:fetch-categories]', e); });
    loadTransactions();
  }, []);

  // update onboarding when other pages dispatch an update event
  useEffect(()=>{
    function onUpdate(){
      fetch('/api/onboarding', { credentials: 'same-origin', cache: 'no-store' }).then(r=>r.json()).then(d=>{ if (!d.error) setOnboarding(d.onboarding || null); }).catch(e=>{ console.error('Silent failure detected [product:onboarding-update]', e); });
    }
    window.addEventListener('onboarding:updated', onUpdate);
    return () => window.removeEventListener('onboarding:updated', onUpdate);
  }, []);

  // Ensure a default category is selected when categories change
  useEffect(() => {
    if ((categories || []).length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [categories]);

  // derive filtered categories based on transaction `type`
  function isIncomeCategory(cat) {
    if (!cat) return false;
    // explicit type returned from guest defaults
    if (cat.type === 'income') return true;
    if (cat.type === 'expense') return false;
    if (!cat.name) return false;
    const n = cat.name.toLowerCase();
    // treat known income category names explicitly (covers DB defaults without a `type` column)
    const incomeNames = ['job','allowance','gift','side hustle','side-hustle','sidehustle'];
    if (incomeNames.includes(n)) return true;
    // savings should not be treated as income — it's treated as its own expense-style category
    const incomeKeywords = ['salary','pay','income','deposit','refund','transfer','paycheck','wages','allowance'];
    return incomeKeywords.some(k => n.includes(k));
  }

  const filteredCategories = (categories || []).filter(c => {
    if (type === 'income') return isIncomeCategory(c);
    // for expenses, prefer categories that are not clearly income
    return !isIncomeCategory(c);
  });

  useEffect(() => {
    // when the transaction type changes, pick the first appropriate category if available
    if (filteredCategories.length > 0) {
      setCategoryId(filteredCategories[0].id);
    } else if (categories.length > 0) {
      // fallback to first overall category
      setCategoryId(categories[0].id);
    }
  }, [type, categories]);

  function loadTransactions(){
    fetch('/api/transactions', { credentials: 'same-origin' }).then(r=>r.json()).then(d=>{ if (d.transactions) { setTransactions(d.transactions); setTotals(d.totals || {income:0,expenses:0}); } }).catch(e=>{ console.error('Silent failure detected [product:load-transactions]', e); });
  }

  async function handleAdd(e){
    e.preventDefault();
    const amt = parseFloat(amounts[type]) || 0;
    const effectiveUser = previewGuest ? null : user;
    if (effectiveUser) {
      const body = { amount: amt, type, categoryId, description: desc };
      const res = await fetch('/api/transactions', { method:'POST', credentials: 'same-origin', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) {
        setAmounts(prev => ({ ...prev, [type]: '0.00' })); setDesc('');
        // notify global UI that a transaction was added (staff/admin can listen)
        try { window.dispatchEvent(new CustomEvent('transaction:added', { detail: data.transaction })); } catch(e){ console.error('Silent failure detected [product:transaction-event-dispatch]', e); }
        loadTransactions();
      } else {
        alert(data.error || 'Error adding transaction');
      }
    } else {
      // Local guest transaction (not persisted)
      const tx = { id: `local-${Date.now()}`, amount: amt, type, categoryId, description: desc, occurredAt: new Date().toISOString() };
      setTransactions(prev => [tx, ...prev]);
      // update local totals
      setTotals(prev => {
        const inc = prev.income || 0;
        const exp = prev.expenses || 0;
        return { income: type === 'income' ? inc + amt : inc, expenses: type === 'expense' ? exp + amt : exp };
      });
      setAmounts(prev => ({ ...prev, [type]: '0.00' })); setDesc('');
      try { window.dispatchEvent(new CustomEvent('transaction:added', { detail: tx })); } catch(e){ console.error('Silent failure detected [product:transaction-event-dispatch]', e); }
    }
  }

  async function handleInsight(){
    // show loading state and ensure at least a short delay so it feels like a real request
    setInsight('Generating...');
    const start = Date.now();
    const effectiveUser = previewGuest ? null : user;
    const payload = effectiveUser ? { onboarding } : { transactions };
    const res = await fetch('/api/ai/insight', { method: 'POST', credentials: 'same-origin', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const d = await res.json();
    const elapsed = Date.now() - start;
    const minDelay = 700; // ms
    if (elapsed < minDelay) await new Promise(r => setTimeout(r, minDelay - elapsed));

    if (res.ok) {
      setInsight(d.insight || '');
      setInsightDetails(d.details || null);
    } else {
      setInsight(d.error || d.message || 'Error generating insight');
      setInsightDetails(null);
    }
  }

  const balance = (totals.income || 0) - (totals.expenses || 0);

  return (
    <>
      <div className="page-hero card">
        <h2>{(previewGuest ? null : user) ? `${user ? `Welcome${user.email ? `, ${user.email.split('@')[0]}` : ''}` : ''}` : 'Product Dashboard'}</h2>
        <p className="lead">{(previewGuest ? null : user) ? (onboarding && onboarding.goal ? `Your goal: ${onboarding.goal}. We'll tailor insights to help you reach it.` : 'Track your income and expenses, and get AI-powered insights tailored to you.') : 'Track your income and expenses, and get AI-powered insights'}</p>
        {user && (user.role === 'coach' || user.role === 'instructor') && (
          <div style={{marginTop:8}}>
            <button className="btn secondary" onClick={()=>{ setPreviewGuest(true); setTimeout(()=>setPreviewGuest(false), 120000); }}>Preview as guest (2m)</button>
            {previewGuest && <span style={{marginLeft:12,color:'var(--muted)'}}>Previewing as guest — your session is not affected</span>}
          </div>
        )}
      </div>

      {(!previewGuest && !user) && (
        <div className="signed-out-banner" role="status" aria-live="polite">
          <div>
            <div className="message">You are not signed in — transactions will not be saved.</div>
            <div className="desc">Sign in or create an account to save your data, access insights, and sync across devices.</div>
          </div>
          <div className="cta">
            <Link href="/auth" className="btn">Sign in / Create account</Link>
          </div>
        </div>
      )}

      <div className="card" style={{marginBottom:18}}>
        <h3 style={{textAlign:'center'}}>Add Transaction</h3>
        {(!previewGuest && !user) && <div className="muted-note">You are not signed in — transactions will not be saved. <Link href="/auth">Sign in or create an account</Link>.</div>}
        <form onSubmit={handleAdd} className="transaction-form">
          <div className="form-row">
            <label>Type</label>
            <div className="toggle-group">
              <button type="button" aria-pressed={type==='income'} onClick={()=>setType('income')} className={`toggle-btn ${type==='income' ? 'active' : ''}`}>Income</button>
              <button type="button" aria-pressed={type==='expense'} onClick={()=>setType('expense')} className={`toggle-btn ${type==='expense' ? 'active' : ''}`}>Expense</button>
            </div>
          </div>

          <div className="form-row">
            <label>Amount</label>
            <input
              value={amounts[type] || ''}
              onChange={e => {
                // allow only digits and a single decimal point
                const v = e.target.value;
                if (v === '' || /^\d*\.?\d*$/.test(v)) {
                  setAmounts(prev => ({ ...prev, [type]: v }));
                }
              }}
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              onWheel={e => e.currentTarget.blur()} // prevent scroll-from-changing value
              name="tx-amount"
              autoComplete="off"
              onKeyDown={e => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
              }}
            />
          </div>

          <div className="form-row">
            <label>Category</label>
            <CategorySelect categories={filteredCategories} value={categoryId} onChange={setCategoryId} placeholder="-- Select --" />
          </div>

          <div className="form-row">
            <label>Description</label>
            <input value={desc} onChange={e=>setDesc(e.target.value)} type="text" />
          </div>

          <div className="transaction-actions">
            <button className={`btn full`} type="submit">➕ Add Transaction</button>
          </div>
        </form>
      </div>

      <div className="card" style={{marginBottom:18}}>
        <h3 style={{textAlign:'center'}}>Summary</h3>
        <div style={{display:'grid',gap:8}}>
          <div style={{display:'flex',justifyContent:'space-between'}}><div>Total Income</div><div>${(totals.income||0).toFixed(2)}</div></div>
          <div style={{display:'flex',justifyContent:'space-between'}}><div>Total Expenses</div><div>${(totals.expenses||0).toFixed(2)}</div></div>
          <div style={{background:'var(--accent)',padding:12,color:'#021',borderRadius:6,display:'flex',justifyContent:'space-between'}}><div>Balance</div><div style={{fontWeight:700}}>${balance.toFixed(2)}</div></div>
        </div>
      </div>

      <div className="card" style={{marginBottom:18}}>
        <h3 style={{textAlign:'center'}}>AI Insight</h3>
        <div style={{padding:12,background:'var(--accent)',borderRadius:6,color:'#021'}}>
          {insight || 'Start adding your income and expenses to receive personalized insights!'}
          {insightDetails && (
            <div style={{marginTop:10,color:'#021'}}>
              <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                <div style={{background:'rgba(255,255,255,0.95)',padding:'8px 10px',borderRadius:8,color:'#012'}}>Income: ${Number(insightDetails.income||0).toFixed(2)}</div>
                <div style={{background:'rgba(255,255,255,0.95)',padding:'8px 10px',borderRadius:8,color:'#012'}}>Expenses: ${Number(insightDetails.expenses||0).toFixed(2)}</div>
                <div style={{background:'rgba(255,255,255,0.95)',padding:'8px 10px',borderRadius:8,color:'#012'}}>Balance: ${Number(insightDetails.balance||0).toFixed(2)}</div>
                {insightDetails.savingsRate !== null && <div style={{background:'rgba(255,255,255,0.95)',padding:'8px 10px',borderRadius:8,color:'#012'}}>Savings rate: {insightDetails.savingsRate}%</div>}
              </div>
              {insightDetails.topCategories && insightDetails.topCategories.length > 0 && (
                <div style={{marginTop:8,color:'#021'}}>
                  <strong>Top categories:</strong>
                  <ul style={{margin:6,paddingLeft:18,color:'#012'}}>
                    {insightDetails.topCategories.map((c,idx)=> (
                      <li key={idx}>{c.name}: ${Number(c.amount).toFixed(2)}</li>
                    ))}
                  </ul>
                </div>
              )}
              {insightDetails.suggestions && insightDetails.suggestions.length > 0 && (
                <div style={{marginTop:8,color:'#021'}}>
                  <strong>Suggestions:</strong>
                  <ul style={{margin:6,paddingLeft:18,color:'#012'}}>
                    {insightDetails.suggestions.map((s,idx)=> (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{marginTop:8}}><button onClick={handleInsight} className="btn">Generate Insight</button></div>
        {(!previewGuest && !user) && (
          <div style={{marginTop:10}} className="muted-note">Sign in to save insights and history and access them later. <Link href="/auth">Sign in / Create account</Link></div>
        )}
      </div>

      <div className="card">
        <h3>Recent Transactions</h3>
        <ul>
          {transactions.map(tx => (
            <li key={tx.id} style={{padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <div>{tx.description || (tx.type || '').toUpperCase()}</div>
                <div>${Number(tx.amount).toFixed(2)}</div>
              </div>
              <div style={{fontSize:12,opacity:0.8}}>
                {new Date(tx.occurredAt).toLocaleDateString()} • {new Date(tx.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <AIChat />
    </>
  );
}
