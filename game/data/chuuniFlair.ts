/** 中二风味台词与随机宣告（玩法系统与日志复用） */

const pick = (arr: string[]): string => {
  if (arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
};

export const CHUUNI_VICTORY_LINES = [
  '这一页战史……以你的真名起首！',
  '因果线在指尖崩断——胜者是书写法则的人。',
  '跪下吧，余波。见证者只有风与残渣。',
  '「胜利」不过是凡人能听懂的别名，其真名为——唔，算了，你赢了。',
  '深渊侧目了一瞬，又继续打盹。今日算你过关。',
  '传令：把「不可战胜」的标签从我的名号上撕下来——换成更大的那张。'
];

export const CHUUNI_DEFEAT_LINES = [
  '唔……这是命运预留的败笔，下一章自会翻盘。',
  '共鸣……逆流了。撤退不算耻辱，算战术性谢幕。',
  '世界线微微震颤——你输了，但谱曲尚未终章。',
  '真名蒙尘。去找更强的藉口……不，更强的盟友吧。',
  '此战记入「尚在冷却的劫」，改日再以全称咏唱。'
];

export const CHUUNI_OATH_BATTLE_LINES = [
  '【宣告】真名锁已解——此阵之内，余将代行「常识』的死刑！',
  '听好：这一击冠名「尚未备案的奇迹」，许可编号……临场签发！',
  '共鸣 overflow——全军听我倒数，三、二、一……「展开」！'
];

export const CHUUNI_OATH_PLEDGE_LINES = [
  '你燃烧了部分中二力，向下一战烙下胜利的傲慢前缀。',
  '虚空收据已开：35 点共鸣换一场「念出招式全名」的特权。',
  '很好。敌军还不知道自己即将出现在你个人志的扉页上。'
];

export const CHUUNI_TRAINING_WIN = [
  '演武场的木人：我已经什么都不想了。',
  '模拟战胜利——在「if 线」里，你确实无双。'
];

/** 命运宣告 d6：文案 + 对 gold / renown / chuuniResonance 的增量 */
export const CHUUNI_FATE_ROLLS: Array<{
  line: string;
  gold: number;
  renown: number;
  resonance: number;
}> = [
  { line: '「逆流刻印」——钱包微微一痛，但你窥见了更深的真理。（共鸣+15，金币-40）', gold: -40, renown: 0, resonance: 15 },
  { line: '「无名者的私语」——什么都没发生……才怪，声望像幽灵般涨了一截。', gold: 0, renown: 6, resonance: 5 },
  { line: '「伪典·一页」——捡到了谁丢的剧情道具般的一笔横财。', gold: 55, renown: 0, resonance: 0 },
  { line: '「双月相位」——名与力同时摇曳，世界对你多看了一眼。', gold: 20, renown: 4, resonance: 8 },
  { line: '「自我指涉的悖论」——你太强了，所以共鸣自检扣了一点……开玩笑的，扣的不多。', gold: 0, renown: 0, resonance: -5 },
  { line: '「终幕彩排」——大满贯。金币、声望与中二力同时点头致意。', gold: 35, renown: 5, resonance: 12 }
];

export function pickChuuniVictoryLine(): string {
  return pick(CHUUNI_VICTORY_LINES);
}

export function pickChuuniDefeatLine(): string {
  return pick(CHUUNI_DEFEAT_LINES);
}

export function pickChuuniOathBattleLine(): string {
  return pick(CHUUNI_OATH_BATTLE_LINES);
}

export function pickChuuniOathPledgeLine(): string {
  return pick(CHUUNI_OATH_PLEDGE_LINES);
}

export function pickChuuniTrainingWinLine(): string {
  return pick(CHUUNI_TRAINING_WIN);
}

export function rollChuuniFate(): { line: string; gold: number; renown: number; resonance: number } {
  const idx = Math.floor(Math.random() * CHUUNI_FATE_ROLLS.length);
  const r = CHUUNI_FATE_ROLLS[idx];
  return { line: r.line, gold: r.gold, renown: r.renown, resonance: r.resonance };
}
