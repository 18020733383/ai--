import type { Location, PlayerState, WorkContract } from '../../types';

/** 首段以小概率出现在城内榜文；后续段落在完成上一段后必定出现在各次刷新的榜上 */
const MYSTERY_FIRST_STAGE_CHANCE = 0.045;

export type MysteryStageDef = {
  title: string;
  days: number;
  tier: number;
  pay: number;
};

export type MysteryWorkChainDef = {
  id: string;
  stages: MysteryStageDef[];
  finale: {
    gold: number;
    xp: number;
    troopId: string;
    troopCount: number;
    prestige?: number;
  };
};

export const MYSTERY_WORK_CHAINS: MysteryWorkChainDef[] = [
  {
    id: 'MYSTERY_STAR_RUNE_BELL',
    stages: [
      { title: '裂符龙铃（第一段）', days: 3, tier: 2, pay: 240 },
      { title: '裂符龙铃（第二段）', days: 4, tier: 3, pay: 460 },
      { title: '裂符龙铃（第三段）', days: 5, tier: 3, pay: 640 },
      { title: '裂符龙铃（第四段）', days: 7, tier: 4, pay: 980 },
      { title: '裂符龙铃（第五段）', days: 9, tier: 5, pay: 1500 }
    ],
    finale: { gold: 16000, xp: 600, troopId: 'stellar_magus', troopCount: 5, prestige: 90 }
  },
  {
    id: 'MYSTERY_SALT_COCOON_ARCHIVE',
    stages: [
      { title: '盐茧密简（第一段）', days: 3, tier: 2, pay: 210 },
      { title: '盐茧密简（第二段）', days: 5, tier: 3, pay: 520 },
      { title: '盐茧密简（第三段）', days: 6, tier: 4, pay: 820 },
      { title: '盐茧密简（第四段）', days: 8, tier: 5, pay: 1350 }
    ],
    finale: { gold: 14000, xp: 520, troopId: 'red_dune_cataphract', troopCount: 6, prestige: 85 }
  },
  {
    id: 'MYSTERY_LOCKSMITH_GRIMOIRE',
    stages: [
      { title: '钥匠隐册（第一段）', days: 2, tier: 2, pay: 230 },
      { title: '钥匠隐册（第二段）', days: 4, tier: 3, pay: 480 },
      { title: '钥匠隐册（第三段）', days: 5, tier: 4, pay: 760 },
      { title: '钥匠隐册（第四段）', days: 7, tier: 5, pay: 1280 }
    ],
    finale: { gold: 13500, xp: 580, troopId: 'aether_scholar', troopCount: 5, prestige: 88 }
  }
];

const CHAIN_BY_ID = new Map(MYSTERY_WORK_CHAINS.map(c => [c.id, c]));

export function getMysteryWorkChainDef(chainId: string): MysteryWorkChainDef | undefined {
  return CHAIN_BY_ID.get(chainId);
}

function buildMysteryContract(
  chain: MysteryWorkChainDef,
  stageIndex0: number,
  loc: Location,
  day: number
): WorkContract {
  const st = chain.stages[stageIndex0];
  return {
    id: `MYSTERY_${chain.id}_${loc.id}_${day}_${stageIndex0}_${Math.floor(Math.random() * 10000)}`,
    title: st.title,
    tier: st.tier,
    days: st.days,
    pay: st.pay,
    isMystery: true,
    mysteryChainId: chain.id,
    mysteryStage: stageIndex0 + 1,
    mysteryTotalStages: chain.stages.length
  };
}

export function appendMysteryWorkContracts(
  base: WorkContract[],
  loc: Location,
  day: number,
  mysteryWorkProgress: PlayerState['mysteryWorkProgress'] | undefined
): WorkContract[] {
  const progress = mysteryWorkProgress ?? {};
  const extra: WorkContract[] = [];

  for (const chain of MYSTERY_WORK_CHAINS) {
    const p = progress[chain.id];
    if (p === 'done') continue;

    const stagesDone = typeof p === 'number' ? p : 0;
    if (stagesDone >= chain.stages.length) continue;

    if (stagesDone === 0) {
      if (Math.random() >= MYSTERY_FIRST_STAGE_CHANCE) continue;
    }

    extra.push(buildMysteryContract(chain, stagesDone, loc, day));
  }

  return [...base, ...extra];
}
