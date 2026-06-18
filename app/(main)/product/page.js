"use client";
import { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, ClipboardList, Plus, X } from 'lucide-react';
import Link from 'next/link';
import CategorySelect from '../../components/CategorySelect';
import AIChat from '../../../components/AIChat';
import FinancialAlerts from '../../../components/FinancialAlerts';
import FinancialStory from '../../../components/FinancialStory';
import TopOpportunity from '../../../components/TopOpportunity';
import ActionCard from '../../../components/ActionCard';
import ActionCenter from '../../../components/ActionCenter';
import StrategyCard from '../../../components/StrategyCard';
import FinancialReviewCard from '../../../components/FinancialReviewCard';
import FinancialRoadmapCard from '../../../components/FinancialRoadmapCard';
import DashboardTour from '../../../components/DashboardTour';
import { getUserJourneyState } from '../../../lib/userState.js';

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function GoalRing({ percent, size = 112, stroke = 9 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ - (Math.min(percent, 100) / 100) * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <defs>
          <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10c08a" />
            <stop offset="100%" stopColor="#07a36b" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="url(#rg)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: off }}
          transition={{ duration: 1.4, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="goal-ring-percent">{percent}%</div>
        <div className="goal-ring-label">saved</div>
      </div>
    </div>
  );
}

function SpendingBars({ income, expenses }) {
  const max = Math.max(income, expenses, 0.01);
  return (
    <div className="spend-chart-wrap">
      <div className="spend-bar-col">
        <div className="spend-bar-track">
          <div className="spend-bar spend-bar--income" style={{ height: `${Math.round((income / max) * 100)}%` }} />
        </div>
        <div className="spend-bar-label">
          <div className="spend-bar-amount tx-amount--income">+${income.toFixed(2)}</div>
          <div>Income</div>
        </div>
      </div>
      <div className="spend-bar-col">
        <div className="spend-bar-track">
          <div className="spend-bar spend-bar--expense" style={{ height: `${Math.round((expenses / max) * 100)}%` }} />
        </div>
        <div className="spend-bar-label">
          <div className="spend-bar-amount tx-amount--expense">−${expenses.toFixed(2)}</div>
          <div>Expenses</div>
        </div>
      </div>
    </div>
  );
}

export default function Product() {
  const [categories, setCategories] = useState([]);
  const [user, setUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [previewGuest, setPreviewGuest] = useState(false);
  const [type, setType] = useState('expense');
  const [amounts, setAmounts] = useState({ income: '', expense: '' });
  const [date, setDate] = useState(localDate);
  const [categoryId, setCategoryId] = useState('');
  const [desc, setDesc] = useState('');
  const [txError, setTxError] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [totals, setTotals] = useState({ income: 0, expenses: 0 });
  const [insight, setInsight] = useState('');
  const [insightDetails, setInsightDetails] = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [apiGoals, setApiGoals] = useState([]);
  const [apiAccounts, setApiAccounts] = useState([]);
  const [showGuestNudge, setShowGuestNudge] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [editingTx, setEditingTx] = useState(null);
  const [timeScope, setTimeScope] = useState('month');
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [insightAlerts, setInsightAlerts] = useState([]);
  const [insightMemory, setInsightMemory] = useState(null);
  const [insightOpportunities, setInsightOpportunities] = useState([]);
  const [insightActions, setInsightActions] = useState([]);
  const [insightStrategies, setInsightStrategies] = useState([]);
  const [insightReview, setInsightReview] = useState(null);
  const [insightRoadmap, setInsightRoadmap] = useState(null);
  const [actionStatuses, setActionStatuses] = useState({});
  const [insightFailed, setInsightFailed] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [financialActions, setFinancialActions] = useState([]);

  const [showTour, setShowTour] = useState(false);

  const autoInsightFiredRef = useRef(false);
  const nudgeDismissedRef = useRef(false);

  useEffect(() => {
    async function loadInitial() {
      try {
        const [meRes, obRes, goalsRes] = await Promise.allSettled([
          fetch('/api/auth/me', { credentials: 'same-origin' }).then(r => r.json()),
          fetch('/api/onboarding', { credentials: 'same-origin', cache: 'no-store' }).then(r => r.json()),
          fetch('/api/goals', { credentials: 'same-origin', cache: 'no-store' }).then(r => r.json()),
        ]);

        if (meRes.status === 'fulfilled' && meRes.value?.user) {
          setUser(meRes.value.user);
        }
        if (obRes.status === 'fulfilled' && !obRes.value?.error) {
          setOnboarding(obRes.value?.onboarding || null);
        }
        if (goalsRes.status === 'fulfilled' && !goalsRes.value?.error && Array.isArray(goalsRes.value?.goals)) {
          setApiGoals(goalsRes.value.goals);
        }
      } catch (e) {
        console.error('Silent failure detected [product:load-initial]', e);
      } finally {
        setUserLoaded(true);
      }

      // Load financial actions separately so a slow /api/actions response
      // does not delay setUser and the goal card render above.
      fetch('/api/actions', { credentials: 'same-origin' })
        .then(r => r.json())
        .then(d => { if (Array.isArray(d?.actions)) setFinancialActions(d.actions); })
        .catch(e => { console.error('Silent failure detected [product:load-actions]', e); });
    }
    loadInitial();

    fetch('/api/categories', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(d => {
        if (d.categories) {
          setCategories(d.categories);
          if (d.categories[0]) setCategoryId(d.categories[0].id);
        }
      })
      .catch(e => { console.error('Silent failure detected [product:fetch-categories]', e); });

    loadTransactions();
  }, []);

  useEffect(() => {
    function onUpdate() {
      Promise.all([
        fetch('/api/onboarding', { credentials: 'same-origin', cache: 'no-store' }).then(r => r.json()),
        fetch('/api/goals',      { credentials: 'same-origin', cache: 'no-store' }).then(r => r.json()),
      ])
        .then(([od, gd]) => {
          if (!od.error) setOnboarding(od.onboarding || null);
          if (!gd.error && Array.isArray(gd.goals)) setApiGoals(gd.goals);
        })
        .catch(e => { console.error('Silent failure detected [product:onboarding-update]', e); });
    }
    window.addEventListener('onboarding:updated', onUpdate);
    return () => window.removeEventListener('onboarding:updated', onUpdate);
  }, []);

  useEffect(() => {
    function loadAccounts() {
      fetch('/api/accounts', { credentials: 'same-origin' })
        .then(r => r.json())
        .then(d => { if (Array.isArray(d.accounts)) setApiAccounts(d.accounts); })
        .catch(e => { console.error('Silent failure detected [product:load-accounts]', e); });
    }
    loadAccounts();
    window.addEventListener('accounts:updated', loadAccounts);
    return () => window.removeEventListener('accounts:updated', loadAccounts);
  }, []);

  useEffect(() => {
    if ((categories || []).length > 0 && !categoryId) setCategoryId(categories[0].id);
  }, [categories]);

  useEffect(() => {
    if (userLoaded && user) {
      try {
        const done = localStorage.getItem('clearcents:tour:completed');
        if (!done) setShowTour(true);
      } catch { /* localStorage unavailable */ }
    }
  }, [userLoaded, user]);

  function completeTour() {
    try { localStorage.setItem('clearcents:tour:completed', '1'); } catch { /* ignore */ }
    setShowTour(false);
  }

  function isIncomeCategory(cat) {
    if (!cat) return false;
    if (cat.type === 'income') return true;
    if (cat.type === 'expense') return false;
    if (!cat.name) return false;
    const n = cat.name.toLowerCase();
    const incomeNames = ['job', 'allowance', 'gift', 'side hustle', 'side-hustle', 'sidehustle'];
    if (incomeNames.includes(n)) return true;
    const incomeKeywords = ['salary', 'pay', 'income', 'deposit', 'refund', 'transfer', 'paycheck', 'wages', 'allowance'];
    return incomeKeywords.some(k => n.includes(k));
  }

  const filteredCategories = (categories || []).filter(c => {
    if (type === 'income') return isIncomeCategory(c);
    return !isIncomeCategory(c);
  });

  useEffect(() => {
    if (filteredCategories.length > 0) setCategoryId(filteredCategories[0].id);
    else if (categories.length > 0) setCategoryId(categories[0].id);
  }, [type, categories]);

  function loadFinancialActions() {
    if (!user) return;
    fetch('/api/actions', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.actions)) setFinancialActions(d.actions); })
      .catch(e => { console.error('Silent failure detected [product:load-financial-actions]', e); });
  }

  async function handleAcceptAction(plan) {
    if (!user) return;
    try {
      await fetch('/api/actions', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId: plan.id, title: plan.title, priorityScore: plan.priorityScore }),
      });
      loadFinancialActions();
    } catch (e) { console.error('Silent failure detected [product:accept-action]', e); }
  }

  async function handleUpdateAction(id, status) {
    if (!user) return;
    try {
      await fetch(`/api/actions/${id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      loadFinancialActions();
    } catch (e) { console.error('Silent failure detected [product:update-action]', e); }
  }

  function loadTransactions() {
    fetch('/api/transactions', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(d => {
        if (d.transactions) {
          setTransactions(d.transactions);
          setTotals(d.totals || { income: 0, expenses: 0 });
        }
      })
      .catch(e => { console.error('Silent failure detected [product:load-transactions]', e); });
  }

  function loadGoals() {
    fetch('/api/goals', { credentials: 'same-origin', cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (!d.error && Array.isArray(d.goals)) setApiGoals(d.goals);
      })
      .catch(e => { console.error('Silent failure detected [product:reload-goals]', e); });
  }

  async function handleDelete(txId) {
    setConfirmDeleteId(null);
    if (String(txId).startsWith('local-')) {
      const removed = transactions.find(t => t.id === txId);
      setTransactions(prev => prev.filter(t => t.id !== txId));
      if (removed) setTotals(prev => ({
        income: removed.type === 'income' ? Math.max(0, prev.income - Number(removed.amount)) : prev.income,
        expenses: removed.type === 'expense' ? Math.max(0, prev.expenses - Number(removed.amount)) : prev.expenses,
      }));
      return;
    }
    const removed = transactions.find(t => t.id === txId);
    setTransactions(prev => prev.filter(t => t.id !== txId));
    const res = await fetch(`/api/transactions/${txId}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    if (!res.ok) {
      if (removed) setTransactions(prev => [...prev, removed].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)));
      return;
    }
    loadTransactions();
    loadGoals();
  }

  async function handleEdit(e) {
    e.preventDefault();
    if (!editingTx) return;
    setTxError('');
    const amt = parseFloat(amounts[type]) || 0;
    const occurredAt = date ? new Date(`${date}T00:00:00`).toISOString() : new Date().toISOString();
    const res = await fetch(`/api/transactions/${editingTx.id}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amt, type, categoryId, description: desc, occurredAt }),
    });
    const data = await res.json();
    if (res.ok) {
      setEditingTx(null);
      setAmounts({ income: '', expense: '' });
      setDesc('');
      setDate(localDate());
      setShowForm(false);
      loadTransactions();
      loadGoals();
    } else {
      setTxError(data.error || 'Error updating transaction');
    }
  }

  function startEdit(tx) {
    setEditingTx(tx);
    setType(tx.type);
    setAmounts({
      income: tx.type === 'income' ? String(Number(tx.amount)) : '',
      expense: tx.type === 'expense' ? String(Number(tx.amount)) : '',
    });
    setDate(new Date(tx.occurredAt).toISOString().slice(0, 10));
    setCategoryId(tx.categoryId || '');
    setDesc(tx.description || '');
    setShowForm(true);
  }

  useEffect(() => {
    if (!userLoaded || autoInsightFiredRef.current) return;
    autoInsightFiredRef.current = true;
    handleInsight();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoaded]);

  async function handleAdd(e) {
    e.preventDefault();
    setTxError('');
    const amt = parseFloat(amounts[type]) || 0;
    const effectiveUser = previewGuest ? null : user;
    const occurredAt = date ? new Date(`${date}T00:00:00`).toISOString() : new Date().toISOString();

    if (effectiveUser) {
      const body = { amount: amt, type, categoryId, description: desc, occurredAt };
      const res = await fetch('/api/transactions', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setAmounts(prev => ({ ...prev, [type]: '' }));
        setDesc('');
        setDate(localDate());
        try { window.dispatchEvent(new CustomEvent('transaction:added', { detail: data.transaction })); }
        catch (e) { console.error('Silent failure detected [product:transaction-event-dispatch]', e); }
        loadTransactions();
        loadGoals();
      } else {
        setTxError(data.error || 'Error adding transaction');
      }
    } else {
      const tx = { id: `local-${Date.now()}`, amount: amt, type, categoryId, description: desc, occurredAt };
      setTransactions(prev => [tx, ...prev]);
      setTotals(prev => ({
        income: type === 'income' ? (prev.income || 0) + amt : (prev.income || 0),
        expenses: type === 'expense' ? (prev.expenses || 0) + amt : (prev.expenses || 0),
      }));
      setAmounts(prev => ({ ...prev, [type]: '' }));
      setDesc('');
      setDate(localDate());
      if (!nudgeDismissedRef.current) setShowGuestNudge(true);
      try { window.dispatchEvent(new CustomEvent('transaction:added', { detail: tx })); }
      catch (e) { console.error('Silent failure detected [product:transaction-event-dispatch]', e); }
    }
  }

  async function handleInsight() {
    setInsight('Generating...');
    setInsightFailed(false);
    setInsightLoading(true);
    const effectiveUser = previewGuest ? null : user;
    const payload = effectiveUser ? { onboarding } : { transactions };
    try {
      const res = await fetch('/api/ai/insight', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (res.ok) {
        setInsight(d.insight || '');
        setInsightDetails(d.details || null);
        setInsightAlerts(Array.isArray(d.alerts) ? d.alerts : []);
        setInsightMemory(d.memory || null);
        setInsightOpportunities(Array.isArray(d.opportunities) ? d.opportunities : []);
        setInsightActions(Array.isArray(d.actions) ? d.actions : []);
        setInsightStrategies(Array.isArray(d.strategies) ? d.strategies : []);
        setInsightReview(d.review || null);
        setInsightRoadmap(d.roadmap || null);
        setActionStatuses({});
        setInsightFailed(false);
      } else {
        setInsight(d.error || d.message || 'Error generating insight');
        setInsightDetails(null);
        setInsightAlerts([]);
        setInsightMemory(null);
        setInsightOpportunities([]);
        setInsightActions([]);
        setInsightStrategies([]);
        setInsightReview(null);
        setInsightRoadmap(null);
        setActionStatuses({});
        setInsightFailed(true);
      }
    } catch (e) {
      console.error('Silent failure detected [product:insight-fetch]', e);
      setInsightFailed(true);
    } finally {
      setInsightLoading(false);
    }
  }

  // All-time balance is kept separate from scoped balance so the goalProgress
  // fallback (which needs the full historical net balance) is unaffected by the toggle.
  const balance = (totals.income || 0) - (totals.expenses || 0);
  const guestTxCount = transactions.filter(t => String(t.id).startsWith('local-')).length;

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const scopedTransactions = timeScope === 'month'
    ? transactions.filter(tx => {
        const d = new Date(tx.occurredAt);
        return d >= thisMonthStart && d < nextMonthStart;
      })
    : transactions;

  const scopedTotals = scopedTransactions.reduce(
    (acc, t) => {
      if (t.type === 'income') acc.income += Number(t.amount);
      else if (t.type === 'expense') acc.expenses += Number(t.amount);
      // transfer: excluded from income/expense display totals
      return acc;
    },
    { income: 0, expenses: 0 }
  );

  const lastMonthTotals = transactions
    .filter(tx => {
      const d = new Date(tx.occurredAt);
      return d >= lastMonthStart && d < thisMonthStart;
    })
    .reduce(
      (acc, t) => {
        if (t.type === 'income') acc.income += Number(t.amount);
        else if (t.type === 'expense') acc.expenses += Number(t.amount);
        // transfer: excluded
        return acc;
      },
      { income: 0, expenses: 0 }
    );

  const activeDaysMonth = new Set(
    transactions
      .filter(tx => { const d = new Date(tx.occurredAt); return d >= thisMonthStart && d < nextMonthStart; })
      .map(tx => new Date(tx.occurredAt).toISOString().slice(0, 10))
  ).size;

  const activeDaysAllTime = new Set(
    transactions.map(tx => new Date(tx.occurredAt).toISOString().slice(0, 10))
  ).size;

  const consistencyLabel = activeDaysMonth >= 20 ? 'Excellent consistency this month.'
    : activeDaysMonth >= 10 ? 'Strong tracking habit.'
    : activeDaysMonth >= 3 ? "You're building consistency."
    : activeDaysMonth >= 1 ? 'Every habit starts somewhere.'
    : null;

  // Month-specific totals for trend comparisons — always calendar-month, not scope-dependent
  const trendMonthTotals = transactions
    .filter(tx => { const d = new Date(tx.occurredAt); return d >= thisMonthStart && d < nextMonthStart; })
    .reduce((acc, tx) => {
      if (tx.type === 'income') acc.income += Number(tx.amount);
      else if (tx.type === 'expense') acc.expenses += Number(tx.amount);
      // transfer: excluded
      return acc;
    }, { income: 0, expenses: 0 });

  // Category spend this month (expenses only, for trend)
  const thisMonthCategorySpend = transactions
    .filter(tx => { const d = new Date(tx.occurredAt); return tx.type === 'expense' && d >= thisMonthStart && d < nextMonthStart; })
    .reduce((acc, tx) => {
      const key = tx.categoryId || '__none__';
      acc[key] = (acc[key] || 0) + Number(tx.amount);
      return acc;
    }, {});

  // Category spend last month (expenses only, for trend)
  const lastMonthCategorySpend = transactions
    .filter(tx => { const d = new Date(tx.occurredAt); return tx.type === 'expense' && d >= lastMonthStart && d < thisMonthStart; })
    .reduce((acc, tx) => {
      const key = tx.categoryId || '__none__';
      acc[key] = (acc[key] || 0) + Number(tx.amount);
      return acc;
    }, {});

  // Category trends: only categories with spending in BOTH months (no division by zero)
  const categoryTrends = Object.keys(thisMonthCategorySpend)
    .filter(key => (lastMonthCategorySpend[key] || 0) > 0)
    .map(key => ({
      name: categories.find(c => c.id === key)?.name || 'Uncategorized',
      pctChange: Math.round(
        ((thisMonthCategorySpend[key] - lastMonthCategorySpend[key]) / lastMonthCategorySpend[key]) * 100
      ),
    }));

  const largestIncrease = categoryTrends.filter(t => t.pctChange > 0).sort((a, b) => b.pctChange - a.pctChange)[0] || null;
  const largestDecrease = categoryTrends.filter(t => t.pctChange < 0).sort((a, b) => a.pctChange - b.pctChange)[0] || null;

  // Savings rate trend (requires income in both months)
  const thisMonthSavingsRate = trendMonthTotals.income > 0
    ? Math.round(((trendMonthTotals.income - trendMonthTotals.expenses) / trendMonthTotals.income) * 100)
    : null;
  const lastMonthSavingsRate = lastMonthTotals.income > 0
    ? Math.round(((lastMonthTotals.income - lastMonthTotals.expenses) / lastMonthTotals.income) * 100)
    : null;
  const savingsRateDelta = thisMonthSavingsRate !== null && lastMonthSavingsRate !== null
    ? thisMonthSavingsRate - lastMonthSavingsRate
    : null;

  // Trend insights in priority order: increase > decrease > savings rate
  const trendInsights = [];
  if (largestIncrease) {
    trendInsights.push(`${largestIncrease.name} spending increased by ${Math.abs(largestIncrease.pctChange)}% from last month.`);
  }
  if (largestDecrease) {
    trendInsights.push(`${largestDecrease.name} spending decreased by ${Math.abs(largestDecrease.pctChange)}% from last month.`);
  }
  if (savingsRateDelta !== null && savingsRateDelta !== 0) {
    const pts = Math.abs(savingsRateDelta);
    trendInsights.push(savingsRateDelta > 0
      ? `Savings rate improved by ${pts} percentage point${pts !== 1 ? 's' : ''}.`
      : `Savings rate is down ${pts} percentage point${pts !== 1 ? 's' : ''} from last month.`
    );
  }

  const hasTrendData = trendInsights.length > 0;
  const hasInsights = insightAlerts.length > 0 || !!insightMemory || insightOpportunities.length > 0 || insightActions.length > 0 || insightStrategies.length > 0 || !!insightReview || !!insightRoadmap;

  // Group scoped expenses by category for spending insight
  const categorySpend = scopedTransactions
    .filter(tx => tx.type === 'expense')
    .reduce((acc, tx) => {
      const key = tx.categoryId || '__none__';
      acc[key] = (acc[key] || 0) + Number(tx.amount);
      return acc;
    }, {});

  const topCategoryEntry = Object.entries(categorySpend).sort(([, a], [, b]) => b - a)[0] || null;
  const topCategory = topCategoryEntry ? {
    id: topCategoryEntry[0],
    amount: topCategoryEntry[1],
    name: categories.find(c => c.id === topCategoryEntry[0])?.name || 'Uncategorized',
    pct: scopedTotals.expenses > 0
      ? Math.round((topCategoryEntry[1] / scopedTotals.expenses) * 100)
      : 0,
  } : null;

  const spendingConcentrated = topCategory !== null && topCategory.pct >= 40;

  const scopedBalance = scopedTotals.income - scopedTotals.expenses;
  const savingsRate = scopedTotals.income > 0
    ? Math.round((scopedBalance / scopedTotals.income) * 100)
    : null;
  const healthStatus = savingsRate === null ? 'neutral'
    : savingsRate >= 20 ? 'good'
    : savingsRate >= 0 ? 'warn'
    : 'bad';
  const healthLabel = healthStatus === 'good' ? 'On track'
    : healthStatus === 'warn' ? 'Room to improve'
    : healthStatus === 'bad' ? 'Over budget'
    : null;

  const journeyState = userLoaded ? getUserJourneyState({
    user,
    transactions,
    goals: apiGoals,
    onboarding,
  }) : null;

  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || null;
  const greeting = !user || previewGuest
    ? 'Financial Snapshot'
    : journeyState === 'needs_first_transaction'
      ? `Welcome to ClearCents${firstName ? `, ${firstName}` : ''}!`
      : `Welcome back${firstName ? `, ${firstName}` : ''}`;

  let goalProgress = null;
  if (user && !previewGuest) {
    if (apiGoals.length > 0) {
      // Primary path: Goal table is source of truth — numbers match dashboard, profile, and coach
      const g = apiGoals[0];
      goalProgress = {
        percent: g.progressPercent || 0,
        current: g.currentSaved || 0,
        target: g.targetAmount || 0,
        goal: g.title,
        isOnTrack: g.isOnTrack ?? null,
        monthlyPaceActual: g.monthlyPaceActual || 0,
        monthlyTarget: g.monthlyTarget ?? null,
        monthsRemaining: g.monthsRemaining ?? null,
        goalAgeMonths: g.goalAgeMonths || 0,
        remainingAmount: g.remainingAmount || 0,
        justCompleted: g.justCompleted || false,
        goalStatus: g.status || 'active',
      };
    } else if (onboarding?.goal) {
      // Fallback: used for historical users whose Goal records have not yet been backfilled.
      // Removed once GET /api/goals lazy-backfill has run for all users.
      const m = String(onboarding.goal).match(/\$?\s*(\d{1,3}(?:[,\d]*)(?:\.\d{1,2})?)/);
      if (m) {
        const target = Number(m[1].replace(/,/g, '')) || 0;
        const current = Math.max(0, balance);
        const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
        goalProgress = { percent, current, target, goal: onboarding.goal };
      }
    }
  }

  // Financial snapshot: user-declared pre-app account balances stored in localStorage.
  // These are added to the displayed goal progress so existing savings count from day one.
  // The backend computation remains unchanged; this is a display-layer adjustment only.
  const netExistingAssets = Math.max(0, apiAccounts.reduce((sum, a) => {
    const b = Number(a.balance) || 0;
    return a.type === 'credit_card' ? sum - b : sum + b;
  }, 0));
  const displayGoalProgress = goalProgress && netExistingAssets > 0
    ? (() => {
        const adjustedCurrent = goalProgress.current + netExistingAssets;
        const adjustedPercent = goalProgress.target > 0
          ? Math.min(100, Math.round((adjustedCurrent / goalProgress.target) * 100))
          : 0;
        return {
          ...goalProgress,
          current: adjustedCurrent,
          percent: adjustedPercent,
          remainingAmount: Math.max(0, goalProgress.target - adjustedCurrent),
        };
      })()
    : goalProgress;

  // Pace context: drives coaching card and AI panel prompts.
  // null = no goal / no monthly target / goal complete / pace incalculable
  const paceContext = displayGoalProgress && displayGoalProgress.percent < 100 && goalProgress.monthlyTarget !== null && goalProgress.isOnTrack !== null && goalProgress.isOnTrack !== undefined
    ? (goalProgress.isOnTrack ? 'onTrack' : 'behind')
    : null;

  const isFirstRun = transactions.length === 0 && !!user && !previewGuest;

  const coachInsightMsg = !goalProgress
    ? 'Set a savings goal and your coach will begin tracking your progress and giving personalized guidance.'
    : isFirstRun
      ? `Your ${goalProgress.goal} goal is set. Log your first transaction and your coach will begin tracking your savings pace and spending habits.`
      : paceContext === 'behind'
        ? `You're slightly behind your savings pace for ${goalProgress.goal}. Your coach can help you find ways to get back on track.`
        : paceContext === 'onTrack'
          ? `You're on pace to reach your ${goalProgress.goal} goal. Your coach can help you stay consistent or accelerate your progress.`
          : `You have a ${goalProgress.goal} goal in progress. Ask your coach for personalized guidance based on your spending and savings habits.`;

  return (
    <>
      {showTour && <DashboardTour onComplete={completeTour} />}

      {/* Signed-out notice */}
      {!previewGuest && !user && userLoaded && (
        <div className="signed-out-banner" role="status" aria-live="polite">
          <div>
            <div className="message">You're exploring as a guest — transactions won't be saved between sessions.</div>
            <div className="desc">Sign in to save your progress and get AI coaching based on your real spending.</div>
          </div>
          <div className="cta">
            <Link href="/auth" className="btn">Sign in / Create account</Link>
          </div>
        </div>
      )}

      {/* Guest nudge */}
      {showGuestNudge && !user && !previewGuest && (
        <div className="guest-nudge" role="status" aria-live="polite">
          <div className="guest-nudge-body">
            <strong>Don't lose your transactions!</strong>
            <p>
              You've added {guestTxCount} transaction{guestTxCount !== 1 ? 's' : ''} — they'll disappear when you close this tab.
              Create a free account to keep them.
            </p>
          </div>
          <div className="guest-nudge-actions">
            <Link href="/auth/register" className="btn">Create free account</Link>
            <button type="button" className="btn ghost" onClick={() => { nudgeDismissedRef.current = true; setShowGuestNudge(false); }}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Command Center Header */}
      <motion.div
        className="dash-header"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0.9, 0.3, 1] }}
      >
        <div className="dash-header-left">
          <div className="dash-greeting">{greeting}</div>
          <div
            className="dash-balance-hero"
            style={{ color: scopedBalance >= 0 ? 'var(--text-primary)' : 'var(--error)' }}
          >
            {scopedBalance >= 0 ? '+' : '−'}${Math.abs(scopedBalance).toFixed(2)}
          </div>
          <div className="dash-balance-label">
            {timeScope === 'month' ? `Net · ${now.toLocaleString('default', { month: 'long' })}` : 'Current balance'}
          </div>
          {healthLabel && (
            <div className={`dash-health-badge dash-health-badge--${healthStatus}`}>
              {healthStatus === 'good' && '↑ '}
              {healthStatus === 'warn' && '→ '}
              {healthStatus === 'bad' && '↓ '}
              {savingsRate}% {timeScope === 'month' ? 'monthly savings rate' : 'savings rate'} · {healthLabel}
            </div>
          )}
          {user && !previewGuest && onboarding?.goal && !goalProgress && (
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>
              Working toward: {onboarding.goal}
            </div>
          )}
        </div>

        <div className="dash-header-right">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <div className="toggle-group">
              <button
                type="button"
                aria-pressed={timeScope === 'month'}
                className={`toggle-btn ${timeScope === 'month' ? 'active' : ''}`}
                onClick={() => { setTimeScope('month'); setShowAllActivity(false); }}
                style={{ padding: '5px 13px', fontSize: 12 }}
              >This Month</button>
              <button
                type="button"
                aria-pressed={timeScope === 'all'}
                className={`toggle-btn ${timeScope === 'all' ? 'active' : ''}`}
                onClick={() => { setTimeScope('all'); setShowAllActivity(false); }}
                style={{ padding: '5px 13px', fontSize: 12 }}
              >All Time</button>
            </div>
          </div>
          <div className="dash-stats-mini">
            <div className="dash-stat-mini">
              <span>Income</span>
              <span className="tx-amount--income">+${(scopedTotals.income || 0).toFixed(2)}</span>
            </div>
            <div className="dash-stat-mini-divider" />
            <div className="dash-stat-mini">
              <span>Expenses</span>
              <span className="tx-amount--expense">−${(scopedTotals.expenses || 0).toFixed(2)}</span>
            </div>
          </div>
          {user && !previewGuest && (user.role === 'coach' || user.role === 'instructor') && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button
                className="btn secondary"
                style={{ fontSize: 12, padding: '7px 12px' }}
                onClick={() => { setPreviewGuest(true); setTimeout(() => setPreviewGuest(false), 120000); }}
              >
                Preview as guest (2m)
              </button>
              {previewGuest && (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Previewing as guest</span>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Two-column layout */}
      <div className="dash-layout">

        {/* Left: Activity + Add Form + Chart */}
        <div className="dash-main">

          {/* Activity feed */}
          <motion.div
            className="card card--static"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.08, ease: [0.2, 0.9, 0.3, 1] }}
          >
            <div className="card-header-row">
              <h3>Recent Activity</h3>
              {transactions.length > 0 && (
                <button
                  className="btn secondary"
                  style={{ padding: '6px 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  onClick={() => { setEditingTx(null); setAmounts({ income: '', expense: '' }); setDesc(''); setDate(localDate()); setShowForm(f => !f); }}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Add
                </button>
              )}
            </div>

            {scopedTransactions.length === 0 ? (
              transactions.length === 0 ? (
                isFirstRun ? (
                  <div style={{ padding: '4px 0 8px' }}>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>
                      Three steps to get the most out of ClearCents:
                    </div>

                    {/* Step 1 — Add transaction */}
                    <div className="onboard-step">
                      <div className="onboard-step-num">1</div>
                      <div className="onboard-step-body">
                        <div className="onboard-step-title">Add your first transaction</div>
                        <div className="onboard-step-desc">Your balance, goal ring, and AI insights all update automatically from your transactions.</div>
                        <button
                          type="button"
                          className="btn"
                          style={{ fontSize: 13, padding: '8px 18px', marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          onClick={() => setShowForm(true)}
                        >
                          <Plus size={14} strokeWidth={2.5} />
                          Add transaction
                        </button>
                      </div>
                    </div>

                    {/* Step 2 — Set a goal */}
                    <div className={`onboard-step${onboarding?.goal ? ' onboard-step--done' : ''}`}>
                      <div className={`onboard-step-num${onboarding?.goal ? ' onboard-step-num--done' : ''}`}>
                        {onboarding?.goal ? '✓' : '2'}
                      </div>
                      <div className="onboard-step-body">
                        <div className="onboard-step-title">
                          {onboarding?.goal ? `Goal set: ${onboarding.goal}` : 'Set a savings goal'}
                        </div>
                        {onboarding?.goal ? (
                          <div className="onboard-step-desc">Add transactions to start tracking your progress toward this goal.</div>
                        ) : (
                          <>
                            <div className="onboard-step-desc">Emergency Fund, Travel, New Phone — anything worth saving for. Your coach tracks progress toward it automatically.</div>
                            <Link
                              href="/auth/onboarding"
                              className="btn secondary"
                              style={{ fontSize: 13, padding: '8px 18px', marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                            >
                              Set a goal →
                            </Link>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Step 3 — AI Coach */}
                    <div className="onboard-step onboard-step--last">
                      <div className="onboard-step-num">3</div>
                      <div className="onboard-step-body">
                        <div className="onboard-step-title">Ask your AI Coach</div>
                        <div className="onboard-step-desc">Once you have a transaction, your coach gives personalized guidance on your spending, pace, and goals — open it from the AI Coach card on this dashboard.</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="tx-empty-state" role="status">
                    <div className="tx-empty-icon" aria-hidden="true">
                      <ClipboardList size={32} strokeWidth={1.5} style={{ opacity: 0.35 }} />
                    </div>
                    <p style={{ margin: '0 0 4px' }}>No transactions yet.</p>
                    <p className="tx-empty-hint">Log your first income or expense to start tracking your finances.</p>
                    <button className="btn" style={{ marginTop: 14 }} onClick={() => setShowForm(true)}>
                      <Plus size={15} strokeWidth={2.5} style={{ marginRight: 4 }} />
                      Add first transaction
                    </button>
                  </div>
                )
              ) : (
                <div className="tx-empty-state" role="status">
                  <div className="tx-empty-icon" aria-hidden="true">
                    <ClipboardList size={32} strokeWidth={1.5} style={{ opacity: 0.35 }} />
                  </div>
                  <p style={{ margin: '0 0 4px' }}>Nothing logged this month yet.</p>
                  <p className="tx-empty-hint">{`Add an income or expense to start tracking ${now.toLocaleString('default', { month: 'long' })}'s progress.`}</p>
                  <button
                    className="btn"
                    style={{ marginTop: 14 }}
                    onClick={() => setShowForm(true)}
                  >
                    <Plus size={15} strokeWidth={2.5} style={{ marginRight: 4 }} />
                    Add first transaction this month
                  </button>
                </div>
              )
            ) : (
              <div className="activity-feed">
                {(showAllActivity ? scopedTransactions : scopedTransactions.slice(0, 10)).map(tx => (
                  <div key={tx.id} className="activity-item">
                    <div className={`activity-dot activity-dot--${tx.type}`} aria-hidden="true" />
                    <div className="activity-body">
                      <span className="activity-desc">
                        {tx.description || <span style={{ opacity: 0.4 }}>—</span>}
                      </span>
                      <span className="activity-date">
                        {new Date(tx.occurredAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        {' · '}
                        {tx.type === 'income' ? 'Income' : 'Expense'}
                      </span>
                    </div>
                    <div className={`activity-amount ${tx.type === 'income' ? 'tx-amount--income' : 'tx-amount--expense'}`}>
                      {tx.type === 'income' ? '+' : '−'}${Number(tx.amount).toFixed(2)}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginLeft: 8, flexShrink: 0 }}>
                      {user && !String(tx.id).startsWith('local-') && confirmDeleteId !== tx.id && (
                        <button
                          type="button"
                          aria-label="Edit transaction"
                          onClick={() => startEdit(tx)}
                          style={{ fontSize: 11, padding: '2px 6px', background: 'none', color: 'var(--muted)', border: '1px solid var(--border-subtle)', borderRadius: 4, cursor: 'pointer', lineHeight: 1.4 }}
                        >Edit</button>
                      )}
                      {confirmDeleteId === tx.id ? (
                        <>
                          <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center', whiteSpace: 'nowrap' }}>Delete?</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(tx.id)}
                            style={{ fontSize: 11, padding: '2px 6px', background: '#f87171', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', lineHeight: 1.4 }}
                          >Yes</button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            style={{ fontSize: 11, padding: '2px 6px', background: 'none', color: 'var(--muted)', border: '1px solid var(--border-subtle)', borderRadius: 4, cursor: 'pointer', lineHeight: 1.4 }}
                          >No</button>
                        </>
                      ) : (
                        <button
                          type="button"
                          aria-label="Delete transaction"
                          onClick={() => setConfirmDeleteId(tx.id)}
                          style={{ fontSize: 11, padding: '2px 6px', background: 'none', color: 'var(--muted)', border: '1px solid var(--border-subtle)', borderRadius: 4, cursor: 'pointer', lineHeight: 1.4 }}
                        >✕</button>
                      )}
                    </div>
                  </div>
                ))}
                {scopedTransactions.length > 10 && (
                  <button
                    type="button"
                    onClick={() => setShowAllActivity(v => !v)}
                    style={{ display: 'block', width: '100%', marginTop: 10, padding: '8px 0', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--muted)', fontSize: 13, cursor: 'pointer', textAlign: 'center' }}
                  >
                    {showAllActivity
                      ? 'Show less'
                      : `Show all ${scopedTransactions.length} transactions`}
                  </button>
                )}
              </div>
            )}

            {/* Inline add/edit form — expands within the activity card */}
            <AnimatePresence>
              {showForm && (
                <motion.div
                  key="add-form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.26, ease: [0.2, 0.9, 0.3, 1] }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 16, paddingTop: 16 }}>
                    <div className="card-header-row" style={{ marginBottom: 14 }}>
                      <h3 style={{ margin: 0, fontSize: '1rem' }}>{editingTx ? 'Edit Transaction' : 'Add Transaction'}</h3>
                      <button
                        onClick={() => { setShowForm(false); setEditingTx(null); }}
                        aria-label="Close form"
                        style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
                      >
                        <X size={18} />
                      </button>
                    </div>
                    {!previewGuest && !user && !editingTx && (
                      <div className="muted-note" style={{ marginBottom: 12 }}>
                        Not signed in — transactions won&apos;t be saved.{' '}
                        <Link href="/auth">Sign in</Link>
                      </div>
                    )}
                    <form onSubmit={editingTx ? handleEdit : handleAdd} className="transaction-form">
                      <div className="form-row">
                        <label id="tx-type-label">Type</label>
                        <div className="toggle-group" role="group" aria-labelledby="tx-type-label">
                          <button type="button" aria-pressed={type === 'income'} onClick={() => setType('income')} className={`toggle-btn ${type === 'income' ? 'active' : ''}`}>Income</button>
                          <button type="button" aria-pressed={type === 'expense'} onClick={() => setType('expense')} className={`toggle-btn ${type === 'expense' ? 'active' : ''}`}>Expense</button>
                        </div>
                      </div>
                      <div className="form-row">
                        <label htmlFor="tx-amount">Amount</label>
                        <input
                          id="tx-amount"
                          value={amounts[type] || ''}
                          onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) setAmounts(prev => ({ ...prev, [type]: v })); }}
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          onWheel={e => e.currentTarget.blur()}
                          name="tx-amount"
                          autoComplete="off"
                          onKeyDown={e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
                        />
                      </div>
                      <div className="form-row">
                        <label htmlFor="tx-date">Date</label>
                        <input id="tx-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
                      </div>
                      <div className="form-row">
                        <label htmlFor="tx-category">Category</label>
                        <CategorySelect id="tx-category" categories={filteredCategories} value={categoryId} onChange={setCategoryId} placeholder="-- Select --" />
                      </div>
                      <div className="form-row">
                        <label htmlFor="tx-desc">Description</label>
                        <input id="tx-desc" value={desc} onChange={e => setDesc(e.target.value)} type="text" />
                      </div>
                      {txError && <div className="form-error" role="alert">{txError}</div>}
                      <div className="transaction-actions">
                        <button className="btn full" type="submit">{editingTx ? 'Save Changes' : 'Add Transaction'}</button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Monthly summary card — Phase 2 */}
          {timeScope === 'month' && scopedTransactions.length > 0 && (
            <motion.div
              className="card card--static"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.06, ease: [0.2, 0.9, 0.3, 1] }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 8 }}>
                {now.toLocaleString('default', { month: 'long' })} {now.getFullYear()}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: scopedBalance >= 0 ? 'var(--accent)' : 'var(--error)', marginBottom: 4 }}>
                {scopedBalance >= 0
                  ? `You saved $${scopedBalance.toFixed(0)} this month.`
                  : `You're $${Math.abs(scopedBalance).toFixed(0)} over budget this month.`}
              </div>
              {lastMonthTotals.expenses > 0 && scopedTotals.expenses > 0 && (() => {
                const diff = scopedTotals.expenses - lastMonthTotals.expenses;
                const pct = Math.round(Math.abs(diff / lastMonthTotals.expenses) * 100);
                if (pct === 0) return (
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Spending matches last month.</div>
                );
                return (
                  <div style={{ fontSize: 12, color: diff < 0 ? 'var(--accent)' : 'var(--muted)' }}>
                    {diff < 0 ? `Spending is down ${pct}% from last month.` : `Spending is up ${pct}% from last month.`}
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* Spending insight card */}
          {topCategory && (
            <motion.div
              className="card card--static"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.08, ease: [0.2, 0.9, 0.3, 1] }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 8 }}>
                Spending Breakdown
              </div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                {`Your largest expense category${timeScope === 'month' ? ' this month' : ''} is ${topCategory.name} ($${topCategory.amount.toFixed(0)}, ${topCategory.pct}% of spending).`}
              </div>
              {spendingConcentrated && (
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {`A large share of your spending is going toward ${topCategory.name}.`}
                </div>
              )}
            </motion.div>
          )}

          {/* Trend Insight card — month scope only, requires prior-month comparison data */}
          {timeScope === 'month' && hasTrendData && (
            <motion.div
              className="card card--static"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.09, ease: [0.2, 0.9, 0.3, 1] }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 8 }}>
                Trend Insight
              </div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                {trendInsights[0]}
              </div>
              {trendInsights[1] && (
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{trendInsights[1]}</div>
              )}
            </motion.div>
          )}

          {/* Consistency card */}
          {activeDaysMonth > 0 && (
            <motion.div
              className="card card--static"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.10, ease: [0.2, 0.9, 0.3, 1] }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 8 }}>
                Habit Streak
              </div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                {`You tracked your finances on ${activeDaysMonth} different day${activeDaysMonth !== 1 ? 's' : ''} this month.`}
              </div>
              {consistencyLabel && (
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{consistencyLabel}</div>
              )}
            </motion.div>
          )}

          {/* Spending chart */}
          {(scopedTransactions.length > 0 || transactions.length > 0) && (
            <motion.div
              className="card card--static"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.18 }}
            >
              <h3 style={{ textAlign: 'center', marginBottom: 4, color: 'var(--text-primary)' }}>Income vs. Expenses</h3>
              <div className="muted-note" style={{ textAlign: 'center', marginBottom: 4 }}>
                {scopedTransactions.length} transaction{scopedTransactions.length !== 1 ? 's' : ''} {timeScope === 'month' ? 'this month' : 'tracked'}
              </div>
              <SpendingBars income={scopedTotals.income || 0} expenses={scopedTotals.expenses || 0} />
            </motion.div>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="dash-sidebar">

          {/* Goal Ring */}
          {user && !previewGuest && (
            <motion.div
              className="card card--static"
              style={goalProgress?.percent >= 100 ? { borderColor: 'rgba(16,192,138,0.45)', background: 'linear-gradient(135deg, rgba(16,192,138,0.07), transparent)' } : undefined}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: 0.12, ease: [0.2, 0.9, 0.3, 1] }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 14 }}>
                Your Goal
              </div>
              {goalProgress ? (
                goalProgress.percent >= 100 ? (
                  <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
                    <div style={{ fontSize: 38, marginBottom: 10 }} aria-hidden="true">🎉</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent)', marginBottom: 4 }}>
                      Goal achieved!
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      {goalProgress.goal} completed.
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                      {`You saved $${goalProgress.target.toFixed(0)}`}
                      {goalProgress.goalAgeMonths > 0 && ` in ${Math.round(goalProgress.goalAgeMonths)} month${Math.round(goalProgress.goalAgeMonths) !== 1 ? 's' : ''}`}.
                    </div>
                    {onboarding && (onboarding.reasons?.length > 0 || onboarding.why) && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 16 }}>
                        {onboarding.reasons?.length > 0
                          ? `You said you wanted to ${onboarding.reasons[0].toLowerCase()}. Done.`
                          : `"${String(onboarding.why).slice(0, 80)}${String(onboarding.why).length > 80 ? '…' : ''}"`}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                      <Link href="/auth/onboarding" className="btn" style={{ fontSize: 13, padding: '8px 22px' }}>
                        Set your next goal
                      </Link>
                      <button
                        type="button"
                        className="btn ghost"
                        style={{ fontSize: 12, padding: '6px 18px' }}
                        onClick={() => loadGoals()}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <GoalRing percent={displayGoalProgress.percent} />
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 8 }}>
                        {displayGoalProgress.goal}
                      </div>
                      <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 15, marginBottom: 2 }}>
                        ${displayGoalProgress.current.toFixed(0)} saved
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        of ${displayGoalProgress.target.toFixed(0)} goal
                      </div>
                      {netExistingAssets > 0 && (
                        <div style={{ marginTop: 3, fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
                          Includes ${netExistingAssets.toFixed(0)} from existing accounts
                        </div>
                      )}
                      {displayGoalProgress.percent >= 75 && (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--accent)' }}>
                          Almost there — keep going!
                        </div>
                      )}
                      {displayGoalProgress.percent >= 50 && displayGoalProgress.percent < 75 && (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)' }}>
                          Halfway — solid progress!
                        </div>
                      )}
                      {displayGoalProgress.percent >= 25 && displayGoalProgress.percent < 50 && (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)' }}>
                          Great start — momentum matters.
                        </div>
                      )}
                      {goalProgress.monthlyTarget !== null && goalProgress.monthlyPaceActual > 0 && (
                        <div style={{ marginTop: 6, fontSize: 11, color: goalProgress.isOnTrack === false ? '#f87171' : 'var(--muted)', lineHeight: 1.4 }}>
                          {`$${Math.round(goalProgress.monthlyPaceActual)}/mo · `}
                          {goalProgress.isOnTrack === true && `Goal $${goalProgress.monthlyTarget}/mo · On track`}
                          {goalProgress.isOnTrack === false && `Need $${goalProgress.monthlyTarget}/mo · Slightly behind`}
                        </div>
                      )}
                      {goalProgress.monthsRemaining !== null && (
                        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--muted)' }}>
                          {goalProgress.monthsRemaining <= 1
                            ? 'Due this month'
                            : `${Math.round(goalProgress.monthsRemaining)} month${Math.round(goalProgress.monthsRemaining) !== 1 ? 's' : ''} left`}
                        </div>
                      )}
                      {goalProgress.monthsRemaining === null && goalProgress.monthlyPaceActual > 0 && displayGoalProgress.remainingAmount > 0 && (() => {
                        const months = Math.round(displayGoalProgress.remainingAmount / goalProgress.monthlyPaceActual);
                        if (months > 0 && months <= 60) {
                          return (
                            <div style={{ marginTop: 4, fontSize: 11, color: 'var(--muted)' }}>
                              {`~${months} month${months !== 1 ? 's' : ''} at current pace`}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                )
              ) : (
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>
                    No savings goal yet. Setting one lets your coach track your progress and give you more targeted feedback.
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {['Emergency Fund', 'New Phone', 'Laptop', 'Travel'].map(example => (
                      <div key={example} style={{ fontSize: 12, color: 'var(--muted)' }}>· {example}</div>
                    ))}
                  </div>
                  <Link href="/auth/onboarding" className="btn secondary" style={{ fontSize: 13, padding: '7px 14px', marginTop: 12, display: 'inline-block' }}>
                    Set a goal →
                  </Link>
                </div>
              )}
            </motion.div>
          )}

          {/* AI Coach — insight preview card, not a chat interface */}
          <motion.div
            className="card card--static"
            style={{ borderColor: 'rgba(16,192,138,0.16)', background: 'linear-gradient(135deg, rgba(16,192,138,0.05), transparent)' }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.13, ease: [0.2, 0.9, 0.3, 1] }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div className="coach-avatar" style={{ width: 34, height: 34, flexShrink: 0 }}>
                <Bot size={16} strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="coach-label" style={{ margin: 0 }}>AI Coach</div>
              </div>
              {insightLoading && (
                <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, margin: 0 }} aria-label="Generating insight…" />
              )}
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
              {coachInsightMsg}
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: 7 }}>
              {isFirstRun ? 'Topics to explore' : 'Things your coach can help with'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
              {(isFirstRun
                ? ['How budgeting and savings goals work', 'What to track and how often', 'How to build better money habits', 'When to start saving aggressively']
                : ['Am I saving enough?', 'Where is my money going?', 'Will I reach my goal?', 'How can I improve my budget?']
              ).map(q => (
                <div key={q} style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 7 }}>
                  <span style={{ color: 'var(--accent)', flexShrink: 0 }}>·</span>
                  <span>{q}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn"
              style={{ width: '100%', fontSize: 13 }}
              onClick={() => window.dispatchEvent(new CustomEvent('aicoach:open'))}
            >
              Open AI Coach
            </button>
          </motion.div>

          {/* Pace Coaching Card */}
          {paceContext && (
            <motion.div
              className="card card--static"
              style={paceContext === 'behind'
                ? { borderColor: 'rgba(248,113,113,0.30)', background: 'linear-gradient(135deg, rgba(248,113,113,0.05), transparent)' }
                : { borderColor: 'rgba(16,192,138,0.25)', background: 'linear-gradient(135deg, rgba(16,192,138,0.06), transparent)' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.14, ease: [0.2, 0.9, 0.3, 1] }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: paceContext === 'behind' ? '#f87171' : 'var(--accent)', marginBottom: 8 }}>
                Pace Check
              </div>
              {paceContext === 'behind' ? (
                <>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    You're slightly behind your savings pace.
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {`Saving $${Math.round(goalProgress.monthlyPaceActual)}/mo · Need $${Math.round(goalProgress.monthlyTarget)}/mo to stay on track.`}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    You're on pace to reach your goal.
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {`Current pace: $${Math.round(goalProgress.monthlyPaceActual)}/mo.`}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Financial Alerts — proactive events from the insight engine */}
          {insightAlerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.15, ease: [0.2, 0.9, 0.3, 1] }}
            >
              <FinancialAlerts alerts={insightAlerts} />
            </motion.div>
          )}

          {/* Financial Story — narrative from memory patterns */}
          {insightMemory && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.17, ease: [0.2, 0.9, 0.3, 1] }}
            >
              <FinancialStory memory={insightMemory} />
            </motion.div>
          )}

          {/* Top Opportunity — highest-ranked coaching action */}
          {insightOpportunities.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.19, ease: [0.2, 0.9, 0.3, 1] }}
            >
              <TopOpportunity opportunity={insightOpportunities[0]} />
            </motion.div>
          )}

          {/* Recommended Action — highest-priority action plan not yet accepted */}
          {insightActions.filter(a =>
            actionStatuses[a.id] !== 'dismissed' &&
            !financialActions.some(fa => fa.actionId === a.id && fa.status === 'active')
          ).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.21, ease: [0.2, 0.9, 0.3, 1] }}
            >
              <ActionCard
                action={insightActions.filter(a =>
                  actionStatuses[a.id] !== 'dismissed' &&
                  !financialActions.some(fa => fa.actionId === a.id && fa.status === 'active')
                )[0]}
                onAccept={user ? handleAcceptAction : undefined}
                onDismiss={(id) => setActionStatuses(prev => ({ ...prev, [id]: 'dismissed' }))}
              />
            </motion.div>
          )}

          {/* Action Center — persistent accepted and completed actions */}
          {user && financialActions.filter(a => ['active', 'completed'].includes(a.status)).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.23, ease: [0.2, 0.9, 0.3, 1] }}
            >
              <ActionCenter
                actions={financialActions}
                onComplete={(id) => handleUpdateAction(id, 'completed')}
                onDismiss={(id) => handleUpdateAction(id, 'dismissed')}
              />
            </motion.div>
          )}

          {/* Current Strategy — coordinated multi-action plan with progress tracking */}
          {user && insightStrategies.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.25, ease: [0.2, 0.9, 0.3, 1] }}
            >
              <StrategyCard strategy={insightStrategies[0]} />
            </motion.div>
          )}

          {/* Financial Review — structured recap of wins, concerns, and progress */}
          {user && insightReview && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.27, ease: [0.2, 0.9, 0.3, 1] }}
            >
              <FinancialReviewCard review={insightReview} />
            </motion.div>
          )}

          {/* Financial Roadmap — long-term destination plan with milestones and completion estimate */}
          {user && insightRoadmap && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.29, ease: [0.2, 0.9, 0.3, 1] }}
            >
              <FinancialRoadmapCard roadmap={insightRoadmap} />
            </motion.div>
          )}

        </div>
      </div>

      <AIChat paceContext={paceContext} activeDaysMonth={activeDaysMonth} hasSpendingData={scopedTotals.expenses > 0} hasTrendData={hasTrendData} hasTransactions={transactions.length > 0} />
    </>
  );
}
