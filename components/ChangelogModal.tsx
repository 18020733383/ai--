import React from 'react';
import { Scroll } from 'lucide-react';
import { ChangelogEntry } from '../data/changelog';

export const ChangelogModal = ({ entries, onClose }: { entries: ChangelogEntry[]; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
    <div className="w-full max-w-2xl bg-stone-900 border border-stone-700 rounded shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-stone-800">
        <h3 className="text-lg font-bold text-stone-200 flex items-center gap-2"><Scroll size={18}/> 游戏更新日志</h3>
        <button
          onClick={onClose}
          className="text-stone-400 hover:text-white"
        >
          关闭
        </button>
      </div>
      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hide">
        {entries.map(entry => (
          <div key={entry.version} className="bg-stone-950/40 border border-stone-800 rounded p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-amber-400 font-bold">v{entry.version}</div>
              <div className="text-xs text-stone-500">{entry.date}</div>
            </div>
            <div className="space-y-1">
              {entry.items.map((item, index) => (
                <div key={`${entry.version}-${index}`} className="text-sm text-stone-300">- {item}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
