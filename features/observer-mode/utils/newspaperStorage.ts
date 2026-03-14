/**
 * 报纸本地存储 - 独立模块避免循环依赖
 */
import type { WorldNewspaperIssue } from '../../../services/geminiService';

const STORAGE_KEY = 'observer.newspapers';

export function loadNewspapers(): Array<{ id: string; date: string; masthead: string; issue: WorldNewspaperIssue }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveNewspaper(issue: WorldNewspaperIssue) {
  const list = loadNewspapers();
  const id = `paper_${Date.now()}`;
  list.unshift({
    id,
    date: issue.dateLine ?? String(new Date().toLocaleDateString('zh-CN')),
    masthead: issue.masthead ?? '异世界日报',
    issue
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
}
