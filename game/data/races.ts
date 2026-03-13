import { RaceId } from '../../types';

export const RACE_LABELS: Record<RaceId, string> = {
  HUMAN: '人类',
  ROACH: '蟑螂族群',
  UNDEAD: '亡灵族群',
  IMPOSTER: '伪人族群',
  BANDIT: '盗匪团伙',
  AUTOMATON: '失控机兵',
  VOID: '深渊势力',
  MADNESS: '疯人群体',
  BEAST: '野兽族群',
  GOBLIN: '哥布林部落'
};

export const RACE_RELATION_MATRIX: Record<RaceId, Record<RaceId, number>> = {
  HUMAN: {
    HUMAN: 0,
    ROACH: -35,
    UNDEAD: -25,
    IMPOSTER: -80,
    BANDIT: -50,
    AUTOMATON: -30,
    VOID: -60,
    MADNESS: -40,
    BEAST: -10,
    GOBLIN: -35
  },
  ROACH: {
    HUMAN: -35,
    ROACH: 0,
    UNDEAD: -10,
    IMPOSTER: -60,
    BANDIT: -20,
    AUTOMATON: -15,
    VOID: -45,
    MADNESS: -25,
    BEAST: -25,
    GOBLIN: -15
  },
  UNDEAD: {
    HUMAN: -25,
    ROACH: -10,
    UNDEAD: 0,
    IMPOSTER: -55,
    BANDIT: -20,
    AUTOMATON: -20,
    VOID: -40,
    MADNESS: -15,
    BEAST: -5,
    GOBLIN: -10
  },
  IMPOSTER: {
    HUMAN: -80,
    ROACH: -60,
    UNDEAD: -55,
    IMPOSTER: 0,
    BANDIT: -55,
    AUTOMATON: -40,
    VOID: -70,
    MADNESS: -50,
    BEAST: -55,
    GOBLIN: -55
  },
  BANDIT: {
    HUMAN: -50,
    ROACH: -20,
    UNDEAD: -20,
    IMPOSTER: -55,
    BANDIT: 0,
    AUTOMATON: -25,
    VOID: -35,
    MADNESS: -15,
    BEAST: -20,
    GOBLIN: -15
  },
  AUTOMATON: {
    HUMAN: -30,
    ROACH: -15,
    UNDEAD: -20,
    IMPOSTER: -40,
    BANDIT: -25,
    AUTOMATON: 0,
    VOID: -45,
    MADNESS: -25,
    BEAST: -18,
    GOBLIN: -20
  },
  VOID: {
    HUMAN: -60,
    ROACH: -45,
    UNDEAD: -40,
    IMPOSTER: -70,
    BANDIT: -35,
    AUTOMATON: -45,
    VOID: 0,
    MADNESS: -30,
    BEAST: -40,
    GOBLIN: -45
  },
  MADNESS: {
    HUMAN: -40,
    ROACH: -25,
    UNDEAD: -15,
    IMPOSTER: -50,
    BANDIT: -15,
    AUTOMATON: -25,
    VOID: -30,
    MADNESS: 0,
    BEAST: -8,
    GOBLIN: -20
  },
  BEAST: {
    HUMAN: -10,
    ROACH: -25,
    UNDEAD: -5,
    IMPOSTER: -55,
    BANDIT: -20,
    AUTOMATON: -18,
    VOID: -40,
    MADNESS: -8,
    BEAST: 0,
    GOBLIN: -10
  },
  GOBLIN: {
    HUMAN: -35,
    ROACH: -15,
    UNDEAD: -10,
    IMPOSTER: -55,
    BANDIT: -15,
    AUTOMATON: -20,
    VOID: -45,
    MADNESS: -20,
    BEAST: -10,
    GOBLIN: 0
  }
};
