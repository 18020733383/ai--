import type { Location } from '../../types';

/** 玩家隐匿点是否已开通。旧存档无 hideoutUnlocked 字段视为已开通。 */
export function isPlayerHideoutUnlocked(location: Location): boolean {
  if (location.type !== 'HIDEOUT' || location.owner !== 'PLAYER') return true;
  const h = location.hideout;
  if (!h) return true;
  if (h.hideoutUnlocked === false) return false;
  return true;
}
