'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { db } from '@/lib/firebase';
import { ref, set } from 'firebase/database';
import { playClick, playSuccess } from '@/lib/sounds';

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <button
          className="sound-toggle"
          onClick={() => setSoundOn(s => !s)}
          title={soundOn ? 'Mute' : 'Unmute'}
        >
          {soundOn ? '🔊' : '🔇'}
        </button>
        <button className="lang-btn" onClick={toggleLanguage} id="lang-toggle">
          {i18n.language === 'ar' ? 'English' : 'عربي'}
        </button>
      </div>

      {/* Hero */}
      <div className="header">
        <div style={{ fontSize: '5rem', marginBottom: '0.5rem', filter: 'drop-shadow(0 4px 20px rgba(194,155,71,0.5))' }}>
          ⭐
        </div>
        <h1>{t('home.title')}</h1>
        <p>{t('home.subtitle')}</p>
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

      {/* Footer */}
      <footer className="app-footer">
        ⭐ By Moe 2026 ⭐
      </footer>
    </main>
  );
}
