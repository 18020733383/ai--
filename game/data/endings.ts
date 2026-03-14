/**
 * 游戏结局数据与工具
 * 从 App.tsx 迁出
 */
import type { Location } from '../../types';

export type EndingContent = {
  title: string;
  subtitle: string;
  lines: string[];
};

/** 主菜单回放用结局列表 */
export const ENDING_LIST = [
  { id: 'PORTAL_CLEARED', title: '封堵裂隙', subtitle: '你夺回了回家的门。' },
  { id: 'NEW_COVENANT', title: '诸神黄昏后的新约', subtitle: '你把信仰写进废土。' },
  { id: 'HIDEOUT_FALLEN', title: '隐匿点沦陷', subtitle: '最后退路被异常吞没。' },
  { id: 'HIDEOUT_REBELLION', title: '叛军夺取隐匿点', subtitle: '内政失衡，地下燃起反旗。' },
  { id: 'ALL_DIED', title: '无名之死', subtitle: '队伍覆灭，传说终止。' }
] as const;

export function getEndingContent(
  endingKey: string,
  playerDay: number,
  playerReligionName: string
): EndingContent {
  if (endingKey === 'NEW_COVENANT') {
    return {
      title: '终章：新约',
      subtitle: `第 ${playerDay} 天`,
      lines: [
        '门亮起的那一刻，你没有伸手。',
        '你让火把从掌心熄灭，又在灰烬里点燃新的词。',
        '城市的钟声被重新校准——它们不再为旧神敲响。',
        `你把「${playerReligionName || '新约'}」写进每一块告示板，把恐惧换成秩序。`,
        '裂隙仍在那里，但它不再是唯一的路。',
        '诸神黄昏之后，你签下了新的契约。'
      ]
    };
  }
  if (endingKey === 'HIDEOUT_REBELLION') {
    return {
      title: '终章：叛军的灯火',
      subtitle: `第 ${playerDay} 天`,
      lines: [
        '地下的火把一盏盏熄灭，换成陌生的口号。',
        '你以为自己在维持秩序——其实只是在透支它。',
        '当稳定崩溃，生产与繁荣都变成了借口。',
        '叛军冲进最深处时，没有谁愿意再为你挡门。',
        '隐匿点被夺走，秘密被点燃成篝火。',
        '你的故事以"叛乱"的名义结束。'
      ]
    };
  }
  if (endingKey === 'PORTAL_CLEARED') {
    return {
      title: '终章：门',
      subtitle: `第 ${playerDay} 天`,
      lines: [
        '裂隙在你面前缓慢收拢，像合上的伤口。',
        '那些不该存在的回声逐渐沉寂，空气第一次变得干净。',
        '你听见"回家"的字眼，从很远的地方重新响起。',
        '门亮起时，英雄们都沉默了——没人知道下一步该站在哪一边。',
        '你伸出手，指尖触到一阵熟悉的刺痛：现实的边界。',
        '这是胜利，也是一场告别。'
      ]
    };
  }
  if (endingKey === 'HIDEOUT_FALLEN') {
    return {
      title: '终章：最后的退路',
      subtitle: `第 ${playerDay} 天`,
      lines: [
        '最深处的火把熄灭了。',
        '石门被撞开时，你听见自己的呼吸像空洞回音。',
        '隐匿点的结构开始崩塌——不是石头，而是"规则"。',
        '你曾以为这里是退路，后来才明白：这里只是延迟。',
        '异常吞没了路径，回家的门再也不会亮起。',
        '你的故事在黑暗里结束。'
      ]
    };
  }
  return {
    title: '终章：无名之死',
    subtitle: `第 ${playerDay} 天`,
    lines: [
      '最后一名士兵倒下时，风没有停。',
      '地图仍在延伸，历史仍在继续，只是再也与你无关。',
      '你想起很多名字，却没来得及说出口。',
      '夜色把一切抹平。',
      '你曾来过。',
      '然后离开。'
    ]
  };
}

/** 是否满足「新约」宗教结局条件：有宗教且所有城市信教比例 ≥ 90% */
export function getNewCovenantAvailable(
  locations: Location[],
  religion: { religionName: string } | null
): boolean {
  if (!religion) return false;
  const cities = (locations ?? []).filter(l => l && l.type === 'CITY');
  if (cities.length === 0) return false;
  return cities.every(c => (c.religion?.faith ?? 0) >= 90);
}
