'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { db } from '@/lib/firebase';
import { ref, set } from 'firebase/database';
import { playClick, playSuccess } from '@/lib/sounds';
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

  useEffect(() => {
    setHistoryCount(getHistory().length);
  }, []);

  useEffect(() => {
    const lang = i18n.language;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [i18n.language]);

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
        ⭐ By Moe 2026 ⭐
      </footer>
    </main>
  );
}
