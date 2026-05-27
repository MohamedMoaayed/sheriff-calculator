'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { db } from '@/lib/firebase';
import { ref, set } from 'firebase/database';

export default function Home() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [roomId, setRoomId] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  const createRoom = async () => {
    setLoading(true);
    // Generate a simple 4-digit code
    const id = Math.floor(1000 + Math.random() * 9000).toString();
    try {
      if (db) {
        await set(ref(db, `rooms/${id}`), {
          createdAt: Date.now(),
          players: [],
          status: 'waiting' // waiting, finished
        });
      }
      router.push(`/room/${id}`);
    } catch (e) {
      console.error(e);
      // Fallback for no DB connection (local mode)
      router.push(`/room/${id}`);
    }
    setLoading(false);
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      router.push(`/room/${roomId.trim()}`);
    }
  };

  return (
    <main className="container animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button 
          onClick={toggleLanguage} 
          style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', background: 'transparent', color: 'var(--primary)' }}
        >
          {i18n.language === 'en' ? 'عربي' : 'English'}
        </button>
      </div>
      
      <div className="header">
        <h1>{t('home.title')}</h1>
        <p>{t('home.subtitle')}</p>
      </div>

      <div className="card" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ marginBottom: '2rem' }}>
          <button onClick={createRoom} disabled={loading} style={{ width: '100%' }}>
            {loading ? '...' : t('home.createRoom')}
          </button>
        </div>

        <div style={{ position: 'relative', margin: '2rem 0' }}>
          <hr style={{ borderColor: 'var(--border)' }} />
          <span style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', padding: '0 10px', color: 'var(--text-muted)' }}>OR</span>
        </div>

        <form onSubmit={joinRoom}>
          <div className="input-group">
            <input 
              type="text" 
              placeholder={t('home.roomIdPlaceholder')} 
              value={roomId} 
              onChange={e => setRoomId(e.target.value)}
              required
              maxLength={4}
              style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '4px' }}
            />
          </div>
          <button type="submit" style={{ width: '100%', background: 'transparent', color: 'var(--text)' }}>
            {t('home.join')}
          </button>
        </form>
      </div>
    </main>
  );
}
