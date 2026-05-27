'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Player } from '@/lib/scoring';
import { playClick, playCounter } from '@/lib/sounds';
import { useToast } from '@/components/ToastProvider';

type PlayerWithColor = Player & { color?: string };

const GOODS = [
  { key: 'apples'    as const, emoji: '🍎', color: '#e53e3e', label: 'تفاح / Apples'   },
  { key: 'cheese'    as const, emoji: '🧀', color: '#f6c90e', label: 'جبن / Cheese'    },
  { key: 'bread'     as const, emoji: '🍞', color: '#c4813b', label: 'خبز / Bread'     },
  { key: 'chickens'  as const, emoji: '🐔', color: '#e8a838', label: 'دجاج / Chickens' },
];

type Counts = { apples: number; cheese: number; bread: number; chickens: number; gold: number; contraband: number };
type Result = { key: string; emoji: string; declared: number; actual: number; match: boolean };

export default function VerifyPage() {
  const params   = useParams();
  const router   = useRouter();
  const roomId   = params?.roomId as string;
  const { i18n } = useTranslation();
  const toast    = useToast();
  const ar       = i18n.language === 'ar';

  const [players,  setPlayers]  = useState<PlayerWithColor[]>([]);
  const [selected, setSelected] = useState<PlayerWithColor | null>(null);
  const [counts,   setCounts]   = useState<Counts>({ apples: 0, cheese: 0, bread: 0, chickens: 0, gold: 0, contraband: 0 });
  const [results,  setResults]  = useState<Result[] | null>(null);
  const [cheating, setCheating] = useState(false);

  useEffect(() => {
    document.documentElement.dir = ar ? 'rtl' : 'ltr';
  }, [ar]);

  // Load players from Firebase or localStorage
  useEffect(() => {
    if (!roomId) return;
    if (db) {
      return onValue(ref(db, `rooms/${roomId}/players`), snap => {
        const data = snap.val();
        if (data) setPlayers(Object.values(data) as PlayerWithColor[]);
      });
    }
  }, [roomId]);

  const selectPlayer = (p: PlayerWithColor) => {
    setSelected(p);
    setCounts({ apples: 0, cheese: 0, bread: 0, chickens: 0, gold: 0, contraband: 0 });
    setResults(null);
    if (playClick) playClick();
  };

  const verify = () => {
    if (!selected) return;
    const checks: Result[] = [
      { key: 'apples',    emoji: '🍎', declared: selected.apples,          actual: counts.apples,    match: selected.apples          === counts.apples    },
      { key: 'cheese',    emoji: '🧀', declared: selected.cheese,          actual: counts.cheese,    match: selected.cheese          === counts.cheese    },
      { key: 'bread',     emoji: '🍞', declared: selected.bread,           actual: counts.bread,     match: selected.bread           === counts.bread     },
      { key: 'chickens',  emoji: '🐔', declared: selected.chickens,        actual: counts.chickens,  match: selected.chickens        === counts.chickens  },
      { key: 'gold',      emoji: '🪙', declared: selected.gold,            actual: counts.gold,      match: selected.gold            === counts.gold      },
      { key: 'contraband',emoji: '🎭', declared: selected.contrabandValue, actual: counts.contraband,match: selected.contrabandValue === counts.contraband},
    ];
    const isCheating = checks.some(c => !c.match);
    setResults(checks);
    setCheating(isCheating);
    if (isCheating) {
      toast(ar ? `⚠️ ${selected.name} يغش!` : `⚠️ ${selected.name} is cheating!`, '🚨');
    } else {
      toast(ar ? `✅ ${selected.name} نظيف!` : `✅ ${selected.name} is clean!`, '✅');
    }
  };

  const adj = (key: keyof Counts, delta: number) => {
    setCounts(c => ({ ...c, [key]: Math.max(0, c[key] + delta) }));
    playCounter(delta > 0);
  };

  return (
    <main className="container animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', width: '100%' }}>
        <button onClick={() => { playClick(); router.back(); }}
          style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', boxShadow: 'none', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
          ← {ar ? 'رجوع' : 'Back'}
        </button>
        <button onClick={() => { playClick(); router.push('/'); }}
          style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', boxShadow: 'none', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
          🏠 {ar ? 'الرئيسية' : 'Home'}
        </button>
      </div>

      {/* Sheriff Inspector image */}
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', marginBottom: '1.5rem', maxHeight: 200 }}>
        <img src="/images/sheriff-inspector.png" alt="Sheriff Inspector" style={{ width: '100%', height: 200, objectFit: 'cover', objectPosition: 'top' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(18,16,14,0.95))', display: 'flex', alignItems: 'flex-end', padding: '1rem 1.25rem' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.3rem,5vw,2rem)', margin: 0 }}>
              🔍 {ar ? 'تفتيش الحقائب' : 'Card Inspection'}
            </h1>
            <p style={{ color: 'var(--primary)', fontSize: '0.85rem', margin: 0, marginTop: '0.25rem' }}>
              {ar ? 'تحقق من بطاقات اللاعبين لمنع الغش' : 'Count another player\'s cards to catch cheaters'}
            </p>
          </div>
        </div>
      </div>

      {/* Step 1 — pick a player */}
      {!selected && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-muted)' }}>
            👤 {ar ? 'اختر اللاعب الذي تريد تفتيشه:' : 'Select the player to inspect:'}
          </h3>
          {players.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              {ar ? 'لا يوجد لاعبون بعد' : 'No players found'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {players.map(p => (
                <button key={p.id} onClick={() => selectPlayer(p)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.25)', border: `1px solid ${p.color ?? 'var(--border)'}40`, borderRadius: 10, color: 'var(--text)', textAlign: 'start', boxShadow: 'none', justifyContent: 'flex-start', textTransform: 'none', letterSpacing: 0, fontSize: '1rem', fontWeight: 600 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: p.color ?? '#c29b47', flexShrink: 0 }} />
                  {p.name}
                  <span style={{ marginInlineStart: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {ar ? 'افتحش →' : 'Inspect →'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2 — count cards */}
      {selected && !results && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.3)', borderRadius: 12, border: `1px solid ${selected.color ?? 'var(--border)'}60` }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: selected.color ?? '#c29b47' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{selected.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {ar ? 'أدخل ما تعدّه فعلياً من بطاقاته' : 'Count the actual cards in their bag'}
              </div>
            </div>
            <button onClick={() => setSelected(null)}
              style={{ marginInlineStart: 'auto', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', boxShadow: 'none', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
              ✕
            </button>
          </div>

          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              📦 {ar ? 'عدد البطاقات الفعلية:' : 'Actual card count:'}
            </h3>

            {[
              ...GOODS.map(g => ({ key: g.key, emoji: g.emoji, color: g.color, label: g.label })),
              { key: 'gold' as const,      emoji: '🪙', color: '#c29b47', label: 'ذهب / Gold'        },
              { key: 'contraband' as const,emoji: '🎭', color: '#9c59b6', label: 'مهرب / Contraband' },
            ].map(item => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '1.3rem', width: 32, textAlign: 'center' }}>{item.emoji}</span>
                <span style={{ flex: 1, fontSize: '0.9rem', color: item.color }}>{item.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button type="button" onClick={() => adj(item.key as keyof Counts, -1)}
                    style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)', color: 'var(--text)', padding: 0, boxShadow: 'none', minHeight: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    aria-label="Decrease">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                  <span style={{ width: 28, textAlign: 'center', fontWeight: 700, fontSize: '1.1rem', fontFamily: 'var(--font-cinzel)', color: counts[item.key as keyof Counts] > 0 ? item.color : 'var(--text-muted)' }}>
                    {counts[item.key as keyof Counts]}
                  </span>
                  <button type="button" onClick={() => adj(item.key as keyof Counts, 1)}
                    style={{ width: 32, height: 32, borderRadius: '50%', background: item.color, border: 'none', color: '#111', padding: 0, boxShadow: 'none', minHeight: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    aria-label="Increase">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button onClick={verify} style={{ width: '100%', background: 'linear-gradient(135deg, #8c2a1c, #b53a28)', border: '1px solid #d44', color: '#fff', fontSize: '1.05rem', padding: '1rem' }}>
            🔍 {ar ? 'افتحص الآن' : 'Inspect Now'}
          </button>
        </div>
      )}

      {/* Step 3 — results */}
      {selected && results && (
        <div>
          {/* Verdict */}
          <div style={{ textAlign: 'center', marginBottom: '1.25rem', padding: '1.5rem', borderRadius: 16, background: cheating ? 'rgba(220,53,69,0.12)' : 'rgba(56,161,105,0.12)', border: `2px solid ${cheating ? '#dc3545' : '#38a169'}` }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>{cheating ? '🚨' : '✅'}</div>
            <h2 style={{ fontSize: 'clamp(1.2rem,5vw,1.8rem)', color: cheating ? '#e53e3e' : '#38a169', marginBottom: '0.3rem' }}>
              {cheating
                ? (ar ? `${selected.name} يغش!` : `${selected.name} is CHEATING!`)
                : (ar ? `${selected.name} نظيف!` : `${selected.name} is CLEAN!`)
              }
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {cheating
                ? (ar ? 'البطاقات المعلنة لا تطابق ما تم عده فعلياً' : 'Declared cards do not match the actual count')
                : (ar ? 'البطاقات المعلنة تطابق ما تم عده فعلياً' : 'All declared cards match the actual count')
              }
            </p>
          </div>

          {/* Comparison table */}
          <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '0.4rem', marginBottom: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>
              <span>{ar ? 'البضاعة' : 'Item'}</span>
              <span style={{ textAlign: 'center' }}>{ar ? 'معلن' : 'Declared'}</span>
              <span style={{ textAlign: 'center' }}>{ar ? 'فعلي' : 'Actual'}</span>
              <span style={{ textAlign: 'center' }}>{ar ? 'نتيجة' : 'Result'}</span>
            </div>
            {results.map(r => (
              <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '0.4rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', alignItems: 'center', background: !r.match ? 'rgba(220,53,69,0.07)' : 'transparent', borderRadius: 6 }}>
                <span style={{ fontSize: '0.9rem' }}>
                  {r.emoji} {r.key === 'apples' ? (ar ? 'تفاح' : 'Apples') : r.key === 'cheese' ? (ar ? 'جبن' : 'Cheese') : r.key === 'bread' ? (ar ? 'خبز' : 'Bread') : r.key === 'chickens' ? (ar ? 'دجاج' : 'Chickens') : r.key === 'gold' ? (ar ? 'ذهب' : 'Gold') : (ar ? 'مهرب' : 'Contraband')}
                </span>
                <span style={{ textAlign: 'center', fontWeight: 700, fontFamily: 'var(--font-cinzel)', color: 'var(--text)' }}>{r.declared}</span>
                <span style={{ textAlign: 'center', fontWeight: 700, fontFamily: 'var(--font-cinzel)', color: !r.match ? '#e53e3e' : '#38a169' }}>{r.actual}</span>
                <span style={{ textAlign: 'center', fontSize: '1.2rem' }}>{r.match ? '✅' : '❌'}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button onClick={() => { setSelected(null); setResults(null); setCheating(false); }}
              style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', boxShadow: 'none' }}>
              🔄 {ar ? 'فتش لاعب آخر' : 'Inspect Another'}
            </button>
            <button onClick={() => { playClick(); router.back(); }}
              style={{ flex: 1 }}>
              ✓ {ar ? 'تم' : 'Done'}
            </button>
          </div>
        </div>
      )}

      <footer className="app-footer">⭐ By Moe 2026 ⭐</footer>
    </main>
  );
}
