import type { FactionId, Location, WorkContract, WorkContractRewardKind } from '../../types';

type TierPool = { tier: number; daysRange: [number, number]; payRange: [number, number] };

const TIER_BASE: TierPool[] = [
  { tier: 1, daysRange: [2, 2], payRange: [70, 120] },
  { tier: 2, daysRange: [3, 4], payRange: [160, 260] },
  { tier: 3, daysRange: [4, 5], payRange: [320, 520] },
  { tier: 4, daysRange: [6, 7], payRange: [620, 980] },
  { tier: 5, daysRange: [8, 10], payRange: [1100, 1650] }
];

/** 各势力各等级委托标题（与全局池错开，体现城市风味） */
const FACTION_TIER_TITLES: Record<FactionId, string[][]> = {
  VERDANT_COVENANT: [
    ['弓仓搬运', '林间路标维护', '草药晾晒', '猎人营地帮工', '河谷渔获计数'],
    ['巡林哨协助', '野兽踪迹记录', '走私线耳目', '护送伐木队', '翠弦驿站守卫'],
    ['护送秘猎团', '剿灭偷猎者', '古木下誓约仪式', '毒藤清理', '弓术大会后勤'],
    ['密林伏击支援', '界碑争议调停', '魔物迁徙监视', '弓阶长老信使', '裂隙边缘采样'],
    ['月冠仪式护卫', '盟约树心禁区', '上位掠食者驱逐', '翠弦天灾防线', '誓弓终验']
  ],
  FROST_OATH: [
    ['冻土清雪', '冰窖盘点', '暖窖添煤', '盾形纹章抛光', '铁铃维修'],
    ['城垛巡查', '战俘押送', '刃誓新兵辅训', '冬市秩序维护', '关税哨协助'],
    ['矿道争端仲裁', '霜誓战团辎重', '叛军线人护送', '要塞粮秣押运', '雪原狼患'],
    ['裂冰晶护送', '旧誓卷宗封存', '双面间谍甄别', '永冻碑文抄录', '溃堤防线'],
    ['王庭断头台戒备', '霜心禁区开路', '古王魂灵镇压', '誓刃终战筹备', '寒潮封印']
  ],
  RED_DUNE: [
    ['驼队捆扎', '沙井打水', '驿站喂牲口', '风向标维护', '赤沙图腾重漆'],
    ['骑哨传令', '沙丘巡逻', '劫匪痕迹追踪', '商税凭条核对', '绿洲护卫'],
    ['沙丘贵胄护送', '驭骑竞技场杂役', '械斗部落调停', '风暴前物资抢运', '沙盗窝点'],
    ['双日秘卷护送', '沙暴中失联搜救', '地下暗渠测绘', '驭团长老信物', '渴狱试炼护法'],
    ['沙海王帐谈判', '上古骑魂驱逐', '赤沙天劫补给线', '禁驼陵寝', '驭团终裁']
  ],
  AUREATE_LEAGUE: [
    ['税单抄写', '市集摆位协调', '石板路清扫', '公会学徒跑腿', '粮仓防鼠'],
    ['城门关税抽查', '金盟巡逻', '契约见证', '债务执行协助', '行会纠纷记录'],
    ['贵族仪仗排练', '暗杀预告排查', '宪兵密档护送', '走私船稽核', '暴动苗头'],
    ['国库秘钥护送', '假币工坊清查', '议会密使', '星像台守卫', '叛国听证'],
    ['金盟枢机仪礼', '皇权裂隙巡查', '终税审判庭', '曜金长城戒备', '禁忌铸币厂']
  ],
  ARCANE_CONCORD: [
    ['星盘擦拭', '符文石板搬运', '坩埚残渣清理', '学徒抄卷', '塔城信鸽'],
    ['浅层结界巡检', '违禁材料盘查', '魔像零件清点', '幻象市集巡逻', '秘库通风'],
    ['中阶仪阵维护', '裂隙小规模封印', '魔宠逃逸追捕', '学派争端调解', '异位样本押运'],
    ['高阶术式护法', '咒缚叛徒追捕', '虚空残响采样', '禁书馆护送', '星辉枢密'],
    ['塔顶天灾压制', '多重界门稳固', '古神名碎片收容', '终焉星辉议会', '星髓禁区']
  ]
};

const NEUTRAL_VARIANT_TITLES: string[][] = [
  [
    ['码头力工', '城内张贴', '水井清淤', '马厩铲屎', '面包房递送'],
    ['警钟台执勤', '税吏随行', '牢饭分发', '宵禁喊话', '铁匠铺学徒'],
    ['商会押镖', '债主登门随同', '逃奴踪迹', '证人保护', '邪教徒盯梢'],
    ['密道测绘', '贿款截获', '假身份追查', '贵族丑闻封口', '疫村边缘取样'],
    ['旧神残响清理', '领主替身护送', '裂位暴走', '禁城突围', '末日钟校准']
  ],
  [
    ['货栈整理', '草药晾晒', '石桥修补', '钟楼润滑', '护城河漂浮物打捞'],
    ['民兵夜哨', '集市民事记录', '走私暗号破解实习', '监狱送餐', '猎人公会登记'],
    ['赈灾粮押运', '魔物巢穴前期侦查', '异端审判前期', '古墓外围警戒', '法师塔杂役'],
    ['双面间谍交换人质', '毒杀案验尸旁听', '地下拍卖安检', '叛国信使截击', '禁区标本护送'],
    ['裂隙教团高层', '龙灾疏散', '君王密诏', '深渊闸门', '末日演算']
  ],
  [
    ['浴场换水', '鞣革气味治理', '畜栏计数', '城徽上色', '乞丐登记'],
    ['卫戍换班记录', '械斗调解练习', '黑市线人养成', '城门盘查', '领主猎场帮工'],
    ['护送炼金原料', '剿匪悬赏协办', '瘟疫封锁线', '契约公证暴力威慑', '秘教传单收缴'],
    ['魔法决斗见证', '地下河测绘', '王家替身疑案', '军火走私链', '古战场怨灵'],
    ['神降预兆疏散', '军团哗变调停', '异界碎片收容', '终焉观测', '王冠试炼']
  ]
];

function hashLocationSeed(loc: Location): number {
  let h = 0;
  for (let i = 0; i < loc.id.length; i++) h = (h * 31 + loc.id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function tierTitlesForLocation(loc: Location, tierIndex: number): string[] {
  const faction = loc.factionId;
  if (faction && FACTION_TIER_TITLES[faction]) {
    const row = FACTION_TIER_TITLES[faction][tierIndex];
    if (row?.length) return row;
  }
  const v = hashLocationSeed(loc) % NEUTRAL_VARIANT_TITLES.length;
  return NEUTRAL_VARIANT_TITLES[v][tierIndex] ?? NEUTRAL_VARIANT_TITLES[0][tierIndex];
}

function rollInt(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function rollTier(commerceLevel: number): number {
  const c = Math.min(50, Math.max(0, commerceLevel)) / 50;
  const w = [0.48, 0.3, 0.14, 0.06, 0.02].map((base, i) => {
    if (i === 0) return Math.max(0.08, base - c * 0.28);
    if (i === 1) return Math.max(0.05, base - c * 0.06);
    if (i === 2) return base + c * 0.1;
    if (i === 3) return base + c * 0.14;
    return base + c * 0.1;
  });
  const sum = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < w.length; i++) {
    r -= w[i];
    if (r <= 0) return i + 1;
  }
  return 5;
}

function pickRewardTroop(faction: FactionId | undefined, tier: number): { id: string; count: number } {
  const count = Math.max(1, Math.min(12, 2 + tier + rollInt(0, tier)));
  if (faction === 'VERDANT_COVENANT') {
    if (tier >= 4) return { id: 'verdant_skybow', count: Math.max(1, Math.floor(count / 3)) };
    if (tier >= 3) return { id: 'verdant_scout_archer', count };
    return { id: tier >= 2 ? 'hunter' : 'militia', count };
  }
  if (faction === 'FROST_OATH') {
    if (tier >= 4) return { id: 'frost_oath_bladeguard', count: Math.max(1, Math.floor(count / 2)) };
    if (tier >= 3) return { id: 'frost_oath_halberdier', count };
    return { id: tier >= 2 ? 'footman' : 'militia', count };
  }
  if (faction === 'RED_DUNE') {
    if (tier >= 4) return { id: 'red_dune_cataphract', count: Math.max(1, Math.floor(count / 2)) };
    if (tier >= 3) return { id: 'red_dune_lancer', count };
    return { id: tier >= 2 ? 'cavalryman' : 'militia', count };
  }
  if (faction === 'AUREATE_LEAGUE') {
    if (tier >= 5) return { id: 'imperial_elite_knight', count: Math.max(1, Math.floor(count / 3)) };
    if (tier >= 4) return { id: 'imperial_crossbowman', count };
    if (tier >= 3) return { id: 'footman', count };
    return { id: 'militia', count };
  }
  if (faction === 'ARCANE_CONCORD') {
    if (tier >= 5) return { id: 'aether_scholar', count: Math.max(1, Math.floor(count / 3)) };
    if (tier >= 4) return { id: 'rift_sentinel', count: Math.max(1, Math.floor(count / 2)) };
    if (tier >= 3) return { id: 'stellar_initiate', count };
    return { id: tier >= 2 ? 'arcane_apprentice' : 'peasant', count };
  }
  if (tier >= 4) return { id: 'footman', count };
  if (tier >= 3) return { id: 'hunter', count };
  if (tier >= 2) return { id: 'militia', count };
  return { id: 'peasant', count };
}

function xpForContractTier(tier: number) {
  return 10 + tier * 14 + rollInt(0, tier * 6);
}

export type BuildWorkContractsOptions = {
  commerceLevel?: number;
};

export function buildWorkContractsForCity(loc: Location, day: number, opts?: BuildWorkContractsOptions): WorkContract[] {
  const commerceLevel = Math.max(0, Math.floor(opts?.commerceLevel ?? 0));
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const count = 4;
  const used = new Set<string>();
  const result: WorkContract[] = [];

  for (let i = 0; i < count; i++) {
    const tier = rollTier(commerceLevel);
    const base = TIER_BASE[tier - 1] ?? TIER_BASE[0];
    const titlePool = tierTitlesForLocation(loc, tier - 1);
    let title = pick(titlePool);
    let guard = 0;
    while (used.has(title) && guard < 12) {
      title = pick(titlePool);
      guard++;
    }
    used.add(title);
    const days = rollInt(base.daysRange[0], base.daysRange[1]);
    const pay = rollInt(base.payRange[0], base.payRange[1]);

    let rewardKind: WorkContractRewardKind = 'GOLD';
    let rewardXp: number | undefined;
    let rewardTroopId: string | undefined;
    let rewardTroopCount: number | undefined;

    const rSpec = Math.random();
    if (rSpec < 0.1) {
      rewardKind = 'PLAYER_XP';
      rewardXp = xpForContractTier(tier);
    } else if (rSpec < 0.19) {
      rewardKind = 'TROOP_BONUS';
      const t = pickRewardTroop(loc.factionId, tier);
      rewardTroopId = t.id;
      rewardTroopCount = t.count;
    }

    const c: WorkContract = {
      id: `WORK_${loc.id}_${day}_${i}_${Math.floor(Math.random() * 10000)}`,
      title,
      tier,
      days,
      pay,
      rewardKind: rewardKind === 'GOLD' ? undefined : rewardKind,
      rewardXp,
      rewardTroopId,
      rewardTroopCount
    };
    result.push(c);
  }
  return result;
}
