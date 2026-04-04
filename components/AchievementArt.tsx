import React from 'react';

export const ACHIEVEMENT_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg'] as const;

type AchievementArtOrPlaceholderProps = {
  achievementId: string;
  alt: string;
  /** 包裹层（占位与有图时共用） */
  className?: string;
  /** 仅作用于 img */
  imgClassName?: string;
  /** 无自定义图时显示 */
  fallback: React.ReactNode;
};

/**
 * 尝试加载 `public/image/achievements/{id}.png|.jpg|.jpeg`，皆失败则显示 fallback。
 */
export const AchievementArtOrPlaceholder: React.FC<AchievementArtOrPlaceholderProps> = ({
  achievementId,
  alt,
  className,
  imgClassName,
  fallback
}) => {
  const [extI, setExtI] = React.useState(0);
  React.useEffect(() => {
    setExtI(0);
  }, [achievementId]);

  const failedAll = extI >= ACHIEVEMENT_IMAGE_EXTENSIONS.length;
  if (failedAll) {
    return <div className={className}>{fallback}</div>;
  }
  const ext = ACHIEVEMENT_IMAGE_EXTENSIONS[extI];
  return (
    <div className={className}>
      <img
        src={`/image/achievements/${achievementId}.${ext}`}
        alt={alt}
        className={imgClassName}
        onError={() => setExtI(i => i + 1)}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
};
