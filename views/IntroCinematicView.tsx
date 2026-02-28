import React from 'react';
import { Button } from '../components/Button';

type IntroCinematicViewProps = {
  onFinish: () => void;
};

export const IntroCinematicView = ({ onFinish }: IntroCinematicViewProps) => {
  const lines = [
    '你在一阵静电噪音中醒来。',
    '空气里有铁锈与潮湿的味道，像一台长年未维护的机房。',
    '头顶的天空偶尔闪烁——像是渲染线程在重启。',
    '你记得自己原本不属于这里。',
    '这是一个运行在破碎服务器上的世界：地形被裁切，历史被截断，传送门像未清理的异常入口一样不断泄漏。',
    '伪人盘踞在传送门周围，伪装成你熟悉的一切，试图把整个世界拖入同一段循环。',
    '你得到一个目标：清理传送门周边的伪人活动，封堵异常源头，才能找到回去的路径。'
  ];

  const [lineIndex, setLineIndex] = React.useState(0);
  const [charIndex, setCharIndex] = React.useState(0);
  const [isAuto, setIsAuto] = React.useState(true);
  const [isDone, setIsDone] = React.useState(false);

  React.useEffect(() => {
    if (!isAuto || isDone) return;
    const currentLine = lines[lineIndex] ?? '';
    if (lineIndex >= lines.length) {
      setIsDone(true);
      return;
    }

    const timer = window.setTimeout(() => {
      if (charIndex < currentLine.length) {
        const step = currentLine.length > 30 ? 2 : 1;
        setCharIndex(prev => Math.min(currentLine.length, prev + step));
        return;
      }
      if (lineIndex >= lines.length - 1) {
        setIsDone(true);
        return;
      }
      setLineIndex(prev => prev + 1);
      setCharIndex(0);
    }, charIndex < currentLine.length ? (charIndex < 6 ? 80 : 45) : 520);
    return () => window.clearTimeout(timer);
  }, [charIndex, isAuto, isDone, lineIndex, lines.length]);

  const completed = lines.slice(0, Math.min(lines.length, lineIndex));
  const currentLine = lines[lineIndex] ?? '';
  const currentText = currentLine.slice(0, Math.min(currentLine.length, charIndex));

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-4">
      <style>{'@keyframes introCaret{0%,49%{opacity:1}50%,100%{opacity:0}}'}</style>
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-stone-950 opacity-100 pointer-events-none" />
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(59,130,246,0.18), transparent 40%), radial-gradient(circle at 80% 30%, rgba(16,185,129,0.14), transparent 45%), radial-gradient(circle at 60% 80%, rgba(244,63,94,0.10), transparent 45%)'
      }} />
      <div className="relative max-w-3xl w-full bg-stone-950/70 border border-stone-800 rounded p-8 shadow-2xl overflow-hidden">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-sky-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="text-stone-200 font-serif text-3xl mb-4 tracking-wide">序章：破碎服务器</div>
        <div className="space-y-3 text-stone-300 leading-relaxed min-h-[12rem]">
          {completed.map((t, i) => (
            <div key={i}>{t}</div>
          ))}
          {!isDone && (
            <div>
              <span>{currentText}</span>
              <span
                className="inline-block w-[0.55em] text-emerald-300"
                style={{ animation: 'introCaret 1s steps(2, start) infinite' }}
              >
                ▌
              </span>
            </div>
          )}
          {isDone && (
            <div>{currentLine}</div>
          )}
        </div>

        <div className="mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-xs text-stone-500">
            {isDone ? '目标已写入：清理传送门周边伪人，封堵异常。' : '按“下一句”可跳过自动播放。'}
          </div>
          <div className="flex items-center gap-2">
            {!isDone && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsAuto(false);
                    const line = lines[lineIndex] ?? '';
                    if (charIndex < line.length) {
                      setCharIndex(line.length);
                      return;
                    }
                    if (lineIndex < lines.length - 1) {
                      setLineIndex(prev => Math.min(lines.length - 1, prev + 1));
                      setCharIndex(0);
                      return;
                    }
                    setIsDone(true);
                  }}
                >
                  下一句
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsAuto(false);
                    setLineIndex(lines.length - 1);
                    setCharIndex((lines[lines.length - 1] ?? '').length);
                    setIsDone(true);
                  }}
                >
                  跳过
                </Button>
              </>
            )}
            <Button
              onClick={() => {
                onFinish();
              }}
              disabled={!isDone}
            >
              开始
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
