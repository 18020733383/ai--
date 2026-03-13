import type { Location, WorkContract } from '../../types';

export function buildWorkContractsForCity(loc: Location, day: number): WorkContract[] {
  const pools: { tier: number; titles: string[]; daysRange: [number, number]; payRange: [number, number] }[] = [
    { tier: 1, titles: ['搬运货箱', '跑腿送信', '码头清点', '修补栅栏', '护送学徒'], daysRange: [2, 2], payRange: [70, 120] },
    { tier: 2, titles: ['城门巡逻', '商队随行', '仓库盘点', '清剿鼠患', '押送囚犯'], daysRange: [3, 4], payRange: [160, 260] },
    { tier: 3, titles: ['护送贵客', '处理纠纷', '围剿盗匪', '护卫货队', '追缴欠款'], daysRange: [4, 5], payRange: [320, 520] },
    { tier: 4, titles: ['暗线侦查', '断粮破坏', '护送密使', '追捕逃犯', '封存物证'], daysRange: [6, 7], payRange: [620, 980] },
    { tier: 5, titles: ['裂隙巡查', '异常清剿', '秘密护送', '高危镇压', '禁区采样'], daysRange: [8, 10], payRange: [1100, 1650] }
  ];
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const rollInt = (min: number, max: number) => Math.floor(min + Math.random() * (max - min + 1));
  const rollTier = () => {
    const r = Math.random();
    if (r < 0.48) return 1;
    if (r < 0.78) return 2;
    if (r < 0.93) return 3;
    if (r < 0.985) return 4;
    return 5;
  };
  const count = 4;
  const used = new Set<string>();
  const result: WorkContract[] = [];
  for (let i = 0; i < count; i++) {
    const tier = rollTier();
    const pool = pools.find(p => p.tier === tier) ?? pools[0];
    let title = pick(pool.titles);
    let guard = 0;
    while (used.has(title) && guard < 10) {
      title = pick(pool.titles);
      guard++;
    }
    used.add(title);
    const days = rollInt(pool.daysRange[0], pool.daysRange[1]);
    const pay = rollInt(pool.payRange[0], pool.payRange[1]);
    result.push({ id: `WORK_${loc.id}_${day}_${i}_${Math.floor(Math.random() * 10000)}`, title, tier, days, pay });
  }
  return result;
}
