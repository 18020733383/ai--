import { ChevronDown, ChevronUp } from 'lucide-react';

type LogConsoleProps = {
  logs: string[];
  isExpanded: boolean;
  onToggleExpanded: () => void;
  visible: boolean;
};

export const LogConsole = ({
  logs,
  isExpanded,
  onToggleExpanded,
  visible
}: LogConsoleProps) => {
  if (!visible) return null;

  return (
    <div className={`fixed bottom-0 left-0 w-full md:w-96 md:left-4 md:bottom-4 bg-black/80 backdrop-blur-sm border-t md:border border-stone-800 transition-all duration-300 z-40 flex flex-col ${isExpanded ? 'h-96' : 'h-32'}`}>
      <div className="flex justify-between items-center p-2 bg-stone-900/50 border-b border-stone-800">
        <h4 className="text-xs uppercase text-stone-600 font-bold">日志 ({logs.length})</h4>
        <button onClick={onToggleExpanded} className="text-stone-500 hover:text-stone-300 p-1">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
        {logs.length === 0 ? (
          <div className="text-sm text-stone-600">（暂无日志）</div>
        ) : (
          <div className="flex flex-col gap-1">
            {logs.map((log, i) => (
              <p key={i} className={`text-sm ${i === 0 ? 'text-yellow-400 font-bold log-slide-in' : 'text-stone-400'}`}>
                <span className="mr-2 text-stone-600">➜</span>{log}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
