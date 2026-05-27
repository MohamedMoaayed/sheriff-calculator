'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { db } from '@/lib/firebase';
import { ref, onValue, set } from 'firebase/database';
import { Player, PlayerScore, calculateScores } from '@/lib/scoring';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.id as string;
  const { t, i18n } = useTranslation();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [results, setResults] = useState<PlayerScore[] | null>(null);
  
  // Local state for the current user's input
  const [name, setName] = useState('');
  const [gold, setGold] = useState(0);
  const [apples, setApples] = useState(0);
  const [cheese, setCheese] = useState(0);
  const [bread, setBread] = useState(0);
  const [chickens, setChickens] = useState(0);
  const [contraband, setContraband] = useState(0);
  
  const [myId, setMyId] = useState('');

  useEffect(() => {
    // Generate a unique ID for this device session
    const uniqueId = Math.random().toString(36).substring(2, 9);
    setMyId(uniqueId);
  }, []);

  useEffect(() => {
    if (!roomId || !db) return;
    
    const roomRef = ref(db, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (data.players) {
          const playersList = Object.values(data.players) as Player[];
          setPlayers(playersList);
        }
        if (data.status === 'finished' && data.players) {
          const playersList = Object.values(data.players) as Player[];
          setResults(calculateScores(playersList));
        }
      }
    });

    return () => unsubscribe();
  }, [roomId]);

  const submitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !db) return;
    
    const player: Player = {
      id: myId,
      name: name.trim(),
      gold: Number(gold) || 0,
      apples: Number(apples) || 0,
      cheese: Number(cheese) || 0,
      bread: Number(bread) || 0,
      chickens: Number(chickens) || 0,
      contrabandValue: Number(contraband) || 0
    };

    await set(ref(db, `rooms/${roomId}/players/${myId}`), player);
  };

  const handleCalculate = async () => {
    if (players.length === 0) return;
    
    if (db) {
      await set(ref(db, `rooms/${roomId}/status`), 'finished');
    } else {
      // Fallback for offline mode
      setResults(calculateScores(players));
    }
  };

  if (results) {
    return (
      <main className="container animate-fade-in">
        <div className="header">
          <h1>{t('results.winner')}</h1>
        </div>
        
        {results.map((score, index) => (
          <div key={score.id} className="card" style={{ border: index === 0 ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
              {index + 1}. {score.name}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', color: 'var(--text-muted)' }}>
              <div>
                <p>{t('results.basePoints', { points: score.basePoints })}</p>
                <p>{t('results.bonusPoints', { points: score.bonusPoints })}</p>
              </div>
              <div style={{ textAlign: i18n.language === 'ar' ? 'left' : 'right' }}>
                <p style={{ fontSize: '1.5rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                  {t('results.totalScore', { score: score.totalScore })}
                </p>
              </div>
            </div>
            
            {(score.bonuses.king.length > 0 || score.bonuses.queen.length > 0) && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#1a1613', borderRadius: '4px' }}>
                {score.bonuses.king.length > 0 && (
                  <p style={{ color: '#d4af37' }}>{t('results.kingOf', { goods: score.bonuses.king.join(', ') })}</p>
                )}
                {score.bonuses.queen.length > 0 && (
                  <p style={{ color: '#c0c0c0' }}>{t('results.queenOf', { goods: score.bonuses.queen.join(', ') })}</p>
                )}
              </div>
            )}
          </div>
        ))}
        
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button onClick={() => router.push('/')}>{t('results.playAgain')}</button>
        </div>
      </main>
    );
  }

  return (
    <main className="container animate-fade-in">
      <div className="header">
        <h1>{t('room.roomId', { id: roomId })}</h1>
        <p>{t('room.waiting')}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Input Form */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem' }}>{t('room.addPlayer')}</h2>
          <form onSubmit={submitScore}>
            <div className="input-group">
              <label>{t('room.playerName')}</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label>{t('room.gold')}</label>
                <input type="number" min="0" value={gold} onChange={e => setGold(Number(e.target.value))} />
              </div>
              <div className="input-group">
                <label>{t('room.contraband')}</label>
                <input type="number" min="0" value={contraband} onChange={e => setContraband(Number(e.target.value))} />
              </div>
              <div className="input-group">
                <label>{t('room.apples')}</label>
                <input type="number" min="0" value={apples} onChange={e => setApples(Number(e.target.value))} />
              </div>
              <div className="input-group">
                <label>{t('room.cheese')}</label>
                <input type="number" min="0" value={cheese} onChange={e => setCheese(Number(e.target.value))} />
              </div>
              <div className="input-group">
                <label>{t('room.bread')}</label>
                <input type="number" min="0" value={bread} onChange={e => setBread(Number(e.target.value))} />
              </div>
              <div className="input-group">
                <label>{t('room.chickens')}</label>
                <input type="number" min="0" value={chickens} onChange={e => setChickens(Number(e.target.value))} />
              </div>
            </div>
            <button type="submit" style={{ width: '100%', marginTop: '1rem' }}>
              Submit / Update
            </button>
          </form>
        </div>

        {/* Players List */}
        <div>
          <h2 style={{ marginBottom: '1.5rem', color: 'var(--text)' }}>Players ({players.length})</h2>
          {players.length === 0 ? (
            <div className="card" style={{ opacity: 0.5, textAlign: 'center' }}>
              <p>No players yet</p>
            </div>
          ) : (
            players.map(p => (
              <div key={p.id} className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: p.id === myId ? 'var(--primary)' : 'var(--text)' }}>
                    {p.name} {p.id === myId ? '(You)' : ''}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>Ready</span>
                </div>
              </div>
            ))
          )}
          
          <div style={{ marginTop: '2rem' }}>
            <button 
              onClick={handleCalculate} 
              disabled={players.length === 0}
              style={{ width: '100%', background: players.length > 0 ? 'var(--secondary)' : 'transparent' }}
            >
              {t('room.calculateScores')}
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}
