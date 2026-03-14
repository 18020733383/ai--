export type HideoutGovEvent = {
  id: string;
  title: string;
  lines: string[];
};

export const HIDEOUT_GOV_EVENTS: HideoutGovEvent[] = [
  { id: 'tax_dispute', title: '税吏争执', lines: ['税吏与工坊主在税率上争执不休，工人开始停工。', '如果处理不当，生产会受到影响。'] },
  { id: 'smuggling', title: '走私风波', lines: ['巡逻发现走私货物流入市集，几方势力互相指责。', '放任会破坏秩序，但强硬会影响和谐。'] },
  { id: 'food_shortage', title: '粮仓告急', lines: ['储备粮损耗超出预期，居民开始抱怨配给。', '若不安抚，稳定性将下滑。'] },
  { id: 'craftsmen_guild', title: '工匠纠纷', lines: ['工匠行会要求更多资源与保护，否则将减少产出。', '这是提高生产力还是拖累繁荣的选择。'] },
  { id: 'watch_patrol', title: '巡逻懈怠', lines: ['巡逻队怠工导致盗窃事件增多，治安下滑。', '需要迅速整顿纪律。'] },
  { id: 'market_opportunity', title: '流动市集', lines: ['一批流动商队愿意暂驻据点，带来繁荣机会。', '也会增加据点暴露风险。'] },
  { id: 'water_supply', title: '水源污染', lines: ['地下水源出现异常气味，居民情绪不安。', '若不处理，和谐度将降低。'] },
  { id: 'militia_pressure', title: '民兵诉求', lines: ['民兵要求提升待遇与装备，否则将减少巡防力度。', '权衡成本与稳定性至关重要。'] }
];
