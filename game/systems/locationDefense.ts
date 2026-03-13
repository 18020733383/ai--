import type { BuildingType, Location } from '../../types';
import { isUndeadFortressLocation } from './worldInit';

const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export type LocationDefenseDetails = {
  wallLevel: number;
  wallName: string;
  wallDesc: string;
  mechanisms: { name: string; description: string }[];
  flavorText: string;
  wallHp: number;
  mechanismHp: number;
  rangedHitBonus: number;
  rangedDamageBonus: number;
  meleeDamageReduction: number;
  antiAirPowerBonus: number;
  airstrikeDamageReduction: number;
};

export function getLocationDefenseDetails(location: Location): LocationDefenseDetails {
  const details: LocationDefenseDetails = {
    wallLevel: 0,
    wallName: "无",
    wallDesc: "没有任何防御工事。",
    mechanisms: [],
    flavorText: "这里毫无设防。",
    wallHp: 0,
    mechanismHp: 0,
    rangedHitBonus: 0,
    rangedDamageBonus: 0,
    meleeDamageReduction: 0,
    antiAirPowerBonus: 0,
    airstrikeDamageReduction: 0
  };

  if (location.type === 'CITY') {
    details.wallLevel = 3;
    details.wallName = "巨石城墙";
    details.wallDesc = "坚不可摧的防御体系，足以抵御长时间围攻。";
    details.mechanisms = [
      { name: "重型投石机", description: "投掷巨大的石块，对攻城塔和密集步兵造成毁灭性打击。" },
      { name: "燃烧油锅", description: "向城墙下倾倒滚烫的热油，主要用于防御云梯攀爬者。" },
      { name: "多重箭塔", description: "提供交叉火力覆盖，没有任何死角。" },
      { name: "护城沟", description: "充满尖刺和污水的壕沟，阻碍攻城器械靠近。" }
    ];
    details.flavorText = "这座城市的防御固若金汤，是敌人的噩梦。";
  } else if (location.type === 'CASTLE') {
    details.wallLevel = 2;
    details.wallName = "加固石墙";
    details.wallDesc = "坚固的石墙，配合地形易守难攻。";
    details.mechanisms = [
      { name: "床弩", description: "发射巨大的弩箭，可以贯穿攻城锤的护板。" },
      { name: "滚石", description: "从城头推下的巨石，简单但致命。" },
      { name: "拒马木桩", description: "布置在城门前的障碍物，防止骑兵直接冲击城门。" }
    ];
    details.flavorText = "扼守要道的堡垒，每一块石头都浸透了鲜血。";
  } else if (location.type === 'VILLAGE') {
    details.wallLevel = 1;
    details.wallName = "木栅栏";
    details.wallDesc = "提供远程防御加成，阻挡骑兵冲锋。";
    details.mechanisms = [
      { name: "瞭望塔", description: "提供早期预警，增加弓箭手的射程。" },
      { name: "简易壕沟", description: "挖出的浅坑，用来绊倒马匹。" }
    ];
    details.flavorText = "这座据点的防御工事看起来聊胜于无。";
  } else if (location.type === 'HOTPOT_RESTAURANT') {
    details.wallLevel = 1;
    details.wallName = "蒸汽管道";
    details.wallDesc = "迷宫般的后厨和高温蒸汽管道。";
    details.mechanisms = [
      { name: "火油陷阱", description: "伪装成地滑的油污，点火后会引发大火。" },
      { name: "高压蒸汽喷口", description: "突然喷出的高温蒸汽，能瞬间煮熟铠甲里的肉。" }
    ];
    details.flavorText = "想要攻下这里，先得问问厨师长答不答应。";
  } else if (location.type === 'GRAVEYARD') {
    if (isUndeadFortressLocation(location)) {
      details.wallLevel = 3;
      details.wallName = "冥火城墙";
      details.wallDesc = "由白骨与冥火凝成的堡垒外壳，攻城器械靠近会被灼烧。";
      details.mechanisms = [
        { name: "冥火箭塔", description: "燃着幽焰的箭塔，火力稳定且不知疲倦。" },
        { name: "骨爆地雷", description: "埋在泥土里的骨爆装置，能撕裂密集冲锋队列。" },
        { name: "灵魂枷锁", description: "看不见的幽灵触手，会减缓敌人的移动速度。" }
      ];
      details.flavorText = "这里像一座活着的坟墓。";
    } else {
      details.wallLevel = 2;
      details.wallName = "白骨围栏";
      details.wallDesc = "由不知名生物的骸骨堆砌而成的围墙。";
      details.mechanisms = [
        { name: "亡灵哨塔", description: "由骷髅弓箭手驻守的哨塔，永不疲倦。" },
        { name: "灵魂枷锁", description: "看不见的幽灵触手，会减缓敌人的移动速度。" }
      ];
      details.flavorText = "生者勿进。";
    }
  } else if (location.type === 'RUINS') {
    details.wallLevel = 1;
    details.wallName = "残垣断壁";
    details.wallDesc = "曾经辉煌的建筑如今只剩下危险的废墟。";
    details.mechanisms = [
      { name: "碎石迷阵", description: "不稳定的地形，容易导致攻城器械损坏。" },
      { name: "陷坑机关", description: "古代遗留的陷阱，至今依然有效。" }
    ];
    details.flavorText = "在这里，地形本身就是致命的武器。";
  } else if (location.type === 'BANDIT_CAMP') {
    details.wallLevel = 1;
    details.wallName = "简陋木墙";
    details.wallDesc = "甚至漏风的木板墙。";
    details.mechanisms = [
      { name: "陷阱网", description: "从树上落下的捕兽网，用于捕捉活口。" },
      { name: "警铃", description: "挂满空罐头的绳子，一碰就响。" }
    ];
    details.flavorText = "一群乌合之众的窝点。";
  } else if (location.type === 'FIELD_CAMP') {
    details.wallLevel = 1;
    details.wallName = "木栅与拒马";
    details.wallDesc = "临时搭建的木栅与拒马，能提供有限的掩护。";
    details.mechanisms = [
      { name: "简易壕沟", description: "浅沟与土堆，能拖慢冲锋并提供掩体。" },
      { name: "岗哨旗台", description: "升起旗帜、传递信号，便于组织防御。" }
    ];
    details.flavorText = "行军中的部队在此扎营，警戒森严。";
  } else if (location.type === 'HIDEOUT') {
    const layerIndexRaw = (location.activeSiege as any)?.hideoutLayerIndex ?? location.hideout?.selectedLayer ?? 0;
    const layers = location.hideout?.layers ?? [];
    const layerIndex = Math.max(0, Math.min(layers.length - 1, Math.floor(layerIndexRaw)));
    const layer = layers[layerIndex];
    const depth = layer?.depth ?? layerIndex;
    details.wallLevel = Math.min(6, 1 + depth);
    details.wallName = depth === 0 ? "地表入口工事" : `地下防线·第${depth}层`;
    details.wallDesc = "地表与地层之间的狭窄通道，易守难攻。";
    details.mechanisms = [
      { name: "暗道闸门", description: "通道狭窄且多处可封闭，敌军难以展开。" },
      { name: "陷阱回廊", description: "地刺、落石与爆燃装置布在转角处。" }
    ];
    details.flavorText = "向下，是层层叠叠的黑暗与工事。";
  } else if (location.type === 'ASYLUM') {
    details.wallLevel = 4;
    details.wallName = "高压电网";
    details.wallDesc = "通了高压电的加固围墙，防止病人逃跑（或入侵）。";
    details.mechanisms = [
      { name: "镇静剂喷雾", description: "全覆盖的喷淋系统，能让狂暴的战士变得温顺。" },
      { name: "电击陷阱", description: "踩中地板会释放高压电流，不仅麻痹身体，还治疗网瘾。" },
      { name: "拘束网发射器", description: "自动发射拘束衣的炮台，命中率惊人。" }
    ];
    details.flavorText = "即使是苍蝇飞进去，也要穿上拘束衣。";
  } else if (location.type === 'MARKET') {
    details.wallLevel = 1;
    details.wallName = "鸟笼阵列";
    details.wallDesc = "无数的鸟笼构成了独特的防御迷宫。";
    details.mechanisms = [
      { name: "声波攻击(鸟叫)", description: "数万只鸟同时尖叫，对耳膜造成物理伤害。" },
      { name: "高空坠物", description: "不仅是鸟粪，还有花盆和鸟食罐。" }
    ];
    details.flavorText = "在这里作战，你需要一把好伞。";
  } else if (location.type === 'TRAINING_GROUNDS') {
    details.wallLevel = 2;
    details.wallName = "演习护栏";
    details.wallDesc = "用于模拟攻城战的训练设施。";
    details.mechanisms = [
      { name: "训练假人", description: "看起来像真人，会吸引敌人的火力。" },
      { name: "钝头弩炮", description: "发射钝头弩箭，虽然不会死人，但会被打飞很远。" }
    ];
    details.flavorText = "虽然是演习，但打在身上还是很疼。";
  } else if (location.type === 'ROACH_NEST') {
    details.wallLevel = 3;
    details.wallName = "纸箱堡垒";
    details.wallDesc = "用纸箱、胶带和发霉木板堆出来的\u201C工事\u201D，看起来很敷衍，但数量多到你绕不过去。";
    details.mechanisms = [
      { name: "快递纸盒城墙", description: "层层叠叠的纸盒吸收冲击，冲车撞上去像撞进一堆\u201C缓冲区\u201D。" },
      { name: "胶带拒马", description: "黏到鞋底的那种，跑得越快摔得越惨。" },
      { name: "瓶盖地雷阵", description: "踩上去会'啪'一声响，伤害不大，但羞辱性极强。" },
      { name: "方便面蒸汽烟幕", description: "热气与怪味形成烟幕，弓弩手命中率下降，指挥官心态也下降。" },
      { name: "家具脚轮滚桶", description: "看似垃圾桶，其实能顺坡滚下来，把阵型直接撞成'散列表'。" }
    ];
    details.flavorText = "你听见了很多'嗡——'，以及某个角落里在认真开会的声音。";
  } else if (location.type === 'IMPOSTER_PORTAL') {
    details.wallLevel = 6;
    details.wallName = "维度防火墙";
    details.wallDesc = "由扭曲的现实、错误代码和绝望构成的不可视之墙。物理攻击经常会被判定为无效。";
    details.mechanisms = [
      { name: "空指针陷阱 (Null Pointer Trap)", description: "踏入其中的单位会因为找不到自身坐标而瞬间消失。" },
      { name: "无限循环护城河 (Infinite Loop Moat)", description: "掉进去的人会永远在同一个动作中循环，直到饿死。" },
      { name: "堆栈溢出屏障 (Stack Overflow Barrier)", description: "试图翻越的敌人会被过量的数据流冲垮，大脑过载。" },
      { name: "静电噪音发生器", description: "持续播放白噪音，干扰指挥官的命令传递。" },
      { name: "像素迷彩网", description: "防御设施在视觉上是马赛克，难以瞄准。" },
      { name: "乱码投掷机", description: "投掷出的不是石块，而是实体化的乱码字符，锋利无比。" },
      { name: "语法错误地雷", description: "触发后会修改周围的物理规则，比如重力反转。" },
      { name: "逻辑死锁门 (Deadlock Gate)", description: "两扇门互相等待对方开启，导致永远无法打开，坚不可摧。" },
      { name: "资源耗尽力场", description: "在这个范围内，体力和魔法值恢复速度归零。" },
      { name: "内存泄漏池 (Memory Leak Pool)", description: "站在上面的单位会随着时间推移逐渐失去生命上限。" },
      { name: "递归箭塔 (Recursive Turret)", description: "射出一支箭，这支箭会分裂成两支，然后继续分裂..." },
      { name: "分形护盾发生器", description: "护盾由无数个小护盾组成，每一个都拥有整体的强度。" },
      { name: "蓝屏冲击波 (BSOD Blast)", description: "周期性释放蓝色光波，强制敌方机械单位重启。" },
      { name: "内核恐慌诱发装置", description: "让周围的生物感到莫名的、源自灵魂深处的恐慌。" },
      { name: "段错误切割网 (Segfault Mesh)", description: "接触到的物体会被判定为\u201C非法访问\u201D而被直接切断。" },
      { name: "404 虚空投射器", description: "将被击中的区域标记为\u201C未找到\u201D，该区域内的任何东西都会坠入虚空。" },
      { name: "非法操作拦截网", description: "拦截所有飞行道具，并将其标记为\u201C非法操作\u201D而删除。" },
      { name: "数据包丢弃区", description: "进入该区域的单位有50%的概率\u201C丢包\u201D，即动作无法执行。" },
      { name: "延迟尖刺陷阱 (Lag Spike)", description: "当你以为安全通过时，尖刺会在3秒后突然判定命中你。" },
      { name: "丢包率干扰器", description: "让远程攻击的命中率大幅下降。" },
      { name: "强制垃圾回收站 (GC Station)", description: "周期性清除战场上的尸体和虚弱单位（斩杀低血量）。" },
      { name: "并发冲突雷区", description: "多人同时踩踏会引发巨大的爆炸。" },
      { name: "野指针触手阵", description: "从地下伸出的触手，胡乱攻击周围的一切。" },
      { name: "浮点误差力场", description: "所有的伤害计算都会产生微小的误差，积少成多导致护甲失效。" },
      { name: "类型不匹配屏障", description: "只有特定类型的兵种才能通过，其他类型会被弹开。" },
      { name: "未捕获异常发射井", description: "发射不稳定的能量球，爆炸效果完全随机。" },
      { name: "死循环漩涡", description: "将附近的敌人吸入中心，无法逃脱。" },
      { name: "版本回退时光机", description: "将小范围内的敌人状态回退到受伤前...或者更糟的状态。" },
      { name: "祖传代码屎山 (Legacy Code Mountain)", description: "看起来摇摇欲坠，但没人敢动它。任何攻击都会引发不可预知的连锁反应。" },
      { name: "系统崩溃核心 (System Crash Core)", description: "一旦防御被突破，核心会自爆，试图拉着整个世界一起崩溃。" },
      { name: "全服回档按钮", description: "极低概率触发，让战斗时间倒流。" },
      { name: "停机维护倒计时", description: "给攻城方施加巨大的心理压力，时间耗尽则判负。" },
      { name: "数据抹除光束", description: "被击中的单位不仅会死亡，还会被从历史上抹去（无法复活）。" },
      { name: "账号封禁法阵", description: "踏入法阵的英雄会被暂时\u201C封号\u201D，无法使用技能。" },
      { name: "防沉迷结界", description: "战斗时间越长，攻城方属性越低。" },
      { name: "氪金验证通道", description: "只有消耗大量第纳尔才能通过的快速通道（其实是陷阱）。" },
      { name: "外挂检测哨塔", description: "对属性异常高的单位（如玩家）造成额外伤害。" },
      { name: "DDOS 洪流炮", description: "发射高密度的垃圾数据流，瘫痪敌人的行动。" },
      { name: "服务器熔断器", description: "当受到过量伤害时，暂时免疫一切伤害。" },
      { name: "热更新补丁网", description: "受损的城墙会在战斗中自动修复。" },
      { name: "维度防火墙 (Firewall)", description: "字面意义上的火墙，燃烧着绿色的代码之火。" }
    ];
    details.flavorText = "这里是世界的伤口，任何靠近的人都会被存在本身排斥。在这里，物理法则只是建议，不是铁律。";
  }

  const hideoutLayerIndexRaw = (location.activeSiege as any)?.hideoutLayerIndex ?? location.hideout?.selectedLayer ?? 0;
  const hideoutLayers = location.hideout?.layers ?? [];
  const hideoutLayerIndex = Math.max(0, Math.min(hideoutLayers.length - 1, Math.floor(hideoutLayerIndexRaw)));
  const normalizeSlots = (slots: any[] | undefined) => (Array.isArray(slots) ? slots : [])
    .map(s => ({ type: (s as any)?.type as BuildingType | null, daysLeft: (s as any)?.daysLeft as number | undefined }))
    .filter(s => !!s.type && !(typeof s.daysLeft === 'number' && s.daysLeft > 0))
    .map(s => s.type as BuildingType);
  const built = location.type === 'HIDEOUT'
    ? normalizeSlots(hideoutLayers[hideoutLayerIndex]?.defenseSlots as any)
    : (location.buildings ?? []);
  const countOf = (t: BuildingType) => built.reduce((acc, x) => acc + (x === t ? 1 : 0), 0);
  const hasDefenseBuilding = countOf('DEFENSE') > 0;
  const pushMechanism = (name: string, description: string, count: number) => {
    if (count <= 0) return;
    details.mechanisms.push({ name: count > 1 ? `${name} x${count}` : name, description });
  };
  let extraMechanismHp = 0;
  let extraRangedHit = 0;
  let extraRangedDamage = 0;
  let extraMeleeReduction = 0;
  const aaTower1 = countOf('AA_TOWER_I');
  const aaTower2 = countOf('AA_TOWER_II');
  const aaTower3 = countOf('AA_TOWER_III');
  const aaNet1 = countOf('AA_NET_I');
  const aaNet2 = countOf('AA_NET_II');
  const aaRadar1 = countOf('AA_RADAR_I');
  const aaRadar2 = countOf('AA_RADAR_II');
  const camouflage1 = countOf('CAMOUFLAGE_STRUCTURE');
  const camouflage2 = countOf('CAMOUFLAGE_STRUCTURE_II');
  const camouflage3 = countOf('CAMOUFLAGE_STRUCTURE_III');
  const maze1 = countOf('MAZE_I');
  const maze2 = countOf('MAZE_II');
  const maze3 = countOf('MAZE_III');
  const fireCrystalMine = countOf('FIRE_CRYSTAL_MINE');
  const magicAmplify = countOf('MAGIC_CIRCLE_AMPLIFY');
  const magicWard = countOf('MAGIC_CIRCLE_WARD');
  const magicRestore = countOf('MAGIC_CIRCLE_RESTORE');
  const crystalArray = countOf('ARCANE_CRYSTAL_ARRAY');
  const antiMagicPylon = countOf('ANTI_MAGIC_PYLON');
  pushMechanism("防空箭塔·I", "加固箭塔与集束瞄具，可稳定压制低空目标。", aaTower1);
  details.antiAirPowerBonus += 0.12 * aaTower1;
  extraMechanismHp += 120 * aaTower1;
  extraRangedHit += 0.02 * aaTower1;
  pushMechanism("防空箭塔·II", "加装连弩与导引标尺，对空火力密度显著提升。", aaTower2);
  details.antiAirPowerBonus += 0.22 * aaTower2;
  extraMechanismHp += 220 * aaTower2;
  extraRangedHit += 0.03 * aaTower2;
  pushMechanism("防空箭塔·III", "分区火网与齐射号令，对空压制可持续维持。", aaTower3);
  details.antiAirPowerBonus += 0.35 * aaTower3;
  extraMechanismHp += 320 * aaTower3;
  extraRangedHit += 0.04 * aaTower3;
  extraRangedDamage += 0.02 * aaTower3;
  pushMechanism("防空幕网·I", "在城防关键点布置幕网与诱饵，降低空袭穿透效率。", aaNet1);
  details.airstrikeDamageReduction += 0.12 * aaNet1;
  extraMechanismHp += 160 * aaNet1;
  extraMeleeReduction += 0.01 * aaNet1;
  pushMechanism("防空幕网·II", "更高密度的幕网与诱饵阵列，显著削弱空对地打击。", aaNet2);
  details.airstrikeDamageReduction += 0.22 * aaNet2;
  extraMechanismHp += 260 * aaNet2;
  extraMeleeReduction += 0.02 * aaNet2;
  pushMechanism("预警瞭望链·I", "岗哨与信号点连成体系，提高提前发现与对空引导。", aaRadar1);
  details.antiAirPowerBonus += 0.08 * aaRadar1;
  extraMechanismHp += 120 * aaRadar1;
  extraRangedHit += 0.03 * aaRadar1;
  pushMechanism("预警瞭望链·II", "更完整的预警与引导网络，对空射击命中显著提升。", aaRadar2);
  details.antiAirPowerBonus += 0.14 * aaRadar2;
  extraMechanismHp += 200 * aaRadar2;
  extraRangedHit += 0.05 * aaRadar2;
  pushMechanism("伪装结构", "用伪装与隔离降低暴露程度。", camouflage1);
  pushMechanism("伪装结构·II", "暗道与误导节点成网，进一步降低暴露。", camouflage2);
  pushMechanism("伪装结构·III", "完整伪装体系与隔离链路，大幅降低暴露。", camouflage3);
  pushMechanism("迷宫·I", "迷阵与岔路将敌军拖慢。", maze1);
  pushMechanism("迷宫·II", "更复杂的回廊网络，将敌军拖慢更久。", maze2);
  pushMechanism("迷宫·III", "成体系的迷宫网络，把时间榨干。", maze3);
  pushMechanism("火水晶地雷", "埋设火水晶引爆点，冲锋时爆燃。", fireCrystalMine);
  extraMechanismHp += 180 * fireCrystalMine;
  extraMeleeReduction += 0.02 * fireCrystalMine;
  extraRangedDamage += 0.01 * fireCrystalMine;
  pushMechanism("增幅法阵", "强化术式输出，远程火力更密集。", magicAmplify);
  extraMechanismHp += 140 * magicAmplify;
  extraRangedHit += 0.02 * magicAmplify;
  extraRangedDamage += 0.03 * magicAmplify;
  pushMechanism("护盾法阵", "护盾阵列覆盖城防，近战冲击被削弱。", magicWard);
  extraMechanismHp += 160 * magicWard;
  extraMeleeReduction += 0.03 * magicWard;
  pushMechanism("恢复法阵", "战斗中自我修复，提升防御持续力。", magicRestore);
  extraMechanismHp += 220 * magicRestore;
  details.wallHp += 120 * magicRestore;
  pushMechanism("魔法水晶阵列", "稳定输出法力，强化防御火力。", crystalArray);
  extraMechanismHp += 150 * crystalArray;
  extraRangedDamage += 0.02 * crystalArray;
  pushMechanism("反魔法尖塔", "扰动敌方法阵，削弱空袭与远程。", antiMagicPylon);
  extraMechanismHp += 260 * antiMagicPylon;
  details.airstrikeDamageReduction += 0.18 * antiMagicPylon;
  extraRangedHit += 0.02 * antiMagicPylon;

  const mechanismCount = details.mechanisms.length;
  details.wallHp = Math.max(0, details.wallLevel) * 650 + (hasDefenseBuilding ? 260 : 0);
  details.mechanismHp = mechanismCount * 140 + extraMechanismHp;
  details.rangedHitBonus = clampValue(0.02 + details.wallLevel * 0.05 + mechanismCount * 0.007 + (hasDefenseBuilding ? 0.02 : 0) + extraRangedHit, 0, 0.55);
  details.rangedDamageBonus = clampValue(details.wallLevel * 0.05 + mechanismCount * 0.007 + (hasDefenseBuilding ? 0.03 : 0) + extraRangedDamage, 0, 0.45);
  details.meleeDamageReduction = clampValue(details.wallLevel * 0.04 + mechanismCount * 0.008 + (hasDefenseBuilding ? 0.02 : 0) + extraMeleeReduction, 0, 0.45);
  details.antiAirPowerBonus = clampValue(details.antiAirPowerBonus, 0, 0.85);
  details.airstrikeDamageReduction = clampValue(details.airstrikeDamageReduction, 0, 0.65);
  return details;
}
