'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { getHistory, clearHistory, GameRecord } from '@/lib/storage';
import { playClick } from '@/lib/sounds';

function formatDate(ts: number, lang: string) {
  return new Date(ts).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function HistoryPage() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const [history, setHistory] = useState<GameRecord[]>([]);

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    setHistory(getHistory());
  }, [i18n.language]);

  const handleClear = () => {
    if (confirm(i18n.language === 'ar' ? 'هل تريد مسح كل السجلات؟' : 'Clear all history?')) {
      clearHistory();
      setHistory([]);
    }
  };

  const rankEmoji = (rank: number) => rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

  return (
    <main className="container animate-fade-in">
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button
          onClick={() => { playClick(); router.push('/'); }}
          style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', boxShadow: 'none', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
        >
          ← {i18n.language === 'ar' ? 'رجوع' : 'Back'}
        </button>
        {history.length > 0 && (
          <button
            onClick={handleClear}
            style={{ background: 'transparent', border: '1px solid #8c2a1c', color: '#e53e3e', boxShadow: 'none', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
          >
            🗑️ {i18n.language === 'ar' ? 'مسح الكل' : 'Clear All'}
          </button>
        )}
      </div>

      <div className="header" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.5rem,5vw,2.5rem)' }}>
          📜 {i18n.language === 'ar' ? 'سجل الألعاب' : 'Game History'}
        </h1>
      </div>

      {history.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏰</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
            {i18n.language === 'ar' ? 'لا توجد ألعاب سابقة بعد' : 'No games played yet'}
          </p>
        </div>
      ) : (
        history.map((game) => (
          <div key={game.id} className="card" style={{ marginBottom: '0.75rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  📅 {formatDate(game.date, i18n.language)} &nbsp;·&nbsp; ⏱️ {formatDuration(game.duration)}
                </div>
                <div style={{ fontWeight: 700, color: 'var(--primary)', marginTop: '0.2rem', fontFamily: 'var(--font-cinzel)' }}>
                  👑 {game.winner}
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                # {game.roomId}
              </div>
            </div>

            {/* Players */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {game.players.map(p => (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.35rem 0.6rem', borderRadius: '6px',
                  background: p.rank === 1 ? 'rgba(255,215,0,0.06)' : 'rgba(0,0,0,0.2)',
                  border: p.rank === 1 ? '1px solid rgba(255,215,0,0.2)' : '1px solid transparent',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.85rem' }}>{rankEmoji(p.rank)}</span>
                    <span style={{ fontWeight: p.rank === 1 ? 700 : 400 }}>{p.name}</span>
                  </span>
                  <span style={{ color: 'var(--primary)', fontWeight: 700, fontFamily: 'var(--font-cinzel)' }}>
                    {p.totalScore}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
      <footer className="app-footer">⭐ By Mohammed Moaayed 2026 ⭐</footer>
    </main>
  );
}
