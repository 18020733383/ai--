import React from 'react';
import { Hero, PartyDiaryEntry } from '../types';
import { Button } from '../components/Button';
import Character from '../Character';

type HeroChatViewProps = {
  activeHeroChat: Hero | null;
  worldbookContent: string;
  chatInput: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onCopyPrompt: () => Promise<boolean>;
  partyDiary: PartyDiaryEntry[];
  onAddDiaryEntry: (text: string) => void;
  onUpdateDiaryEntry: (entryId: string, nextText: string) => void;
  onDeleteDiaryEntry: (entryId: string) => void;
  onUpdateMemory: (memoryId: string, nextText: string) => void;
  onDeleteMemory: (memoryId: string) => void;
  onSpendAttribute: (key: 'attack' | 'hp' | 'agility') => void;
  onClose: () => void;
  onBackToParty: () => void;
  listRef: React.RefObject<HTMLDivElement>;
};

export const HeroChatView = ({
  activeHeroChat,
  worldbookContent,
  chatInput,
  isLoading,
  onInputChange,
  onSend,
  onCopyPrompt,
  partyDiary,
  onAddDiaryEntry,
  onUpdateDiaryEntry,
  onDeleteDiaryEntry,
  onUpdateMemory,
  onDeleteMemory,
  onSpendAttribute,
  onClose,
  onBackToParty,
  listRef
}: HeroChatViewProps) => {
  if (!activeHeroChat) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-stone-400">没有可聊天的英雄。</div>
          <Button onClick={onBackToParty} variant="secondary">返回队伍</Button>
        </div>
      </div>
    );
  }

  return (
    <Character
      hero={activeHeroChat}
      chatMemory={activeHeroChat.chatMemory}
      worldbookContent={worldbookContent}
      chatInput={chatInput}
      isLoading={isLoading}
      onInputChange={onInputChange}
      onSend={onSend}
      onCopyPrompt={onCopyPrompt}
      partyDiary={partyDiary}
      onAddDiaryEntry={onAddDiaryEntry}
      onUpdateDiaryEntry={onUpdateDiaryEntry}
      onDeleteDiaryEntry={onDeleteDiaryEntry}
      onUpdateMemory={onUpdateMemory}
      onDeleteMemory={onDeleteMemory}
      onSpendAttribute={onSpendAttribute}
      onClose={onClose}
      listRef={listRef}
    />
  );
};
