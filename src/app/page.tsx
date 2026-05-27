'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { db } from '@/lib/firebase';
import { ref, set } from 'firebase/database';
import { playClick, playSuccess, playStory1, playStory2, playStory3, playStory4 } from '@/lib/sounds';
import { getHistory } from '@/lib/storage';

const GOODS = [
  { key: 'apples',   emoji: '🍎', color: '#e53e3e', perCard: 2, king: 20, queen: 10 },
  { key: 'cheese',   emoji: '🧀', color: '#f6c90e', perCard: 3, king: 15, queen: 10 },
  { key: 'bread',    emoji: '🍞', color: '#c4813b', perCard: 4, king: 15, queen: 10 },
  { key: 'chickens', emoji: '🐔', color: '#e8a838', perCard: 4, king: 10, queen: 5  },
];

export default function Home() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [roomId, setRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [historyCount, setHistoryCount] = useState(0);

  // IG Stories State
  const [activeStoryIdx, setActiveStoryIdx] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isStoryPaused, setIsStoryPaused] = useState(false);

  const ar = i18n.language === 'ar';

  useEffect(() => {
    setHistoryCount(getHistory().length);
  }, []);

  useEffect(() => {
    const lang = i18n.language;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [i18n.language]);

  // IG Stories Sound Trigger Effect
  useEffect(() => {
    if (activeStoryIdx === null) return;
    
    // Play sound according to active slide
    if (soundOn) {
      try {
        if (activeStoryIdx === 0 || activeStoryIdx === 6) playStory1();
        else if (activeStoryIdx === 1 || activeStoryIdx === 4) playStory2();
        else if (activeStoryIdx === 2 || activeStoryIdx === 5) playStory3();
        else if (activeStoryIdx === 3 || activeStoryIdx === 7) playStory4();
      } catch (_) {}
    }
  }, [activeStoryIdx, soundOn]);

  // IG Stories Auto-Advance Effect
  useEffect(() => {
    if (activeStoryIdx === null) return;
    
    setStoryProgress(0);
    const duration = 8000; // 8 seconds per slide
    const intervalTime = 100; // update progress bar every 100ms
    const step = (intervalTime / duration) * 100;
    
    const interval = setInterval(() => {
      setStoryProgress(prev => {
        if (isStoryPaused) return prev; // Freeze progress if paused!
        if (prev >= 100) {
          if (activeStoryIdx < 7) {
            setActiveStoryIdx(activeStoryIdx + 1);
          } else {
            setActiveStoryIdx(null); // auto close at the end
          }
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);
    
    return () => clearInterval(interval);
  }, [activeStoryIdx, isStoryPaused]);

  const toggleLanguage = () => {
    if (soundOn) playClick();
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const createRoom = async () => {
    if (soundOn) playSuccess();
    setLoading(true);
    const id = Math.floor(1000 + Math.random() * 9000).toString();
    try {
      if (db) {
        await set(ref(db, `rooms/${id}`), {
          createdAt: Date.now(),
          players: {},
          status: 'waiting',
        });
      }
      router.push(`/room/${id}`);
    } catch {
      router.push(`/room/${id}`);
    }
    setLoading(false);
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (soundOn) playClick();
    if (roomId.trim()) router.push(`/room/${roomId.trim()}`);
  };

  return (
    <main className="container animate-fade-in">
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className="lang-btn" onClick={() => { playClick(); router.push('/history'); }} id="history-btn" style={{ position: 'relative' }}>
            📜{historyCount > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--secondary)', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>{historyCount}</span>}
          </button>
          <button className="lang-btn" onClick={() => { playClick(); router.push('/stats'); }} id="stats-btn">📊</button>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className="sound-toggle" onClick={() => setSoundOn(s => !s)}>
            {soundOn ? '🔊' : '🔇'}
          </button>
          <button className="lang-btn" onClick={toggleLanguage} id="lang-toggle">
            {i18n.language === 'ar' ? 'English' : 'عربي'}
          </button>
        </div>
      </div>

      {/* Styles for stories hover & scroll */}
      <style>{`
        .story-bubble-circle:hover {
          transform: scale(1.08);
          border-color: var(--primary-light) !important;
          box-shadow: 0 0 14px rgba(194,155,71,0.5), inset 0 0 8px rgba(0,0,0,0.5) !important;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* IG Stories Bubble Row */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '1rem', 
          overflowX: 'auto', 
          padding: '0.2rem 0.6rem 0.6rem', 
          marginBottom: '1.25rem', 
          scrollbarWidth: 'none',
          justifyContent: 'flex-start',
          flexWrap: 'nowrap'
        }} 
        className="no-scrollbar"
      >
        {[
          { idx: 0, emoji: '🏆', key: 'bubble1' },
          { idx: 1, emoji: '🎭', key: 'bubble2' },
          { idx: 2, emoji: '👜', key: 'bubble3' },
          { idx: 3, emoji: '🗣️', key: 'bubble4' },
          { idx: 4, emoji: '🤝', key: 'bubble5' },
          { idx: 5, emoji: '🔍', key: 'bubble6' },
          { idx: 6, emoji: '👑', key: 'bubble7' },
          { idx: 7, emoji: '🏆', key: 'bubble8' },
        ].map(item => (
          <button
            key={item.idx}
            onClick={() => { if (soundOn) playClick(); setIsStoryPaused(false); setActiveStoryIdx(item.idx); }}
            style={{
              flexShrink: 0,
              background: 'transparent',
              border: 'none',
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer',
              boxShadow: 'none',
              minHeight: 'auto',
              transform: 'none',
              userSelect: 'none',
            }}
          >
            <div 
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--surface)',
                border: '2.5px solid var(--primary)',
                boxShadow: '0 0 10px rgba(194,155,71,0.25), inset 0 0 8px rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
                transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
              }}
              className="story-bubble-circle"
            >
              {item.emoji}
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, fontFamily: ar ? 'ArefRuqaa' : 'inherit' }}>
              {t(`stories.${item.key}`)}
            </span>
          </button>
        ))}
      </div>

      {/* IG Stories Modal Viewer Overlay */}
      {activeStoryIdx !== null && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#0a0908',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 'calc(1.2rem + var(--safe-top)) 1.25rem calc(1.5rem + var(--safe-bottom))',
            animation: 'fadeIn 0.22s ease-out',
            color: '#fff',
            width: '100vw',
            height: '100dvh',
            overflow: 'hidden',
          }}
          onClick={(e) => {
            // Click zone: LTR (click right side -> advance, left -> back)
            // Click zone: RTL (click left side -> advance, right -> back)
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const width = rect.width;
            
            const isClickRight = clickX > width * 0.45;
            const advance = ar ? !isClickRight : isClickRight;

            if (advance) {
              if (activeStoryIdx < 7) {
                setActiveStoryIdx(activeStoryIdx + 1);
              } else {
                setActiveStoryIdx(null);
              }
            } else {
              if (activeStoryIdx > 0) {
                setActiveStoryIdx(activeStoryIdx - 1);
              } else {
                setActiveStoryIdx(null);
              }
            }
          }}
        >
          {/* Background Story Image */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(/images/story-${activeStoryIdx + 1}.png)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.85,
              zIndex: 1,
            }}
          />

          {/* Dark Vignette/Overlay Gradient */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(10,9,8,0.7) 0%, transparent 25%, transparent 60%, rgba(10,9,8,0.95) 100%)',
              zIndex: 2,
            }}
          />

          {/* Story Dialog Content wrapper (keeps elements beautifully aligned and centered on desktop) */}
          <div style={{ width: '100%', maxWidth: '500px', zIndex: 3, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
            
            {/* Top Segments & Header */}
            <div>
              <div style={{ display: 'flex', gap: '5px', marginBottom: '0.75rem', width: '100%', flexDirection: ar ? 'row-reverse' : 'row' }}>
                {[0, 1, 2, 3, 4, 5, 6, 7].map(idx => (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      height: '3.5px',
                      background: 'rgba(255,255,255,0.22)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: ar ? 'auto' : 0,
                        right: ar ? 0 : 'auto',
                        bottom: 0,
                        background: 'var(--primary)',
                        width: idx < activeStoryIdx ? '100%' : idx === activeStoryIdx ? `${storyProgress}%` : '0%',
                        transition: idx === activeStoryIdx ? 'width 0.1s linear' : 'none',
                      }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: ar ? 'row-reverse' : 'row' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexDirection: ar ? 'row-reverse' : 'row' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid var(--primary)', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem' }}>
                    🏰
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, textShadow: '0 1px 4px #000', fontFamily: ar ? 'ArefRuqaa' : 'var(--font-cinzel)', color: 'var(--primary)' }}>
                    {t('home.title')}
                  </span>
                </div>
                
                {/* Control Action Buttons (Stop/Pause & Close) */}
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexDirection: ar ? 'row-reverse' : 'row' }}>
                  {/* Stop / Pause Autoplay Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (soundOn) playClick();
                      setIsStoryPaused(!isStoryPaused);
                    }}
                    style={{
                      background: 'rgba(0,0,0,0.5)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      minWidth: '32px',
                      minHeight: '32px',
                      padding: 0,
                      fontSize: '0.85rem',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'none',
                      transform: 'none',
                    }}
                    title={isStoryPaused ? (ar ? 'تشغيل' : 'Play') : (ar ? 'إيقاف مؤقت' : 'Pause')}
                  >
                    {isStoryPaused ? '▶️' : '⏸️'}
                  </button>

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (soundOn) playClick();
                      setActiveStoryIdx(null);
                    }}
                    style={{
                      background: 'rgba(0,0,0,0.5)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      minWidth: '32px',
                      minHeight: '32px',
                      padding: 0,
                      fontSize: '0.95rem',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'none',
                      transform: 'none',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Narrator Dialogue Card */}
            <div
              style={{
                background: 'rgba(30, 27, 24, 0.94)',
                border: '1.5px solid var(--primary)',
                borderRadius: '16px',
                padding: '1.25rem',
                boxShadow: '0 12px 36px rgba(0,0,0,0.85)',
                backdropFilter: 'blur(16px)',
                textAlign: ar ? 'right' : 'left',
              }}
              dir={ar ? 'rtl' : 'ltr'}
              onClick={(e) => {
                // Dialogue click advance/prev
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const width = rect.width;
                
                const isClickRight = clickX > width * 0.45;
                const advance = ar ? !isClickRight : isClickRight;

                if (advance) {
                  if (activeStoryIdx < 7) {
                    setActiveStoryIdx(activeStoryIdx + 1);
                  } else {
                    setActiveStoryIdx(null);
                  }
                } else {
                  if (activeStoryIdx > 0) {
                    setActiveStoryIdx(activeStoryIdx - 1);
                  } else {
                    setActiveStoryIdx(null);
                  }
                }
              }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.5rem', background: 'rgba(194,155,71,0.15)', border: '1px solid var(--primary)', borderRadius: '20px', fontSize: '0.74rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.65rem', fontFamily: ar ? 'ArefRuqaa' : 'inherit', flexDirection: ar ? 'row-reverse' : 'row' }}>
                🎙️ {ar ? 'سيد اللعبة (المُوجّه)' : 'Gamemaster Explanation'}
              </div>
              
              <h2 style={{ fontSize: 'clamp(1.25rem, 5vw, 1.45rem)', color: '#fff', margin: 0, marginBottom: '0.5rem', fontFamily: ar ? 'ArefRuqaa' : 'var(--font-cinzel)', textShadow: 'none' }}>
                {t(`stories.title${activeStoryIdx + 1}`)}
              </h2>
              
              <p style={{ fontSize: ar ? 'clamp(1.15rem, 4.5vw, 1.3rem)' : 'clamp(1.02rem, 4vw, 1.15rem)', color: 'rgba(255,255,255,0.92)', margin: 0, lineHeight: ar ? 1.8 : 1.65, fontFamily: ar ? 'ArefRuqaa' : 'inherit' }}>
                {t(`stories.desc${activeStoryIdx + 1}`)}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontFamily: ar ? 'ArefRuqaa' : 'inherit', flexDirection: ar ? 'row-reverse' : 'row' }}>
                <span>◀ {ar ? 'اضغط لليسار للرجوع' : 'Tap left for back'}</span>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{activeStoryIdx + 1} / 8</span>
                <span>{ar ? 'اضغط لليمين للتالي' : 'Tap right for next'} ▶</span>
              </div>
            </div>

          </div>
        </div>
      )}


      {/* Hero image banner */}
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', marginBottom: '1.25rem' }}>
        <img src="/images/market-banner.png" alt="Sheriff of Nottingham Market" style={{ width: '100%', height: 'clamp(160px, 35vw, 240px)', objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(18,16,14,0.1) 0%, rgba(18,16,14,0.85) 100%)', display: 'flex', alignItems: 'flex-end', padding: '1rem 1.25rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.4rem,6vw,2.5rem)', lineHeight: 1.2 }}>{t('home.title')}</h1>
            <p style={{ margin: 0, marginTop: '0.3rem', color: 'var(--primary)', fontSize: 'clamp(0.8rem,3vw,1rem)' }}>{t('home.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Create / Join card */}
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <div className="card card-elevated">
          <button
            onClick={createRoom}
            disabled={loading}
            style={{ width: '100%', padding: '1rem', fontSize: '1.05rem' }}
            id="create-room-btn"
          >
            {loading ? '...' : `🏰 ${t('home.createRoom')}`}
          </button>

          <div className="divider">{t('home.or')}</div>

          <form onSubmit={joinRoom}>
            <div className="input-group">
              <input
                type="text"
                inputMode="numeric"
                placeholder={t('home.roomIdPlaceholder')}
                value={roomId}
                onChange={e => setRoomId(e.target.value.replace(/\D/g, '').slice(0, 4))}
                required
                maxLength={4}
                style={{ textAlign: 'center', fontSize: '2rem', letterSpacing: '8px' }}
                id="room-code-input"
              />
            </div>
            <button
              type="submit"
              id="join-room-btn"
              style={{ width: '100%', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', boxShadow: 'none' }}
            >
              🚪 {t('home.join')}
            </button>
          </form>
        </div>
      </div>

      {/* Scoring Reference */}
      <div style={{ maxWidth: '700px', margin: '2rem auto 0' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.1rem', marginBottom: '1rem', opacity: 0.9 }}>
          📜 {t('home.rulesTitle')}
        </h2>

        <div className="home-goods-grid">
          {GOODS.map(good => (
            <div
              key={good.key}
              className="good-card"
              style={{ '--card-color': good.color } as React.CSSProperties}
            >
              <span className="good-emoji">{good.emoji}</span>
              <span className="good-name" style={{ color: good.color }}>
                {t(`goods.${good.key}`)}
              </span>
              <span className="good-value">
                {good.perCard} {t('room.perCard')}
              </span>
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span className="bonus-badge king">👑 {good.king}</span>
                <span className="bonus-badge queen">👸 {good.queen}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Gold & Contraband info */}
        <div className="card" style={{ padding: '0.75rem 1rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
              <span>🪙</span>
              <span style={{ color: 'var(--text-muted)' }}>{t('goods.gold')} = 1 {t('room.perCard')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
              <span>🎭</span>
              <span style={{ color: 'var(--text-muted)' }}>{t('goods.contraband')} = {t('goods.contrabandValue')}</span>
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem', lineHeight: 1.5 }}>
          ⚠️ {t('bonus.tieNote')}
        </p>
      </div>

      {/* Goods art banner */}
      <div style={{ borderRadius: 14, overflow: 'hidden', marginTop: '1.5rem', position: 'relative' }}>
        <img src="/images/goods-banner.png" alt="Market Goods" style={{ width: '100%', height: 180, objectFit: 'cover', objectPosition: 'center', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(18,16,14,0.85), transparent 60%)' }}>
          <div style={{ padding: '1.2rem 1.25rem', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>{i18n.language === 'ar' ? 'السوق ينتظرك!' : 'The market awaits!'}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0, marginTop: '0.3rem' }}>{i18n.language === 'ar' ? 'أنشئ غرفة وابدأ التجارة' : 'Create a room & start trading'}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="app-footer">
        ⭐ By Mohammed Moaayed 2026 ⭐
      </footer>
    </main>
  );
}
