export const FACTIONS = [
  {
    id: 'VERDANT_COVENANT',
    name: '翠弦盟约',
    shortName: '翠弦',
    description: '由河谷与林地的弓手团结成的盟约，以记录与远射守护贸易脉络。',
    focus: 'RANGED',
    color: '#22c55e',
    specialTroopIds: ['verdant_scout_archer', 'verdant_skybow']
  },
  {
    id: 'FROST_OATH',
    name: '霜誓王庭',
    shortName: '霜誓',
    description: '北境要塞与山岭关隘组成的誓盟，以重装与誓约维系残存秩序。',
    focus: 'MELEE',
    color: '#60a5fa',
    specialTroopIds: ['frost_oath_halberdier', 'frost_oath_bladeguard']
  },
  {
    id: 'RED_DUNE',
    name: '赤沙驭团',
    shortName: '赤沙',
    description: '沙海驿路上的骑团联邦，依靠风暴与驭骑掌控补给线。',
    focus: 'CAVALRY',
    color: '#f97316',
    specialTroopIds: ['red_dune_lancer', 'red_dune_cataphract']
  },
  {
    id: 'AUREATE_LEAGUE',
    name: '曜金同盟',
    shortName: '曜金',
    description: '沿着日升大道崛起的新贵联盟，偏好秩序与贸易，信奉“税票与长弓同样致命”。',
    focus: 'RANGED',
    color: '#facc15',
    specialTroopIds: ['imperial_elite_knight', 'knight']
  },
  {
    id: 'ARCANE_CONCORD',
    name: '星辉秘约',
    shortName: '星辉',
    description: '由高阶法师与塔城学派构成的秘约联盟，擅长以符文与法阵压制战场。',
    focus: 'RANGED',
    color: '#a78bfa',
    specialTroopIds: ['stellar_initiate', 'lumen_disciple', 'rift_sentinel', 'aether_scholar']
  }
] as const;
