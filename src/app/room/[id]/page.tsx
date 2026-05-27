'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { db } from '@/lib/firebase';
import { ref, onValue, set } from 'firebase/database';
import { Player, PlayerScore, calculateScores } from '@/lib/scoring';
import { playClick, playCoin, playCounter, playFanfare, playSuccess, playTickSound, playGong, startBgMusic, stopBgMusic } from '@/lib/sounds';
import { saveGame, upsertProfile, updateProfileStats, getSavedNames } from '@/lib/storage';
import { useToast } from '@/components/ToastProvider';
import Confetti from '@/components/Confetti';
import AnimatedNumber from '@/components/AnimatedNumber';
import QRCode from '@/components/QRCode';

// ─── Constants ───────────────────────────────────────────────────────────────
const PLAYER_COLORS = ['#c29b47','#e53e3e','#38a169','#3182ce','#805ad5','#dd6b20','#e91e8c','#00bcd4'];

const GOODS = [
  { key: 'apples'   as const, emoji: '🍎', color: '#e53e3e', perCard: 2, king: 20, queen: 10 },
  { key: 'cheese'   as const, emoji: '🧀', color: '#f6c90e', perCard: 3, king: 15, queen: 10 },
  { key: 'bread'    as const, emoji: '🍞', color: '#c4813b', perCard: 4, king: 15, queen: 10 },
  { key: 'chickens' as const, emoji: '🐔', color: '#e8a838', perCard: 4, king: 10, queen: 5  },
];

// ─── Utilities ────────────────────────────────────────────────────────────────
function formatTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ─── Good Counter ─────────────────────────────────────────────────────────────
function GoodCounter({ good, value, onChange, soundOn }: { good: typeof GOODS[number]; value: number; onChange: (v: number) => void; soundOn: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="good-card" style={{ '--card-color': good.color } as React.CSSProperties}>
      <span className="good-emoji">{good.emoji}</span>
      <span className="good-name" style={{ color: good.color }}>{t(`goods.${good.key}`)}</span>
      <span className="good-value">
        {good.perCard} {t('room.perCard')}<br />
        <span style={{ fontSize: '0.7rem' }}>👑{good.king} · 👸{good.queen}</span>
      </span>
      <div className="good-counter">
        <button type="button" className="counter-btn"
          onClick={() => { if (soundOn) playCounter(false); onChange(Math.max(0, value - 1)); }}
          style={{ background: 'rgba(0,0,0,0.4)', color: 'var(--text)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label="Decrease">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <input type="text" inputMode="numeric" pattern="[0-9]*"
          value={value === 0 ? '' : value}
          placeholder="0"
          onChange={e => {
            const val = e.target.value.replace(/[^0-9]/g, '');
            onChange(val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0));
          }}
          className="counter-input"
          style={{ borderColor: value > 0 ? good.color : 'var(--border)' }} />
        <button type="button" className="counter-btn"
          onClick={() => { if (soundOn) playCounter(true); onChange(value + 1); }}
          style={{ background: good.color, color: '#111', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label="Increase">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RoomPage() {
  const params  = useParams();
  const router  = useRouter();
  const roomId  = params?.id as string;
  const { t, i18n } = useTranslation();
  const toast   = useToast();

  // ── State ─────────────────────────────────────────────────────────────────
  const [players,       setPlayers]       = useState<Player[]>([]);
  const [prevPlayerIds, setPrevPlayerIds] = useState<Set<string>>(new Set());
  const [results,       setResults]       = useState<PlayerScore[] | null>(null);
  const [myId]                            = useState(() => Math.random().toString(36).slice(2, 9));
  const [copied,        setCopied]        = useState(false);
  const [soundOn,       setSoundOn]       = useState(true);
  const [lightMode,     setLightMode]     = useState(false);
  const [activeTab,     setActiveTab]     = useState<'score' | 'rules'>('score');
  const [editMode,      setEditMode]      = useState(false);
  const [submitted,     setSubmitted]     = useState(false);
  const [savedNames,    setSavedNames]    = useState<string[]>([]);
  const [showQR,        setShowQR]        = useState(false);
  const [isSpectator,   setIsSpectator]   = useState(false);
  const [confettiOn,    setConfettiOn]    = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Turn Timer State
  const [timerPreset,   setTimerPreset]   = useState(90);
  const [timerSeconds,  setTimerSeconds]  = useState(90);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Penalty Helper State
  const [calcGoodType,  setCalcGoodType]  = useState<'legal' | 'contraband'>('legal');
  const [calcQty,       setCalcQty]       = useState(0);

  // Contraband Card Calculator State
  const [contraband6,   setContraband6]   = useState(0);
  const [contraband7,   setContraband7]   = useState(0);
  const [contraband8,   setContraband8]   = useState(0);
  const [contraband9,   setContraband9]   = useState(0);
  const [showContrabandCalc, setShowContrabandCalc] = useState(false);

  // History Double-Save Prevention Ref
  const gameSavedRef = useRef(false);

  // Timer
  const [elapsed,  setElapsed]  = useState(0);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTime  = useRef<number>(Date.now());

  // Form
  const [name,        setName]        = useState('');
  const [playerColor, setPlayerColor] = useState(PLAYER_COLORS[0]);
  const [gold,        setGold]        = useState(0);
  const [apples,      setApples]      = useState(0);
  const [cheese,      setCheese]      = useState(0);
  const [bread,       setBread]       = useState(0);
  const [chickens,    setChickens]    = useState(0);
  const [contraband,  setContraband]  = useState(0);

  const ar = i18n.language === 'ar';

  const previewScore =
    Number(gold) + Number(contraband) +
    Number(apples) * 2 + Number(cheese) * 3 +
    Number(bread)  * 4 + Number(chickens) * 4;

  // ── Effects ───────────────────────────────────────────────────────────────

  // Light mode toggle
  useEffect(() => {
    document.documentElement.classList.toggle('light-mode', lightMode);
  }, [lightMode]);

  // RTL/LTR
  useEffect(() => {
    document.documentElement.dir = ar ? 'rtl' : 'ltr';
    setSavedNames(getSavedNames());
  }, [ar]);

  // Auto-calculate contraband total value from card counts
  useEffect(() => {
    setContraband((contraband6 * 6) + (contraband7 * 7) + (contraband8 * 8) + (contraband9 * 9));
  }, [contraband6, contraband7, contraband8, contraband9]);

  // Timer
  useEffect(() => {
    startTime.current = Date.now();
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTime.current) / 1000)), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Sheriff Turn Timer Effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(s => {
          if (s <= 1) {
            setIsTimerRunning(false);
            if (soundOn) {
              try { playGong(); } catch (_) {}
            }
            return 0;
          }
          if (s <= 6 && soundOn) {
            try { playTickSound(); } catch (_) {}
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isTimerRunning, timerSeconds, soundOn]);

  // Background music effect for results page
  useEffect(() => {
    if (results && soundOn) {
      try { startBgMusic(soundOn); } catch (_) {}
    } else {
      try { stopBgMusic(); } catch (_) {}
    }
    return () => {
      try { stopBgMusic(); } catch (_) {}
    };
  }, [results, soundOn]);

  // Firebase listener
  useEffect(() => {
    if (!roomId || !db) return;
    return onValue(ref(db, `rooms/${roomId}`), snap => {
      const data = snap.val();
      if (!data) return;

      if (data.players) {
        const incomingPlayers = Object.values(data.players) as Player[];
        // Detect new joins → show toast
        const incomingIds = new Set(incomingPlayers.map(p => p.id));
        incomingPlayers.forEach(p => {
          if (!prevPlayerIds.has(p.id) && p.id !== myId) {
            toast(`${p.name} ${ar ? 'انضم!' : 'joined!'}`, '👋');
            if (soundOn) playClick();
          }
        });
        setPrevPlayerIds(incomingIds);
        setPlayers(incomingPlayers);
      }

      if (data.status === 'finished' && data.players) {
        if (timerRef.current) clearInterval(timerRef.current);
        const scores = calculateScores(Object.values(data.players) as Player[]);
        setResults(scores);
        setConfettiOn(true);
        if (soundOn) setTimeout(playFanfare, 200);
        setTimeout(() => setConfettiOn(false), 6000);

        if (!gameSavedRef.current) {
          gameSavedRef.current = true;
          const duration = Math.floor((Date.now() - startTime.current) / 1000);
          saveGame({
            id: `${roomId}-${Date.now()}`, date: Date.now(), roomId, duration,
            winner: scores[0]?.name ?? '',
            players: scores.map((s, i) => ({ id: s.id, name: s.name, totalScore: s.totalScore, rank: i + 1 })),
          });
          scores.forEach((s, i) => {
            upsertProfile(s.name, (s as PlayerScore & { color?: string }).color ?? '#c29b47');
            updateProfileStats(s.name, s.totalScore, i === 0);
          });
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, soundOn, ar]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const toggleLang = () => {
    if (soundOn) playClick();
    const nl = ar ? 'en' : 'ar';
    i18n.changeLanguage(nl);
    document.documentElement.dir = nl === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = nl;
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
    if (soundOn) playClick();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast(ar ? 'تم نسخ الكود!' : 'Code copied!', '📋');
  };

  const shareRoom = () => {
    if (soundOn) playClick();
    const url = `${window.location.origin}/room/${roomId}`;
    if (navigator.share) {
      navigator.share({ title: t('home.title'), text: `${t('room.shareCode')}: ${roomId}`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast(ar ? 'تم نسخ الرابط!' : 'Link copied!', '🔗');
    }
  };

  const submitScore = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return;
    if (soundOn) playSuccess();
    const player: Player = {
      id: myId, name: name.trim(), gold: +gold || 0,
      apples: +apples || 0, cheese: +cheese || 0, bread: +bread || 0,
      chickens: +chickens || 0, contrabandValue: +contraband || 0,
    };
    upsertProfile(player.name, playerColor);
    if (db) {
      await set(ref(db, `rooms/${roomId}/players/${myId}`), { ...player, color: playerColor });
    } else {
      setPlayers(prev => [...prev.filter(p => p.id !== myId), player]);
    }
    setSubmitted(true);
    setEditMode(false);
    toast(ar ? `تم حفظ نقاطك! (${previewScore})` : `Score saved! (${previewScore})`, '✅');
  }, [myId, roomId, name, gold, apples, cheese, bread, chickens, contraband, playerColor, soundOn, ar, previewScore, toast]);

  const handleCalculate = async () => {
    if (players.length < 2) return;
    if (soundOn) playFanfare();
    if (timerRef.current) clearInterval(timerRef.current);
    if (db) {
      await set(ref(db, `rooms/${roomId}/status`), 'finished');
    } else {
      const scores = calculateScores(players);
      setResults(scores);
      setConfettiOn(true);
      setTimeout(() => setConfettiOn(false), 6000);
      if (!gameSavedRef.current) {
        gameSavedRef.current = true;
        const duration = Math.floor((Date.now() - startTime.current) / 1000);
        saveGame({ id: `${roomId}-${Date.now()}`, date: Date.now(), roomId, duration, winner: scores[0]?.name ?? '', players: scores.map((s, i) => ({ id: s.id, name: s.name, totalScore: s.totalScore, rank: i + 1 })) });
        scores.forEach((s, i) => updateProfileStats(s.name, s.totalScore, i === 0));
      }
    }
  };

  // Top bar (shared)
  const TopBar = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <button onClick={() => { if (soundOn) playClick(); setShowLeaveConfirm(true); }} style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', boxShadow: 'none' }} title={ar ? 'الرئيسية' : 'Go Home'}>
          🏠 {ar ? 'الرئيسية' : 'Home'}
        </button>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.35rem 0.6rem' }}>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{t('room.roomId')}</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, letterSpacing: '4px', color: 'var(--primary)', fontFamily: 'var(--font-cinzel)', lineHeight: 1.1 }}>{roomId}</div>
        </div>
        <button onClick={copyCode} style={{ padding: '0.4rem 0.5rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border)', color: copied ? 'var(--primary)' : 'var(--text-muted)', boxShadow: 'none' }}>
          {copied ? '✓' : '📋'}
        </button>
        <button onClick={shareRoom} style={{ padding: '0.4rem 0.5rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', boxShadow: 'none' }}>📤</button>
        <button onClick={() => { setShowQR(true); if (soundOn) playClick(); }} style={{ padding: '0.4rem 0.5rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', boxShadow: 'none' }}>📷</button>
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          ⏱️ {formatTime(elapsed)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button className="theme-btn" onClick={() => { setLightMode(l => !l); if (soundOn) playClick(); }} title="Toggle theme">
          {lightMode ? '🌙' : '☀️'}
        </button>
        <button className="sound-toggle" onClick={() => setSoundOn(s => !s)}>{soundOn ? '🔊' : '🔇'}</button>
        <button className="lang-btn" onClick={toggleLang}>{ar ? 'English' : 'عربي'}</button>
      </div>
    </div>
  );

  // ─── Results Screen ────────────────────────────────────────────────────────
  if (results) {
    const topScore = results[0]?.totalScore ?? 0;
    // Detect ties at the top
    const winners = results.filter(r => r.totalScore === topScore);
    const isTied  = winners.length > 1;

    const shareResults = () => {
      if (soundOn) playClick();
      const emoji = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;
      const text = results.map((s, i) => `${emoji(i)} ${s.name}: ${s.totalScore}`).join('\n');
      const msg  = `👑 ${t('home.title')}\n\n${text}\n\n⏱️ ${formatTime(elapsed)}\n⭐ By Mohammed Moaayed 2026`;
      if (navigator.share) navigator.share({ title: t('home.title'), text: msg });
      else { navigator.clipboard.writeText(msg); toast(ar ? 'تم نسخ النتائج!' : 'Results copied!', '📋'); }
    };

    return (
      <main className="container animate-fade-in">
        <Confetti active={confettiOn} />

        {/* QR Modal */}
        {showQR && (
          <div className="qr-modal-backdrop" onClick={() => setShowQR(false)}>
            <div className="qr-modal" onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: '1rem' }}>📷 {ar ? 'امسح للانضمام' : 'Scan to Join'}</h3>
              <QRCode value={typeof window !== 'undefined' ? window.location.href : roomId} size={180} />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>{t('room.roomId')}: <strong style={{ color: 'var(--primary)', letterSpacing: 3 }}>{roomId}</strong></p>
              <button onClick={() => setShowQR(false)} style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', boxShadow: 'none' }}>✕ {ar ? 'إغلاق' : 'Close'}</button>
            </div>
          </div>
        )}

        {/* Leave Confirmation Modal */}
        {showLeaveConfirm && (
          <div className="qr-modal-backdrop" style={{ zIndex: 6000 }} onClick={() => setShowLeaveConfirm(false)}>
            <div className="qr-modal" style={{ maxWidth: '320px' }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: '3rem', textShadow: '0 0 10px rgba(140,42,28,0.4)' }}>🚪</div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--secondary-light)', margin: 0 }}>
                {ar ? 'مغادرة الغرفة؟' : 'Leave Room?'}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center', margin: '0.5rem 0 1rem', lineHeight: 1.5 }}>
                {ar ? 'هل أنت متأكد أنك تريد مغادرة الغرفة والعودة للصفحة الرئيسية؟ سيتم فقدان تقدمك الحالي.' : 'Are you sure you want to leave the room and go back to the home page? Your current progress will be lost.'}
              </p>
              <div style={{ display: 'flex', gap: '0.6rem', width: '100%' }}>
                <button onClick={() => setShowLeaveConfirm(false)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', boxShadow: 'none' }}>
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
                <button onClick={() => { setShowLeaveConfirm(false); playClick(); router.push('/'); }} style={{ flex: 1, background: 'linear-gradient(180deg, #8c2a1c 0%, #b53a28 100%)', border: '1px solid #d44', color: '#fff' }}>
                  {ar ? 'مغادرة' : 'Leave'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <button onClick={() => { if (soundOn) playClick(); setShowLeaveConfirm(true); }} style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', boxShadow: 'none' }}>
            🏠 {ar ? 'الرئيسية' : 'Home'}
          </button>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button className="theme-btn" onClick={() => setLightMode(l => !l)}>{lightMode ? '🌙' : '☀️'}</button>
            <button className="sound-toggle" onClick={() => setSoundOn(s => !s)}>{soundOn ? '🔊' : '🔇'}</button>
            <button className="lang-btn" onClick={toggleLang}>{ar ? 'English' : 'عربي'}</button>
          </div>
        </div>

        <div className="header" style={{ marginBottom: '1.5rem' }}>
          <div className="crown-icon">👑</div>
          <h1 style={{ fontSize: 'clamp(1.5rem,5vw,2.5rem)', marginTop: '0.5rem' }}>{t('results.title')}</h1>
          {isTied ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
              <span className="tie-badge" style={{ fontSize: '0.9rem', padding: '0.3rem 0.75rem' }}>⚖️ {ar ? 'تعادل!' : 'TIE!'}</span>
              <p style={{ color: 'var(--primary)', fontWeight: 700 }}>
                {winners.map(w => w.name).join(' & ')}
              </p>
            </div>
          ) : (
            <p style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.05rem' }}>
              🎉 {results[0]?.name} — {t('results.congratulations')}
            </p>
          )}
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>⏱️ {formatTime(elapsed)}</p>
        </div>

        {results.map((score, idx) => {
          const pColor = (score as PlayerScore & { color?: string }).color ?? '#c29b47';
          const isTiedWinner = isTied && score.totalScore === topScore;
          return (
            <div key={score.id}
              className={`result-card ${idx === 0 && !isTied ? 'winner' : ''} ${isTiedWinner ? 'tie-card' : ''}`}
              style={{ animationDelay: `${idx * 0.12}s` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className={`rank-badge ${idx < 3 ? `rank-${idx+1}` : 'rank-n'}`}
                  style={{ background: idx === 0 ? undefined : `${pColor}33` }}>
                  {isTiedWinner ? '⚖️' : idx === 0 ? '👑' : idx + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ margin: 0, fontSize: 'clamp(1rem,4vw,1.3rem)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {score.name}
                  </h2>
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                    {isTiedWinner && <span className="tie-badge">⚖️ {ar ? 'متعادل' : 'Tied'}</span>}
                    {score.bonuses.king.map(g => { const gd = GOODS.find(x => x.key === g); return <span key={`k${g}`} className="bonus-badge king">{gd?.emoji} 👑</span>; })}
                    {score.bonuses.queen.map(g => { const gd = GOODS.find(x => x.key === g); return <span key={`q${g}`} className="bonus-badge queen">{gd?.emoji} 👸</span>; })}
                  </div>
                </div>
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <AnimatedNumber
                    value={score.totalScore}
                    duration={900 + idx * 200}
                    style={{ fontSize: 'clamp(1.4rem,5vw,2rem)', fontWeight: 900, color: idx === 0 ? 'var(--gold)' : 'var(--primary)', fontFamily: 'var(--font-cinzel)', display: 'block' }}
                  />
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('results.total')}</div>
                </div>
              </div>

              <div className="score-breakdown">
                {[
                  { icon: '🪙', label: t('goods.gold'),       val: score.gold            },
                  { icon: '🍎', label: t('goods.apples'),     val: `${score.apples}×2`  },
                  { icon: '🧀', label: t('goods.cheese'),     val: `${score.cheese}×3`  },
                  { icon: '🍞', label: t('goods.bread'),      val: `${score.bread}×4`   },
                  { icon: '🐔', label: t('goods.chickens'),   val: `${score.chickens}×4`},
                  { icon: '🎭', label: t('goods.contraband'), val: score.contrabandValue },
                  ...(score.bonusPoints > 0 ? [{ icon: '⭐', label: t('results.bonus'), val: `+${score.bonusPoints}` }] : []),
                ].map(item => (
                  <div key={item.label} className="score-item" style={item.icon === '⭐' ? { border: '1px solid rgba(255,215,0,0.3)' } : {}}>
                    <span className="score-item-icon">{item.icon}</span>
                    <span className="score-item-value" style={item.icon === '⭐' ? { color: 'var(--gold)' } : {}}>{item.val}</span>
                    {item.label}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t('results.basePoints', { points: score.basePoints })}</span>
                {score.bonusPoints > 0 && <span style={{ color: 'var(--gold)' }}>{t('results.bonusPoints', { points: score.bonusPoints })}</span>}
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{t('results.totalScore', { score: score.totalScore })}</span>
              </div>
            </div>
          );
        })}

        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.5rem' }}>
          <button onClick={() => { if (soundOn) playClick(); router.push('/'); }} id="play-again-btn">
            🎲 {t('results.playAgain')}
          </button>
          <button onClick={shareResults} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', boxShadow: 'none' }}>
            📤 {ar ? 'شارك النتائج' : 'Share'}
          </button>
          <button onClick={() => { if (soundOn) playClick(); router.push('/history'); }} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', boxShadow: 'none', fontSize: '0.85rem' }}>
            📜 {ar ? 'السجل' : 'History'}
          </button>
          <button onClick={() => { if (soundOn) playClick(); router.push('/stats'); }} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', boxShadow: 'none', fontSize: '0.85rem' }}>
            📊 {ar ? 'الإحصائيات' : 'Stats'}
          </button>
        </div>
        <footer className="app-footer">⭐ By Mohammed Moaayed 2026 ⭐</footer>
      </main>
    );
  }

  // ─── Room Entry Screen ────────────────────────────────────────────────────
  return (
    <main className="container animate-fade-in">
      {/* QR Modal */}
      {showQR && (
        <div className="qr-modal-backdrop" onClick={() => setShowQR(false)}>
          <div className="qr-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem' }}>📷 {ar ? 'امسح للانضمام' : 'Scan to Join'}</h3>
            <QRCode value={typeof window !== 'undefined' ? window.location.href : roomId} size={180} />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              {t('room.roomId')}: <strong style={{ color: 'var(--primary)', letterSpacing: 3, fontFamily: 'var(--font-cinzel)' }}>{roomId}</strong>
            </p>
            <button onClick={() => setShowQR(false)} style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', boxShadow: 'none' }}>
              ✕ {ar ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="qr-modal-backdrop" style={{ zIndex: 6000 }} onClick={() => setShowLeaveConfirm(false)}>
          <div className="qr-modal" style={{ maxWidth: '320px' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '3rem', textShadow: '0 0 10px rgba(140,42,28,0.4)' }}>🚪</div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--secondary-light)', margin: 0 }}>
              {ar ? 'مغادرة الغرفة؟' : 'Leave Room?'}
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center', margin: '0.5rem 0 1rem', lineHeight: 1.5 }}>
              {ar ? 'هل أنت متأكد أنك تريد مغادرة الغرفة والعودة للصفحة الرئيسية؟ سيتم فقدان تقدمك الحالي.' : 'Are you sure you want to leave the room and go back to the home page? Your current progress will be lost.'}
            </p>
            <div style={{ display: 'flex', gap: '0.6rem', width: '100%' }}>
              <button onClick={() => setShowLeaveConfirm(false)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', boxShadow: 'none' }}>
                {ar ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={() => { setShowLeaveConfirm(false); playClick(); router.push('/'); }} style={{ flex: 1, background: 'linear-gradient(180deg, #8c2a1c 0%, #b53a28 100%)', border: '1px solid #d44', color: '#fff' }}>
                {ar ? 'مغادرة' : 'Leave'}
              </button>
            </div>
          </div>
        </div>
      )}

      <TopBar />

      {/* Spectator toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
        <button
          onClick={() => { setIsSpectator(s => !s); if (soundOn) playClick(); }}
          style={{ background: 'transparent', border: `1px solid ${isSpectator ? '#7888ff' : 'var(--border)'}`, color: isSpectator ? '#7888ff' : 'var(--text-muted)', boxShadow: 'none', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
        >
          👁️ {isSpectator ? (ar ? 'مشاهد (لن تُحسب نقاطك)' : 'Spectator mode') : (ar ? 'العب كمشاهد؟' : 'Watch only?')}
        </button>
      </div>

      <div className="room-grid">
        {/* ── Score Input Form ─────────────────────────────────────────────── */}
        <div className="card card-elevated">
          <div className="tab-row">
            <button className={`tab-btn ${activeTab === 'score' ? 'active' : ''}`} onClick={() => { setActiveTab('score'); if (soundOn) playClick(); }}>
              ⚔️ {t('room.addPlayer')}
            </button>
            <button className={`tab-btn ${activeTab === 'rules' ? 'active' : ''}`} onClick={() => { setActiveTab('rules'); if (soundOn) playClick(); }}>
              📜 {t('home.rulesTitle')}
            </button>
          </div>

          {activeTab === 'score' && !isSpectator && (
            <form onSubmit={submitScore}>
              {/* Name */}
              <div className="input-group">
                <label>👤 {t('room.playerName')}</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required
                  placeholder="..." id="player-name-input"
                  style={{ borderColor: playerColor, fontSize: '1.1rem' }}
                  list="saved-names-list" />
                <datalist id="saved-names-list">
                  {savedNames.map(n => <option key={n} value={n} />)}
                </datalist>
                {savedNames.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                    {savedNames.slice(0, 6).map(n => (
                      <button key={n} type="button" onClick={() => { setName(n); if (soundOn) playClick(); }}
                        style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.72rem', padding: '0.15rem 0.5rem', boxShadow: 'none', textTransform: 'none', letterSpacing: 0, minHeight: 'auto' }}>
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Color picker */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ar ? 'اللون:' : 'Color:'}</span>
                {PLAYER_COLORS.map(c => (
                  <div key={c} className={`color-dot ${playerColor === c ? 'selected' : ''}`}
                    style={{ background: c }} onClick={() => { setPlayerColor(c); if (soundOn) playClick(); }} />
                ))}
              </div>

              {/* Gold & Contraband */}
              <div className="gold-contraband-grid">
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>🪙 {t('room.gold')}</label>
                  <input type="text" inputMode="numeric" pattern="[0-9]*"
                    value={gold === 0 ? '' : gold}
                    placeholder="0"
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setGold(val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0));
                      if (soundOn && val !== '') playCoin();
                    }}
                    id="gold-input" style={{ textAlign: 'center', fontSize: '1.3rem', fontWeight: 700 }} />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>🎭 {t('room.contraband')}</label>
                  <input type="text" inputMode="numeric" pattern="[0-9]*"
                    value={contraband === 0 ? '' : contraband}
                    placeholder="0"
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setContraband(val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0));
                      setContraband6(0);
                      setContraband7(0);
                      setContraband8(0);
                      setContraband9(0);
                    }}
                    id="contraband-input" style={{ textAlign: 'center', fontSize: '1.3rem', fontWeight: 700, color: 'var(--contraband-color)' }} />
                </div>
              </div>

              {/* Contraband Card Calculator Link & Expanded Panel */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem', marginBottom: '0.75rem' }}>
                <button type="button" onClick={() => { setShowContrabandCalc(!showContrabandCalc); if (soundOn) playClick(); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--contraband-color)', fontSize: '0.8rem', padding: '0.2rem 0.5rem', minHeight: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem', boxShadow: 'none' }}>
                  🎭 {showContrabandCalc ? (ar ? 'إغلاق حاسبة البطاقات' : 'Hide Card Calculator') : (ar ? 'احسب بقيمة بطاقات الممنوعات (٦، ٧، ٨، ٩)' : 'Calculate by Contraband Cards (6, 7, 8, 9)')}
                </button>
              </div>

              {showContrabandCalc && (
                <div className="card" style={{ padding: '0.85rem', marginBottom: '1rem', border: '1px solid rgba(156,89,182,0.3)', background: 'rgba(156,89,182,0.03)', borderRadius: '10px', animation: 'fadeIn 0.25s ease' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.6rem', textAlign: 'center' }}>
                    {ar ? 'أدخل عدد بطاقات الممنوعات بكل قيمة، وسيتم حساب المجموع تلقائياً:' : 'Enter the number of contraband cards of each gold value:'}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
                    {[
                      { val: 6, state: contraband6, setter: setContraband6, color: '#f39c12' },
                      { val: 7, state: contraband7, setter: setContraband7, color: '#e67e22' },
                      { val: 8, state: contraband8, setter: setContraband8, color: '#d35400' },
                      { val: 9, state: contraband9, setter: setContraband9, color: '#c0392b' },
                    ].map(card => (
                      <div key={card.val} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: card.color }}>{ar ? `بطاقة قيمة ${card.val}` : `${card.val} Gold`}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button type="button" onClick={() => { if (soundOn) playCounter(false); card.setter(Math.max(0, card.state - 1)); }}
                            style={{ width: 24, height: 24, minWidth: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: 'var(--text)', padding: 0, minHeight: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', boxShadow: 'none' }}>−</button>
                          <input type="text" inputMode="numeric" pattern="[0-9]*"
                            value={card.state === 0 ? '' : card.state}
                            placeholder="0"
                            onChange={e => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              card.setter(val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0));
                            }}
                            style={{ width: 34, height: 28, minHeight: 28, textAlign: 'center', padding: '0.1rem', fontSize: '0.9rem', fontWeight: 700, border: '1px solid var(--border)', borderRadius: '4px', background: '#000', color: '#fff' }} />
                          <button type="button" onClick={() => { if (soundOn) playCounter(true); card.setter(card.state + 1); }}
                            style={{ width: 24, height: 24, minWidth: 24, borderRadius: '50%', background: 'var(--contraband-color)', border: 'none', color: '#fff', padding: 0, minHeight: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', boxShadow: 'none' }}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Goods counters */}
              <div className="goods-grid" style={{ marginBottom: '1rem', marginTop: '0.25rem' }}>
                <GoodCounter good={GOODS[0]} value={apples}   onChange={setApples}   soundOn={soundOn} />
                <GoodCounter good={GOODS[1]} value={cheese}   onChange={setCheese}   soundOn={soundOn} />
                <GoodCounter good={GOODS[2]} value={bread}    onChange={setBread}    soundOn={soundOn} />
                <GoodCounter good={GOODS[3]} value={chickens} onChange={setChickens} soundOn={soundOn} />
              </div>

              {/* Live score preview */}
              <div style={{ background: 'rgba(194,155,71,0.08)', border: '1px solid rgba(194,155,71,0.2)', borderRadius: '8px', padding: '0.6rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  {ar ? 'نقاطك الأساسية' : 'Base score (no bonuses)'}
                </span>
                <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-cinzel)' }}>
                  {previewScore}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" id="submit-score-btn" style={{ flex: 1 }}>
                  {submitted && !editMode ? `✓ ${t('room.ready')}` : `💾 ${t('room.submitScore')}`}
                </button>
                {submitted && !editMode && (
                  <button type="button" onClick={() => { setEditMode(true); if (soundOn) playClick(); }}
                    style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', boxShadow: 'none', padding: '0.75rem', fontSize: '0.85rem' }}>
                    ✏️ {ar ? 'تعديل' : 'Edit'}
                  </button>
                )}
              </div>
            </form>
          )}

          {activeTab === 'score' && isSpectator && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>👁️</div>
              <p className="spectator-badge" style={{ display: 'inline-flex', fontSize: '0.9rem', padding: '0.4rem 1rem', marginBottom: '0.75rem' }}>
                {ar ? 'أنت تشاهد فقط' : 'Spectator Mode'}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                {ar ? 'لن تُحسب نقاطك في اللعبة' : 'Your score will not be counted'}
              </p>
            </div>
          )}

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
              <div className="card" style={{ padding: '0.75rem', marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                <p>🪙 {t('goods.gold')} = 1 {t('room.perCard')}</p>
                <p>🎭 {t('goods.contraband')} = {t('goods.contrabandValue')}</p>
                <p style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>⚠️ {t('bonus.tieNote')}</p>
              </div>

              {/* ⚖️ Interactive Penalty & Bribe Calculator */}
              <div className="card" style={{ padding: '1rem', marginTop: '0.75rem', border: '1px solid rgba(194,155,71,0.3)' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ⚖️ {ar ? 'حاسبة الغرامات والرشاوى' : 'Sheriff\'s Penalty & Bribe Helper'}
                </h4>
                
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <button type="button" onClick={() => { setCalcGoodType('legal'); if (soundOn) playClick(); }}
                    style={{ flex: 1, background: calcGoodType === 'legal' ? 'var(--primary)' : 'rgba(0,0,0,0.3)', color: calcGoodType === 'legal' ? '#111' : 'var(--text-muted)', border: calcGoodType === 'legal' ? 'none' : '1px solid var(--border)', fontSize: '0.75rem', padding: '0.4rem 0.5rem', minHeight: '36px', borderRadius: '6px' }}>
                    🍎 {ar ? 'بضائع قانونية' : 'Legal Goods'}
                  </button>
                  <button type="button" onClick={() => { setCalcGoodType('contraband'); if (soundOn) playClick(); }}
                    style={{ flex: 1, background: calcGoodType === 'contraband' ? 'var(--primary)' : 'rgba(0,0,0,0.3)', color: calcGoodType === 'contraband' ? '#111' : 'var(--text-muted)', border: calcGoodType === 'contraband' ? 'none' : '1px solid var(--border)', fontSize: '0.75rem', padding: '0.4rem 0.5rem', minHeight: '36px', borderRadius: '6px' }}>
                    🎭 {ar ? 'بضائع مهربة' : 'Contraband'}
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', flex: 1 }}>{ar ? 'كمية البضائع المصادرة:' : 'Quantity of goods inspected:'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button type="button" onClick={() => { setCalcQty(q => Math.max(0, q - 1)); if (soundOn) playCounter(false); }}
                      style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)', color: 'var(--text)', padding: 0, boxShadow: 'none', fontSize: '1.1rem', minHeight: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ width: 28, textAlign: 'center', fontWeight: 700, fontSize: '1.1rem', fontFamily: 'var(--font-cinzel)', color: 'var(--primary)' }}>
                      {calcQty}
                    </span>
                    <button type="button" onClick={() => { setCalcQty(q => q + 1); if (soundOn) playCounter(true); }}
                      style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', border: 'none', color: '#111', padding: 0, boxShadow: 'none', fontSize: '1.1rem', minHeight: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ background: 'rgba(56,161,105,0.08)', border: '1px solid rgba(56,161,105,0.3)', borderRadius: '8px', padding: '0.6rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: '#38a169', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                      {ar ? 'إذا كان صادقاً' : 'If Merchant is Clean'}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      {ar ? 'الشريف يدفع للتاجر' : 'Sheriff pays Merchant'}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#38a169', fontFamily: 'var(--font-cinzel)' }}>
                      🪙 {calcQty * (calcGoodType === 'legal' ? 2 : 4)}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(229,62,62,0.08)', border: '1px solid rgba(229,62,62,0.3)', borderRadius: '8px', padding: '0.6rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: '#e53e3e', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                      {ar ? 'إذا كان كاذباً' : 'If Merchant Lied'}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      {ar ? 'التاجر يدفع للشريف' : 'Merchant pays Sheriff'}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#e53e3e', fontFamily: 'var(--font-cinzel)' }}>
                      🪙 {calcQty * (calcGoodType === 'legal' ? 2 : 4)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Players Panel ─────────────────────────────────────────────────── */}
        <div>
          {/* ⏳ Sheriff Turn Timer (Negotiation) */}
          <div className="card card-elevated" style={{ marginBottom: '1rem', border: '1px solid var(--primary)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(to right, var(--primary), var(--secondary))' }} />
            <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.75rem', fontWeight: 700 }}>
              <span>⏳ {ar ? 'مؤقت المفاوضات للشريف' : 'Sheriff\'s Turn Timer'}</span>
              {isTimerRunning && <span className="join-dot" style={{ background: 'var(--primary)' }} />}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
              {/* Digital Readout */}
              <div style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'monospace', color: timerSeconds <= 10 ? 'var(--secondary-light)' : 'var(--text)', textShadow: timerSeconds <= 10 ? '0 0 12px rgba(181,58,40,0.5)' : 'none', letterSpacing: '2px', lineHeight: 1 }}>
                {Math.floor(timerSeconds / 60).toString().padStart(2, '0')}:{(timerSeconds % 60).toString().padStart(2, '0')}
              </div>

              {/* Presets */}
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                {[60, 90, 120, 180].map(sec => (
                  <button key={sec} type="button" onClick={() => { setTimerPreset(sec); setTimerSeconds(sec); setIsTimerRunning(false); if (soundOn) playClick(); }}
                    style={{ background: timerPreset === sec ? 'var(--primary)' : 'rgba(0,0,0,0.3)', color: timerPreset === sec ? '#111' : 'var(--text-muted)', border: timerPreset === sec ? 'none' : '1px solid var(--border)', fontSize: '0.7rem', padding: '0.2rem 0.5rem', minHeight: 'auto', borderRadius: '4px', textTransform: 'none', letterSpacing: 0, fontWeight: 700 }}>
                    {sec}s
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '0.25rem' }}>
                <button type="button" onClick={() => { setIsTimerRunning(!isTimerRunning); if (soundOn) playClick(); }}
                  style={{ flex: 1, background: isTimerRunning ? 'transparent' : 'linear-gradient(180deg, #d4a848 0%, #8c6820 100%)', border: isTimerRunning ? '1px solid var(--primary)' : 'none', color: isTimerRunning ? 'var(--primary)' : '#111', fontSize: '0.8rem', padding: '0.5rem', minHeight: '36px' }}>
                  {isTimerRunning ? (ar ? '⏸️ إيقاف' : '⏸️ Pause') : (ar ? '▶️ بدء' : '▶️ Start')}
                </button>
                <button type="button" onClick={() => { setTimerSeconds(timerPreset); setIsTimerRunning(false); if (soundOn) playClick(); }}
                  style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.8rem', padding: '0.5rem', minHeight: '36px' }}>
                  🔄 {ar ? 'إعادة' : 'Reset'}
                </button>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="join-dot" />
                👥 {t('room.players')}
              </span>
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{players.length}</span>
            </h3>

            {players.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '0.75rem' }}>{t('room.noPlayers')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {players.map(p => {
                  const pCol = (p as Player & { color?: string }).color ?? '#c29b47';
                  return (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0.6rem', borderRadius: '8px', background: p.id === myId ? 'rgba(194,155,71,0.08)' : 'rgba(0,0,0,0.2)', border: p.id === myId ? `1px solid ${pCol}40` : '1px solid transparent', gap: '0.4rem' }}>
                      <div style={{ width: 9, height: 9, borderRadius: '50%', background: pCol, flexShrink: 0 }} />
                      <span style={{ fontWeight: p.id === myId ? 700 : 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
                        {p.name} {p.id === myId ? (ar ? '(أنت)' : '(You)') : ''}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--primary)', flexShrink: 0 }}>{t('room.ready')}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '0.75rem' }}>
            🔗 {t('room.shareCode')}
          </p>

          <button id="calculate-btn" onClick={handleCalculate} disabled={players.length < 2}
            style={{ width: '100%', background: players.length >= 2 ? 'linear-gradient(135deg, #8c2a1c, #b53a28)' : 'var(--surface)', border: players.length >= 2 ? '1px solid #d44' : '1px solid var(--border)', color: players.length >= 2 ? '#fff' : 'var(--text-muted)', padding: '1rem', fontSize: '1rem' }}>
            🏆 {t('room.calculateScores')}
          </button>

          {players.length < 2 && (
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.4rem' }}>
              {ar ? 'يحتاج لاعبَين على الأقل' : 'Need at least 2 players'}
            </p>
          )}

          {/* 🔍 Card Inspection (anti-cheat) */}
          {players.length >= 2 && (
            <button
              id="inspect-btn"
              onClick={() => { if (soundOn) playClick(); router.push(`/verify/${roomId}`); }}
              style={{ width: '100%', marginTop: '0.6rem', background: 'transparent', border: '1px solid rgba(194,155,71,0.4)', color: 'var(--primary)', boxShadow: 'none', fontSize: '0.9rem', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              🔍 {ar ? 'تفتيش حقيبة لاعب (منع الغش)' : 'Inspect Player Bag (Anti-Cheat)'}
            </button>
          )}

        </div>
      </div>

      <footer className="app-footer">⭐ By Mohammed Moaayed 2026 ⭐</footer>
    </main>
  );
}
