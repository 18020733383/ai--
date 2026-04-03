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
  { id: 'ending_witness', title: '命运之幕', description: '观看任意结局演出（含主菜单回放）。', category: 'STORY' },
  { id: 'chuuni_apotheosis', title: '共鸣超限', description: '中二共鸣达到 100（足以惊醒邻座的魔王）。', category: 'PROGRESS' },
  { id: 'chuuni_oath_keeper', title: '真名债主', description: '累计立下真名誓约 5 次（在角色界面）。', category: 'PROGRESS' },
  { id: 'work_contract_first', title: '打工入门', description: '在任意城市完成 1 次打工委托。', category: 'PROGRESS' },
  { id: 'work_contract_veteran', title: '委任常客', description: '累计完成 20 次打工委托。', category: 'PROGRESS' },
  { id: 'work_contract_special', title: '非常规差事', description: '完成 1 次经验或援军类特殊委托。', category: 'PROGRESS' },
  { id: 'work_contract_board_refresh', title: '榜文新帖', description: '在城内使用过一次「今日刷新委托」。', category: 'PROGRESS' },
  { id: 'work_contract_elite', title: '生死状', description: '完成过 1 次 5 级委托。', category: 'PROGRESS' },
  { id: 'work_contract_wanderer', title: '三城记', description: '在至少 3 座不同城市各完成过 1 次委托。', category: 'EXPLORATION' }
];

const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map(a => [a.id, a]));

const STORAGE_KEY = 'calradia_achievements_v1';

export const ACHIEVEMENT_UNLOCK_EVENT = 'calradia-achievement-unlock';

type PersistShape = {
  unlocked: string[];
  stats: {
    battleWins: number;
    trainingWins: number;
    chuuniOathCount: number;
  };
};

const defaultPersist = (): PersistShape => ({
  unlocked: [],
  stats: { battleWins: 0, trainingWins: 0, chuuniOathCount: 0 }
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
          trainingWins: Math.max(0, Math.floor(Number((parsed.stats as any).trainingWins) || 0)),
          chuuniOathCount: Math.max(0, Math.floor(Number((parsed.stats as any).chuuniOathCount) || 0)),
          workContractsCompleted: Math.max(0, Math.floor(Number((parsed.stats as any).workContractsCompleted) || 0)),
          workSpecialContractsCompleted: Math.max(0, Math.floor(Number((parsed.stats as any).workSpecialContractsCompleted) || 0)),
          workBoardRefreshCount: Math.max(0, Math.floor(Number((parsed.stats as any).workBoardRefreshCount) || 0)),
          workTier5ContractsCompleted: Math.max(0, Math.floor(Number((parsed.stats as any).workTier5ContractsCompleted) || 0)),
          workContractCityIds: Array.isArray((parsed.stats as any).workContractCityIds)
            ? (parsed.stats as any).workContractCityIds.map(String).slice(0, 40)
            : []
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

export function recordChuuniOathPledged() {
  const p = readPersist();
  p.stats.chuuniOathCount += 1;
  writePersist(p);
  if (p.stats.chuuniOathCount >= 5) tryUnlockAchievement('chuuni_oath_keeper');
}

export function tryUnlockChuuniApotheosis(resonance: number) {
  if (resonance >= 100) tryUnlockAchievement('chuuni_apotheosis');
}

export function recordWorkContractComplete(payload: { tier: number; rewardKind: 'GOLD' | 'PLAYER_XP' | 'TROOP_BONUS'; cityId: string }) {
  const p = readPersist();
  p.stats.workContractsCompleted += 1;
  if (payload.rewardKind === 'PLAYER_XP' || payload.rewardKind === 'TROOP_BONUS') {
    p.stats.workSpecialContractsCompleted += 1;
  }
  if (payload.tier >= 5) {
    p.stats.workTier5ContractsCompleted += 1;
  }
  const set = new Set(p.stats.workContractCityIds);
  if (payload.cityId) set.add(payload.cityId);
  p.stats.workContractCityIds = [...set].slice(0, 40);
  writePersist(p);

  const total = p.stats.workContractsCompleted;
  if (total >= 1) tryUnlockAchievement('work_contract_first');
  if (total >= 20) tryUnlockAchievement('work_contract_veteran');
  if (p.stats.workSpecialContractsCompleted >= 1) tryUnlockAchievement('work_contract_special');
  if (p.stats.workTier5ContractsCompleted >= 1) tryUnlockAchievement('work_contract_elite');
  if (p.stats.workContractCityIds.length >= 3) tryUnlockAchievement('work_contract_wanderer');
}

export function recordWorkBoardManualRefresh() {
  const p = readPersist();
  p.stats.workBoardRefreshCount += 1;
  writePersist(p);
  if (p.stats.workBoardRefreshCount >= 1) tryUnlockAchievement('work_contract_board_refresh');
}
