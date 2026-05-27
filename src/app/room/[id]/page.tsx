'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { db } from '@/lib/firebase';
import { ref, onValue, set } from 'firebase/database';
import { Player, PlayerScore, calculateScores } from '@/lib/scoring';
import { playClick, playCoin, playCounter, playFanfare, playSuccess } from '@/lib/sounds';

// ─── Types ──────────────────────────────────────────────────────────────────
const PLAYER_COLORS = ['#c29b47','#e53e3e','#38a169','#3182ce','#805ad5','#dd6b20','#e91e8c','#00bcd4'];

const GOODS = [
  { key: 'apples'   as const, emoji: '🍎', color: '#e53e3e', perCard: 2, king: 20, queen: 10 },
  { key: 'cheese'   as const, emoji: '🧀', color: '#f6c90e', perCard: 3, king: 15, queen: 10 },
  { key: 'bread'    as const, emoji: '🍞', color: '#c4813b', perCard: 4, king: 15, queen: 10 },
  { key: 'chickens' as const, emoji: '🐔', color: '#e8a838', perCard: 4, king: 10, queen: 5  },
];

// ─── Counter component ───────────────────────────────────────────────────────
function GoodCounter({
  good, value, onChange, soundOn,
}: {
  good: typeof GOODS[number]; value: number; onChange: (v: number) => void; soundOn: boolean;
}) {
  const { t } = useTranslation();
  const dec = () => { if (soundOn) playCounter(false); onChange(Math.max(0, value - 1)); };
  const inc = () => { if (soundOn) playCounter(true);  onChange(value + 1); };
  return (
    <div className="good-card" style={{ '--card-color': good.color } as React.CSSProperties}>
      <span className="good-emoji">{good.emoji}</span>
      <span className="good-name" style={{ color: good.color }}>{t(`goods.${good.key}`)}</span>
      <span className="good-value">
        {good.perCard} {t('room.perCard')}<br />
        <span style={{ fontSize: '0.7rem' }}>👑{good.king} · 👸{good.queen}</span>
      </span>
      <div className="good-counter">
        <button type="button" className="counter-btn" onClick={dec}
          style={{ background: 'rgba(0,0,0,0.4)', color: 'var(--text)', border: '1px solid var(--border)' }}>−</button>
        <input
          type="number" min={0} value={value}
          onChange={e => onChange(Math.max(0, Number(e.target.value)))}
          className="counter-input"
          style={{ borderColor: value > 0 ? good.color : 'var(--border)' }}
        />
        <button type="button" className="counter-btn" onClick={inc}
          style={{ background: good.color, color: '#111', border: 'none' }}>+</button>
      </div>
    </div>
  );
}

// ─── Main Room Page ──────────────────────────────────────────────────────────
export default function RoomPage() {
  const params  = useParams();
  const router  = useRouter();
  const roomId  = params?.id as string;
  const { t, i18n } = useTranslation();

  const [players,   setPlayers]   = useState<Player[]>([]);
  const [results,   setResults]   = useState<PlayerScore[] | null>(null);
  const [myId]                    = useState(() => Math.random().toString(36).slice(2, 9));
  const [copied,    setCopied]    = useState(false);
  const [soundOn,   setSoundOn]   = useState(true);
  const [activeTab, setActiveTab] = useState<'score' | 'rules'>('score');

  // Form state
  const [name,       setName]       = useState('');
  const [playerColor,setPlayerColor]= useState(PLAYER_COLORS[0]);
  const [gold,       setGold]       = useState(0);
  const [apples,     setApples]     = useState(0);
  const [cheese,     setCheese]     = useState(0);
  const [bread,      setBread]      = useState(0);
  const [chickens,   setChickens]   = useState(0);
  const [contraband, setContraband] = useState(0);
  const [submitted,  setSubmitted]  = useState(false);

  const previewScore =
    Number(gold) + Number(contraband) +
    Number(apples) * 2 + Number(cheese) * 3 +
    Number(bread)  * 4 + Number(chickens) * 4;

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const toggleLang = () => {
    if (soundOn) playClick();
    const nl = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(nl);
    document.documentElement.dir = nl === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = nl;
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
    if (soundOn) playClick();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Firebase listener
  useEffect(() => {
    if (!roomId || !db) return;
    const roomRef = ref(db, `rooms/${roomId}`);
    return onValue(roomRef, snap => {
      const data = snap.val();
      if (!data) return;
      if (data.players) setPlayers(Object.values(data.players) as Player[]);
      if (data.status === 'finished' && data.players) {
        const scores = calculateScores(Object.values(data.players) as Player[]);
        setResults(scores);
        if (soundOn) setTimeout(playFanfare, 300);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const submitScore = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return;
    if (soundOn) playSuccess();
    const player: Player = {
      id: myId, name: name.trim(), gold: +gold || 0,
      apples: +apples || 0, cheese: +cheese || 0, bread: +bread || 0,
      chickens: +chickens || 0, contrabandValue: +contraband || 0,
    };
    if (db) {
      await set(ref(db, `rooms/${roomId}/players/${myId}`), { ...player, color: playerColor });
    } else {
      setPlayers(prev => [...prev.filter(p => p.id !== myId), player]);
    }
    setSubmitted(true);
  }, [myId, roomId, name, gold, apples, cheese, bread, chickens, contraband, playerColor, soundOn]);

  const handleCalculate = async () => {
    if (players.length < 2) return;
    if (soundOn) playFanfare();
    if (db) {
      await set(ref(db, `rooms/${roomId}/status`), 'finished');
    } else {
      setResults(calculateScores(players));
    }
  };

  const shareRoom = () => {
    if (soundOn) playClick();
    const url = `${window.location.origin}/room/${roomId}`;
    if (navigator.share) {
      navigator.share({ title: t('home.title'), text: `${t('room.shareCode')}: ${roomId}`, url });
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ─── Results Screen ─────────────────────────────────────────────────────────
  if (results) {
    return (
      <main className="container animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <button className="sound-toggle" onClick={() => setSoundOn(s => !s)}>
            {soundOn ? '🔊' : '🔇'}
          </button>
          <button className="lang-btn" onClick={toggleLang}>{i18n.language === 'ar' ? 'English' : 'عربي'}</button>
        </div>

        <div className="header" style={{ marginBottom: '1.5rem' }}>
          <div className="crown-icon">👑</div>
          <h1 style={{ fontSize: 'clamp(1.5rem,5vw,2.5rem)', marginTop: '0.5rem' }}>{t('results.title')}</h1>
          <p style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.1rem' }}>
            🎉 {results[0]?.name} — {t('results.congratulations')}
          </p>
        </div>

        {results.map((score, idx) => (
          <div
            key={score.id}
            className={`result-card ${idx === 0 ? 'winner' : ''}`}
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div className={`rank-badge ${idx < 3 ? `rank-${idx + 1}` : 'rank-n'}`}>
                {idx === 0 ? '👑' : idx + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: 'clamp(1rem,4vw,1.3rem)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {score.name}
                </h2>
                {(score.bonuses.king.length > 0 || score.bonuses.queen.length > 0) && (
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                    {score.bonuses.king.map(g => {
                      const gd = GOODS.find(x => x.key === g);
                      return <span key={`k${g}`} className="bonus-badge king">{gd?.emoji} 👑 {t(`goods.${g}`)}</span>;
                    })}
                    {score.bonuses.queen.map(g => {
                      const gd = GOODS.find(x => x.key === g);
                      return <span key={`q${g}`} className="bonus-badge queen">{gd?.emoji} 👸 {t(`goods.${g}`)}</span>;
                    })}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 'clamp(1.5rem,5vw,2rem)', fontWeight: 900, color: idx === 0 ? 'var(--gold)' : 'var(--primary)', fontFamily: 'var(--font-cinzel)' }}>
                  {score.totalScore}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('results.total')}</div>
              </div>
            </div>

            <div className="score-breakdown">
              {[
                { icon: '🪙', label: t('goods.gold'),       val: `${score.gold}`              },
                { icon: '🍎', label: t('goods.apples'),     val: `${score.apples}×2`          },
                { icon: '🧀', label: t('goods.cheese'),     val: `${score.cheese}×3`          },
                { icon: '🍞', label: t('goods.bread'),      val: `${score.bread}×4`           },
                { icon: '🐔', label: t('goods.chickens'),   val: `${score.chickens}×4`        },
                { icon: '🎭', label: t('goods.contraband'), val: `${score.contrabandValue}`   },
                ...(score.bonusPoints > 0 ? [{ icon: '⭐', label: t('results.bonus'), val: `+${score.bonusPoints}` }] : []),
              ].map(item => (
                <div key={item.label} className="score-item" style={item.icon === '⭐' ? { border: '1px solid rgba(255,215,0,0.3)' } : {}}>
                  <span className="score-item-icon">{item.icon}</span>
                  <span className="score-item-value" style={item.icon === '⭐' ? { color: 'var(--gold)' } : {}}>{item.val}</span>
                  {item.label}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('results.basePoints', { points: score.basePoints })}</span>
              {score.bonusPoints > 0 && <span style={{ color: 'var(--gold)' }}>{t('results.bonusPoints', { points: score.bonusPoints })}</span>}
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{t('results.totalScore', { score: score.totalScore })}</span>
            </div>
          </div>
        ))}

        <div style={{ textAlign: 'center', marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => { if (soundOn) playClick(); router.push('/'); }} id="play-again-btn">
            🎲 {t('results.playAgain')}
          </button>
          <button
            onClick={() => { if (soundOn) playClick(); navigator.share?.({ title: t('home.title'), text: `🏆 ${results[0]?.name} wins!` }); }}
            style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', boxShadow: 'none' }}
          >
            📤 Share
          </button>
        </div>

        <footer className="app-footer">⭐ By Moe 2026 ⭐</footer>
      </main>
    );
  }

  // ─── Room / Score Entry Screen ────────────────────────────────────────────
  return (
    <main className="container animate-fade-in">
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        {/* Room code */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.4rem 0.75rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('room.roomId')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '5px', color: 'var(--primary)', fontFamily: 'var(--font-cinzel)', lineHeight: 1.1 }}>
              {roomId}
            </div>
          </div>
          <button id="copy-btn" onClick={copyCode} style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border)', color: copied ? 'var(--primary)' : 'var(--text-muted)', boxShadow: 'none' }}>
            {copied ? '✓' : '📋'}
          </button>
          <button id="share-btn" onClick={shareRoom} style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', boxShadow: 'none' }}>
            📤
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className="sound-toggle" onClick={() => { setSoundOn(s => !s); }}>
            {soundOn ? '🔊' : '🔇'}
          </button>
          <button className="lang-btn" onClick={toggleLang}>{i18n.language === 'ar' ? 'English' : 'عربي'}</button>
        </div>
      </div>

      <div className="room-grid">
        {/* ── Score Input Form ─────────────────────────────────────────────── */}
        <div className="card card-elevated">
          {/* Tabs */}
          <div className="tab-row">
            <button className={`tab-btn ${activeTab === 'score' ? 'active' : ''}`} onClick={() => { setActiveTab('score'); if (soundOn) playClick(); }}>
              ⚔️ {t('room.addPlayer')}
            </button>
            <button className={`tab-btn ${activeTab === 'rules' ? 'active' : ''}`} onClick={() => { setActiveTab('rules'); if (soundOn) playClick(); }}>
              📜 {t('home.rulesTitle')}
            </button>
          </div>

          {/* ── Score tab ─────────────────────────────────────────────── */}
          {activeTab === 'score' && (
            <form onSubmit={submitScore}>
              {/* Name + Color */}
              <div className="input-group">
                <label>👤 {t('room.playerName')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="..."
                  id="player-name-input"
                  style={{ borderColor: playerColor }}
                />
              </div>

              {/* Color picker */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                {PLAYER_COLORS.map(c => (
                  <div
                    key={c}
                    className={`color-dot ${playerColor === c ? 'selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => { setPlayerColor(c); if (soundOn) playClick(); }}
                  />
                ))}
              </div>

              {/* Gold & Contraband */}
              <div className="gold-contraband-grid">
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>🪙 {t('room.gold')}</label>
                  <input
                    type="number" min={0} value={gold}
                    onChange={e => { setGold(+e.target.value); if (soundOn) playCoin(); }}
                    id="gold-input"
                    style={{ textAlign: 'center', fontSize: '1.3rem', fontWeight: 700 }}
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>🎭 {t('room.contraband')}</label>
                  <input
                    type="number" min={0} value={contraband}
                    onChange={e => setContraband(+e.target.value)}
                    id="contraband-input"
                    style={{ textAlign: 'center', fontSize: '1.3rem', fontWeight: 700, color: 'var(--contraband-color)' }}
                  />
                </div>
              </div>

              {/* Goods counters */}
              <div className="goods-grid" style={{ marginBottom: '1rem', marginTop: '0.25rem' }}>
                <GoodCounter good={GOODS[0]} value={apples}   onChange={setApples}   soundOn={soundOn} />
                <GoodCounter good={GOODS[1]} value={cheese}   onChange={setCheese}   soundOn={soundOn} />
                <GoodCounter good={GOODS[2]} value={bread}    onChange={setBread}    soundOn={soundOn} />
                <GoodCounter good={GOODS[3]} value={chickens} onChange={setChickens} soundOn={soundOn} />
              </div>

              {/* Live score preview */}
              <div style={{
                background: 'rgba(194,155,71,0.08)',
                border: '1px solid rgba(194,155,71,0.2)',
                borderRadius: '8px',
                padding: '0.6rem 1rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '1rem',
              }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {i18n.language === 'ar' ? 'نقاطك الأساسية (بدون مكافآت)' : 'Your base score (no bonuses)'}
                </span>
                <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-cinzel)' }}>
                  {previewScore}
                </span>
              </div>

              <button type="submit" id="submit-score-btn" style={{ width: '100%' }}>
                {submitted ? `✓ ${t('room.ready')}` : `💾 ${t('room.submitScore')}`}
              </button>
            </form>
          )}

          {/* ── Rules tab ─────────────────────────────────────────────── */}
          {activeTab === 'rules' && (
            <div>
              <div className="home-goods-grid">
                {GOODS.map(good => (
                  <div key={good.key} className="good-card" style={{ '--card-color': good.color } as React.CSSProperties}>
                    <span className="good-emoji">{good.emoji}</span>
                    <span className="good-name" style={{ color: good.color }}>{t(`goods.${good.key}`)}</span>
                    <span className="good-value">{good.perCard} {t('room.perCard')}</span>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <span className="bonus-badge king">👑 {good.king}</span>
                      <span className="bonus-badge queen">👸 {good.queen}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: '0.75rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <p>🪙 {t('goods.gold')} = 1 {t('room.perCard')}</p>
                <p>🎭 {t('goods.contraband')} = {t('goods.contrabandValue')}</p>
                <p style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>⚠️ {t('bonus.tieNote')}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Players Panel ─────────────────────────────────────────────────── */}
        <div>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '0.95rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>👥 {t('room.players')}</span>
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{players.length}</span>
            </h3>

            {players.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '0.75rem' }}>
                {t('room.noPlayers')}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {players.map(p => {
                  const color = (p as Player & { color?: string }).color ?? '#c29b47';
                  return (
                    <div key={p.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.5rem 0.75rem', borderRadius: '8px',
                      background: p.id === myId ? 'rgba(194,155,71,0.08)' : 'rgba(0,0,0,0.2)',
                      border: p.id === myId ? `1px solid ${color}40` : '1px solid transparent',
                      gap: '0.5rem',
                    }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ fontWeight: p.id === myId ? 700 : 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name} {p.id === myId ? '(أنت / You)' : ''}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--primary)', flexShrink: 0 }}>{t('room.ready')}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '0.75rem' }}>
            🔗 {t('room.shareCode')}
          </p>

          <button
            id="calculate-btn"
            onClick={handleCalculate}
            disabled={players.length < 2}
            style={{
              width: '100%',
              background: players.length >= 2 ? 'linear-gradient(135deg, #8c2a1c, #b53a28)' : 'var(--surface)',
              border: players.length >= 2 ? '1px solid #d44' : '1px solid var(--border)',
              color: players.length >= 2 ? '#fff' : 'var(--text-muted)',
              padding: '1rem', fontSize: '1rem',
            }}
          >
            🏆 {t('room.calculateScores')}
          </button>

          {players.length < 2 && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.4rem' }}>
              {i18n.language === 'ar' ? 'يحتاج لاعبَين على الأقل' : 'Need at least 2 players'}
            </p>
          )}
        </div>
      </div>

      <footer className="app-footer">⭐ By Moe 2026 ⭐</footer>
    </main>
  );
}
