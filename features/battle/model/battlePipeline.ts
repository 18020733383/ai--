import { resolveBattle } from '../../../services/geminiService';
import { BattleResult, BattleRound, EnemyForce, PlayerState, TerrainType, Troop } from '../../../types';
import { BattleEngagementMeta } from './battleRuntime';
import { calculateLocalBattleRewards as defaultCalculateRewards } from './battleSettlement';

type LocalBattleRewards = { gold: number; renown: number; xp: number };

type RunBattlePipelineParams = {
  battleTroops: Troop[];
  activeEnemy: EnemyForce;
  currentPlayer: PlayerState;
  battleInfo: BattleEngagementMeta;
  battleResolutionMode: 'AI' | 'PROGRAM';
  battleStreamEnabled: boolean;
  aiConfig: any;
  isTraining: boolean;
  deploymentContext: string;
  calculateLocalBattleRewards?: (enemy: EnemyForce, playerLevel: number, trainingLevel: number, outcome: BattleResult['outcome']) => LocalBattleRewards;
  resolveBattleProgrammatic: (
    battleTroops: Troop[],
    enemyForce: EnemyForce,
    terrain: TerrainType,
    currentPlayer: PlayerState,
    battleInfo?: BattleEngagementMeta
  ) => BattleResult;
  onStreamRound?: (rounds: BattleRound[]) => void;
  onFirstRoundReady?: () => void;
};

type RunBattlePipelineResult = {
  finalResult: BattleResult;
  localRewards: LocalBattleRewards;
  shouldStep: boolean;
  useAiMode: boolean;
  useStreaming: boolean;
  firstRoundReady: boolean;
};

export const runBattlePipeline = async ({
  battleTroops,
  activeEnemy,
  currentPlayer,
  battleInfo,
  battleResolutionMode,
  battleStreamEnabled,
  aiConfig,
  isTraining,
  deploymentContext,
  calculateLocalBattleRewards,
  resolveBattleProgrammatic,
  onStreamRound,
  onFirstRoundReady
}: RunBattlePipelineParams): Promise<RunBattlePipelineResult> => {
  const calcRewards = calculateLocalBattleRewards ?? defaultCalculateRewards;
  const useAiMode = battleResolutionMode === 'AI' && !!aiConfig;
  const useStreaming = !!(useAiMode && battleStreamEnabled);
  let streamedRounds: BattleRound[] = [];
  let firstRoundReady = false;

  const result = useAiMode && aiConfig
    ? await resolveBattle(
        battleTroops,
        activeEnemy,
        activeEnemy.terrain,
        currentPlayer,
        aiConfig,
        battleInfo.siegeContext,
        deploymentContext,
        useStreaming ? {
          stream: true,
          onRound: (round) => {
            streamedRounds = [...streamedRounds, round];
            onStreamRound?.(streamedRounds);
            if (!firstRoundReady) {
              firstRoundReady = true;
              onFirstRoundReady?.();
            }
          }
        } : undefined
      )
    : resolveBattleProgrammatic(
        battleTroops,
        activeEnemy,
        activeEnemy.terrain,
        currentPlayer,
        battleInfo
      );

  const trainingRewardsRaw = calcRewards(activeEnemy, currentPlayer.level, currentPlayer.attributes.training ?? 0, result.outcome);
  const localRewards = isTraining
    ? { gold: 0, renown: 0, xp: Math.floor(trainingRewardsRaw.xp / 3) }
    : calcRewards(activeEnemy, currentPlayer.level, currentPlayer.attributes.training ?? 0, result.outcome);

  const finalResult: BattleResult = {
    ...result,
    lootGold: localRewards.gold,
    renownGained: localRewards.renown,
    xpGained: localRewards.xp
  };

  const shouldStep = battleResolutionMode === 'PROGRAM' && (finalResult.rounds?.length ?? 0) > 1;

  return {
    finalResult,
    localRewards,
    shouldStep,
    useAiMode,
    useStreaming,
    firstRoundReady
  };
};
