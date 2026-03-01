import React from 'react';
import { Button } from '../components/Button';

type EndingCinematicViewProps = {
  title: string;
  subtitle?: string;
  lines: string[];
  onFinish: () => void;
};

export const EndingCinematicView = ({ title, subtitle, lines, onFinish }: EndingCinematicViewProps) => {
  const safeLines = Array.isArray(lines) ? lines.filter(Boolean) : [];
  const [lineIndex, setLineIndex] = React.useState(0);
  const [charIndex, setCharIndex] = React.useState(0);
  const [isAuto, setIsAuto] = React.useState(true);
  const [isDone, setIsDone] = React.useState(false);

  React.useEffect(() => {
    if (!isAuto || isDone) return;
    const currentLine = safeLines[lineIndex] ?? '';
    if (lineIndex >= safeLines.length) {
      setIsDone(true);
      return;
    }

    const timer = window.setTimeout(() => {
      if (charIndex < currentLine.length) {
        const step = currentLine.length > 30 ? 2 : 1;
        setCharIndex(prev => Math.min(currentLine.length, prev + step));
        return;
      }
      if (lineIndex >= safeLines.length - 1) {
        setIsDone(true);
        return;
      }
      setLineIndex(prev => prev + 1);
      setCharIndex(0);
    }, charIndex < currentLine.length ? (charIndex < 6 ? 85 : 48) : 520);
    return () => window.clearTimeout(timer);
  }, [charIndex, isAuto, isDone, lineIndex, safeLines.length]);

  const completed = safeLines.slice(0, Math.min(safeLines.length, lineIndex));
  const currentLine = safeLines[lineIndex] ?? '';
  const currentText = currentLine.slice(0, Math.min(currentLine.length, charIndex));

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-4">
      <style>{'@keyframes endingCaret{0%,49%{opacity:1}50%,100%{opacity:0}}'}</style>
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-stone-950 opacity-100 pointer-events-none" />
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(244,63,94,0.12), transparent 40%), radial-gradient(circle at 80% 30%, rgba(16,185,129,0.10), transparent 45%), radial-gradient(circle at 60% 80%, rgba(245,158,11,0.10), transparent 45%)'
      }} />
      <div className="relative max-w-3xl w-full bg-stone-950/70 border border-stone-800 rounded p-8 shadow-2xl overflow-hidden">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-rose-500/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="text-stone-200 font-serif text-3xl mb-2 tracking-wide">{title}</div>
        {subtitle && <div className="text-xs text-stone-500 mb-5">{subtitle}</div>}
        <div className="space-y-3 text-stone-300 leading-relaxed min-h-[12rem]">
          {completed.map((t, i) => (
            <div key={i}>{t}</div>
          ))}
          {!isDone && (
            <div>
              <span>{currentText}</span>
              <span
                className="inline-block w-[0.55em] text-amber-300"
                style={{ animation: 'endingCaret 1s steps(2, start) infinite' }}
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
            {isDone ? '故事到此为止。' : '按“下一句”可跳过自动播放。'}
          </div>
          <div className="flex items-center gap-2">
            {!isDone && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsAuto(false);
                    const line = safeLines[lineIndex] ?? '';
                    if (charIndex < line.length) {
                      setCharIndex(line.length);
                      return;
                    }
                    if (lineIndex < safeLines.length - 1) {
                      setLineIndex(prev => Math.min(safeLines.length - 1, prev + 1));
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
                    setLineIndex(Math.max(0, safeLines.length - 1));
                    setCharIndex((safeLines[safeLines.length - 1] ?? '').length);
                    setIsDone(true);
                  }}
                >
                  跳过
                </Button>
              </>
            )}
            <Button onClick={onFinish} disabled={!isDone}>
              结束
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
