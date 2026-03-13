import React from 'react';

type ThinkingBubbleProps = {
  label?: string;
  className?: string;
};

export const ThinkingBubble = ({ label = '思考中', className = '' }: ThinkingBubbleProps) => (
  <div className={`flex justify-start log-slide-in ${className}`}>
    <div className="max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-2xl rounded-bl-sm border border-stone-700 bg-stone-800/70 text-stone-400 shadow">
      <div className="flex items-center gap-2">
        <span className="text-xs opacity-70">{label}</span>
        <span className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-stone-500 thinking-dot" />
          <span className="w-1.5 h-1.5 rounded-full bg-stone-500 thinking-dot-2" />
          <span className="w-1.5 h-1.5 rounded-full bg-stone-500 thinking-dot-3" />
        </span>
      </div>
    </div>
  </div>
);
