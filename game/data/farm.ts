import type { CropDef, FarmPlot, FarmState } from '../../types';

export const FARM_MAX_PLOTS = 8;
export const FARM_PLOT_UNLOCK_COST = 220;

export const CROP_DEFS: CropDef[] = [
  { id: 'TURNIP', name: '芜菁', growMs: 15 * 60 * 1000, seedCost: 18, yieldGold: 55, flavor: '长得快，适合补贴日常开销。' },
  { id: 'WHEAT', name: '小麦', growMs: 35 * 60 * 1000, seedCost: 40, yieldGold: 120, flavor: '稳产作物，收益和生长速度都很均衡。' },
  { id: 'MOONBERRY', name: '月莓', growMs: 75 * 60 * 1000, seedCost: 85, yieldGold: 265, flavor: '夜色越深成熟越快，是法师们喜欢的甜味作物。' },
  { id: 'SUNSPIKE', name: '日芒穗', growMs: 2 * 60 * 60 * 1000, seedCost: 160, yieldGold: 520, flavor: '昂贵但高产，成熟时像一束凝固的阳光。' }
];

export const CROP_DEF_MAP: Record<CropDef['id'], CropDef> = Object.fromEntries(
  CROP_DEFS.map(def => [def.id, def])
) as Record<CropDef['id'], CropDef>;

export const createFarmState = (unlockedPlots = 2): FarmState => ({
  unlockedPlots,
  plots: Array.from({ length: FARM_MAX_PLOTS }, (_, slot): FarmPlot => ({ slot })),
  lastUpdatedAt: Date.now()
});
