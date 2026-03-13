import type { Enchantment, Location, MineralId, MineralPurity } from '../../types';

export const MINERAL_PURITY_LABELS: Record<MineralPurity, string> = {
  1: '裂纹',
  2: '粗炼',
  3: '稳定',
  4: '高纯',
  5: '完美'
};

export const MINERAL_META: Record<MineralId, { name: string; effect: string }> = {
  NULL_CRYSTAL: { name: '空指针结晶', effect: '无视防御、闪避、隐匿' },
  STACK_OVERFLOW: { name: '溢出堆栈', effect: '攻速加成、多重打击、冷却缩减' },
  DEADLOCK_SHARD: { name: '死循环碎片', effect: '反伤、永动续航、控制免疫' },
  HERO_CRYSTAL: { name: '英雄水晶', effect: '将士兵重构为英雄的灵魂载体（纯度=位阶）' }
};

export const MINE_CONFIGS: Partial<Record<Location['type'], { mineralId: MineralId; crystalName: string; effect: string }>> = {
  VOID_BUFFER_MINE: { mineralId: 'NULL_CRYSTAL', crystalName: '空指针结晶', effect: '无视防御、闪避、隐匿' },
  MEMORY_OVERFLOW_MINE: { mineralId: 'STACK_OVERFLOW', crystalName: '溢出堆栈', effect: '攻速加成、多重打击、冷却缩减' },
  LOGIC_PARADOX_MINE: { mineralId: 'DEADLOCK_SHARD', crystalName: '死循环碎片', effect: '反伤、永动续航、控制免疫' },
  HERO_CRYSTAL_MINE: { mineralId: 'HERO_CRYSTAL', crystalName: '英雄水晶', effect: '灵魂位阶，决定重塑英雄的强度与谈吐' }
};

export const ENCHANTMENT_RECIPES: Array<{ enchantment: Enchantment; costs: { mineralId: MineralId; purityMin: MineralPurity; amount: number }[] }> = [
  {
    enchantment: {
      id: 'null_pointer',
      name: '空指针异常',
      category: '空间逻辑类',
      description: '每次攻击有25%概率无视护甲，造成130%伤害。战力+10%。',
      powerBonus: 0.1
    },
    costs: [{ mineralId: 'NULL_CRYSTAL', purityMin: 2, amount: 1 }]
  },
  {
    enchantment: {
      id: 'stealth_process',
      name: '隐匿进程',
      category: '空间逻辑类',
      description: '战斗前2回合远程命中率-25%，近战命中率-10%。战力+8%。',
      powerBonus: 0.08
    },
    costs: [{ mineralId: 'NULL_CRYSTAL', purityMin: 2, amount: 1 }]
  },
  {
    enchantment: {
      id: 'coordinate_offset',
      name: '坐标偏移',
      category: '空间逻辑类',
      description: '被远程攻击时有30%概率完全闪避。战力+7%。',
      powerBonus: 0.07
    },
    costs: [{ mineralId: 'NULL_CRYSTAL', purityMin: 1, amount: 1 }]
  },
  {
    enchantment: {
      id: 'phase_cut',
      name: '相位切割',
      category: '空间逻辑类',
      description: '攻击有20%概率穿透格挡并追加20%伤害。战力+11%。',
      powerBonus: 0.11
    },
    costs: [{ mineralId: 'NULL_CRYSTAL', purityMin: 3, amount: 1 }]
  },
  {
    enchantment: {
      id: 'recursive_strike',
      name: '递归打击',
      category: '运算过载类',
      description: '每次普攻追加2次命中（总3段），追加段为45%伤害。战力+12%。',
      powerBonus: 0.12
    },
    costs: [{ mineralId: 'STACK_OVERFLOW', purityMin: 2, amount: 1 }]
  },
  {
    enchantment: {
      id: 'multi_threading',
      name: '多线程并行',
      category: '运算过载类',
      description: '攻速+20%，控制持续时间-20%。战力+9%。',
      powerBonus: 0.09
    },
    costs: [{ mineralId: 'STACK_OVERFLOW', purityMin: 2, amount: 1 }]
  },
  {
    enchantment: {
      id: 'cache_boost',
      name: '高速缓冲区',
      category: '运算过载类',
      description: '技能冷却-25%，每3回合额外获得1次行动。战力+13%。',
      powerBonus: 0.13
    },
    costs: [{ mineralId: 'STACK_OVERFLOW', purityMin: 3, amount: 1 }]
  },
  {
    enchantment: {
      id: 'instruction_reorder',
      name: '指令乱序',
      category: '运算过载类',
      description: '命中后有25%概率令目标下回合失去行动。战力+10%。',
      powerBonus: 0.1
    },
    costs: [{ mineralId: 'STACK_OVERFLOW', purityMin: 1, amount: 1 }]
  },
  {
    enchantment: {
      id: 'infinite_loop',
      name: '死循环护盾',
      category: '逻辑锁死类',
      description: '受到的35%伤害延迟到下一回合结算。战力+12%。',
      powerBonus: 0.12
    },
    costs: [{ mineralId: 'DEADLOCK_SHARD', purityMin: 2, amount: 1 }]
  },
  {
    enchantment: {
      id: 'read_only',
      name: '只读模式',
      category: '逻辑锁死类',
      description: '每5回合触发1回合免疫控制与负面状态，但该回合无法被治疗。战力+10%。',
      powerBonus: 0.1
    },
    costs: [{ mineralId: 'DEADLOCK_SHARD', purityMin: 2, amount: 1 }]
  },
  {
    enchantment: {
      id: 'boolean_not',
      name: '逻辑反转',
      category: '逻辑锁死类',
      description: '25%概率将受到的直接伤害转为等量治疗，25%概率将治疗转为伤害。战力+14%。',
      powerBonus: 0.14
    },
    costs: [{ mineralId: 'DEADLOCK_SHARD', purityMin: 3, amount: 1 }]
  },
  {
    enchantment: {
      id: 'state_freeze',
      name: '状态冻结',
      category: '逻辑锁死类',
      description: '被控制时持续时间减半（向上取整），硬直-40%。战力+11%。',
      powerBonus: 0.11
    },
    costs: [{ mineralId: 'DEADLOCK_SHARD', purityMin: 1, amount: 1 }]
  },
  {
    enchantment: {
      id: 'root_access',
      name: '权限提升',
      category: '系统底层类',
      description: '攻击有30%概率打断施法或蓄力，并使目标下回合伤害-20%。战力+16%。',
      powerBonus: 0.16
    },
    costs: [
      { mineralId: 'NULL_CRYSTAL', purityMin: 3, amount: 1 },
      { mineralId: 'STACK_OVERFLOW', purityMin: 3, amount: 1 }
    ]
  },
  {
    enchantment: {
      id: 'rollback',
      name: '回滚机制',
      category: '系统底层类',
      description: '生命低于30%时触发一次，回复最大生命40%并清除负面状态（每战1次）。战力+20%。',
      powerBonus: 0.2
    },
    costs: [
      { mineralId: 'STACK_OVERFLOW', purityMin: 4, amount: 1 },
      { mineralId: 'DEADLOCK_SHARD', purityMin: 4, amount: 1 }
    ]
  },
  {
    enchantment: {
      id: 'junk_code',
      name: '乱码污染',
      category: '系统底层类',
      description: '命中后使目标命中率-25%、防御-15%，持续2回合。战力+15%。',
      powerBonus: 0.15
    },
    costs: [
      { mineralId: 'NULL_CRYSTAL', purityMin: 3, amount: 1 },
      { mineralId: 'DEADLOCK_SHARD', purityMin: 3, amount: 1 }
    ]
  },
  {
    enchantment: {
      id: 'kernel_fault',
      name: '内核错断',
      category: '系统底层类',
      description: '战斗前2回合敌军速度-20%、命中-15%。战力+17%。',
      powerBonus: 0.17
    },
    costs: [
      { mineralId: 'NULL_CRYSTAL', purityMin: 4, amount: 1 },
      { mineralId: 'STACK_OVERFLOW', purityMin: 4, amount: 1 }
    ]
  }
];
