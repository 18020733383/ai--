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
    "这就是你的战术？笑死鸟了！",
    "我又饿了，穷鬼！",
    "快点走，蜗牛都比你快！",
    "哎呀，又输了？",
    "你的剑是拿来切菜的吗？"
  ],
  GLOOMY: [
    "我们会死在这里的...",
    "我看不到希望...",
    "这雨水尝起来像眼泪...",
    "末日近了...",
    "唉..."
  ],
  WISE: [
    "知彼知己，百战不殆。",
    "不要被怒火冲昏了头脑。",
    "观察风向，它会告诉你答案。",
    "真正的力量源于内心。",
    "有些战斗是可以避免的。"
  ],
  MANIC: [
    "哇啊啊啊！冲啊！",
    "爆炸！爆炸！艺术就是爆炸！",
    "我们要去哪？！我们要去哪？！",
    "血！我要看到血流成河！",
    "嘿嘿嘿嘿嘿！"
  ]
};

export const parrotMischiefEvents = [
  { action: "啃坏了装备架", cost: 2, taunt: "这木头口感不错！" },
  { action: "在地图上拉了一坨", cost: 5, taunt: "帮你在地图上做个标记，不用谢！" },
  { action: "偷走了一枚金币藏起来", cost: 1, taunt: "亮晶晶的！我的！" },
  { action: "啄伤了新兵的手指", cost: 3, taunt: "那根手指指着我不礼貌！" },
  { action: "骂了路过的商人傻瓜", cost: 10, taunt: "那家伙看起来就是个奸商！" },
  { action: "偷吃了应急干粮", cost: 4, taunt: "味道有点干，下次加点酱！" },
  { action: "撕掉了编年史的一页", cost: 6, taunt: "这段历史太无聊了，我帮你删了！" },
  { action: "打翻了油灯", cost: 8, taunt: "这里太黑了，我想看看火光！" },
  { action: "把你的靴子藏到了房顶", cost: 5, taunt: "光脚走路有益健康！" },
  { action: "模仿长官下达了错误的命令", cost: 7, taunt: "向左转！不，向右转！哈哈！" }
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
