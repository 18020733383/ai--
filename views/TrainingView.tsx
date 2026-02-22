import React from 'react';
import { Swords } from 'lucide-react';
import { EnemyForce, Troop } from '../types';
import { Button } from '../components/Button';

type TrainingViewProps = {
  trainingEnemyArmy: Array<{ id: string; count: number }>;
  setTrainingEnemyArmy: React.Dispatch<React.SetStateAction<Array<{ id: string; count: number }>>>;
  troopTemplates: Record<string, Omit<Troop, 'count' | 'xp'>>;
  createTroop: (id: string, count: number) => Troop;
  onStartTrainingBattle: (enemy: EnemyForce) => void;
  onBackToMap: () => void;
};

export const TrainingView = ({
  trainingEnemyArmy,
  setTrainingEnemyArmy,
  troopTemplates,
  createTroop,
  onStartTrainingBattle,
  onBackToMap
}: TrainingViewProps) => {
  return (
    <div className="max-w-4xl mx-auto p-4 pt-20 animate-fade-in">
      <div className="bg-stone-900 border border-stone-700 p-6 rounded shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-serif text-blue-400 flex items-center gap-2">
            <Swords /> 帝国训练场
          </h2>
          <Button onClick={onBackToMap} variant="secondary">离开</Button>
        </div>

        <p className="text-stone-400 mb-8">
          在这里你可以进行模拟战，测试兵种强度。模拟战不会造成实际伤亡，但也无法获得战利品。
        </p>

        <div className="bg-stone-800/50 p-6 rounded border border-stone-700 mb-8">
          <h3 className="text-xl font-bold text-stone-300 mb-4">模拟对手设置</h3>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs text-stone-500 mb-1">敌军兵种 ID</label>
              <select
                className="w-full bg-stone-900 border border-stone-600 text-stone-300 p-2 rounded"
                value={trainingEnemyArmy[0]?.id || 'peasant'}
                onChange={(e) => setTrainingEnemyArmy([{ id: e.target.value, count: trainingEnemyArmy[0]?.count || 10 }])}
              >
                {Object.values(troopTemplates).map(t => (
                  <option key={t.id} value={t.id}>{t.name} (T{t.tier})</option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="block text-xs text-stone-500 mb-1">数量</label>
              <input
                type="number"
                className="w-full bg-stone-900 border border-stone-600 text-stone-300 p-2 rounded"
                value={trainingEnemyArmy[0]?.count || 10}
                onChange={(e) => setTrainingEnemyArmy([{ id: trainingEnemyArmy[0]?.id || 'peasant', count: parseInt(e.target.value) }])}
              />
            </div>
          </div>
        </div>

        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            const enemyTroops = trainingEnemyArmy.map(t => createTroop(t.id, t.count));
            const enemy: EnemyForce = {
              name: '训练假人军团',
              description: '一群用于测试的靶子。',
              troops: enemyTroops,
              difficulty: 'N/A',
              lootPotential: 0,
              terrain: 'PLAINS',
              baseTroopId: trainingEnemyArmy[0].id
            };
            onStartTrainingBattle(enemy);
          }}
        >
          开始模拟战
        </Button>
      </div>
    </div>
  );
};
