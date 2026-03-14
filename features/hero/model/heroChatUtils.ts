import type { Hero, HeroChatLine, HeroPermanentMemory, PartyDiaryEntry } from '../../../types';
import { HERO_EMOTIONS } from '../../../game/data';

export type MemoryEdit = { action: string; id?: string; text?: string };

export function normalizeHeroChat(memory: HeroChatLine[], currentDay: number): HeroChatLine[] {
  const minDay = Math.max(0, currentDay - 2);
  return memory
    .filter(line => line && (line.role === 'PLAYER' || line.role === 'HERO') && typeof line.text === 'string')
    .map(line => ({
      role: line.role,
      text: String(line.text).trim(),
      day: typeof line.day === 'number' ? line.day : currentDay
    }))
    .filter(line => line.text.length > 0 && line.day >= minDay)
    .slice(-24);
}

export function normalizeHeroMemory(memory: HeroPermanentMemory[]): HeroPermanentMemory[] {
  return (Array.isArray(memory) ? memory : [])
    .map(item => ({
      id: String(item?.id ?? '').trim() || `mem_${String(item?.createdAt ?? '').trim()}_${String(item?.roundIndex ?? '')}_${String(item?.text ?? '').trim()}`,
      text: String(item?.text ?? '').trim(),
      createdAt: String(item?.createdAt ?? '').trim(),
      createdDay: typeof item?.createdDay === 'number' ? item.createdDay : 0,
      roundIndex: typeof item?.roundIndex === 'number' ? item.roundIndex : 0
    }))
    .filter(item => item.text.length > 0)
    .slice(-30);
}

export function normalizePartyDiary(entries: PartyDiaryEntry[], currentDay: number): PartyDiaryEntry[] {
  return (Array.isArray(entries) ? entries : [])
    .map(item => ({
      id: String(item?.id ?? '').trim() || `diary_${String(item?.createdAt ?? '').trim()}_${String(item?.roundIndex ?? '')}_${String(item?.text ?? '').trim()}`,
      text: String(item?.text ?? '').trim(),
      authorId: String((item as any)?.authorId ?? '').trim(),
      authorName: String((item as any)?.authorName ?? (item as any)?.author ?? '').trim() || '未知',
      createdAt: String(item?.createdAt ?? '').trim(),
      createdDay: typeof item?.createdDay === 'number' ? item.createdDay : currentDay,
      roundIndex: typeof item?.roundIndex === 'number' ? item.roundIndex : 0
    }))
    .filter(item => item.text.length > 0)
    .slice(-40);
}

export function normalizeMemoryEdits(raw: unknown): MemoryEdit[] {
  return (Array.isArray(raw) ? raw : [])
    .map(item => ({
      action: String(item?.action ?? '').trim().toUpperCase(),
      id: String(item?.id ?? '').trim(),
      text: String(item?.text ?? '').trim()
    }))
    .filter(item => item.action && (item.id || item.text));
}

export function normalizeDiaryEdits(raw: unknown): MemoryEdit[] {
  return (Array.isArray(raw) ? raw : [])
    .map(item => ({
      action: String(item?.action ?? '').trim().toUpperCase(),
      id: String(item?.id ?? '').trim(),
      text: String(item?.text ?? '').trim()
    }))
    .filter(item => item.action && (item.id || item.text));
}

export function applyMemoryEdits(
  memory: HeroPermanentMemory[],
  edits: MemoryEdit[],
  nowText: string,
  day: number,
  roundIndex: number
): HeroPermanentMemory[] {
  let next = [...memory];
  edits.forEach(edit => {
    if (edit.action === 'DELETE') {
      if (edit.id) {
        next = next.filter(item => item.id !== edit.id);
      } else if (edit.text) {
        next = next.filter(item => item.text !== edit.text);
      }
    }
    if (edit.action === 'UPDATE') {
      if (!edit.id || !edit.text) return;
      const index = next.findIndex(item => item.id === edit.id);
      if (index >= 0) {
        next[index] = {
          ...next[index],
          text: edit.text,
          createdAt: nowText,
          createdDay: day,
          roundIndex
        };
      }
    }
    if (edit.action === 'ADD') {
      if (!edit.text) return;
      if (next.some(item => item.text === edit.text)) return;
      next.push({
        id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        text: edit.text,
        createdAt: nowText,
        createdDay: day,
        roundIndex
      });
    }
  });
  return next.slice(-30);
}

export function applyPartyDiaryEdits(
  entries: PartyDiaryEntry[],
  edits: MemoryEdit[],
  nowText: string,
  day: number,
  roundIndex: number,
  authorName: string,
  authorId?: string
): PartyDiaryEntry[] {
  let next = [...entries];
  edits.forEach(edit => {
    if (edit.action === 'DELETE') {
      if (edit.id) {
        next = next.filter(item => item.id !== edit.id);
      } else if (edit.text) {
        next = next.filter(item => item.text !== edit.text);
      }
    }
    if (edit.action === 'UPDATE') {
      const targetId = edit.id || (edit.text ? next.find(item => item.text === edit.text)?.id : undefined);
      if (!targetId || !edit.text) return;
      const index = next.findIndex(item => item.id === targetId);
      if (index >= 0) {
        next[index] = {
          ...next[index],
          text: edit.text,
          authorName,
          authorId,
          createdAt: nowText,
          createdDay: day,
          roundIndex
        };
      }
    }
    if (edit.action === 'ADD') {
      if (!edit.text) return;
      if (next.some(item => item.text === edit.text)) return;
      next.push({
        id: `diary_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        text: edit.text,
        authorName,
        authorId,
        createdAt: nowText,
        createdDay: day,
        roundIndex
      });
    }
  });
  return normalizePartyDiary(next, day);
}

export function normalizeHeroEmotion(value?: string): Hero['currentExpression'] {
  const raw = String(value || '').trim();
  const upper = raw.toUpperCase();
  if (HERO_EMOTIONS.includes(upper as Hero['currentExpression'])) return upper as Hero['currentExpression'];
  const aliases: Record<string, Hero['currentExpression']> = {
    '愤怒': 'ANGRY',
    '空闲': 'IDLE',
    '无语': 'SILENT',
    '尴尬': 'AWKWARD',
    '高兴': 'HAPPY',
    '难过': 'SAD',
    '害怕': 'AFRAID',
    '惊讶': 'SURPRISED',
    '生无可恋': 'DEAD'
  };
  return aliases[raw] ?? 'IDLE';
}

export function splitHeroReply(raw: string): string[] {
  const text = String(raw ?? '').trim();
  if (!text) return [];
  const byLine = text.split(/\n+/).map(line => line.trim()).filter(Boolean);
  if (byLine.length > 1) return byLine;
  const parts = text.match(/[^。！？!?]+[。！？!?]?/g)?.map(line => line.trim()).filter(Boolean);
  if (parts && parts.length > 1) return parts;
  return [text];
}
