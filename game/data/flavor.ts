import { ParrotVariant, Troop, TroopRace } from '../../types';

export const PARROT_VARIANTS: ParrotVariant[] = [
  { name: '玄风鹦鹉', type: 'XUANFENG', color: 'text-slate-300', price: 40, personality: 'MANIC', description: '最便宜的吵闹鸟，基本只会乱叫。' },
  { name: '虎皮鹦鹉', type: 'BUDGERIGAR', color: 'text-lime-400', price: 60, personality: 'MANIC', description: '活泼又聒噪，学不会战术，只会学你骂人。' },
  { name: '蓝黄金刚鹦鹉', type: 'MACAW', color: 'text-blue-400', price: 100, personality: 'SARCASTIC', description: '羽毛华丽，嘴巴却很毒。喜欢在关键时刻嘲讽你的战术。' },
  { name: '月轮鹦鹉', type: 'PARAKEET', color: 'text-green-600', price: 150, personality: 'GLOOMY', description: '总是低着头，仿佛看透了这世间的苦难。它预言的坏事通常都很准。' },
  { name: '非洲灰鹦鹉', type: 'GREY', color: 'text-stone-400', price: 500, personality: 'WISE', description: '智商极高，眼神深邃。偶尔会引用古代哲学家的名言，或者纠正你的语法。' },
  { name: '葵花凤头鹦鹉', type: 'COCKATOO', color: 'text-yellow-200', price: 300, personality: 'MANIC', description: '拥有莫西干发型的摇滚明星。大部分时间在尖叫，极度亢奋。' },
];

export const ENEMY_QUOTES: Record<string, string[]> = {
  peasant: ["别杀我们！我们只是想要点面包！", "把钱交出来，你可以滚了！", "兄弟们，这就是那只肥羊！"],
  militia: ["此处禁止通行！除非...嘿嘿。", "这片沙漠归我们管！", "留下买路财！"],
  hunter: ["森林会埋葬你们。", "你的头骨会是很好的装饰品。", "嘘...猎物上钩了。"],
  footman: ["以钢铁之名，碾碎他们！", "北境不需要弱者。", "把他们的头砍下来当酒杯！"],
  knight: ["叛徒？不，我们是新的秩序！", "为了被遗忘的荣耀！", "向我的剑刃下跪！"],
  zealot: ["血祭血神！", "火焰会净化一切！", "为了末日的降临！献身吧！"],
  wolf_rider: ["肉！新鲜的肉！", "撕碎他们！", "嗷呜————！"],
  automaton: ["目标锁定...歼灭模式启动...", "检测到有机生命体...清除...", "指令：毁灭。"],
  skeleton_warrior: ["加入我们...成为永恒...", "这里只有死亡...", "大脑...新鲜的大脑..."],
  void_caller: ["深渊正在凝视你...", "你的理智...如此脆弱...", "拥抱虚空吧！"],
  mad_patient: ["医生！医生在哪里？！", "哈哈哈！我不吃药！我不吃药！", "把你的脸皮借我穿一下！"],
  specter: ["离开...这片诅咒之地...", "你的灵魂...归我了...", "痛苦..."],
  meatball_soldier: ["别吃我！我是过期肉！", "为了火锅之神！", "我们要把你也煮了！"],
};

export const parrotChatter: Record<string, string[]> = {
  SARCASTIC: [
    "你的指挥真是...独具一格。",
    "刚才那个农民本来可以活下来的。",
    "嘎！笨蛋！嘎！",
    "看那个贡丸，它滚得比你跑得快。",
    "我打赌这次又要亏本了。",
    "你这走位像在找坟位。",
    "要不要我替你当指挥？至少我会飞。",
    "我见过更聪明的石头。",
    "你现在看起来就像个被收税的英雄。",
    "再这样下去，我要申请换主人。"
  ],
  GLOOMY: [
    "我们都会死在这里...",
    "天空是灰色的，像我的心情。",
    "今天的风里有血腥味。",
    "那个亡灵唢呐手吹得我抑郁症都犯了。",
    "毫无希望...",
    "我梦见我们明天还是欠债。",
    "别挣扎了，命运已经写好结局。",
    "你笑什么？那是崩溃前的征兆。",
    "我数过了，坏事比好事多三倍。",
    "活着只是暂时的。"
  ],
  MANIC: [
    "杀！杀！杀！还要更多瓜子！",
    "颜色！好多颜色！嘎哈哈哈哈！",
    "我要飞到太阳上去！",
    "火锅！好烫！好香！再来点！",
    "那是敌人的眼珠子吗？看起来很好吃！",
    "我要把你的头盔当窝！",
    "快！把地图撕了！我们靠直觉！",
    "我听见金币在哭！嘎哈哈！",
    "冲！去跟那只熊抱一下！",
    "今天适合干点违法的事！"
  ],
  WISE: [
    "星象显示今日不宜出行。",
    "命运的齿轮开始转动了...",
    "嘎，如果你给我吃的，我就告诉你宇宙的终极答案。",
    "注意那个红油法师，他看谁的眼神都像在看食材。",
    "战争没有赢家，只有活下来的鸟。",
    "当你凝视深渊时，深渊也在数你的钱。",
    "失误不可怕，可怕的是你觉得那是风格。",
    "谨记：士气比面包更贵。",
    "你若不改战略，历史会改写你。",
    "一只鸟的沉默，胜过十个将军的嘴硬。"
  ]
};

export const parrotMischiefEvents: { action: string; cost: number; taunt: string }[] = [
  { action: "啃坏了你的旗杆支架，临时找木匠修补", cost: 2, taunt: "你那旗杆松得像你的意志。我替你测试了强度，结果你看到了。" },
  { action: "在你的地图上拉了一坨，只能重新买一份地图", cost: 5, taunt: "这叫标记领地。你不懂战略——你只懂折叠。" },
  { action: "把帐篷角啄出个洞，夜里漏风漏雨", cost: 3, taunt: "你睡得太香了，我给你加点现实的寒意。" },
  { action: "啄穿了粮袋，顺手把几把麦子撒给路人", cost: 2, taunt: "别这么小气，社会需要流动性。你的粮食也需要。" },
  { action: "把罗盘指针叼走当玩具，只能换一个新的", cost: 4, taunt: "方向？你又不用。你靠'感觉'迷路。" },
  { action: "把你的笔记啄得满是洞，重新誊写买纸买墨", cost: 3, taunt: "你那战术写得像遗书，我帮你做了删改。" },
  { action: "偷喝了酒馆桌上的麦酒，被迫赔礼道歉", cost: 2, taunt: "我只是替你社交。你连赔钱都不会赔得体面。" },
  { action: "把马缰绳咬出毛边，换了条新缰", cost: 4, taunt: "你骑马的技术配不上完整的缰绳。" },
  { action: "把你珍藏的干果叼去'投资'，投资回报为零", cost: 2, taunt: "别看我，我这是替你体验创业失败。" },
  { action: "把炊具踢翻烫坏了锅底，重新打了一口小锅", cost: 3, taunt: "你指挥打仗不行，煮饭也不行。至少我让你知道锅会反抗。" }
];

export const IMPOSTER_TROOP_IDS = new Set([
  'void_larva', 'glitch_pawn', 'static_noise_walker', 'null_fragment',
  'imposter_light_infantry', 'imposter_spearman', 'imposter_short_bowman', 'imposter_slinger',
  'imposter_shield_conscript', 'imposter_axeman', 'imposter_javelin_thrower', 'imposter_scout_rider',
  'entropy_acolyte', 'pixel_shifter', 'null_pointer_hound', 'syntax_error_scout', 'imposter_wanderer',
  'imposter_heavy_infantry', 'imposter_pikeman', 'imposter_swordsman', 'imposter_longbowman',
  'imposter_crossbowman', 'imposter_halberdier', 'imposter_mace_guard', 'imposter_raider_rider',
  'imposter_stalker', 'memory_leak_mage', 'recursion_archer', 'deadlock_sentinel', 'buffer_overflow_brute', 'hypnotist_imposter',
  'imposter_heavy_knight', 'imposter_horse_archer', 'imposter_pike_guard', 'imposter_reaper_blade',
  'imposter_mirrorblade', 'blue_screen_golem', 'kernel_panic_knight', 'segmentation_fault_dragon', 'not_found_assassin',
  'legacy_code_abomination', 'system_crash_titan', 'infinite_loop_devourer'
]);

export const TROOP_RACE_LABELS: Record<TroopRace, string> = {
  HUMAN: '人类',
  ROACH: '蟑螂',
  UNDEAD: '亡灵',
  IMPOSTER: '伪人',
  BANDIT: '盗匪',
  AUTOMATON: '机兵',
  VOID: '深渊',
  MADNESS: '疯人',
  BEAST: '野兽',
  GOBLIN: '哥布林',
  UNKNOWN: '未知'
};

export const getTroopRace = (
  troop: Pick<Troop, 'id' | 'name' | 'doctrine' | 'evangelist' | 'race'>,
  imposterTroopIds: Set<string> = IMPOSTER_TROOP_IDS
): TroopRace => {
  const normalizedId = troop.id.startsWith('garrison_') ? troop.id.slice('garrison_'.length) : troop.id;
  const doctrineLabel = troop.doctrine?.trim();
  if (troop.race) return troop.race;
  if (normalizedId.startsWith('shaped_')) return 'UNKNOWN';
  if (normalizedId.startsWith('altar_') || troop.evangelist || !!doctrineLabel) return 'HUMAN';
  if (normalizedId.startsWith('bug_')) return 'UNKNOWN';
  if (imposterTroopIds.has(normalizedId)) return 'IMPOSTER';
  if (normalizedId.startsWith('roach_')) return 'ROACH';
  if (normalizedId.startsWith('undead_') || normalizedId.startsWith('skeleton') || normalizedId.startsWith('zombie') || normalizedId.startsWith('specter')) return 'UNDEAD';
  if (normalizedId.startsWith('automaton') || normalizedId.startsWith('ai_')) return 'AUTOMATON';
  if (normalizedId.startsWith('void_')) return 'VOID';
  if (normalizedId.startsWith('mad_') || normalizedId.includes('patient')) return 'MADNESS';
  if (normalizedId.startsWith('beast_')) return 'BEAST';
  if (normalizedId.startsWith('goblin_')) return 'GOBLIN';
  if (normalizedId.includes('bandit') || normalizedId.includes('raider') || normalizedId.includes('thief')) return 'BANDIT';
  const name = String(troop.name ?? '');
  if (name.includes('匪') || name.includes('盗') || name.includes('强盗') || name.includes('劫匪')) return 'BANDIT';
  return 'HUMAN';
};
