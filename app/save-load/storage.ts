export type SaveSlotMeta = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  isAuto?: boolean;
  day?: number;
  level?: number;
  renown?: number;
  endingId?: string;
};

export const SAVE_INDEX_KEY = 'calradia.saves.v1';
export const SAVE_DATA_PREFIX = 'calradia.save.v1.';
export const SAVE_SELECTED_KEY = 'calradia.saves.selected';
export const AUTO_SAVE_ID = 'AUTO';

export const readSaveIndex = (): SaveSlotMeta[] => {
  try {
    const raw = localStorage.getItem(SAVE_INDEX_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list
      .filter(item => item && typeof item.id === 'string')
      .map(item => ({
        id: String(item.id),
        name: String(item.name ?? '未命名存档'),
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
        isAuto: !!item.isAuto,
        day: typeof item.day === 'number' ? item.day : undefined,
        level: typeof item.level === 'number' ? item.level : undefined,
        renown: typeof item.renown === 'number' ? item.renown : undefined,
        endingId: typeof item.endingId === 'string' ? item.endingId : undefined
      }));
  } catch {
    return [];
  }
};

export const writeSaveIndex = (list: SaveSlotMeta[]) => {
  localStorage.setItem(SAVE_INDEX_KEY, JSON.stringify(list.slice(0, 40)));
};
