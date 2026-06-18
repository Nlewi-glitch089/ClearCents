"use client";
import { useState, useRef, useEffect } from 'react';
import Icon from './Icon';

function iconFor(name) {
  if (!name) return 'dot';
  const n = name.toLowerCase();
  if (n.includes('pay') || n.includes('job') || n.includes('salary') || n.includes('wage')) return 'briefcase';
  if (n.includes('allow')) return 'wallet';
  if (n.includes('gift')) return 'gift';
  if (n.includes('side') || n.includes('hustle')) return 'rocket';
  if (n.includes('saving') || n.includes('goal')) return 'target';
  if (n.includes('food')) return 'utensils';
  if (n.includes('transport')) return 'bus';
  if (n.includes('entertain')) return 'gamepad';
  if (n.includes('subscript')) return 'repeat';
  if (n.includes('other')) return 'more-horizontal';
  return 'more-horizontal';
}

export default function CategorySelect({ categories = [], value, onChange, placeholder='-- Select --', id }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const optionRefs = useRef([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  useEffect(() => {
    if (open) {
      // set focused index to selected or first
      const selIndex = categories.findIndex(c => c.id === value);
      setFocusedIndex(selIndex >= 0 ? selIndex : (categories.length ? 0 : -1));
    } else {
      setFocusedIndex(-1);
    }
  }, [open, categories, value]);

  // keyboard navigation when open
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(i => {
          const next = (i + 1) % categories.length;
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(i => {
          const next = (i - 1 + categories.length) % categories.length;
          return next;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedIndex >= 0 && categories[focusedIndex]) {
          onChange(categories[focusedIndex].id);
          setOpen(false);
        }
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, categories, focusedIndex, onChange]);

  useEffect(() => {
    if (focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      optionRefs.current[focusedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      // focus for assistive tech
      optionRefs.current[focusedIndex].focus && optionRefs.current[focusedIndex].focus();
    }
  }, [focusedIndex]);

  const selected = categories.find(c => c.id === value);

  return (
    <div className="custom-select" ref={ref} style={{position:'relative'}}>
      <button type="button" id={id} className="card" onClick={() => setOpen(o => !o)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',width:'100%'}} aria-haspopup="listbox" aria-expanded={open}>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          {selected ? (
            <>
              <div className={`feature-icon ${selected.type ? (selected.type==='income' ? 'cat-income' : 'cat-expense') : ''}`} style={{width:36,height:36,borderRadius:8}} aria-hidden>
                <Icon name={iconFor(selected.name)} />
              </div>
              <div>
                <div style={{fontWeight:700}}>{selected.name}</div>
              </div>
            </>
          ) : (
            <div style={{color:'var(--muted)'}}>{placeholder}</div>
          )}
        </div>
        <div style={{opacity:0.8}}>{open ? '▴' : '▾'}</div>
      </button>

      {open && (
        <div className="card" role="listbox" aria-activedescendant={focusedIndex >= 0 && categories[focusedIndex] ? `option-${categories[focusedIndex].id}` : undefined} style={{position:'absolute',left:0,right:0,top:'100%',zIndex:40,maxHeight:220,overflow:'auto',marginTop:8,padding:8}}>
          {categories.length === 0 && <div style={{padding:12,color:'var(--muted)'}}>No categories</div>}
          {categories.map((c, idx) => (
            <div
              id={`option-${c.id}`}
              key={c.id}
              role="option"
              aria-selected={value === c.id}
              ref={el => optionRefs.current[idx] = el}
              tabIndex={-1}
              onClick={() => { onChange(c.id); setOpen(false); }}
              onKeyDown={(e)=>{ if (e.key==='Enter') { onChange(c.id); setOpen(false);} }}
              className={focusedIndex === idx ? 'option-focused' : ''}
              style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',cursor:'pointer',borderRadius:6,marginBottom:6,background:'transparent',outline:focusedIndex===idx ? '2px solid rgba(62,166,255,0.16)' : 'none'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div className={`feature-icon ${c.type ? (c.type==='income' ? 'cat-income' : 'cat-expense') : ''}`} style={{width:36,height:36,borderRadius:8}} aria-hidden>
                  <Icon name={iconFor(c.name)} />
                </div>
                <div>
                  <div style={{fontWeight:700}}>{c.name}</div>
                </div>
              </div>
              <div style={{fontSize:13,opacity:0.8}}>{value === c.id ? '✓' : ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
