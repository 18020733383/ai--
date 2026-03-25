export type AchievementCategory = 'COMBAT' | 'PROGRESS' | 'ECONOMY' | 'EXPLORATION' | 'STORY';

export type AchievementDef = {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
};

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  COMBAT: '战斗',
  PROGRESS: '历程',
  ECONOMY: '财富',
  EXPLORATION: '探索',
  STORY: '剧情'
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_victory', title: '首胜', description: '在实战战斗中获胜一次（不含训练场）。', category: 'COMBAT' },
  { id: 'veteran_10', title: '十战十胜', description: '累计在实战战斗中获胜 10 次。', category: 'COMBAT' },
  { id: 'warmaster_50', title: '百战老兵', description: '累计在实战战斗中获胜 50 次。', category: 'COMBAT' },
  { id: 'first_training_win', title: '演武入门', description: '在训练场获胜一次。', category: 'COMBAT' },
  { id: 'survivor_30', title: '立足一月', description: '任意存档存活至第 30 天。', category: 'PROGRESS' },
  { id: 'survivor_100', title: '百日传奇', description: '任意存档存活至第 100 天。', category: 'PROGRESS' },
  { id: 'gold_10k', title: '腰缠万贯', description: '任意时刻持有金币不少于 10000。', category: 'ECONOMY' },
  { id: 'gold_100k', title: '金山银海', description: '任意时刻持有金币不少于 100000。', category: 'ECONOMY' },
  { id: 'renown_100', title: '名动一方', description: '声望达到 100。', category: 'PROGRESS' },
  { id: 'troop_archive', title: '兵法研习', description: '打开兵种档案界面。', category: 'EXPLORATION' },
  { id: 'map_explorer', title: '踏足大地图', description: '进入大地图。', category: 'EXPLORATION' },
  { id: 'manual_save', title: '落笔为证', description: '完成一次手动存档。', category: 'PROGRESS' },
  { id: 'ending_witness', title: '命运之幕', description: '观看任意结局演出（含主菜单回放）。', category: 'STORY' }
];

const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map(a => [a.id, a]));

const STORAGE_KEY = 'calradia_achievements_v1';

export const ACHIEVEMENT_UNLOCK_EVENT = 'calradia-achievement-unlock';

type PersistShape = {
  unlocked: string[];
  stats: {
    battleWins: number;
    trainingWins: number;
  };
};

const defaultPersist = (): PersistShape => ({
  unlocked: [],
  stats: { battleWins: 0, trainingWins: 0 }
});

export function readPersist(): PersistShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPersist();
    const parsed = JSON.parse(raw) as Partial<PersistShape>;
    const unlocked = Array.isArray(parsed.unlocked) ? parsed.unlocked.map(String) : [];
    const stats = parsed.stats && typeof parsed.stats === 'object'
      ? {
          battleWins: Math.max(0, Math.floor(Number((parsed.stats as any).battleWins) || 0)),
          trainingWins: Math.max(0, Math.floor(Number((parsed.stats as any).trainingWins) || 0))
        }
      : defaultPersist().stats;
    return { unlocked, stats };
  } catch {
    return defaultPersist();
  }
}

function writePersist(data: PersistShape) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

function dispatchUnlock(def: AchievementDef) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ACHIEVEMENT_UNLOCK_EVENT, { detail: def }));
}

/** Returns definition if newly unlocked, otherwise null. */
export function tryUnlockAchievement(id: string): AchievementDef | null {
  const def = ACHIEVEMENT_BY_ID.get(id);
  if (!def) return null;
  const p = readPersist();
  if (p.unlocked.includes(id)) return null;
  p.unlocked.push(id);
  writePersist(p);
  dispatchUnlock(def);
  return def;
}

export function getUnlockedIds(): Set<string> {
  return new Set(readPersist().unlocked);
}

export function recordBattleWin(isTraining: boolean) {
  const p = readPersist();
  if (isTraining) {
    p.stats.trainingWins += 1;
    writePersist(p);
    if (p.stats.trainingWins >= 1) tryUnlockAchievement('first_training_win');
    return;
  }
  p.stats.battleWins += 1;
  writePersist(p);
  const w = p.stats.battleWins;
  if (w >= 1) tryUnlockAchievement('first_victory');
  if (w >= 10) tryUnlockAchievement('veteran_10');
  if (w >= 50) tryUnlockAchievement('warmaster_50');
}

export function recordManualSaveUnlock() {
  tryUnlockAchievement('manual_save');
}

export function checkProgressAchievements(snapshot: { day: number; gold: number; renown: number }) {
  const day = Math.max(0, Math.floor(snapshot.day));
  const gold = Math.max(0, Math.floor(snapshot.gold));
  const renown = Math.max(0, Math.floor(snapshot.renown));
  if (day >= 30) tryUnlockAchievement('survivor_30');
  if (day >= 100) tryUnlockAchievement('survivor_100');
  if (gold >= 10_000) tryUnlockAchievement('gold_10k');
  if (gold >= 100_000) tryUnlockAchievement('gold_100k');
  if (renown >= 100) tryUnlockAchievement('renown_100');
}

export function tryUnlockTroopArchive() {
  tryUnlockAchievement('troop_archive');
}

export function tryUnlockMapExplorer() {
  tryUnlockAchievement('map_explorer');
}

export function tryUnlockEndingWitness() {
  tryUnlockAchievement('ending_witness');
}
