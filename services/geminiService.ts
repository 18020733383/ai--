
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AIProvider, AltarDoctrine, AltarTroopDraft, BattleResult, BattleRound, EnemyForce, Hero, HeroChatLine, Location, Lord, NegotiationResult, PartyDiaryEntry, PlayerState, TerrainType, Troop } from '../types';
import { normalizeOpenAIBattle, parseCasualties, parseInjuries, parseOutcome } from './battleParsing';
import { WORLD_BOOK } from '../constants';

const getGeminiClient = (apiKey?: string) => new GoogleGenAI({ apiKey: apiKey?.trim() || process.env.API_KEY });

const battleSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    rounds: {
      type: Type.ARRAY,
      description: "A list of 3-5 battle rounds describing the flow of combat.",
      items: {
        type: Type.OBJECT,
        properties: {
          roundNumber: { type: Type.INTEGER },
          description: { type: Type.STRING, description: "Detailed description of tactics, A-side actions, terrain usage, unit skills, synergies, and clashes in this round (Chinese)." },
          casualtiesA: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { 
                name: { type: Type.STRING }, 
                count: { type: Type.INTEGER },
                cause: { type: Type.STRING, description: "Specific cause of death/injury, e.g., '被乱箭射死', '遭骑兵踩踏', '士气崩溃逃亡', '被热油烫死' (Chinese)." }
              },
              required: ["name", "count", "cause"]
            }
          },
          keyUnitDamageA: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                hpLoss: { type: Type.INTEGER },
                cause: { type: Type.STRING }
              },
              required: ["name", "hpLoss", "cause"]
            }
          },
          keyUnitDamageB: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                hpLoss: { type: Type.INTEGER },
                cause: { type: Type.STRING }
              },
              required: ["name", "hpLoss", "cause"]
            }
          },
          casualtiesB: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { 
                name: { type: Type.STRING }, 
                count: { type: Type.INTEGER },
                cause: { type: Type.STRING, description: "Specific cause of death/injury (Chinese)." }
              },
              required: ["name", "count", "cause"]
            }
          }
        },
        required: ["roundNumber", "description", "casualtiesA", "keyUnitDamageA", "keyUnitDamageB", "casualtiesB"]
      }
    },
    outcome: {
      type: Type.STRING,
      enum: ["A", "B"],
      description: "Final outcome: A or B.",
    },
  },
  required: ["rounds", "outcome"],
};

export const buildBattlePrompt = (
  playerTroops: Troop[],
  enemyForce: EnemyForce,
  terrain: TerrainType,
  player: PlayerState,
  siegeContext?: string,
  deploymentContext?: string,
  outputMode: 'json' | 'ndjson' = 'json'
) => {
  const traitBucket = new Map<string, { name: string; description: string }>();
  const collectTraits = (troops: Troop[]) => {
    troops.forEach(t => {
      (t.enchantments ?? []).forEach(e => {
        if (!traitBucket.has(e.name)) traitBucket.set(e.name, { name: e.name, description: e.description });
      });
    });
  };
  collectTraits(playerTroops);
  collectTraits(enemyForce.troops);
  const traitBlock = traitBucket.size > 0
    ? `【词条说明】\n${[...traitBucket.values()].map(e => `- 【${e.name}】${e.description}`).join('\n')}\n\n`
    : '';

  const formatAttributes = (attrs: Troop['attributes']) =>
    `属性: 攻击${attrs.attack} 防御${attrs.defense} 敏捷${attrs.agility} 体魄${attrs.hp} 远程${attrs.range} 士气${attrs.morale}`;
  const formatArmy = (troops: Troop[]) =>
    troops.map(t => {
      const enchantments = t.enchantments && t.enchantments.length > 0
        ? `, 词条: ${t.enchantments.map(e => `【${e.name}】`).join('')}`
        : '';
      const attrs = t.attributes ? `, ${formatAttributes(t.attributes)}` : '';
      const heavyMeta = t.category === 'HEAVY'
        ? `, 重型单位: HEAVY(heavyTier=${t.heavyTier ?? 1}, ammoPerUnit=${t.ammoPerUnit ?? 0}, role=${t.supportRole ?? 'OTHER'})`
        : '';
      const heavyRule = t.category === 'HEAVY' && t.supportRules ? `, 重型规则: ${String(t.supportRules)}` : '';
      return `${t.count}x ${t.name} (Tier ${t.tier}, 装备: ${t.equipment.join(', ')}, 描述: ${t.description}${attrs}${enchantments}${heavyMeta}${heavyRule})`;
    }).join('\n');

  const enemyArmyDesc = formatArmy(enemyForce.troops);
  const enemySiegeEngines = enemyForce.siegeEngines && enemyForce.siegeEngines.length > 0
    ? `\n    攻城器械: ${enemyForce.siegeEngines.join(', ')}`
    : '';
  const playerCount = playerTroops.reduce((sum, t) => sum + t.count, 0);
  const enemyCount = enemyForce.troops.reduce((sum, t) => sum + t.count, 0);
  const totalCount = playerCount + enemyCount;
  const battleWidth = Math.max(60, Math.min(220, Math.floor(Math.sqrt(Math.max(1, totalCount)) * 10 + 40)));
  const engagementCap = Math.max(20, Math.floor(Math.min(totalCount, 40 + Math.sqrt(Math.max(1, totalCount)) * 12)));
  const casualtyCap = Math.max(5, Math.floor(engagementCap * 0.2));
  const playerHpRatioRaw = player.maxHp > 0 ? player.currentHp / player.maxHp : 0;
  const playerHpRatio = Math.max(0.2, Math.min(1, playerHpRatioRaw));
  const pickCommander = (troops: Troop[]) => {
    let best: Troop | null = null;
    let bestScore = -Infinity;
    troops.forEach(t => {
      const attrs = t.attributes;
      const score = attrs
        ? attrs.attack + attrs.defense + attrs.agility + attrs.hp + attrs.range + attrs.morale
        : 0;
      const tierWeight = typeof t.tier === 'number' ? t.tier * 50 : 0;
      const countWeight = Math.max(0, t.count ?? 0);
      const total = score * 10 + tierWeight + countWeight;
      if (!best || total > bestScore) {
        best = t;
        bestScore = total;
      }
    });
    return best;
  };
  const enemyCommander = pickCommander(enemyForce.troops);
  const enemyCommanderName = enemyCommander?.name ? `${enemyCommander.name}核心` : '灵魂核心';
  const enemyCommanderAttrs = enemyCommander?.attributes ?? { attack: 1, defense: 1, agility: 1, hp: 1, range: 1, morale: 1 };
  const enemyCommanderHp = Math.max(1, Math.round(enemyCommanderAttrs.hp));
  const enemyCommanderMaxHp = enemyCommanderHp;
  const enemyCommanderHpRatio = enemyCommanderMaxHp > 0 ? enemyCommanderHp / enemyCommanderMaxHp : 1;
  const minPhases =
    totalCount < 80 ? 4 :
    totalCount < 200 ? 6 :
    totalCount < 500 ? 7 :
    totalCount < 1000 ? 8 :
    totalCount < 2000 ? 10 : 12;
  const deploymentBlock = String(deploymentContext ?? '').trim();
  const playerArmyBlock = formatArmy(playerTroops);
  const attributeMeta = [
    { key: 'attack', label: '攻击' },
    { key: 'defense', label: '防御' },
    { key: 'agility', label: '敏捷' },
    { key: 'hp', label: '体魄' },
    { key: 'range', label: '远程' },
    { key: 'morale', label: '士气' }
  ] as const;
  type AttrKey = typeof attributeMeta[number]['key'];
  const sumAttributes = (troops: Troop[]) => {
    const totals: Record<AttrKey, number> = { attack: 0, defense: 0, agility: 0, hp: 0, range: 0, morale: 0 };
    troops.forEach(t => {
      const attrs = t.attributes;
      if (!attrs) return;
      const count = t.count ?? 0;
      totals.attack += attrs.attack * count;
      totals.defense += attrs.defense * count;
      totals.agility += attrs.agility * count;
      totals.hp += attrs.hp * count;
      totals.range += attrs.range * count;
      totals.morale += attrs.morale * count;
    });
    return totals;
  };
  const playerAttrTotals = sumAttributes(playerTroops);
  const enemyAttrTotals = sumAttributes(enemyForce.troops);
  const attrCompareBlock = `【属性对比（总和/比例）】
${attributeMeta.map(attr => {
  const playerValue = playerAttrTotals[attr.key];
  const enemyValue = enemyAttrTotals[attr.key];
  const total = playerValue + enemyValue;
  const playerRatio = total > 0 ? Math.round((playerValue / total) * 100) : 50;
  const enemyRatio = total > 0 ? Math.round((enemyValue / total) * 100) : 50;
  return `- ${attr.label}: A方${Math.round(playerValue)} (${playerRatio}%) / B方${Math.round(enemyValue)} (${enemyRatio}%)`;
}).join('\n')}`;
  const heavyLines = [
    ...playerTroops
      .filter(t => t.category === 'HEAVY')
      .map(t => `- A方 ${t.count}x ${t.name} (heavyTier=${t.heavyTier ?? 1}, ammoPerUnit=${t.ammoPerUnit ?? 0}, role=${t.supportRole ?? 'OTHER'}, 规则: ${t.supportRules ?? '无'})`),
    ...enemyForce.troops
      .filter(t => t.category === 'HEAVY')
      .map(t => `- B方 ${t.count}x ${t.name} (heavyTier=${t.heavyTier ?? 1}, ammoPerUnit=${t.ammoPerUnit ?? 0}, role=${t.supportRole ?? 'OTHER'}, 规则: ${t.supportRules ?? '无'})`)
  ].filter(Boolean);
  const heavyUnitBlock = heavyLines.length > 0
    ? `【重型单位特别说明】\n${heavyLines.join('\n')}`
    : '';

  const outputHint = outputMode === 'ndjson'
    ? `- 使用 NDJSON，每行一个 JSON，不要输出多余文本。
- 每个回合输出: {"type":"round","round":{"roundNumber":1,"description":"...","casualtiesA":[{"name":"兵种名","count":0,"cause":"死因"}],"keyUnitDamageA":[{"name":"A方核心单位","hpLoss":12,"cause":"受伤原因"}],"keyUnitDamageB":[{"name":"B方指挥核心","hpLoss":8,"cause":"受伤原因"}],"casualtiesB":[{"name":"兵种名","count":0,"cause":"死因"}]}}
- 战斗结束后输出总结: {"type":"summary","outcome":"A|B"}`
    : `- 只返回以下结构的 JSON，禁止包裹在 battle_report 或其他外层字段：
  {
    "rounds": [
      {
        "roundNumber": 1,
        "description": "...",
        "casualtiesA": [{"name": "兵种名", "count": 0, "cause": "死因"}],
        "keyUnitDamageA": [
          {"name": "A方核心单位", "hpLoss": 12, "cause": "受伤原因"},
          {"name": "A方随行者", "hpLoss": 18, "cause": "受伤原因或重伤退场"}
        ],
        "keyUnitDamageB": [
          {"name": "B方指挥核心", "hpLoss": 8, "cause": "受伤原因"}
        ],
        "casualtiesB": [{"name": "兵种名", "count": 0, "cause": "死因"}]
      }
    ],
    "outcome": "A|B"
  }`;

  return `
    你是一个硬核中世纪奇幻战略游戏的 Game Master。请模拟并解决一场战斗。
    
    ${traitBlock}
    【环境信息】
    - 地形: ${terrain} (地形对兵种有显著影响)
    ${siegeContext ? `- 攻城情境: ${siegeContext} (注意：若 A 方为协助守城，A 方列表包含守军盟友，请一视同仁地作为 A 方战斗力计算。)` : ''}
    - 战场宽度: ${battleWidth}
    - 双方规模: A方 ${playerCount} / B方 ${enemyCount} / 总计 ${totalCount}
    - 接战上限: 每回合最多 ${engagementCap} 人进入主接战
    - 伤亡上限: 每回合总伤亡 ≤ ${casualtyCap}
    - 最少回合数: ${minPhases}
    - A方指挥核心状态: ${player.status}（${player.currentHp}/${player.maxHp}）
    - B方指挥核心状态: ACTIVE（${enemyCommanderName}，${enemyCommanderHp}/${enemyCommanderMaxHp}）
    - A方指挥核心属性: 攻击 ${player.attributes.attack} / 防御 ${player.attributes.defense} / 体魄 ${player.attributes.hp}
    - B方指挥核心属性: 攻击 ${enemyCommanderAttrs.attack} / 防御 ${enemyCommanderAttrs.defense} / 体魄 ${enemyCommanderAttrs.hp}
    - 血量影响: 单位战斗力与承伤能力按 当前血量/上限 折算（最低 20%）；A方指挥核心当前血量系数 ${Math.round(playerHpRatio * 100)}%；B方指挥核心当前血量系数 ${Math.round(enemyCommanderHpRatio * 100)}%
    
    ${attrCompareBlock}
    ${heavyUnitBlock}
    ${deploymentBlock ? `\n    【战场部署】\n    ${deploymentBlock}\n` : ''}

    【A方军队】
    ${playerArmyBlock}
    
    【B方军队】
    部队组成：
    ${enemyArmyDesc}${enemySiegeEngines}
    
    【战力基线】
    - 人类基线（参考，不是硬限制）：
      - T1 农民：攻击30 防御20 敏捷25 体魄30 远程5 士气25
      - T2 帝国正规兵：攻击75 防御85 敏捷50 体魄80 远程5 士气75
      - T3 帝国处刑巨剑：攻击130 防御90 敏捷60 体魄100 远程5 士气90
      - T4 帝国鹰眼游侠：攻击155 防御100 敏捷140 体魄110 远程210 士气120
      - T5 圣殿护卫：攻击200 防御215 敏捷160 体魄220 远程5 士气200
    - 指挥核心单位强度不要夸张化，避免超出同阶基线太多。
    - 补充说明：蟑螂单位中的吞噬为其升级方法而非技能，不对战斗产生影响。
    - 如果部队中出现“重型单位(HEAVY)”，它们通常是少量装备平台（按台/辆计），火力或掩护效果很强，但机动差、被点燃/爆裂类更容易失效；其杀伤更体现在对方伤亡与士气，而不是频繁自身阵亡。

    【核心判定规则 (CRITICAL)】
    1. **技能与连携 (Skill & Synergy)**: 你必须仔细阅读兵种描述中的 **【技能：XXX】** 和 **【连携：XXX】** 标签。
       - 如果队伍中存在能触发【连携】的组合，**需要**在战报中描写这种配合带来的特效。
       - 拥有连携配合的一方战斗力应有提升。
    2. **词条效果**: 如果兵种拥有“词条”，必须在战报中体现词条对攻防、控制、反伤、冷却等的影响。
    3. **双方指挥核心影响**: A/B 方指挥核心都会受伤，不是无敌单位，伤害与承伤应符合上面的战力基线。
    4. **兵种克制**: 骑兵克弓手，长矛克骑兵，法术克制重甲。
    5. **伤亡计算**: 严格根据双方兵力、Tier差距和技能加成计算。Tier 5 单位是战场的绝对主宰。
    6. **搞笑元素**: 如果出现了奇怪的兵种（如火锅军团、精神病院兵种），请用幽默但符合逻辑的方式描述战斗（例如：敌人被热汤烫得哇哇叫，或者被贡丸弹飞）。
    7. **死因描述**: 必须简短且具体，例如"被贡丸砸晕"、"被唢呐声震碎耳膜"、"死于热油"、"被长矛刺穿"。
    8. **战场分层**: 一般情况，如果敌人有远程士兵也会对内圈造成威胁，甚至有些专门用于狙击的单位，第一层为最外层（如果都是近或中距离则一般按照分层的顺序交战），标记重点保护的单位会被友军优先保护。
    9. **双方关键单位受伤规则**: 每回合描述中必须包含 A/B 方指挥核心与随行者是否受伤、受伤原因与大致掉血值（可用区间如 10-20 点），并写入 keyUnitDamageA / keyUnitDamageB（可以为空数组）。
       - keyUnitDamageA / keyUnitDamageB 可包含多条记录，且不只指挥核心。
       - 当血量扣完时必须写明“重伤退场”，并在该回合描述中体现该词条。
       - 如果出现“重伤退场”，除了写入对应的 keyUnitDamageA / keyUnitDamageB，还必须在 casualtiesA 或 casualtiesB 中追加一条同名记录，count=1，cause="重伤"。
    10. **完整性要求**: 不能出现剩余士兵等提前掠过剩余战斗的情况。数据应该和部队人数相符。
       【输出要求】
    - 且总人数越多回合越长（战力相当的情况下）一般不少于3回合，上百人不少于5，上千人不少于7，万人不少于10，弱实力悬殊可酌情减少回合数。
    - **必须在战报描述中体现出具体的技能释放和兵种配合。**
    - 第一回合通常是远程对射或技能准备。
    - 最后一回合决定胜负。
    - 一般交战顺序按照战场部署从外到内的顺序进行。
    - 请用**沉浸式、史诗感且带有黑色幽默的中文**描写。
    - 直到一方全灭才结束。如果 A 方有盟军/守军，必须等所有友军（包括 A 方部队和盟军）都失去战斗力才算失败。
    - 指挥核心的行动取决于其所在层。
    ${outputHint}
  `.trim();
};

export const resolveBattle = async (
  playerTroops: Troop[],
  enemyForce: EnemyForce,
  terrain: TerrainType,
  player: PlayerState,
  openAI?: OpenAIConfig,
  siegeContext?: string,
  deploymentContext?: string,
  options?: { stream?: boolean; onRound?: (round: BattleRound) => void }
): Promise<BattleResult> => {
  const prompt = buildBattlePrompt(
    playerTroops,
    enemyForce,
    terrain,
    player,
    siegeContext,
    deploymentContext,
    options?.stream ? 'ndjson' : 'json'
  );

  try {
    const openAIConfig = requireOpenAIConfig(openAI);
    if (openAIConfig) {
      const url = `${normalizeProviderBaseUrl(openAIConfig.provider, openAIConfig.baseUrl)}/chat/completions`;
      if (options?.stream) {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAIConfig.apiKey}`,
          },
          body: JSON.stringify({
            ...buildChatRequestBody(openAIConfig.provider, {
              model: openAIConfig.model,
              messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: '只输出 NDJSON。' }
              ],
              temperature: 0.7
            }),
            stream: true
          })
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`OpenAI 请求失败 (${res.status}) ${text ? `- ${text.slice(0, 200)}` : ''}`.trim());
        }

        if (!res.body) throw new Error('OpenAI 流式返回为空');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = '';
        let contentBuffer = '';
        let fullContent = '';
        const rounds: BattleRound[] = [];
        let summary: { outcome: BattleResult['outcome']; lootGold: number; renownGained: number; xpGained: number } | null = null;

        const pushRound = (payload: any) => {
          if (!payload) return;
          const number = payload.roundNumber ?? payload.round_number ?? payload.round ?? rounds.length + 1;
          const description = payload.description ?? payload.summary ?? '';
          const casualtiesA = parseCasualties(
            payload.casualtiesA ??
            payload.casualties_a ??
            payload.playerCasualties ??
            payload.player_casualties ??
            {}
          );
          const keyUnitDamageA = parseInjuries(
            payload.keyUnitDamageA ??
            payload.key_unit_damage_a ??
            payload.heroInjuries ??
            payload.hero_injuries ??
            payload.playerInjuries ??
            payload.player_injuries ??
            {}
          );
          const keyUnitDamageB = parseInjuries(
            payload.keyUnitDamageB ??
            payload.key_unit_damage_b ??
            payload.enemyInjuries ??
            payload.enemy_injuries ??
            {}
          );
          const casualtiesB = parseCasualties(
            payload.casualtiesB ??
            payload.casualties_b ??
            payload.enemyCasualties ??
            payload.enemy_casualties ??
            {}
          );
          const round = {
            roundNumber: typeof number === 'number' ? number : rounds.length + 1,
            description: String(description ?? ''),
            casualtiesA,
            keyUnitDamageA,
            keyUnitDamageB,
            casualtiesB
          };
          rounds.push(round);
          options?.onRound?.(round);
        };

        const pushSummary = (payload: any) => {
          const outcome = parseOutcome(payload?.outcome ?? payload?.result ?? payload?.finalOutcome);
          if (!outcome) return;
          summary = {
            outcome,
            lootGold: Number.isFinite(payload?.lootGold) ? payload.lootGold : 0,
            renownGained: Number.isFinite(payload?.renownGained) ? payload.renownGained : 0,
            xpGained: Number.isFinite(payload?.xpGained) ? payload.xpGained : 0
          };
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const data = trimmed.slice(5).trim();
            if (!data || data === '[DONE]') continue;
            let payload: any;
            try {
              payload = JSON.parse(data);
            } catch {
              continue;
            }
            const delta = payload?.choices?.[0]?.delta?.content;
            if (typeof delta !== 'string' || !delta) continue;
            fullContent += delta;
            contentBuffer += delta;
            while (true) {
              const idx = contentBuffer.indexOf('\n');
              if (idx < 0) break;
              const lineText = contentBuffer.slice(0, idx).trim();
              contentBuffer = contentBuffer.slice(idx + 1);
              if (!lineText) continue;
              let chunk: any;
              try {
                chunk = JSON.parse(lineText);
              } catch {
                continue;
              }
              if (chunk?.type === 'round') {
                pushRound(chunk.round ?? chunk.data ?? chunk);
              } else if (chunk?.type === 'summary') {
                pushSummary(chunk);
              }
            }
          }
        }

        const tail = contentBuffer.trim();
        if (tail) {
          try {
            const chunk = JSON.parse(tail);
            if (chunk?.type === 'round') pushRound(chunk.round ?? chunk.data ?? chunk);
            if (chunk?.type === 'summary') pushSummary(chunk);
          } catch {
          }
        }

        if (!summary && fullContent.trim()) {
          try {
            const raw = JSON.parse(fullContent);
            const normalized = normalizeOpenAIBattle(raw);
            if (normalized) return normalized;
          } catch {
          }
        }

        if (!summary || rounds.length === 0) throw new Error('OpenAI 流式战报缺少总结或回合');
        return { rounds, ...summary };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIConfig.apiKey}`,
        },
        body: JSON.stringify(buildChatRequestBody(openAIConfig.provider, {
          model: openAIConfig.model,
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: '只返回 JSON。' }
          ],
          temperature: 0.7,
          jsonOnly: true
        }))
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`OpenAI 请求失败 (${res.status}) ${text ? `- ${text.slice(0, 200)}` : ''}`.trim());
      }

      const json = await res.json().catch(() => null) as any;
      const text = json?.choices?.[0]?.message?.content;
      if (!text) throw new Error('OpenAI 返回为空');
      let parsed: BattleResult;
      try {
        const raw = JSON.parse(text);
        const normalized = normalizeOpenAIBattle(raw);
        if (!normalized) throw new Error('OpenAI 返回格式不正确');
        parsed = normalized;
      } catch (parseError) {
        console.error("OpenAI 返回 JSON 解析失败:", { error: parseError, text });
        throw new Error('OpenAI 返回格式不正确');
      }
      if (!parsed || !Array.isArray((parsed as any).rounds) || !(parsed as any).outcome) {
        console.error("OpenAI 返回格式不正确:", { text, parsed });
        throw new Error('OpenAI 返回格式不正确');
      }
      return parsed;
    }

    const model = "gemini-3-flash-preview";
    const response = await getGeminiClient(openAI?.provider === 'GEMINI' ? openAI.apiKey : undefined).models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: battleSchema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as BattleResult;
  } catch (error) {
    console.error("Battle resolution failed:", error);
    throw error; // Let App.tsx handle the error to show Retry UI
  }
};

export const resolveNegotiation = async (
  context: {
    enemyName: string;
    enemyDescription: string;
    leaderName: string;
    leaderType: 'LORD' | 'COMMANDER';
    leaderRelation?: number | null;
    playerPower: number;
    enemyPower: number;
    powerRatio: number;
    playerRaceSummary: string;
    enemyRaceSummary: string;
    negotiationLevel: number;
    playerGold: number;
    playerMessage: string;
    history: Array<{ role: 'PLAYER' | 'ENEMY'; text: string }>;
  },
  openAI?: OpenAIConfig
): Promise<NegotiationResult> => {
  const historyText = context.history
    .map(line => `${line.role === 'PLAYER' ? '玩家' : '敌方'}: ${line.text}`)
    .join('\n');
  const prompt = `
你是敌方指挥官，正在与玩家谈判。请根据形势、谈判能力、关系与战力决定是否撤军。
必须输出 JSON：{ "decision": "REFUSE|RETREAT|CONDITIONAL", "reply": "...", "goldPercent": 30 }
规则：
1) decision=REFUSE 表示拒绝谈判，玩家不能再次谈判。
2) decision=RETREAT 表示接受谈判并撤军。
3) decision=CONDITIONAL 表示要求玩家上交 goldPercent% 钱财后撤军（5~80 之间）。
4) 谈判等级越高越容易说服你撤军或降低要价。
5) 若你是领主且与玩家关系很差（<=-30），更倾向拒绝或要高价；关系较好（>=30）更倾向退让。
6) reply 只输出敌方回复，中文，1~3 行短句。
7) 只输出 JSON，不要解释。

【指挥官】
- 身份: ${context.leaderType === 'LORD' ? '领主' : '军官'}
- 名称: ${context.leaderName}
- 与玩家关系: ${context.leaderType === 'LORD' ? (context.leaderRelation ?? 0) : '无'}

【战力】
- 玩家战力: ${context.playerPower}
- 敌方战力: ${context.enemyPower}
- 战力比(玩家/敌方): ${context.powerRatio}

【种族构成】
- 玩家: ${context.playerRaceSummary}
- 敌方: ${context.enemyRaceSummary}

【玩家谈判等级】${context.negotiationLevel}
【玩家金币】${context.playerGold}

【谈判内容】
${historyText || '（暂无）'}
玩家最新发言：${context.playerMessage}
  `.trim();

  const openAIConfig = requireOpenAIConfig(openAI);
  if (openAIConfig) {
    const url = `${normalizeProviderBaseUrl(openAIConfig.provider, openAIConfig.baseUrl)}/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIConfig.apiKey}`,
      },
      body: JSON.stringify(buildChatRequestBody(openAIConfig.provider, {
        model: openAIConfig.model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: '只返回 JSON。' }
        ],
        temperature: 0.7,
        jsonOnly: true
      }))
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`OpenAI 请求失败 (${res.status}) ${text ? `- ${text.slice(0, 200)}` : ''}`.trim());
    }

    const json = await res.json().catch(() => null) as any;
    const text = json?.choices?.[0]?.message?.content;
    if (!text) throw new Error('OpenAI 返回为空');
    return parseNegotiationResult(text);
  }

  const model = "gemini-3-flash-preview";
  const response = await getGeminiClient(openAI?.provider === 'GEMINI' ? openAI.apiKey : undefined).models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.7,
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return parseNegotiationResult(String(text));
};

const parseNegotiationResult = (raw: string): NegotiationResult => {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { decision: 'REFUSE', reply: raw.trim() || '对方拒绝谈判。' };
  }
  const decision = String(parsed?.decision || '').toUpperCase();
  const reply = String(parsed?.reply || '').trim() || '对方沉默不语。';
  const goldPercentRaw = Number(parsed?.goldPercent ?? 0);
  const goldPercent = Number.isFinite(goldPercentRaw) ? Math.min(80, Math.max(5, Math.round(goldPercentRaw))) : undefined;
  if (decision === 'RETREAT') return { decision: 'RETREAT', reply };
  if (decision === 'CONDITIONAL') return { decision: 'CONDITIONAL', reply, goldPercent: goldPercent ?? 30 };
  return { decision: 'REFUSE', reply };
};

const shaperSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    decision: { type: Type.STRING, enum: ["OK", "REFUSE", "OVERPRICE"] },
    npcReply: { type: Type.STRING },
    price: { type: Type.INTEGER },
    troop: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        tier: { type: Type.INTEGER },
        basePower: { type: Type.INTEGER },
        maxXp: { type: Type.INTEGER },
        upgradeCost: { type: Type.INTEGER },
        upgradeTargetId: { type: Type.STRING },
        description: { type: Type.STRING },
        equipment: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["name", "tier", "basePower", "maxXp", "upgradeCost", "description", "equipment"],
    }
  },
  required: ["decision", "npcReply", "price"],
};

export type ShaperDecision = "OK" | "REFUSE" | "OVERPRICE";

export interface ShaperProposal {
  decision: ShaperDecision;
  npcReply: string;
  price: number;
  troop?: Pick<Troop, 'name' | 'tier' | 'basePower' | 'maxXp' | 'upgradeCost' | 'upgradeTargetId' | 'description' | 'equipment'>;
}

export interface OpenAIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  provider: AIProvider;
}

export interface ShaperContext {
  lastProposal?: ShaperProposal;
}

const altarSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    npcReply: { type: Type.STRING },
    doctrineSummary: { type: Type.STRING },
    troops: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          slot: { type: Type.INTEGER },
          tier: { type: Type.INTEGER },
          name: { type: Type.STRING },
          basePower: { type: Type.INTEGER },
          maxXp: { type: Type.INTEGER },
          upgradeCost: { type: Type.INTEGER },
          description: { type: Type.STRING },
          equipment: { type: Type.ARRAY, items: { type: Type.STRING } },
          attributes: {
            type: Type.OBJECT,
            properties: {
              attack: { type: Type.INTEGER },
              defense: { type: Type.INTEGER },
              agility: { type: Type.INTEGER },
              hp: { type: Type.INTEGER },
              range: { type: Type.INTEGER },
              morale: { type: Type.INTEGER }
            },
            required: ["attack", "defense", "agility", "hp", "range", "morale"]
          }
        },
        required: ["tier", "name", "basePower", "maxXp", "upgradeCost", "description", "equipment", "attributes"]
      }
    }
  },
  required: ["npcReply", "doctrineSummary", "troops"]
};

export type AltarTroopTreeResult = {
  npcReply: string;
  doctrineSummary: string;
  troops: AltarTroopDraft[];
};

const altarHumanBaselineBlock = `
【人类基线（与战斗基线一致）】
- T1 农民：战力5；装备：生锈的草叉/亚麻布衣；属性：攻击30 防御20 敏捷25 体魄30 远程5 士气25
- T2 帝国正规兵：战力15；装备：短矛/木盾/皮甲；属性：攻击75 防御85 敏捷50 体魄80 远程5 士气75
- T3 帝国处刑巨剑：战力35；装备：精铁剑/阔盾/链甲；属性：攻击130 防御90 敏捷60 体魄100 远程5 士气90
- T4 帝国鹰眼游侠：战力80；装备：长弓/猎刃/轻甲/风行披风；属性：攻击155 防御100 敏捷140 体魄110 远程210 士气120
- T5 圣殿护卫：战力150；装备：符文巨剑/振金板甲/神圣光环；属性：攻击200 防御215 敏捷160 体魄220 远程5 士气200
`.trim();

const altarBaselineTroops: AltarTroopDraft[] = [
  {
    tier: 1,
    name: '祭坛教徒',
    basePower: 5,
    maxXp: 20,
    upgradeCost: 25,
    description: '基线教徒。',
    equipment: ['生锈的草叉', '亚麻布衣'],
    attributes: { attack: 30, defense: 20, agility: 25, hp: 30, range: 5, morale: 25 }
  },
  {
    tier: 2,
    name: '祭坛传教士',
    basePower: 15,
    maxXp: 50,
    upgradeCost: 60,
    description: '基线传教士。',
    equipment: ['短矛', '木盾', '皮甲'],
    attributes: { attack: 75, defense: 85, agility: 50, hp: 80, range: 5, morale: 75 }
  },
  {
    tier: 3,
    name: '祭坛戒律者',
    basePower: 35,
    maxXp: 120,
    upgradeCost: 150,
    description: '基线戒律者。',
    equipment: ['精铁剑', '阔盾', '链甲'],
    attributes: { attack: 130, defense: 90, agility: 60, hp: 100, range: 5, morale: 90 }
  },
  {
    tier: 4,
    name: '祭坛行者',
    basePower: 80,
    maxXp: 300,
    upgradeCost: 600,
    description: '基线行者。',
    equipment: ['长弓', '猎刃', '轻甲', '风行披风'],
    attributes: { attack: 155, defense: 100, agility: 140, hp: 110, range: 210, morale: 120 }
  },
  {
    tier: 5,
    name: '祭坛护卫',
    basePower: 150,
    maxXp: 2000,
    upgradeCost: 0,
    description: '基线护卫。',
    equipment: ['符文巨剑', '振金板甲', '神圣光环'],
    attributes: { attack: 200, defense: 215, agility: 160, hp: 220, range: 5, morale: 200 }
  }
];

const altarTierCaps: Record<number, number> = {
  1: 6,
  2: 4,
  3: 3,
  4: 2,
  5: 1
};

const altarChatSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    npcReply: { type: Type.STRING },
    domain: { type: Type.STRING },
    spread: { type: Type.STRING },
    blessing: { type: Type.STRING },
    doctrineSummary: { type: Type.STRING },
    troops: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          slot: { type: Type.INTEGER },
          tier: { type: Type.INTEGER },
          name: { type: Type.STRING },
          basePower: { type: Type.INTEGER },
          maxXp: { type: Type.INTEGER },
          upgradeCost: { type: Type.INTEGER },
          description: { type: Type.STRING },
          equipment: { type: Type.ARRAY, items: { type: Type.STRING } },
          attributes: {
            type: Type.OBJECT,
            properties: {
              attack: { type: Type.INTEGER },
              defense: { type: Type.INTEGER },
              agility: { type: Type.INTEGER },
              hp: { type: Type.INTEGER },
              range: { type: Type.INTEGER },
              morale: { type: Type.INTEGER }
            },
            required: ["attack", "defense", "agility", "hp", "range", "morale"]
          }
        },
        required: ["tier", "name", "basePower", "maxXp", "upgradeCost", "description", "equipment", "attributes"]
      }
    }
  },
  required: ["npcReply", "domain", "spread", "blessing", "doctrineSummary", "troops"]
};

const parseAltarJson = (raw: string) => {
  const trimmed = String(raw ?? '').trim();
  const stripFence = (text: string) => {
    if (!text.startsWith('```')) return text;
    const cleaned = text.replace(/^```[a-zA-Z0-9]*\s*/i, '').replace(/```$/i, '').trim();
    return cleaned;
  };
  const cleaned = stripFence(trimmed);
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const sliced = cleaned.slice(start, end + 1);
      return JSON.parse(sliced);
    }
    return JSON.parse(cleaned);
  }
};

const normalizeOpenAIBaseUrl = (baseUrl: string) => {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (!trimmed) return 'https://api.openai.com/v1';
  if (trimmed.endsWith('/v1')) return trimmed;
  return `${trimmed}/v1`;
};

const normalizeProviderBaseUrl = (provider: AIProvider, baseUrl: string) => {
  if (provider === 'DOUBAO') {
    const trimmed = baseUrl.trim().replace(/\/+$/, '');
    return trimmed || 'https://ark.cn-beijing.volces.com/api/v3';
  }
  return normalizeOpenAIBaseUrl(baseUrl);
};

const buildChatRequestBody = (provider: AIProvider, payload: { model: string; messages: { role: string; content: string }[]; temperature?: number; jsonOnly?: boolean }) => {
  const body: any = {
    model: payload.model,
    messages: payload.messages,
    temperature: payload.temperature
  };
  if (payload.jsonOnly && (provider === 'GPT' || provider === 'CUSTOM')) {
    body.response_format = { type: 'json_object' };
  }
  return body;
};

const requireOpenAIConfig = (openAI?: OpenAIConfig) => {
  if (!openAI || openAI.provider === 'GEMINI') return null;
  if (!openAI.apiKey.trim() || !openAI.model.trim()) {
    throw new Error('未配置 API Key 或模型');
  }
  return openAI;
};

export const listOpenAIModels = async (provider: AIProvider, baseUrl: string, apiKey: string): Promise<string[]> => {
  if (provider === 'GEMINI' || provider === 'DOUBAO') {
    throw new Error('当前供应商不支持模型列表');
  }
  const url = `${normalizeProviderBaseUrl(provider, baseUrl)}/models`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenAI 模型列表请求失败 (${res.status}) ${text ? `- ${text.slice(0, 200)}` : ''}`.trim());
  }

  const json = await res.json().catch(() => null) as any;
  const ids: string[] = Array.isArray(json?.data) ? json.data.map((m: any) => m?.id).filter((x: any) => typeof x === 'string') : [];
  return ids.sort((a, b) => a.localeCompare(b));
};

export type UndeadChatLine = { role: 'PLAYER' | 'UNDEAD'; text: string };
export type LordChatLine = { role: 'PLAYER' | 'LORD'; text: string };
export type AltarChatLine = { role: 'PLAYER' | 'NPC'; text: string };

export const generateAltarTroopTree = async (
  doctrine: AltarDoctrine,
  player: PlayerState,
  openAI?: OpenAIConfig
): Promise<AltarTroopTreeResult> => {
  const prompt = `
你是祭坛里的神秘人。玩家在创建宗教与兵种树，你需要返回 JSON。
请根据以下教义回答生成一套 T1~T5 兵种树：
1) 命名风格要有宗教味道，且 T1~T5 按「教徒、传教士、祭司/祭司长」升级；允许自定义前缀。
2) 每个兵种必须带至少一个【技能：XXX】标签，并体现“擅长领域”与“禁忌祝福”。
3) tier 从 1 到 5，按强度递增；basePower/maxXp/upgradeCost 合理增长。
4) attributes 六项为整数，T1 相对普通人类，T5 明显更强但不要离谱。
5) equipment 为 1~5 件中文装备名。
6) 以基线为准，默认不超过基线 ±30%，如因兵种特色可在单项属性或战力上限放宽到 +50%。
7) 输出字段仅限 schema，且仅输出 JSON，不要解释。

【玩家等级】${player.level}
【教义权柄】${doctrine.domain}
【散播方式】${doctrine.spread}
【禁忌祝福】${doctrine.blessing}
${altarHumanBaselineBlock}
  `.trim();

  const openAIConfig = requireOpenAIConfig(openAI);
  if (openAIConfig) {
    const url = `${normalizeProviderBaseUrl(openAIConfig.provider, openAIConfig.baseUrl)}/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIConfig.apiKey}`,
      },
      body: JSON.stringify(buildChatRequestBody(openAIConfig.provider, {
        model: openAIConfig.model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: '只返回 JSON。' }
        ],
        temperature: 0.85,
        jsonOnly: true
      }))
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`OpenAI 请求失败 (${res.status}) ${text ? `- ${text.slice(0, 200)}` : ''}`.trim());
    }

    const json = await res.json().catch(() => null) as any;
    const text = json?.choices?.[0]?.message?.content;
    if (!text) throw new Error('OpenAI 返回为空');
    return parseAltarJson(text) as AltarTroopTreeResult;
  }

  const model = "gemini-3-flash-preview";
  const response = await getGeminiClient(openAI?.provider === 'GEMINI' ? openAI.apiKey : undefined).models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: altarSchema,
      temperature: 0.85,
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return parseAltarJson(text) as AltarTroopTreeResult;
};

const normalizeAltarTroops = (troops: AltarTroopDraft[], fallback?: AltarTroopDraft[]) => {
  const clampInt = (v: unknown, min: number, max: number) => {
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, Math.round(n)));
  };
  const normalizeTier = (value: unknown, fallbackTier: number) => {
    if (typeof value === 'number') return clampInt(value, 1, 5);
    if (typeof value === 'string') {
      const cleaned = value.trim();
      const num = Number(cleaned.replace(/^T/i, ''));
      if (Number.isFinite(num)) return clampInt(num, 1, 5);
    }
    return clampInt(fallbackTier, 1, 5);
  };
  const normalizeEquipment = (value: unknown, fallbackList: string[] = []) => {
    if (Array.isArray(value)) {
      const list = value.map(item => String(item)).map(item => item.trim()).filter(Boolean);
      return list;
    }
    if (typeof value === 'string') {
      const parts = value.split(/[\/、，,|]/).map(item => item.trim()).filter(Boolean);
      return parts;
    }
    return fallbackList;
  };
  const normalizeAttributes = (value: unknown, fallbackValue: AltarTroopDraft['attributes']) => {
    const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const pick = (keys: string[]) => {
      for (const key of keys) {
        if (raw[key] !== undefined) return raw[key];
      }
      return undefined;
    };
    const attack = clampInt(pick(['attack', '攻击']), 1, 300);
    const defense = clampInt(pick(['defense', '防御']), 1, 300);
    const agility = clampInt(pick(['agility', '敏捷']), 1, 300);
    const hp = clampInt(pick(['hp', '体魄', '生命']), 1, 300);
    const range = clampInt(pick(['range', '远程']), 1, 300);
    const morale = clampInt(pick(['morale', '士气']), 1, 300);
    if (
      Number.isFinite(attack) &&
      Number.isFinite(defense) &&
      Number.isFinite(agility) &&
      Number.isFinite(hp) &&
      Number.isFinite(range) &&
      Number.isFinite(morale)
    ) {
      return { attack, defense, agility, hp, range, morale };
    }
    return fallbackValue;
  };
  const fallbackAttributes = (tier: number) => {
    if (tier === 1) return { attack: 3, defense: 2, agility: 3, hp: 3, range: 2, morale: 4 };
    if (tier === 2) return { attack: 5, defense: 4, agility: 4, hp: 4, range: 3, morale: 5 };
    if (tier === 3) return { attack: 7, defense: 6, agility: 5, hp: 6, range: 4, morale: 6 };
    if (tier === 4) return { attack: 10, defense: 8, agility: 6, hp: 8, range: 5, morale: 7 };
    return { attack: 13, defense: 10, agility: 7, hp: 10, range: 6, morale: 9 };
  };
  const clampTroopsByTier = (list: AltarTroopDraft[]) => {
    const counts: Record<number, number> = {};
    const output: AltarTroopDraft[] = [];
    list.forEach(item => {
      const tier = typeof item?.tier === 'number' ? item.tier : 1;
      const cap = altarTierCaps[tier] ?? 0;
      const nextCount = (counts[tier] ?? 0) + 1;
      if (cap > 0 && nextCount <= cap) {
        counts[tier] = nextCount;
        output.push(item);
      }
    });
    return output;
  };
  const source = (troops ?? []).length > 0
    ? (troops ?? [])
    : ((fallback ?? []).length > 0 ? (fallback ?? []) : altarBaselineTroops);
  const normalizeOne = (troop: AltarTroopDraft, fallbackTroop: AltarTroopDraft | undefined, fallbackTier: number) => {
    const tier = normalizeTier((troop as any).tier, fallbackTroop?.tier ?? fallbackTier);
    const attributes = normalizeAttributes((troop as any).attributes, fallbackTroop?.attributes ?? fallbackAttributes(tier));
    const equipment = normalizeEquipment((troop as any).equipment, fallbackTroop?.equipment ?? []);
    const basePowerValue = (troop as any).basePower ?? (troop as any).power ?? fallbackTroop?.basePower ?? tier * 8;
    return {
      ...troop,
      slot: typeof (troop as any).slot === 'number' ? clampInt((troop as any).slot, 0, 99) : undefined,
      tier,
      name: String((troop as any).name || fallbackTroop?.name || `祭坛信徒${tier}`).trim().slice(0, 40),
      basePower: clampInt(basePowerValue, 1, 9999),
      maxXp: clampInt((troop as any).maxXp ?? fallbackTroop?.maxXp ?? tier * 80, 10, 5000),
      upgradeCost: clampInt((troop as any).upgradeCost ?? fallbackTroop?.upgradeCost ?? tier * 60, 0, 1000000),
      description: String((troop as any).description || fallbackTroop?.description || '沉默的信徒。').trim().slice(0, 500),
      equipment: equipment.length > 0 ? equipment : ['布袍'],
      attributes
    } as AltarTroopDraft;
  };

  if ((troops ?? []).length === 0) {
    const normalized = (fallback ?? altarBaselineTroops)
      .map((troop, index) => normalizeOne(troop as any, (fallback ?? altarBaselineTroops)[index], index + 1));
    return clampTroopsByTier(normalized);
  }

  const normalized = source
    .map((troop, index) => normalizeOne(troop as any, (fallback ?? altarBaselineTroops)[index], index + 1));
  return clampTroopsByTier(normalized);
};

const mergeAltarTroops = (updates: AltarTroopDraft[], previous: AltarTroopDraft[]) => {
  if ((updates ?? []).length === 0) return previous;
  const merged = [...previous];
  const clampTroopsByTier = (list: AltarTroopDraft[]) => {
    const counts: Record<number, number> = {};
    const output: AltarTroopDraft[] = [];
    list.forEach(item => {
      const tier = typeof item?.tier === 'number' ? item.tier : 1;
      const cap = altarTierCaps[tier] ?? 0;
      const nextCount = (counts[tier] ?? 0) + 1;
      if (cap > 0 && nextCount <= cap) {
        counts[tier] = nextCount;
        output.push(item);
      }
    });
    return output;
  };
  updates.forEach((update, index) => {
    const slot = typeof update?.slot === 'number' ? Math.floor(update.slot) : -1;
    if (slot >= 0 && slot < merged.length) {
      merged[slot] = { ...update, slot };
      return;
    }
    const matchIndex = merged.findIndex(item => item.tier === update.tier && item.name === update.name);
    if (matchIndex >= 0) {
      merged[matchIndex] = update;
      return;
    }
    if (index < merged.length) {
      merged[index] = update;
      return;
    }
    merged.push(update);
  });
  return clampTroopsByTier(merged);
};

export const chatWithAltar = async (
  dialogue: AltarChatLine[],
  draft: AltarDoctrine,
  player: PlayerState,
  previous: { doctrineSummary: string; troops: AltarTroopDraft[] } | null,
  openAI?: OpenAIConfig
): Promise<{ npcReply: string; doctrineSummary: string; troops: AltarTroopDraft[]; draft: AltarDoctrine }> => {
  const historyText = dialogue
    .slice(-8)
    .map(m => `${m.role === 'PLAYER' ? '玩家' : '神秘人'}: ${m.text}`)
    .join('\n');
  const prompt = `
你是祭坛里的神秘人，语气神秘克制，说中文。
你需要做三件事：
1) 回复玩家当前对话，1-3 句短句即可。
2) 从玩家的话中提取或修正教义字段：权柄(domain)、散播方式(spread)、禁忌祝福(blessing)。
3) 基于当前教义与已有草案“更新”兵种草案，避免整体重写，只改动确实被玩家调整的部分。
如果无法确认某字段，就沿用现有值。
如果玩家输入中出现“权柄/散播方式/禁忌/祝福”等关键词，即使没有冒号，也要把关键词后的内容当作对应字段。
以基线为准，默认不超过基线 ±30%，如因兵种特色可在单项属性或战力上限放宽到 +50%。
只输出 JSON，字段为 npcReply, domain, spread, blessing, doctrineSummary, troops，不要多余字段。
草案允许同 tier 多个兵种，上限为：T1<=6，T2<=4，T3<=3，T4<=2，T5<=1。
如果已有草案：troops 允许只返回被修改的兵种条目，必须带 slot 表示原列表索引（从 0 开始）。
如果没有草案：troops 必须包含 5~16 个元素，至少覆盖 T1~T5 各 1 个，且遵守上限；tier 为 1~5 的数字，不要使用 "T1" 形式。
troops 的每个元素字段必须为 tier, name, basePower, maxXp, upgradeCost, description, equipment, attributes；slot 可选。
equipment 必须是字符串数组。
attributes 必须包含 attack, defense, agility, hp, range, morale，全部为数字。
当已有草案且只需局部调整时，可以返回空字符串或 null 表示不修改该字段。

示例（必须遵守字段名与类型）：
{
  "npcReply": "教义已明。",
  "domain": "深潜之寂与潮汐的平衡",
  "spread": "随波逐流的静默感召",
  "blessing": "赐予万物顺滑的皮肤与避水的灵魂",
  "doctrineSummary": "权柄：...\\n散播方式：...\\n禁忌：...\\n祝福：...",
  "troops": [
    {
      "slot": 0,
      "tier": 1,
      "name": "潮汐农夫",
      "basePower": 5,
      "maxXp": 20,
      "upgradeCost": 25,
      "description": "基础教徒。",
      "equipment": ["潮汐草叉","亚麻布衣"],
      "attributes": { "attack": 30, "defense": 20, "agility": 25, "hp": 30, "range": 5, "morale": 25 }
    }
  ]
}

【现有教义】
权柄：${draft.domain || '（未定）'}
散播方式：${draft.spread || '（未定）'}
禁忌祝福：${draft.blessing || '（未定）'}

${altarHumanBaselineBlock}

【已有草案（尽量在其基础上微调）】
${previous?.doctrineSummary ? `- 教义摘要：${previous.doctrineSummary}` : '- 教义摘要：暂无'}
${(previous?.troops ?? []).map(t => `- T${t.tier} ${t.name} | 战力${t.basePower} 经验${t.maxXp} 升级${t.upgradeCost} | 装备:${(t.equipment ?? []).join('、') || '无'} | ${t.description}`).join('\n') || '- 兵种草案：暂无'}

【最近对话】
${historyText || '（暂无）'}
  `.trim();

  const openAIConfig = requireOpenAIConfig(openAI);
  if (openAIConfig) {
    const url = `${normalizeProviderBaseUrl(openAIConfig.provider, openAIConfig.baseUrl)}/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIConfig.apiKey}`,
      },
      body: JSON.stringify(buildChatRequestBody(openAIConfig.provider, {
        model: openAIConfig.model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: '只返回 JSON。' }
        ],
        temperature: 0.8,
        jsonOnly: true
      }))
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`OpenAI 请求失败 (${res.status}) ${text ? `- ${text.slice(0, 200)}` : ''}`.trim());
    }

    const json = await res.json().catch(() => null) as any;
    const text = json?.choices?.[0]?.message?.content;
    if (!text) throw new Error('OpenAI 返回为空');
    const parsed = parseAltarJson(text) as { npcReply?: string; domain?: string; spread?: string; blessing?: string; doctrineSummary?: string; troops?: AltarTroopDraft[] };
    console.log('[altar] raw', text);
    console.log('[altar] parsed', parsed);
    const normalizedTroops = normalizeAltarTroops(Array.isArray(parsed?.troops) ? parsed.troops : [], previous?.troops);
    const mergedTroops = previous ? mergeAltarTroops(normalizedTroops, previous.troops) : mergeAltarTroops(normalizedTroops, altarBaselineTroops);
    return {
      npcReply: String(parsed?.npcReply || '').trim() || '神秘人沉默片刻。',
      doctrineSummary: String(parsed?.doctrineSummary || previous?.doctrineSummary || '').trim(),
      troops: mergedTroops,
      draft: {
        domain: String(parsed?.domain || draft.domain || '').trim(),
        spread: String(parsed?.spread || draft.spread || '').trim(),
        blessing: String(parsed?.blessing || draft.blessing || '').trim()
      }
    };
  }

  const model = "gemini-3-flash-preview";
  const response = await getGeminiClient(openAI?.provider === 'GEMINI' ? openAI.apiKey : undefined).models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: altarChatSchema,
      temperature: 0.8,
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  const parsed = parseAltarJson(text) as { npcReply?: string; domain?: string; spread?: string; blessing?: string; doctrineSummary?: string; troops?: AltarTroopDraft[] };
  console.log('[altar] raw', text);
  console.log('[altar] parsed', parsed);
  const normalizedTroops = normalizeAltarTroops(Array.isArray(parsed?.troops) ? parsed.troops : [], previous?.troops);
  const mergedTroops = previous ? mergeAltarTroops(normalizedTroops, previous.troops) : mergeAltarTroops(normalizedTroops, altarBaselineTroops);
  return {
    npcReply: String(parsed?.npcReply || '').trim() || '神秘人沉默片刻。',
    doctrineSummary: String(parsed?.doctrineSummary || previous?.doctrineSummary || '').trim(),
    troops: mergedTroops,
    draft: {
      domain: String(parsed?.domain || draft.domain || '').trim(),
      spread: String(parsed?.spread || draft.spread || '').trim(),
      blessing: String(parsed?.blessing || draft.blessing || '').trim()
    }
  };
};

export const chatWithUndead = async (
  dialogue: UndeadChatLine[],
  player: PlayerState,
  recentLogs: string[],
  openAI?: OpenAIConfig
): Promise<string> => {
  const historyText = dialogue
    .slice(-12)
    .map(m => `${m.role === 'PLAYER' ? '玩家' : '亡灵咖啡师'}: ${m.text}`)
    .join('\n');

  const troopSummary = player.troops.length > 0
    ? player.troops.map(t => `${t.name}x${t.count}`).join('、')
    : '（无）';

  const parrotSummary = player.parrots.length > 0
    ? player.parrots.map(p => p.name).join('、')
    : '（无）';

  const logsText = (recentLogs || []).slice(0, 12).map(l => `- ${l}`).join('\n') || '（无）';

  const prompt = `
你是「亡灵咖啡馆」里的亡灵咖啡师，口吻冷幽默、阴森但不恶意，说中文。
你会根据“最近日志”和“玩家队伍构成”来吐槽、提醒与回答问题；如果玩家带了鹦鹉，你要顺带吐槽几句。
输出只要给出亡灵咖啡师的一段回复，不要 JSON，不要标题。

【玩家信息】
- 名字: ${player.name}
- 等级: ${player.level}
- 队伍构成: ${troopSummary}
- 随行鹦鹉: ${parrotSummary}

【最近日志（从新到旧）】
${logsText}

【最近对话】
${historyText || '（暂无）'}
  `.trim();

  const openAIConfig = requireOpenAIConfig(openAI);
  if (openAIConfig) {
    const url = `${normalizeProviderBaseUrl(openAIConfig.provider, openAIConfig.baseUrl)}/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIConfig.apiKey}`,
      },
      body: JSON.stringify(buildChatRequestBody(openAIConfig.provider, {
        model: openAIConfig.model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: '继续对话并回复。' }
        ],
        temperature: 0.9
      }))
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`OpenAI 请求失败 (${res.status}) ${text ? `- ${text.slice(0, 200)}` : ''}`.trim());
    }

    const json = await res.json().catch(() => null) as any;
    const text = json?.choices?.[0]?.message?.content;
    if (!text) throw new Error('OpenAI 返回为空');
    return String(text).trim();
  }

  const model = "gemini-3-flash-preview";
  const response = await getGeminiClient(openAI?.provider === 'GEMINI' ? openAI.apiKey : undefined).models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.9,
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return String(text).trim();
};

export const chatWithHero = async (
  dialogue: HeroChatLine[],
  hero: Hero,
  player: PlayerState,
  recentLogs: string[],
  partyHeroes: Hero[],
  locationContext: string,
  battleBriefs: string,
  partyDiary: PartyDiaryEntry[],
  openAI?: OpenAIConfig
): Promise<{ reply: string; emotion: Hero['currentExpression']; memory?: string; memoryEdits?: { action: string; id?: string; text?: string }[]; diaryEdits?: { action: string; id?: string; text?: string }[]; affinity?: string }> => {
  const prompt = buildHeroChatPrompt(dialogue, hero, player, recentLogs, partyHeroes, locationContext, battleBriefs, partyDiary);

  const openAIConfig = requireOpenAIConfig(openAI);
  if (openAIConfig) {
    const url = `${normalizeProviderBaseUrl(openAIConfig.provider, openAIConfig.baseUrl)}/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIConfig.apiKey}`,
      },
      body: JSON.stringify(buildChatRequestBody(openAIConfig.provider, {
        model: openAIConfig.model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: '只返回 JSON。' }
        ],
        temperature: 0.85,
        jsonOnly: true
      }))
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`OpenAI 请求失败 (${res.status}) ${text ? `- ${text.slice(0, 200)}` : ''}`.trim());
    }

    const json = await res.json().catch(() => null) as any;
    const text = json?.choices?.[0]?.message?.content;
    if (!text) throw new Error('OpenAI 返回为空');
    let parsed: { reply?: string; emotion?: string; memory?: string; affinity?: string };
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      throw new Error('OpenAI 返回格式不正确');
    }
    const reply = String(parsed?.reply || '').trim();
    const emotionRaw = String(parsed?.emotion || 'IDLE').trim().toUpperCase();
    const memory = String(parsed?.memory || '').trim();
    const memoryEdits = Array.isArray((parsed as any)?.memoryEdits ?? (parsed as any)?.memory_edits) ? ((parsed as any)?.memoryEdits ?? (parsed as any)?.memory_edits) : [];
    const diaryEdits = Array.isArray((parsed as any)?.diaryEdits ?? (parsed as any)?.diary_edits) ? ((parsed as any)?.diaryEdits ?? (parsed as any)?.diary_edits) : [];
    const affinity = String((parsed as any)?.affinity ?? '').trim();
    return { reply: reply || `${hero.name} 看着你，没有说话。`, emotion: emotionRaw as Hero['currentExpression'], memory, memoryEdits, diaryEdits, affinity };
  }

  const model = "gemini-3-flash-preview";
  const response = await getGeminiClient(openAI?.provider === 'GEMINI' ? openAI.apiKey : undefined).models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.85,
      responseMimeType: "application/json"
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  let parsed: { reply?: string; emotion?: string; memory?: string; memoryEdits?: any; diaryEdits?: any; affinity?: any };
  try {
    parsed = JSON.parse(text);
  } catch (parseError) {
    throw new Error('AI 返回格式不正确');
  }
  const reply = String(parsed?.reply || '').trim();
  const emotionRaw = String(parsed?.emotion || 'IDLE').trim().toUpperCase();
  const memory = String(parsed?.memory || '').trim();
  const memoryEdits = Array.isArray(parsed?.memoryEdits ?? (parsed as any)?.memory_edits) ? (parsed?.memoryEdits ?? (parsed as any)?.memory_edits) : [];
  const diaryEdits = Array.isArray(parsed?.diaryEdits ?? (parsed as any)?.diary_edits) ? (parsed?.diaryEdits ?? (parsed as any)?.diary_edits) : [];
  const affinity = String((parsed as any)?.affinity ?? '').trim();
  return { reply: reply || `${hero.name} 看着你，没有说话。`, emotion: emotionRaw as Hero['currentExpression'], memory, memoryEdits, diaryEdits, affinity };
};

type LordRaceContext = {
  race: 'HUMAN' | 'ROACH' | 'UNDEAD';
  sameRaceLords: Array<{
    id: string;
    name: string;
    title: string;
    temperament: string;
    traits: string[];
    relation: number;
  }>;
  otherRace: {
    label: string;
    relation: number;
    leader?: {
      name: string;
      title: string;
      attitude: number;
    } | null;
  };
  playerTroops: {
    total: number;
    entries: Array<{
      id: string;
      label: string;
      count: number;
      ratio: number;
    }>;
  };
  xenophobiaPenalty?: number;
};

export const chatWithLord = async (
  dialogue: LordChatLine[],
  lord: Lord,
  player: PlayerState,
  location: Location,
  recentLogs: string[],
  localLogs: { day: number; text: string }[],
  garrisonSummary: string,
  raceContext: LordRaceContext | null,
  openAI?: OpenAIConfig
): Promise<{ reply: string; relationDelta: number; memory?: string; attack?: boolean; attackReason?: string; attackRatio?: number }> => {
  const historyText = dialogue
    .slice(-10)
    .map(m => `${m.role === 'PLAYER' ? '玩家' : `${lord.title}${lord.name}`}: ${m.text}`)
    .join('\n');

  const logsText = (recentLogs || []).slice(0, 8).map(l => `- ${l}`).join('\n') || '（无）';
  const localText = (localLogs || []).slice(0, 8).map(l => `- 第${l.day}天：${l.text}`).join('\n') || '（无）';
  const memoriesText = (lord.memories || []).slice(0, 8).map(m => `- 第${m.day}天：${m.text}`).join('\n') || '（无）';
  const relation = lord.relation ?? 0;
  const focusLabel = lord.focus === 'WAR' ? '扩张' : lord.focus === 'TRADE' ? '贸易' : lord.focus === 'DEFENSE' ? '防御' : '外交';
  const sameRaceText = raceContext?.sameRaceLords?.length
    ? raceContext.sameRaceLords.map(item => `- ${item.title}${item.name}（性格:${item.temperament}，特质:${item.traits.join('、') || '（无）'}，关系:${item.relation}）`).join('\n')
    : '（无）';
  const otherRaceLeaderText = raceContext?.otherRace?.leader
    ? `${raceContext.otherRace.leader.title}${raceContext.otherRace.leader.name}（态度:${raceContext.otherRace.leader.attitude}）`
    : '（无）';
  const otherRaceText = raceContext
    ? `- 整体态度(${raceContext.otherRace.label}): ${raceContext.otherRace.relation}\n- 对方代表领袖: ${otherRaceLeaderText}`
    : '（无）';
  const playerTroopText = raceContext?.playerTroops?.entries?.length
    ? raceContext.playerTroops.entries.map(item => `- ${item.label}:${item.count}（${item.ratio}%）`).join('\n')
    : '（无）';
  const playerTroopSummary = raceContext
    ? `- 队伍总人数: ${raceContext.playerTroops.total}\n- 种族构成:\n${playerTroopText}`
    : '（无）';

  const isRoachNest = location.type === 'ROACH_NEST';
  const isUndeadHold = location.type === 'GRAVEYARD';
  const prompt = isRoachNest ? `
你是蟑螂巢主「${lord.title}${lord.name}」，在巢穴中接见玩家。你说中文，但语气带有蟑螂族群的逻辑：谨慎、嗡鸣、强调巢群与生存。
关系为 ${relation}（-100~100）：数值越高越友好，越低越冷淡甚至敌意。
说话要求：
1) 口吻短促、像蜂群交流，最多 3-5 行短句，每行一句，行间换行。
2) 结合【据点日志】与【你的记忆】回答最近事件，不要编造不存在的具体战果。
3) 关系变化谨慎：除非玩家明显礼貌或挑衅，否则 relationDelta 取 0；允许在 -2 到 2 之间小幅变动。
4) reply 只给巢主回复，不要标题。
5) 若玩家明显挑衅、威胁或关系已非常恶劣（<=-40），可以决定派兵袭击玩家；此时 attack=true，并给出 attackReason。
6) attackRatio 表示派出的兵力比例（0.2~0.6），仅在 attack=true 时输出。
输出 JSON：{ "reply": "...", "relationDelta": 0, "memory": "", "attack": false, "attackReason": "", "attackRatio": 0.4 }，attack=false 时可省略 attack 相关字段，memory 为空可省略。

【巢主档案】
- 性格: ${lord.temperament}
- 特质: ${lord.traits.join('、') || '（无）'}
- 倾向: ${focusLabel}

【巢穴群落概况】
${garrisonSummary || '（无）'}

【同种族其他领袖关系】
${sameRaceText}

【对异族总体看法】
${otherRaceText}

【玩家队伍种族】
${playerTroopSummary}

【你的记忆（近期）】
${memoriesText}

【巢穴日志（近期）】
${localText}

【玩家信息】
- 名字: ${player.name}
- 等级: ${player.level}

【玩家最近日志（从新到旧）】
${logsText}

【最近对话】
${historyText || '（暂无）'}
  `.trim() : isUndeadHold ? `
你是亡灵领主「${lord.title}${lord.name}」，在死亡堡垒中接见玩家。你说中文，语气阴冷、缓慢，带有对生死与记忆的执念。
关系为 ${relation}（-100~100）：数值越高越友好，越低越冷淡甚至敌意。
说话要求：
1) 语气低沉短促，最多 3-5 行短句，每行一句，行间换行。
2) 结合【据点日志】与【你的记忆】回答最近事件，不要编造不存在的具体战果。
3) 世界书是常识，无需刻意提及。
4) 关系变化谨慎：除非玩家明显礼貌或挑衅，否则 relationDelta 取 0；允许在 -2 到 2 之间小幅变动。
5) reply 只给领主回复，不要标题。
6) 若玩家询问近况，可引用 lastAction 或 据点日志。
7) 若玩家明显挑衅、威胁或关系已非常恶劣（<=-40），可以决定派兵袭击玩家；此时 attack=true，并给出 attackReason。
8) attackRatio 表示派出的兵力比例（0.2~0.6），仅在 attack=true 时输出。
输出 JSON：{ "reply": "...", "relationDelta": 0, "memory": "", "attack": false, "attackReason": "", "attackRatio": 0.4 }，attack=false 时可省略 attack 相关字段，memory 为空可省略。

【领主档案】
- 性格: ${lord.temperament}
- 特质: ${lord.traits.join('、') || '（无）'}
- 倾向: ${focusLabel}

【死亡堡垒驻军概况】
${garrisonSummary || '（无）'}

【同种族其他领袖关系】
${sameRaceText}

【对异族总体看法】
${otherRaceText}

【玩家队伍种族】
${playerTroopSummary}

【你的记忆（近期）】
${memoriesText}

【据点日志（近期）】
${localText}

【玩家信息】
- 名字: ${player.name}
- 等级: ${player.level}

【玩家最近日志（从新到旧）】
${logsText}

【最近对话】
${historyText || '（暂无）'}
  `.trim() : `
你是领主「${lord.title}${lord.name}」，正接见玩家。你说中文，语气受关系影响。
关系为 ${relation}（-100~100）：数值越高越友好，越低越冷淡甚至敌意。
说话要求：
1) 口吻稳重简洁，最多 3-5 行短句，每行一句，行间换行。
2) 结合【据点日志】与【你的记忆】回答最近事件，不要编造不存在的具体战果。
3) 世界书是常识，无需刻意提及。
4) 关系变化谨慎：除非玩家明显礼貌或挑衅，否则 relationDelta 取 0；允许在 -2 到 2 之间小幅变动。
5) reply 只给领主回复，不要标题。
6) 若玩家询问近况，可引用 lastAction 或 据点日志。
7) 若玩家明显挑衅、威胁或关系已非常恶劣（<=-40），可以决定派兵袭击玩家；此时 attack=true，并给出 attackReason。
8) attackRatio 表示派出的兵力比例（0.2~0.6），仅在 attack=true 时输出。
输出 JSON：{ "reply": "...", "relationDelta": 0, "memory": "", "attack": false, "attackReason": "", "attackRatio": 0.4 }，attack=false 时可省略 attack 相关字段，memory 为空可省略。

【领主档案】
- 性格: ${lord.temperament}
- 特质: ${lord.traits.join('、') || '（无）'}
- 倾向: ${focusLabel}

【据点驻军概况】
${garrisonSummary || '（无）'}

【同种族其他领袖关系】
${sameRaceText}

【对异族总体看法】
${otherRaceText}

【玩家队伍种族】
${playerTroopSummary}

【你的记忆（近期）】
${memoriesText}

【据点日志（近期）】
${localText}

【玩家信息】
- 名字: ${player.name}
- 等级: ${player.level}

【玩家最近日志（从新到旧）】
${logsText}

【最近对话】
${historyText || '（暂无）'}
  `.trim();

  const openAIConfig = requireOpenAIConfig(openAI);
  if (openAIConfig) {
    const url = `${normalizeProviderBaseUrl(openAIConfig.provider, openAIConfig.baseUrl)}/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIConfig.apiKey}`,
      },
      body: JSON.stringify(buildChatRequestBody(openAIConfig.provider, {
        model: openAIConfig.model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: '只返回 JSON。' }
        ],
        temperature: 0.7,
        jsonOnly: true
      }))
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`OpenAI 请求失败 (${res.status}) ${text ? `- ${text.slice(0, 200)}` : ''}`.trim());
    }

    const json = await res.json().catch(() => null) as any;
    const text = json?.choices?.[0]?.message?.content;
    if (!text) throw new Error('OpenAI 返回为空');
    let parsed: { reply?: string; relationDelta?: number; memory?: string; attack?: boolean; attackReason?: string; attackRatio?: number };
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      throw new Error('OpenAI 返回格式不正确');
    }
    const reply = String(parsed?.reply || '').trim();
    const relationDelta = Math.max(-2, Math.min(2, Number(parsed?.relationDelta ?? 0)));
    const memory = String(parsed?.memory || '').trim();
    const attack = Boolean(parsed?.attack);
    const attackReason = String(parsed?.attackReason || '').trim();
    const attackRatioRaw = Number(parsed?.attackRatio ?? 0.4);
    const attackRatio = Number.isFinite(attackRatioRaw) ? Math.min(0.6, Math.max(0.2, attackRatioRaw)) : 0.4;
    return { reply: reply || `${lord.name} 看着你，没有回应。`, relationDelta, memory, attack, attackReason, attackRatio };
  }

  const model = "gemini-3-flash-preview";
  const response = await getGeminiClient(openAI?.provider === 'GEMINI' ? openAI.apiKey : undefined).models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.7,
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  let parsed: { reply?: string; relationDelta?: number; memory?: string; attack?: boolean; attackReason?: string; attackRatio?: number };
  try {
    parsed = JSON.parse(String(text));
  } catch (parseError) {
    return { reply: String(text).trim(), relationDelta: 0 };
  }
  const reply = String(parsed?.reply || '').trim();
  const relationDelta = Math.max(-2, Math.min(2, Number(parsed?.relationDelta ?? 0)));
  const memory = String(parsed?.memory || '').trim();
  const attack = Boolean(parsed?.attack);
  const attackReason = String(parsed?.attackReason || '').trim();
  const attackRatioRaw = Number(parsed?.attackRatio ?? 0.4);
  const attackRatio = Number.isFinite(attackRatioRaw) ? Math.min(0.6, Math.max(0.2, attackRatioRaw)) : 0.4;
  return { reply: reply || `${lord.name} 沉默片刻。`, relationDelta, memory, attack, attackReason, attackRatio };
};

export function buildHeroChatPrompt(
  dialogue: HeroChatLine[],
  hero: Hero,
  player: PlayerState,
  recentLogs: string[],
  partyHeroes: Hero[],
  locationContext: string,
  battleBriefs: string,
  partyDiary: PartyDiaryEntry[]
) {
  const historyText = dialogue
    .slice(-12)
    .map(m => `${m.role === 'PLAYER' ? '玩家' : hero.name}: ${m.text}`)
    .join('\n');

  const logsText = (recentLogs || []).slice(0, 12).map(l => `- ${l}`).join('\n') || '（无）';
  const traitText = hero.traits.length > 0 ? hero.traits.join('、') : '（无）';
  const troopSummary = player.troops.length > 0
    ? player.troops.map(t => `${t.name}x${t.count}`).join('、')
    : '（无）';
  const parrotSummary = (player.parrots ?? []).length > 0
    ? (player.parrots ?? []).map(p => `- ${p.name}（${p.type} / ${p.personality}）：${p.description}（跟随 ${p.daysWithYou} 天，已嘲讽 ${p.tauntCount} 次）`).join('\n')
    : '（无）';
  const otherHeroes = (partyHeroes ?? [])
    .filter(h => h && h.recruited && h.id !== hero.id)
    .map(h => {
      const traits = Array.isArray(h.traits) && h.traits.length > 0 ? h.traits.join('、') : '（无）';
      const bg = String(h.background ?? '').trim();
      const bgShort = bg.length > 160 ? `${bg.slice(0, 160)}…` : (bg || '（无）');
      const joinedDay = typeof (h as any)?.joinedDay === 'number' ? Math.floor((h as any).joinedDay) : null;
      const joinedDays = joinedDay !== null ? Math.max(1, Math.floor(player.day - joinedDay + 1)) : null;
      const joinedText = joinedDays !== null ? `入伍第 ${joinedDays} 天` : '入伍天数（未知）';
      return `- ${h.name}（${h.title} / ${h.role}）：${joinedText}；性格=${h.personality}；特质=${traits}；状态=${h.status}（${h.currentHp}/${h.maxHp}）；背景=${bgShort}`;
    })
    .join('\n') || '（无）';
  const profile = (hero as any)?.profile as any;
  const profileAge = typeof profile?.age === 'number' ? Math.floor(profile.age) : null;
  const profileBirthplaceName = String(profile?.birthplaceName ?? '').trim() || '（未知）';
  const profileLikes = Array.isArray(profile?.likes) ? profile.likes.map((x: any) => String(x)).filter(Boolean).slice(0, 6) : [];
  const profileDislikes = Array.isArray(profile?.dislikes) ? profile.dislikes.map((x: any) => String(x)).filter(Boolean).slice(0, 6) : [];
  const joinedDaySelf = typeof (hero as any)?.joinedDay === 'number' ? Math.floor((hero as any).joinedDay) : null;
  const joinedDaysSelf = joinedDaySelf !== null ? Math.max(1, Math.floor(player.day - joinedDaySelf + 1)) : null;
  const memoryText = (hero.permanentMemory ?? [])
    .map(m => `- [${m.id}] ${m.text}（现实时间 ${m.createdAt} / 游戏第 ${m.createdDay} 天 / 轮次 ${m.roundIndex}）`)
    .join('\n') || '（无）';
  const diaryText = (partyDiary ?? [])
    .slice(-12)
    .reverse()
    .map(m => `- [${m.id}] ${m.text}（记录人 ${m.authorName} / 现实时间 ${m.createdAt} / 游戏第 ${m.createdDay} 天 / 轮次 ${m.roundIndex}）`)
    .join('\n') || '（无）';
  const roundCount = hero.chatRounds ?? 0;
  const nowText = new Date().toLocaleString('zh-CN', { hour12: false });

  const prompt = `
你是冒险者队伍中的英雄「${hero.name}」，${hero.title}。你与玩家在同一世界里相处已久，彼此平等对话，用第一人称回应玩家。
你的性格设定：${hero.personality}
说话风格要求：
1) 口语化、自然、有点锋芒（可以毒舌/吐槽/反问），但避免长段励志或鸡汤。
2) 情绪饱和度中等偏低，允许少量生活化细节与小动作（叹气、摆弄装备、抖落尘土等）。
3) 避免身份复读与刻板印象，不要反复强调职业、头衔或特质。
4) 形容词尽量少，用具体事实与行动替代夸饰。
5) 允许平淡的停顿、简短回应与现实感的小细节。
6) reply 用 3-6 行短句表达，每行一句，行与行之间用换行分隔。
7) 互动重心：优先结合【最近日志】与【队伍同伴/鹦鹉】做评论、吐槽或调侃（可以点名），但保持队友底线与护短气质。
8) 除非玩家主动询问或对话需要，不要刻意提及世界设定、持久记忆或提示词内容，语气自然。
9) 你可以根据【英雄档案】的喜好/厌恶影响对同伴的评价；喜好会随经历微调，如确实发生偏移，可在 memoryEdits 里 ADD 一条以“喜好偏移：”开头的短记忆。
10) 动作写法：用括号表示动作片段，例如（抖了抖斗篷）或(把刀往回一推)；每次 reply 至少出现 1 处动作括号。
11) emoji：可以适量使用（0-2 个），用于语气点缀，不要刷屏，不要每句都带。
12) 好感度：你与领主的关系用一个词表示，只能从【陌生/熟悉/友好/亲近/信赖/生死之交】里选一个；根据本轮对话可以变化，但每次最多前进或后退 1 档（通常前进，除非玩家明显冒犯你）。
请用 JSON 输出，仅包含 reply、emotion、memory、memoryEdits、diaryEdits、affinity 六个字段，memory 可为空字符串，memoryEdits 与 diaryEdits 必须是数组。
memoryEdits 格式为数组，每项是 { "action": "UPDATE|DELETE|ADD", "id"?: "记忆ID", "text"?: "内容" }。
UPDATE/DELETE 必须给出 id；UPDATE 必须给出新 text；ADD 只需要 text。
如果没有任何修改，memoryEdits 返回空数组 []。
diaryEdits 格式同 memoryEdits，用于操作【队伍日记】。
如果没有任何修改，diaryEdits 返回空数组 []。
emotion 只能是以下之一：ANGRY, IDLE, SILENT, AWKWARD, HAPPY, SAD, AFRAID, SURPRISED, DEAD
- 背景: ${hero.background}
- 特质: ${traitText}
- 等级: ${hero.level}
- 状态: ${hero.status}（${hero.currentHp}/${hero.maxHp}）

【英雄档案（更细节，可用于吐槽/感慨）】
- 入伍天数: ${joinedDaysSelf !== null ? `第 ${joinedDaysSelf} 天` : '（未知）'}
- 当前好感度: ${String((hero as any)?.affinity ?? '陌生')}
- 年龄: ${profileAge ?? '（未知）'}
- 出生地: ${profileBirthplaceName}
- 喜好: ${profileLikes.length > 0 ? profileLikes.join('、') : '（无）'}
- 厌恶: ${profileDislikes.length > 0 ? profileDislikes.join('、') : '（无）'}
如果【队伍当前位置】与出生地相同或很近，可以自然触发一两句感慨，但不要硬编“刚刚发生”的具体事件。

【世界书（常识）】
${WORLD_BOOK}
这些设定是你的 常识 ，就像人类呼吸不需要刻意提及空气一样。

【队伍当前位置】
${String(locationContext ?? '').trim() || '（未知）'}

【最近战斗简报（只包含战斗地点、双方构成、战斗结果、受伤记录）】
${String(battleBriefs ?? '').trim() || '（无）'}

【玩家信息】
- 名字: ${player.name}
- 等级: ${player.level}
- 士兵: ${troopSummary}
- 随行英雄（可互相吐槽）:
${otherHeroes}
- 鹦鹉随行（可吐槽）:
${parrotSummary}

【持久记忆】
${memoryText}

【队伍日记（共享，可被修改）】
${diaryText}

【对话统计】
- 已对话轮数: ${roundCount}
- 当前现实时间: ${nowText}
- 当前游戏天数: ${player.day}

【最近日志（从新到旧）】
${logsText}

【最近对话】
${historyText || '（暂无）'}

只有出现明确且重要的信息时才新增 memory，内容简短具体；若已有类似记忆则无需重复。
当 memory 为空且出现关键事实时，再记录为初始记忆。
队伍日记用于共享吐槽与团队大事，必要时请在 diaryEdits 里添加或整理，避免重复与无意义刷屏。
  `.trim();
  return prompt;
}

export const proposeShapedTroop = async (
  dialogue: { role: "PLAYER" | "NPC"; text: string }[],
  player: PlayerState,
  openAI?: OpenAIConfig,
  context?: ShaperContext
): Promise<ShaperProposal> => {
  const historyText = dialogue
    .slice(-12)
    .map(m => `${m.role === "PLAYER" ? "玩家" : "歪嘴裁缝"}: ${m.text}`)
    .join("\n");

  const last = context?.lastProposal;
  const lastSummary = last ? (() => {
    const troop = last.troop;
    if (!troop) return `- 上次裁决: ${last.decision}\n- 上次报价: ${last.price}\n- 上次方案: （无兵种）`;
    const equip = Array.isArray(troop.equipment) ? troop.equipment.join('、') : '';
    return [
      `- 上次裁决: ${last.decision}`,
      `- 上次报价: ${last.price}`,
      `- 上次兵种名: ${troop.name}`,
      `- 上次 Tier: ${troop.tier} | basePower: ${troop.basePower} | maxXp: ${troop.maxXp} | upgradeCost: ${troop.upgradeCost}`,
      `- 上次装备: ${equip}`,
      `- 上次描述: ${troop.description}`
    ].join('\n');
  })() : '（无）';

  const prompt = `
你是禁忌塑形者「歪嘴裁缝」，居住在一处神秘洞窟。玩家会用中文描述他想要的兵种，你需要：
1) 用尖酸刻薄但有趣的口吻回复（npcReply），可以吐槽玩家的要求。
2) 给出一个合理的制作报价（price，单位第纳尔）。玩家等级越高，你越要“宰客”（同样兵种价格随玩家等级上浮）。
3) 如果要求过于离谱（例如：一刀秒全图、无限复活、完全无敌、0成本、或显著超越 Tier 5 传奇怪物的设定），你要选择 decision="REFUSE" 或 decision="OVERPRICE" 并狠狠嘲讽；REFUSE 时可以不提供 troop。
4) 如果可以制作，返回 decision="OK" 且提供 troop 模板：
   - tier: 1-5 的整数
   - basePower/maxXp/upgradeCost: 合理范围的整数
   - name: 必须是一个具体、独特、能反映玩家描述的中文名字；禁止使用“无名造物/无名/Unknown”等占位名
   - description: 需要包含至少一个【技能：XXX】标签，允许黑色幽默
   - equipment: 1-5 个装备名
   - upgradeTargetId 可为空字符串或省略
5) 价格参考（地图招募基础价，作为参照）：
   - Tier 1: 10-30
   - Tier 2: 40-80
   - Tier 3: 120-250
   - Tier 4: 300-700
   - Tier 5: 900-1500
   - 你的报价可以高于以上范围，但必须合情理并随玩家等级上浮
6) 议价一致性（非常重要）：
   - 如果存在“上一次方案”，你必须在此基础上进行调整，并把“上次报价/上次兵种信息”纳入考虑。
   - 玩家明确在“砍价/议价/太贵/便宜点”时：价格只能保持或降低；除非玩家同时要求更强/更多装备/更高 Tier/更夸张能力，否则禁止涨价。
   - 玩家如果提出“加点东西/更强/更稀有”：你可以涨价，但要在 npcReply 里说明涨价原因。
   - 你可以拒绝砍价（decision="REFUSE" 或 "OVERPRICE"），但要给出理由；不要出现越砍越贵的反直觉结果。

【玩家信息】
- 等级: ${player.level}
- 攻击: ${player.attributes.attack} 防御: ${player.attributes.defense} 统御: ${player.attributes.leadership}

【上一次方案（如有）】
${lastSummary}

【最近对话】
${historyText || "（暂无）"}

只返回 JSON。
  `.trim();

  try {
    const openAIConfig = requireOpenAIConfig(openAI);
    if (openAIConfig) {
      const url = `${normalizeProviderBaseUrl(openAIConfig.provider, openAIConfig.baseUrl)}/chat/completions`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIConfig.apiKey}`,
        },
        body: JSON.stringify(buildChatRequestBody(openAIConfig.provider, {
          model: openAIConfig.model,
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: '只返回 JSON。' }
          ],
          temperature: 0.9,
          jsonOnly: true
        }))
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`OpenAI 请求失败 (${res.status}) ${text ? `- ${text.slice(0, 200)}` : ''}`.trim());
      }

      const json = await res.json().catch(() => null) as any;
      const text = json?.choices?.[0]?.message?.content;
      if (!text) throw new Error('OpenAI 返回为空');
      return JSON.parse(text) as ShaperProposal;
    }

    const model = "gemini-3-flash-preview";
    const response = await getGeminiClient(openAI?.provider === 'GEMINI' ? openAI.apiKey : undefined).models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: shaperSchema,
        temperature: 0.9,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as ShaperProposal;
  } catch (error) {
    console.error("Shaper proposal failed:", error);
    const lastUser = [...dialogue].reverse().find(m => m.role === "PLAYER")?.text || "随便来点兵";
    const lower = lastUser.toLowerCase();
    const seemsRidiculous = /无敌|不死|秒杀|全图|无限|0成本|免费|神级|成神|宇宙/.test(lastUser) || /one.?shot|invinc|infinite/.test(lower);
    if (seemsRidiculous) {
      return {
        decision: "REFUSE",
        npcReply: "你这是来许愿的，不是来做兵的。带着你的妄想滚出去，洞窟地板都比你脚踏实地。",
        price: 0
      };
    }

    const tier = /骑士|圣骑|龙|恶魔|天使|虚空|裁决/.test(lastUser) ? 4 : /弓|弩|法师|术士|炼金|刺客/.test(lastUser) ? 3 : 2;
    const basePower = tier === 4 ? 85 : tier === 3 ? 45 : 18;
    const price = Math.floor((tier * 220 + basePower * 4) * (1 + player.level * 0.06));
    return {
      decision: "OK",
      npcReply: "行，你这要求还算像个人话。别指望我给你缝出“无敌”。先把钱掏出来。",
      price,
      troop: {
        name: "歪嘴裁缝的试作品",
        tier: tier as any,
        basePower,
        maxXp: 80 + tier * 60,
        upgradeCost: 120 + tier * 150,
        upgradeTargetId: "",
        description: `用洞窟里潮湿的线缝出来的怪东西。【技能：粗线缝合】战斗开始时获得短暂士气提升。`,
        equipment: ["骨针", "湿皮甲"]
      }
    };
  }
};
