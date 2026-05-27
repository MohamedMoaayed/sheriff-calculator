'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { db } from '@/lib/firebase';
import { ref, onValue, set } from 'firebase/database';
import { Player, PlayerScore, calculateScores } from '@/lib/scoring';

// ─── Good definitions ────────────────────────────────────────────────────────
const GOODS: {
  key: keyof Omit<Player, 'id' | 'name' | 'gold' | 'contrabandValue'>;
  labelKey: string;
  emoji: string;
  color: string;
  valueKey: string;
  perCard: number;
  king: number;
  queen: number;
}[] = [
  { key: 'apples',   labelKey: 'goods.apples',   emoji: '🍎', color: '#e53e3e', valueKey: 'goods.applesValue',   perCard: 2, king: 20, queen: 10 },
  { key: 'cheese',   labelKey: 'goods.cheese',   emoji: '🧀', color: '#f6c90e', valueKey: 'goods.cheeseValue',   perCard: 3, king: 15, queen: 10 },
  { key: 'bread',    labelKey: 'goods.bread',    emoji: '🍞', color: '#c4813b', valueKey: 'goods.breadValue',    perCard: 4, king: 15, queen: 10 },
  { key: 'chickens', labelKey: 'goods.chickens', emoji: '🐔', color: '#e8a838', valueKey: 'goods.chickensValue', perCard: 4, king: 10, queen: 5  },
];

// ─── Counter component ────────────────────────────────────────────────────────
function GoodCounter({
  good,
  value,
  onChange,
}: {
  good: typeof GOODS[number];
  value: number;
  onChange: (v: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="good-card" style={{ '--card-color': good.color } as React.CSSProperties}>
      <span className="good-emoji">{good.emoji}</span>
      <span className="good-name" style={{ color: good.color }}>{t(good.labelKey)}</span>
      <span className="good-value">
        {good.perCard} {t('room.perCard')}
        <br />
        <span style={{ fontSize: '0.72rem' }}>
          👑 {good.king} &nbsp; 👸 {good.queen}
        </span>
      </span>
      <div className="good-counter">
        <button
          type="button"
          className="counter-btn"
          onClick={() => onChange(Math.max(0, value - 1))}
          aria-label="decrease"
          style={{ background: 'rgba(0,0,0,0.4)', color: 'var(--text)', border: '1px solid var(--border)' }}
        >
          −
        </button>
        <input
          type="number"
          min={0}
          value={value}
          onChange={e => onChange(Math.max(0, Number(e.target.value)))}
          className="counter-input"
          style={{ borderColor: value > 0 ? good.color : 'var(--border)' }}
        />
        <button
          type="button"
          className="counter-btn"
          onClick={() => onChange(value + 1)}
          aria-label="increase"
          style={{ background: good.color, color: '#111', border: 'none' }}
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─── Main Room Page ───────────────────────────────────────────────────────────
export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.id as string;
  const { t, i18n } = useTranslation();

  const [players, setPlayers] = useState<Player[]>([]);
  const [results, setResults] = useState<PlayerScore[] | null>(null);
  const [myId] = useState(() => Math.random().toString(36).substring(2, 9));
  const [copied, setCopied] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [gold, setGold] = useState(0);
  const [apples, setApples] = useState(0);
  const [cheese, setCheese] = useState(0);
  const [bread, setBread] = useState(0);
  const [chickens, setChickens] = useState(0);
  const [contraband, setContraband] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  // Computed score preview
  const previewScore =
    Number(gold) +
    Number(contraband) +
    Number(apples) * 2 +
    Number(cheese) * 3 +
    Number(bread) * 4 +
    Number(chickens) * 4;

  useEffect(() => {
    const lang = i18n.language;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    if (!roomId || !db) return;
    const roomRef = ref(db, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, snapshot => {
      const data = snapshot.val();
      if (!data) return;
      if (data.players) {
        setPlayers(Object.values(data.players) as Player[]);
      }
      if (data.status === 'finished' && data.players) {
        setResults(calculateScores(Object.values(data.players) as Player[]));
      }
    });
    return () => unsubscribe();
  }, [roomId]);

  const submitScore = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return;
    const player: Player = {
      id: myId,
      name: name.trim(),
      gold: Number(gold) || 0,
      apples: Number(apples) || 0,
      cheese: Number(cheese) || 0,
      bread: Number(bread) || 0,
      chickens: Number(chickens) || 0,
      contrabandValue: Number(contraband) || 0,
    };

    if (db) {
      await set(ref(db, `rooms/${roomId}/players/${myId}`), player);
    } else {
      setPlayers(prev => {
        const others = prev.filter(p => p.id !== myId);
        return [...others, player];
      });
    }
    setSubmitted(true);
  }, [myId, roomId, name, gold, apples, cheese, bread, chickens, contraband]);

  const handleCalculate = async () => {
    if (players.length === 0) return;
    if (db) {
      await set(ref(db, `rooms/${roomId}/status`), 'finished');
    } else {
      setResults(calculateScores(players));
    }
  };

  // ── Results Screen ──────────────────────────────────────────────────────────
  if (results) {
    return (
      <main className="container animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button className="lang-btn" onClick={toggleLanguage}>
            {i18n.language === 'ar' ? 'English' : 'عربي'}
          </button>
        </div>

        <div className="header">
          <div className="crown-icon">👑</div>
          <h1 style={{ fontSize: '2rem', marginTop: '0.5rem' }}>{t('results.title')}</h1>
          <p style={{ color: 'var(--primary)', fontWeight: 700 }}>{results[0]?.name} — {t('results.congratulations')}</p>
        </div>

        {results.map((score, index) => (
          <div
            key={score.id}
            className={`result-card ${index === 0 ? 'winner' : ''}`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div className={`rank-badge ${index < 3 ? `rank-${index + 1}` : 'rank-n'}`}>
                {index === 0 ? '👑' : index + 1}
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{score.name}</h2>
                {(score.bonuses.king.length > 0 || score.bonuses.queen.length > 0) && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                    {score.bonuses.king.map(g => {
                      const good = GOODS.find(gd => gd.key === g);
                      return (
                        <span key={`k-${g}`} className="bonus-badge king">
                          {good?.emoji} 👑 {t(`goods.${g}`)}
                        </span>
                      );
                    })}
                    {score.bonuses.queen.map(g => {
                      const good = GOODS.find(gd => gd.key === g);
                      return (
                        <span key={`q-${g}`} className="bonus-badge queen">
                          {good?.emoji} 👸 {t(`goods.${g}`)}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: index === 0 ? 'var(--gold)' : 'var(--primary)', fontFamily: 'var(--font-cinzel)' }}>
                  {score.totalScore}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('results.total')}</div>
              </div>
            </div>

            {/* Score breakdown grid */}
            <div className="score-breakdown">
              <div className="score-item">
                <span className="score-item-icon">🪙</span>
                <span className="score-item-value">{score.gold}</span>
                {t('goods.gold')}
              </div>
              <div className="score-item">
                <span className="score-item-icon">🍎</span>
                <span className="score-item-value">{score.apples} ×2</span>
                {t('goods.apples')}
              </div>
              <div className="score-item">
                <span className="score-item-icon">🧀</span>
                <span className="score-item-value">{score.cheese} ×3</span>
                {t('goods.cheese')}
              </div>
              <div className="score-item">
                <span className="score-item-icon">🍞</span>
                <span className="score-item-value">{score.bread} ×4</span>
                {t('goods.bread')}
              </div>
              <div className="score-item">
                <span className="score-item-icon">🐔</span>
                <span className="score-item-value">{score.chickens} ×4</span>
                {t('goods.chickens')}
              </div>
              <div className="score-item">
                <span className="score-item-icon">🎭</span>
                <span className="score-item-value">{score.contrabandValue}</span>
                {t('goods.contraband')}
              </div>
              {score.bonusPoints > 0 && (
                <div className="score-item" style={{ borderColor: 'var(--gold)', border: '1px solid rgba(255,215,0,0.3)' }}>
                  <span className="score-item-icon">⭐</span>
                  <span className="score-item-value" style={{ color: 'var(--gold)' }}>+{score.bonusPoints}</span>
                  {t('results.bonus')}
                </div>
              )}
            </div>

            {/* Sub-total bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('results.basePoints', { points: score.basePoints })}</span>
              {score.bonusPoints > 0 && <span style={{ color: 'var(--gold)' }}>{t('results.bonusPoints', { points: score.bonusPoints })}</span>}
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{t('results.totalScore', { score: score.totalScore })}</span>
            </div>
          </div>
        ))}

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button onClick={() => router.push('/')} id="play-again-btn">
            🎲 {t('results.playAgain')}
          </button>
        </div>
      </main>
    );
  }

  // ── Room / Scoring Screen ─────────────────────────────────────────────────
  return (
    <main className="container animate-fade-in">
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
          }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{t('room.roomId')}</span>
            <span style={{ color: 'var(--primary)', fontSize: '1.6rem', fontWeight: 900, letterSpacing: '4px', display: 'block', fontFamily: 'var(--font-cinzel)' }}>
              {roomId}
            </span>
          </div>
          <button
            id="copy-code-btn"
            onClick={copyCode}
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', background: 'transparent', border: '1px solid var(--border)', color: copied ? 'var(--primary)' : 'var(--text-muted)', boxShadow: 'none' }}
          >
            {copied ? `✓ ${t('room.copied')}` : `📋 ${t('room.copyCode')}`}
          </button>
        </div>
        <button className="lang-btn" onClick={toggleLanguage}>
          {i18n.language === 'ar' ? 'English' : 'عربي'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 320px)', gap: '1.5rem', alignItems: 'start' }}>

        {/* ─ Score Input Form ─────────────────────────────────────────────── */}
        <div className="card card-elevated">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>⚔️ {t('room.addPlayer')}</h2>

          <form onSubmit={submitScore}>
            {/* Name */}
            <div className="input-group">
              <label>👤 {t('room.playerName')}</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="..."
                id="player-name-input"
              />
            </div>

            {/* Gold & Contraband */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>🪙 {t('room.gold')}</label>
                <input
                  type="number"
                  min={0}
                  value={gold}
                  onChange={e => setGold(Number(e.target.value))}
                  id="gold-input"
                  style={{ textAlign: 'center', fontSize: '1.3rem', fontWeight: 700 }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('room.goldHint')}</span>
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>🎭 {t('room.contraband')}</label>
                <input
                  type="number"
                  min={0}
                  value={contraband}
                  onChange={e => setContraband(Number(e.target.value))}
                  id="contraband-input"
                  style={{ textAlign: 'center', fontSize: '1.3rem', fontWeight: 700, color: 'var(--contraband-color)' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('room.contrabandHint')}</span>
              </div>
            </div>

            {/* Goods grid with counters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <GoodCounter good={GOODS[0]} value={apples}   onChange={setApples} />
              <GoodCounter good={GOODS[1]} value={cheese}   onChange={setCheese} />
              <GoodCounter good={GOODS[2]} value={bread}    onChange={setBread} />
              <GoodCounter good={GOODS[3]} value={chickens} onChange={setChickens} />
            </div>

            {/* Live score preview */}
            <div style={{
              background: 'rgba(194,155,71,0.08)',
              border: '1px solid rgba(194,155,71,0.2)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>النقاط الأساسية (بدون مكافآت)</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-cinzel)' }}>
                {previewScore}
              </span>
            </div>

            <button
              type="submit"
              id="submit-score-btn"
              style={{ width: '100%' }}
            >
              {submitted ? `✓ ${t('room.ready')}` : `💾 ${t('room.submitScore')}`}
            </button>
          </form>
        </div>

        {/* ─ Players panel + Calculate ─────────────────────────────────────── */}
        <div>
          {/* Players list */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>👥 {t('room.players')}</span>
              <span style={{ color: 'var(--primary)' }}>{players.length}</span>
            </h3>

            {players.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>
                {t('room.noPlayers')}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {players.map(p => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      background: p.id === myId ? 'rgba(194,155,71,0.08)' : 'rgba(0,0,0,0.2)',
                      border: p.id === myId ? '1px solid rgba(194,155,71,0.3)' : '1px solid transparent',
                    }}
                  >
                    <span style={{ fontWeight: p.id === myId ? 700 : 400 }}>
                      {p.name} {p.id === myId ? '(أنت)' : ''}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>{t('room.ready')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Share hint */}
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1rem' }}>
            🔗 {t('room.shareCode')}
          </p>

          {/* Calculate button */}
          <button
            id="calculate-btn"
            onClick={handleCalculate}
            disabled={players.length < 2}
            style={{
              width: '100%',
              background: players.length >= 2
                ? 'linear-gradient(135deg, #8c2a1c, #b53a28)'
                : 'var(--surface)',
              border: players.length >= 2 ? '1px solid #d44' : '1px solid var(--border)',
              color: players.length >= 2 ? '#fff' : 'var(--text-muted)',
              padding: '1rem',
              fontSize: '1rem',
            }}
          >
            🏆 {t('room.calculateScores')}
          </button>
          {players.length < 2 && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
              {i18n.language === 'ar' ? 'يحتاج للاعبَين على الأقل' : 'Need at least 2 players'}
            </p>
          )}
        </div>

      </div>
    </main>
  );
}
