// ─── Game History & Player Profiles stored in localStorage ──────────────────

export type GameRecord = {
  id: string;
  date: number;
  roomId: string;
  players: {
    id: string;
    name: string;
    totalScore: number;
    rank: number;
  }[];
  winner: string;
  duration: number; // seconds
};

export type PlayerProfile = {
  name: string;
  color: string;
  wins: number;
  gamesPlayed: number;
  totalScore: number;
};

const HISTORY_KEY = 'sheriff_history';
const PROFILES_KEY = 'sheriff_profiles';

// ─── History ─────────────────────────────────────────────────────────────────

export function saveGame(record: GameRecord): void {
  if (typeof window === 'undefined') return;
  const history = getHistory();
  history.unshift(record); // newest first
  const trimmed = history.slice(0, 20); // keep last 20 games
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

export function getHistory(): GameRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(HISTORY_KEY);
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export function getProfiles(): Record<string, PlayerProfile> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function upsertProfile(name: string, color: string): void {
  if (typeof window === 'undefined') return;
  const profiles = getProfiles();
  if (!profiles[name]) {
    profiles[name] = { name, color, wins: 0, gamesPlayed: 0, totalScore: 0 };
  } else {
    profiles[name].color = color;
  }
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function getSavedNames(): string[] {
  return Object.keys(getProfiles()).sort();
}

export function updateProfileStats(name: string, score: number, won: boolean): void {
  if (typeof window === 'undefined') return;
  const profiles = getProfiles();
  if (!profiles[name]) return;
  profiles[name].gamesPlayed += 1;
  profiles[name].totalScore  += score;
  if (won) profiles[name].wins += 1;
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}
