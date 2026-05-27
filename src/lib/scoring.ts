export type Player = {
  id: string;
  name: string;
  gold: number;
  apples: number;
  cheese: number;
  bread: number;
  chickens: number;
  contrabandValue: number;
};

export type PlayerScore = Player & {
  basePoints: number;
  bonusPoints: number;
  totalScore: number;
  bonuses: {
    king: string[];
    queen: string[];
  };
};

const GOODS_VALUES = {
  apples: 2,
  cheese: 3,
  bread: 4,
  chickens: 4,
};

const BONUSES = {
  apples: { king: 20, queen: 10 },
  cheese: { king: 15, queen: 10 },
  bread: { king: 15, queen: 10 },
  chickens: { king: 10, queen: 5 },
};

export function calculateScores(players: Player[]): PlayerScore[] {
  // First calculate base points for all players
  let scores: PlayerScore[] = players.map(p => {
    const basePoints = 
      p.gold + 
      p.contrabandValue + 
      (p.apples * GOODS_VALUES.apples) +
      (p.cheese * GOODS_VALUES.cheese) +
      (p.bread * GOODS_VALUES.bread) +
      (p.chickens * GOODS_VALUES.chickens);
      
    return {
      ...p,
      basePoints,
      bonusPoints: 0,
      totalScore: basePoints,
      bonuses: { king: [], queen: [] }
    };
  });

  const goods: (keyof typeof BONUSES)[] = ['apples', 'cheese', 'bread', 'chickens'];

  // Calculate King and Queen bonuses for each good
  goods.forEach(good => {
    // Sort players by amount of this good descending
    const sorted = [...scores].sort((a, b) => b[good] - a[good]);
    
    if (sorted.length === 0 || sorted[0][good] === 0) return; // No one has this good

    const maxAmount = sorted[0][good];
    const kings = sorted.filter(p => p[good] === maxAmount);

    if (kings.length > 1) {
      // Tie for King: share King + Queen bonus, round down
      const totalBonus = BONUSES[good].king + BONUSES[good].queen;
      const splitBonus = Math.floor(totalBonus / kings.length);
      kings.forEach(k => {
        const p = scores.find(s => s.id === k.id)!;
        p.bonusPoints += splitBonus;
        p.bonuses.king.push(good);
      });
      // No queen bonus awarded
    } else {
      // 1 King
      const king = scores.find(s => s.id === kings[0].id)!;
      king.bonusPoints += BONUSES[good].king;
      king.bonuses.king.push(good);

      // Now calculate Queen
      const remaining = sorted.filter(p => p.id !== king.id && p[good] > 0);
      if (remaining.length > 0) {
        const maxQueenAmount = remaining[0][good];
        const queens = remaining.filter(p => p[good] === maxQueenAmount);
        
        const splitBonus = Math.floor(BONUSES[good].queen / queens.length);
        queens.forEach(q => {
          const p = scores.find(s => s.id === q.id)!;
          p.bonusPoints += splitBonus;
          p.bonuses.queen.push(good);
        });
      }
    }
  });

  // Finalize totals
  scores = scores.map(s => ({
    ...s,
    totalScore: s.basePoints + s.bonusPoints
  }));

  // Sort by total score, then legal goods, then contraband
  scores.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    
    const aLegal = a.apples + a.cheese + a.bread + a.chickens;
    const bLegal = b.apples + b.cheese + b.bread + b.chickens;
    if (bLegal !== aLegal) return bLegal - aLegal;

    // We don't have exact contraband count, just value. So we tie-break on value.
    return b.contrabandValue - a.contrabandValue;
  });

  return scores;
}
