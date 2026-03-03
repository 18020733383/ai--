import React from 'react';
import { Brain } from 'lucide-react';
import { Troop } from '../types';
import { Button } from '../components/Button';
import { TroopCard } from '../components/TroopCard';

type AsylumViewProps = {
  gachaResult: Troop | null;
  onGacha: () => void;
  onBackToMap: () => void;
  onChatAuthor: (dialogue: Array<{ role: 'PLAYER' | 'AUTHOR'; text: string }>, userInput: string) => Promise<string>;
};

export const AsylumView = ({ gachaResult, onGacha, onBackToMap, onChatAuthor }: AsylumViewProps) => {
  const [authorDialogue, setAuthorDialogue] = React.useState<Array<{ role: 'PLAYER' | 'AUTHOR'; text: string }>>([
    { role: 'AUTHOR', text: '哦？又有人走进来了……欢迎来到阳光精神病院。你是来抽卡的，还是来找“作者”算账的？(＾▽＾)' }
  ]);
  const [authorInput, setAuthorInput] = React.useState('');
  const [authorLoading, setAuthorLoading] = React.useState(false);
  const authorListRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = authorListRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [authorDialogue.length]);

  const sendToAuthor = async () => {
    if (authorLoading) return;
    const text = authorInput.trim();
    if (!text) return;
    const nextDialogue = [...authorDialogue, { role: 'PLAYER' as const, text }];
    setAuthorDialogue(nextDialogue);
    setAuthorInput('');
    setAuthorLoading(true);
    try {
      const reply = await onChatAuthor(nextDialogue, text);
      setAuthorDialogue(prev => [...prev, { role: 'AUTHOR' as const, text: reply || '（作者突然把自己踢出群聊了）' }].slice(-40));
    } catch {
      setAuthorDialogue(prev => [...prev, { role: 'AUTHOR' as const, text: '……（信号断了，院长在墙角写代码.jpg）' }].slice(-40));
    } finally {
      setAuthorLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pt-20 animate-fade-in">
      <div className="bg-stone-900 border-2 border-purple-900 p-8 rounded shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Brain size={200} className="text-purple-500" />
        </div>
        <div className="relative z-10 text-center">
          <h2 className="text-4xl font-serif text-purple-400 mb-4 flex items-center justify-center gap-3">
            <Brain size={40} /> 阳光精神病院
          </h2>
          <p className="text-stone-400 mb-8 max-w-lg mx-auto">
            这里的院长声称可以用“休克疗法”制造出超级战士。虽然大部分实验体都疯了，但偶尔也有...奇迹。
            <br /><br />
            <span className="text-yellow-500 font-bold">费用: 250 第纳尔 / 次</span>
            <br />
            <span className="text-stone-500 text-sm">概率分布: T1(60%) / T2(25%) / T3(10%) / T4(4%) / T5(1%)</span>
          </p>

          <div className="flex justify-center gap-4 mb-8">
            <Button onClick={onGacha} size="lg" className="border-purple-500 text-purple-200 hover:bg-purple-900">
              进行“治疗” (抽卡)
            </Button>
            <Button onClick={onBackToMap} variant="secondary">
              离开
            </Button>
          </div>

          {gachaResult && (
            <div className="mt-8 p-6 bg-purple-900/20 border border-purple-500/50 rounded animate-bounce-in">
              <h3 className="text-xl text-purple-300 mb-4">实验成功！</h3>
              <div className="max-w-sm mx-auto">
                <TroopCard troop={gachaResult} />
              </div>
            </div>
          )}

          <div className="mt-10 text-left bg-black/30 border border-stone-800 rounded p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-stone-200 font-bold flex items-center gap-2">
                <Brain size={18} className="text-purple-300" /> 和作者对话
              </div>
              <div className="text-xs text-stone-500">院长值班中</div>
            </div>
            <div ref={authorListRef} className="h-64 overflow-y-auto scrollbar-hide space-y-2 pr-1">
              {authorDialogue.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === 'PLAYER' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded px-3 py-2 text-sm border ${m.role === 'PLAYER'
                    ? 'bg-emerald-950/30 border-emerald-800 text-emerald-200'
                    : 'bg-purple-950/30 border-purple-800 text-purple-100'
                  }`}>
                    <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={authorInput}
                onChange={(e) => setAuthorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendToAuthor();
                  }
                }}
                placeholder={authorLoading ? '院长正在发病…' : '输入你想问作者的内容…'}
                className="flex-1 bg-stone-950 border border-stone-700 rounded px-3 py-2 text-stone-200"
                disabled={authorLoading}
              />
              <Button onClick={sendToAuthor} disabled={authorLoading || !authorInput.trim()} variant="secondary">
                发送
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
