import React from 'react';
import { Trophy, X } from 'lucide-react';
import type { AchievementDef } from '../app/achievements/achievementStore';
import { ACHIEVEMENT_CATEGORY_LABELS } from '../app/achievements/achievementStore';
import { Button } from './Button';

type Props = {
  achievement: AchievementDef | null;
  onDismiss: () => void;
};

export const AchievementUnlockToast = ({ achievement, onDismiss }: Props) => {
  React.useEffect(() => {
    if (!achievement) return;
    const t = window.setTimeout(onDismiss, 5200);
    return () => window.clearTimeout(t);
  }, [achievement, onDismiss]);

  if (!achievement) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[min(92vw,420px)]">
      <div
        className="rounded-lg border border-amber-600/80 bg-stone-950/95 shadow-xl shadow-amber-950/40 p-4 flex gap-3 items-start"
        role="alertdialog"
        aria-label="成就解锁"
      >
        <div className="shrink-0 w-11 h-11 rounded-full bg-amber-900/40 border border-amber-500/60 flex items-center justify-center">
          <Trophy className="text-amber-300" size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-amber-400/90 font-medium uppercase tracking-wide">成就解锁</div>
          <div className="text-stone-100 font-bold text-lg mt-0.5">{achievement.title}</div>
          <div className="text-xs text-amber-700/90 mt-0.5">{ACHIEVEMENT_CATEGORY_LABELS[achievement.category]}</div>
          <p className="text-sm text-stone-400 mt-2 leading-relaxed">{achievement.description}</p>
        </div>
        <Button variant="secondary" size="sm" className="shrink-0 p-1.5" onClick={onDismiss} aria-label="关闭">
          <X size={16} />
        </Button>
      </div>
    </div>
  );
};
