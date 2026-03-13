import type { BuildingType } from '../../types';

export type BuildingOption = { type: BuildingType; name: string; cost: number; days: number; description: string };

export const BUILDING_OPTIONS: BuildingOption[] = [
  { type: 'FACTORY', name: '工厂', cost: 600, days: 3, description: '每隔数天带来稳定收益。' },
  { type: 'HOUSING', name: '民居', cost: 260, days: 2, description: '提供税收来源，也会提高据点的存在感。' },
  { type: 'HOUSING_II', name: '民居·II', cost: 520, days: 3, description: '扩建居所与附属设施，提高税收与稳定预期。' },
  { type: 'HOUSING_III', name: '民居·III', cost: 980, days: 4, description: '成熟社区与配套体系，显著提升税收与民心。' },
  { type: 'UNDERGROUND_PLAZA', name: '地下广场', cost: 760, days: 4, description: '地下层的集会空间，提升稳定与和谐。' },
  { type: 'CANTEEN', name: '餐厅', cost: 540, days: 3, description: '提供稳定餐食，改善士气与和谐。' },
  { type: 'TAVERN', name: '酒馆', cost: 640, days: 3, description: '放松与消息交换场所，提升繁荣。' },
  { type: 'THEATER', name: '剧场', cost: 920, days: 4, description: '娱乐演出提升繁荣与和谐。' },
  { type: 'ARENA', name: '斗技场', cost: 980, days: 4, description: '训练与竞技并行，提升稳定与生产力。' },
  { type: 'TRAINING_CAMP', name: '训练营', cost: 500, days: 3, description: '驻军获得经验并自动晋升。' },
  { type: 'BARRACKS', name: '兵营', cost: 800, days: 4, description: '驻军容量提升 50%。' },
  { type: 'DEFENSE', name: '防御建筑', cost: 700, days: 4, description: '增强据点防御强度。' },
  { type: 'FIRE_CRYSTAL_MINE', name: '火水晶地雷', cost: 520, days: 3, description: '埋设魔法地雷，冲锋时爆燃。' },
  { type: 'MAGIC_CIRCLE_AMPLIFY', name: '增幅法阵', cost: 680, days: 4, description: '放大术式火力，提升远程压制。' },
  { type: 'MAGIC_CIRCLE_WARD', name: '护盾法阵', cost: 680, days: 4, description: '护盾覆盖防线，削弱近战冲击。' },
  { type: 'MAGIC_CIRCLE_RESTORE', name: '恢复法阵', cost: 780, days: 5, description: '修复受损工事，延长防线维持。' },
  { type: 'ARCANE_CRYSTAL_ARRAY', name: '魔法水晶阵列', cost: 620, days: 3, description: '稳定供能，提高防御效率。' },
  { type: 'ANTI_MAGIC_PYLON', name: '反魔法尖塔', cost: 980, days: 5, description: '干扰敌方法阵与空袭。' },
  { type: 'RECRUITER', name: '征兵官', cost: 650, days: 3, description: '定期招募新兵加入驻军。' },
  { type: 'CHAPEL', name: '小教堂', cost: 720, days: 4, description: '提高传教效率，缓冲信教比例的负面波动。' },
  { type: 'SHRINE', name: '神殿', cost: 720, days: 4, description: '若你已确立宗教，会周期性招募信徒守卫此层。' },
  { type: 'ORE_REFINERY', name: '矿石精炼厂', cost: 780, days: 4, description: '花钱与时间将低纯度矿石熔炼为更高纯度。' },
  { type: 'HOSPITAL_I', name: '地下医院·I', cost: 520, days: 3, description: '简易诊疗与担架通道，能更快让伤兵恢复。' },
  { type: 'HOSPITAL_II', name: '地下医院·II', cost: 920, days: 4, description: '更完善的隔离区与药剂储备，显著缩短伤兵恢复。' },
  { type: 'HOSPITAL_III', name: '地下医院·III', cost: 1450, days: 5, description: '完整的地下医馆体系，把死亡率压到最低水平。' },
  { type: 'CAMOUFLAGE_STRUCTURE', name: '伪装结构', cost: 680, days: 4, description: '降低隐匿点暴露程度（冷却），仅限地面层。' },
  { type: 'CAMOUFLAGE_STRUCTURE_II', name: '伪装结构·II', cost: 1080, days: 5, description: '强化伪装与暗道网络，降低暴露幅度并缩短冷却。' },
  { type: 'CAMOUFLAGE_STRUCTURE_III', name: '伪装结构·III', cost: 1580, days: 6, description: '完整的伪装体系与误导网络，大幅降低暴露并减少冷却。' },
  { type: 'AA_TOWER_I', name: '防空箭塔·I', cost: 420, days: 2, description: '对空火力覆盖，提升守方防空强度。' },
  { type: 'AA_TOWER_II', name: '防空箭塔·II', cost: 760, days: 3, description: '更密集的对空火力与瞄准体系。' },
  { type: 'AA_TOWER_III', name: '防空箭塔·III', cost: 1200, days: 4, description: '成体系的防空火网，压制空袭与制空渗透。' },
  { type: 'AA_NET_I', name: '防空幕网·I', cost: 520, days: 2, description: '在关键区域布置幕网与诱饵，降低空袭杀伤。' },
  { type: 'AA_NET_II', name: '防空幕网·II', cost: 880, days: 3, description: '更高密度的幕网与诱饵阵列。' },
  { type: 'AA_RADAR_I', name: '预警瞭望链·I', cost: 460, days: 2, description: '改良岗哨与信号传递，提高对空发现与远程命中。' },
  { type: 'AA_RADAR_II', name: '预警瞭望链·II', cost: 820, days: 3, description: '更完整的预警与引导，显著提升对空命中。' },
  { type: 'MAZE_I', name: '迷宫·I', cost: 520, days: 2, description: '入口迷阵与岔路陷阱，让敌军在黑暗中迷失。' },
  { type: 'MAZE_II', name: '迷宫·II', cost: 920, days: 3, description: '更复杂的回廊与诱导路标，将敌军拖入无意义的绕行。' },
  { type: 'MAZE_III', name: '迷宫·III', cost: 1450, days: 4, description: '成体系的迷宫网络与封闭门闩，把时间榨干。' }
];

export const getBuildingName = (type: BuildingType) =>
  BUILDING_OPTIONS.find(b => b.type === type)?.name ?? type;
