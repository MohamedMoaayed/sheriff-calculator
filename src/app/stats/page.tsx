'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { getProfiles, getHistory, PlayerProfile } from '@/lib/storage';
import { playClick } from '@/lib/sounds';

export default function StatsPage() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const [profiles, setProfiles] = useState<Record<string, PlayerProfile>>({});
  const [totalGames, setTotalGames] = useState(0);
  const [tab, setTab] = useState<'players' | 'overview'>('players');

  const ar = i18n.language === 'ar';

  useEffect(() => {
    document.documentElement.dir = ar ? 'rtl' : 'ltr';
    setProfiles(getProfiles());
    setTotalGames(getHistory().length);
  }, [ar]);

  const playerList = Object.values(profiles).sort((a, b) => b.wins - a.wins);
  const totalScore = playerList.reduce((s, p) => s + p.totalScore, 0);

  return (
    <main className="container animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button onClick={() => { playClick(); router.push('/'); }}
          style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', boxShadow: 'none', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
          ← {ar ? 'رجوع' : 'Back'}
        </button>
      </div>

      <div className="header" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.5rem,5vw,2.5rem)' }}>
          📊 {ar ? 'الإحصائيات' : 'Stats Dashboard'}
        </h1>
      </div>

      {/* Overview cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { icon: '🎮', label: ar ? 'ألعاب' : 'Games', val: totalGames },
          { icon: '👥', label: ar ? 'لاعبون' : 'Players', val: playerList.length },
          { icon: '🏆', label: ar ? 'أعلى فائز' : 'Top Winner', val: playerList[0]?.name?.split(' ')[0] ?? '—' },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ textAlign: 'center', padding: '0.75rem' }}>
            <div style={{ fontSize: '1.5rem' }}>{stat.icon}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-cinzel)', margin: '0.2rem 0' }}>
              {stat.val}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-row" style={{ marginBottom: '1.25rem' }}>
        <button className={`tab-btn ${tab === 'players' ? 'active' : ''}`} onClick={() => { setTab('players'); playClick(); }}>
          👤 {ar ? 'اللاعبون' : 'Players'}
        </button>
        <button className={`tab-btn ${tab === 'overview' ? 'active' : ''}`} onClick={() => { setTab('overview'); playClick(); }}>
          📈 {ar ? 'النظرة العامة' : 'Overview'}
        </button>
      </div>

      {playerList.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📊</div>
          <p style={{ color: 'var(--text-muted)' }}>{ar ? 'لا يوجد بيانات بعد — العب أولاً!' : 'No data yet — play a game first!'}</p>
        </div>
      ) : (
        <>
          {tab === 'players' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {playerList.map((p, idx) => {
                const avgScore = p.gamesPlayed > 0 ? Math.round(p.totalScore / p.gamesPlayed) : 0;
                const winRate  = p.gamesPlayed > 0 ? Math.round((p.wins / p.gamesPlayed) * 100) : 0;
                return (
                  <div key={p.name} className="card" style={{ border: idx === 0 ? `1px solid ${p.color}` : '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                        {idx === 0 ? '👑' : idx + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {p.gamesPlayed} {ar ? 'لعبة' : 'games'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-cinzel)' }}>{p.wins}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ar ? 'انتصارات' : 'wins'}</div>
                      </div>
                    </div>

                    {/* Stats bar */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', fontSize: '0.78rem' }}>
                      {[
                        { label: ar ? 'متوسط النقاط' : 'Avg Score', val: avgScore, color: 'var(--primary)' },
                        { label: ar ? 'نسبة الفوز' : 'Win Rate',  val: `${winRate}%`,  color: winRate >= 50 ? '#38a169' : 'var(--text-muted)' },
                        { label: ar ? 'مجموع النقاط' : 'Total Pts', val: p.totalScore, color: 'var(--text)' },
                      ].map(stat => (
                        <div key={stat.label} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '6px', padding: '0.4rem', textAlign: 'center' }}>
                          <div style={{ fontWeight: 700, color: stat.color, fontSize: '1rem' }}>{stat.val}</div>
                          <div style={{ color: 'var(--text-muted)', marginTop: '0.1rem' }}>{stat.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Win rate bar */}
                    <div style={{ marginTop: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '20px', height: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${winRate}%`, height: '100%', background: p.color, borderRadius: '20px', transition: 'width 1s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'overview' && (
            <div className="card">
              <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>
                🏅 {ar ? 'ترتيب اللاعبين حسب الانتصارات' : 'Leaderboard by Wins'}
              </h3>
              {playerList.map((p, idx) => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ width: '24px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 700 }}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </span>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{p.name}</span>
                  <div style={{ flex: 3, background: 'rgba(0,0,0,0.3)', borderRadius: '20px', height: '8px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${playerList[0].wins > 0 ? (p.wins / playerList[0].wins) * 100 : 0}%`,
                      height: '100%', background: p.color, borderRadius: '20px', transition: 'width 1s ease'
                    }} />
                  </div>
                  <span style={{ color: 'var(--gold)', fontWeight: 700, fontFamily: 'var(--font-cinzel)', width: '30px', textAlign: 'center' }}>
                    {p.wins}
                  </span>
                </div>
              ))}
              {totalScore > 0 && (
                <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  {ar ? `إجمالي نقاط جميع اللاعبين: ${totalScore}` : `Total points across all games: ${totalScore}`}
                </p>
              )}
            </div>
          )}
        </>
      )}

      <footer className="app-footer">⭐ By Moe 2026 ⭐</footer>
    </main>
  );
}
