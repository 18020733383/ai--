/**
 * 观海模式 - 报纸列表弹窗
 * 显示已保存的报纸，支持查看与下载
 */
import React from 'react';
import { X, Download, FileText } from 'lucide-react';
import type { WorldNewspaperIssue } from '../../../services/geminiService';

const STORAGE_KEY = 'observer.newspapers';

function loadNewspapers(): Array<{ id: string; date: string; masthead: string; issue: WorldNewspaperIssue }> {
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

type ObserverNewspaperModalProps = {
  onClose: () => void;
};

export const ObserverNewspaperModal = ({ onClose }: ObserverNewspaperModalProps) => {
  const [papers, setPapers] = React.useState(loadNewspapers);
  const [viewing, setViewing] = React.useState<WorldNewspaperIssue | null>(null);

  const downloadHtml = (issue: WorldNewspaperIssue) => {
    const escapeHtml = (v: string) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const sections = (issue.sections ?? []).map(s =>
      `<div class="section"><div class="tag">${escapeHtml(s.tag)}</div><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.body)}</p></div>`
    ).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(issue.masthead)}</title>
<style>body{font-family:serif;max-width:800px;margin:2em auto;padding:1em;background:#f0e6d2;color:#1c1917}
.masthead{font-size:2em;font-weight:bold;margin-bottom:0.5em}.date{color:#666;font-size:0.9em}
.section{margin:1.5em 0;padding:1em;border-top:1px solid #ccc}.tag{font-size:0.8em;color:#b91c1c}
.lead{font-size:1.2em;margin:1em 0}.briefs ul{margin:0.5em 0;padding-left:1.5em}</style></head><body>
<div class="masthead">${escapeHtml(issue.masthead)}</div>
<div class="date">${escapeHtml(issue.dateLine)} ${escapeHtml(issue.issueNo)}</div>
<div class="lead"><strong>${escapeHtml(issue.leadTitle)}</strong><p>${escapeHtml(issue.leadBody)}</p></div>
<div class="sections">${sections}</div>
${(issue.briefs ?? []).length ? `<div class="briefs"><ul>${(issue.briefs ?? []).map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul></div>` : ''}
</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(issue.masthead || 'newspaper').replace(/[^\w\u4e00-\u9fa5-]+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-stone-900 border border-stone-700 rounded-lg shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-stone-700">
          <h3 className="text-lg font-serif text-amber-400">报纸</h3>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {viewing ? (
            <div className="space-y-4">
              <div className="text-stone-200">
                <div className="text-2xl font-bold mb-2">{viewing.masthead}</div>
                <div className="text-sm text-stone-500 mb-4">{viewing.dateLine} · {viewing.issueNo}</div>
                <div className="text-lg font-semibold mb-2">{viewing.leadTitle}</div>
                <div className="text-stone-400 text-sm whitespace-pre-wrap">{viewing.leadBody}</div>
                {(viewing.sections ?? []).slice(0, 5).map((s, i) => (
                  <div key={i} className="mt-4 p-2 border-l-2 border-stone-600">
                    <div className="text-xs text-amber-500">{s.tag}</div>
                    <div className="font-medium">{s.title}</div>
                    <div className="text-sm text-stone-400">{s.body}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadHtml(viewing)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-black rounded text-sm font-medium hover:bg-amber-500"
                >
                  <Download size={14} /> 下载 HTML
                </button>
                <button onClick={() => setViewing(null)} className="px-3 py-1.5 bg-stone-700 rounded text-sm hover:bg-stone-600">
                  返回列表
                </button>
              </div>
            </div>
          ) : papers.length === 0 ? (
            <div className="text-stone-500 text-center py-8">暂无报纸。在世界公告栏生成报纸后可在此查看。</div>
          ) : (
            <ul className="space-y-2">
              {papers.map(p => (
                <li
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-stone-800 rounded hover:bg-stone-700 cursor-pointer"
                  onClick={() => setViewing(p.issue)}
                >
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-amber-500" />
                    <div>
                      <div className="font-medium text-stone-200">{p.masthead}</div>
                      <div className="text-xs text-stone-500">{p.date}</div>
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); downloadHtml(p.issue); }}
                    className="p-1 text-stone-400 hover:text-amber-400"
                    title="下载"
                  >
                    <Download size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
