import React from 'react';
import { Hammer, History, Scroll, Shield } from 'lucide-react';
import { BattleResult, FactionSpecialization, Location, SiegeEngineType, WorldBattleReport } from '../types';
import { Button } from '../components/Button';
import { WorldNewspaperIssue } from '../services/geminiService';
import { saveNewspaper } from '../features/observer-mode/ui/ObserverNewspaperModal';

type WorldBoardViewProps = {
  currentLocation: Location | null;
  logs: string[];
  worldBattleReports: WorldBattleReport[];
  activeBattles: Array<{
    id: string;
    locationName: string;
    attackerName: string;
    defenderName: string;
    startDay: number;
    attackerTroops: Array<{ id: string; name?: string; count: number }>;
    defenderTroops: Array<{ id: string; name?: string; count: number }>;
  }>;
  battleTimeline: Array<{ day: number; count: number }>;
  troopTypeCount: number;
  siegeEngineArchive: Array<{
    type: SiegeEngineType;
    name: string;
    cost: number;
    days: number;
    description: string;
    hp: number;
    wallDamage: number;
    attackerRangedHit: number;
    attackerRangedDamage: number;
    attackerMeleeHit: number;
    attackerMeleeDamage: number;
    defenderRangedHitPenalty: number;
    defenderRangedDamagePenalty: number;
  }>;
  defenseArchive: Array<{
    type: Location['type'];
    sampleName: string;
    wallName: string;
    wallLevel: number;
    wallHp: number;
    mechanismHp: number;
    rangedHitBonus: number;
    rangedDamageBonus: number;
    meleeDamageReduction: number;
    mechanisms: { name: string; description: string }[];
  }>;
  factionSnapshots: Array<{
    id: string;
    name: string;
    shortName: string;
    description: string;
    focus: FactionSpecialization;
    color: string;
    cities: number;
    castles: number;
    villages: number;
    soldiers: number;
  }>;
  worldForces: Array<{
    id: string;
    kind: string;
    name: string;
    locationName: string;
    troopCount: number;
    power: number;
    troops: Array<{ name: string; count: number; tier?: number }>;
  }>;
  onOpenTroopArchive: () => void;
  onBackToMap: () => void;
  onExportMarkdown: () => void;
  onGenerateNewspaper: () => Promise<WorldNewspaperIssue>;
};

export const WorldBoardView = ({
  currentLocation,
  logs,
  worldBattleReports,
  activeBattles,
  battleTimeline,
  troopTypeCount,
  siegeEngineArchive,
  defenseArchive,
  factionSnapshots,
  worldForces,
  onOpenTroopArchive,
  onBackToMap,
  onExportMarkdown,
  onGenerateNewspaper
}: WorldBoardViewProps) => {
  if (!currentLocation) return null;
  const outcomeLabel = (outcome: BattleResult['outcome']) => outcome === 'A' ? '胜利' : '战败';
  const formatTroopLoss = (list: Array<{ name: string; count: number; cause?: string }>) => {
    if (!list || list.length === 0) return '无';
    return list.map(item => `${item.count}x${item.name}${item.cause ? `(${item.cause})` : ''}`).join('，');
  };
  const formatKeyUnitLoss = (list?: Array<{ name: string; hpLoss: number; cause?: string }>) => {
    if (!list || list.length === 0) return '无';
    return list.map(item => `${item.name} HP-${item.hpLoss}${item.cause ? `(${item.cause})` : ''}`).join('，');
  };
  const pct = (value: number) => `${Math.round(value * 100)}%`;
  const focusLabel: Record<FactionSpecialization, string> = {
    MELEE: '近战',
    RANGED: '远程',
    CAVALRY: '骑兵'
  };
  const [expandedBattleId, setExpandedBattleId] = React.useState<string | null>(null);
  const [forceQuery, setForceQuery] = React.useState('');
  const [forceKind, setForceKind] = React.useState<'ALL' | string>('ALL');
  const [expandedForceId, setExpandedForceId] = React.useState<string | null>(null);
  const [newspaper, setNewspaper] = React.useState<WorldNewspaperIssue | null>(null);
  const [isGeneratingPaper, setIsGeneratingPaper] = React.useState(false);
  const [paperError, setPaperError] = React.useState('');
  const formatTroops = (troops: Array<{ id: string; name?: string; count: number }>) => {
    if (!troops || troops.length === 0) return '无';
    return troops.filter(t => t.count > 0).map(t => `${t.name ?? t.id}x${t.count}`).join('，') || '无';
  };
  const timeline = battleTimeline.slice(-30);
  const maxBattleCount = Math.max(1, ...timeline.map(item => item.count));
  const chartWidth = 320;
  const chartHeight = 120;
  const chartPadding = 20;
  const buildLinePath = () => {
    if (timeline.length === 0) return '';
    const stepX = timeline.length > 1 ? (chartWidth - chartPadding * 2) / (timeline.length - 1) : 0;
    return timeline.map((point, index) => {
      const x = chartPadding + stepX * index;
      const y = chartHeight - chartPadding - (point.count / maxBattleCount) * (chartHeight - chartPadding * 2);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };

  const forceKinds = Array.from(new Set(worldForces.map(item => item.kind))).sort((a, b) => a.localeCompare(b));
  const filteredForces = worldForces
    .filter(item => forceKind === 'ALL' ? true : item.kind === forceKind)
    .filter(item => {
      const q = forceQuery.trim().toLowerCase();
      if (!q) return true;
      const hay = `${item.name} ${item.locationName} ${item.kind}`.toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => (b.power - a.power) || (b.troopCount - a.troopCount) || a.name.localeCompare(b.name));

  const escapeHtml = (value: string) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const buildPaperHtml = (issue: WorldNewspaperIssue) => {
    const columns = issue.sections
      .slice(0, 6)
      .map(section => `
        <article class="col-item">
          <div class="tag">${escapeHtml(section.tag)}</div>
          <h3>${escapeHtml(section.title)}</h3>
          <p>${escapeHtml(section.body)}</p>
        </article>
      `)
      .join('\n');
    const briefs = issue.briefs.map(line => `<li>${escapeHtml(line)}</li>`).join('\n');
    const ticker = issue.ticker.map(line => `<span>${escapeHtml(line)}</span>`).join('\n');
    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(issue.masthead)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700;900&display=swap');
    body{margin:0;background:#e8e4d8;font-family: "Noto Serif SC","Songti SC",serif;color:#1c1917}
    .paper{max-width:1200px;margin:24px auto;background:#f0e6d2;border:4px double #292524;box-shadow:0 10px 30px rgba(0,0,0,.25);padding:4px}
    .inner{border:1px solid #44403c;padding:24px}
    .head{text-align:center;border-bottom:3px double #1c1917;padding-bottom:16px;margin-bottom:20px}
    .mast{font-size:64px;font-weight:900;letter-spacing:4px;line-height:1;text-shadow:2px 2px 0 rgba(0,0,0,0.1);margin-bottom:8px}
    .sub{font-size:15px;font-style:italic;color:#44403c;margin-bottom:12px;letter-spacing:1px}
    .meta{display:flex;justify-content:space-between;border-top:1px solid #1c1917;border-bottom:1px solid #1c1917;padding:6px 0;font-size:13px;font-weight:700;text-transform:uppercase}
    .body{display:grid;grid-template-columns:1.6fr 1fr 0.8fr;gap:24px}
    .lead h1{font-size:42px;line-height:1.1;font-weight:900;margin:12px 0}
    .lead .deck{font-size:18px;color:#292524;font-style:italic;border-left:4px solid #b91c1c;padding-left:12px;margin-bottom:16px;line-height:1.5}
    .lead p{font-size:16px;line-height:1.8;text-align:justify}
    .tag{display:inline-block;background:#1c1917;color:#f0e6d2;font-size:11px;padding:2px 6px;font-weight:700;letter-spacing:1px}
    .tag.red{background:#b91c1c}
    .cols{display:flex;flex-direction:column;gap:20px;border-left:1px solid #a8a29e;border-right:1px solid #a8a29e;padding:0 20px}
    .col-item:not(:first-child){border-top:1px solid #a8a29e;padding-top:16px;margin-top:16px}
    .col-item h3{font-size:20px;line-height:1.25;font-weight:700;margin:6px 0}
    .col-item p{font-size:14px;line-height:1.6;color:#292524}
    .side{background:#e7ded0;padding:16px;border:1px solid #a8a29e}
    .side .quote{font-size:20px;line-height:1.5;font-weight:700;font-style:italic;margin:12px 0;color:#7f1d1d}
    .side .note{font-size:13px;line-height:1.6;color:#44403c;border-top:1px solid #a8a29e;padding-top:12px;margin-top:12px}
    .briefs{margin-top:24px;background:#1c1917;color:#f0e6d2;padding:16px}
    .briefs h4{margin:0 0 10px;font-size:16px;border-bottom:1px solid #57534e;padding-bottom:6px}
    .briefs ul{margin:0;padding-left:18px}
    .briefs li{margin:6px 0;font-size:13px;line-height:1.5}
    .ticker{margin-top:24px;border-top:3px double #1c1917;padding-top:12px;display:flex;flex-wrap:wrap;justify-content:center;gap:16px}
    .ticker span{font-size:14px;font-weight:700;color:#b91c1c;background:#e7ded0;padding:2px 8px;border-radius:2px}
    @media (max-width: 1024px) {
      .body { grid-template-columns: 1fr; }
      .cols { border: none; padding: 0; border-top: 1px solid #a8a29e; padding-top: 20px; }
    }
  </style>
</head>
<body>
  <main class="paper">
    <div class="inner">
      <header class="head">
        <div class="mast">${escapeHtml(issue.masthead)}</div>
        <div class="sub">${escapeHtml(issue.subtitle)}</div>
        <div class="meta">
          <span>${escapeHtml(issue.dateLine)}</span>
          <span>${escapeHtml(issue.issueNo)}</span>
          <span>售价：1 第纳尔</span>
        </div>
      </header>
      <section class="body">
        <article class="lead">
          <div class="tag red">${escapeHtml(issue.leadTag)}</div>
          <h1>${escapeHtml(issue.leadTitle)}</h1>
          <div class="deck">${escapeHtml(issue.leadDeck)}</div>
          <p>${escapeHtml(issue.leadBody)}</p>
          <div class="briefs">
            <h4>最新快讯</h4>
            <ul>${briefs}</ul>
          </div>
        </article>
        <section class="cols">${columns}</section>
        <aside class="side">
          <div class="tag">社评</div>
          <div class="quote">${escapeHtml(issue.sideQuote)}</div>
          <div class="note">${escapeHtml(issue.sideNote)}</div>
        </aside>
      </section>
      <footer class="ticker">${ticker}</footer>
    </div>
  </main>
</body>
</html>`;
  };

  const downloadPaperHtml = () => {
    if (!newspaper) return;
    const html = buildPaperHtml(newspaper);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(newspaper.masthead || 'world-newspaper').replace(/[^\w\u4e00-\u9fa5-]+/g, '_')}.html`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleGeneratePaper = async () => {
    if (isGeneratingPaper) return;
    setPaperError('');
    setIsGeneratingPaper(true);
    try {
      const issue = await onGenerateNewspaper();
      setNewspaper(issue);
      saveNewspaper(issue);
    } catch (e: any) {
      setPaperError(e?.message || '报纸生成失败。');
    } finally {
      setIsGeneratingPaper(false);
    }
  };

  return (
    <div className="min-h-[80vh] p-4 pt-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-stone-900 border border-stone-700 flex items-center justify-center">
              <History className="text-slate-300" size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-stone-200">世界公告栏</h2>
              <div className="text-xs text-stone-500">{currentLocation.description}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onOpenTroopArchive}
              className="flex items-center gap-2"
            >
              <Scroll size={16} /> 兵种档案
            </Button>
            <Button variant="secondary" onClick={onBackToMap}>返回地图</Button>
            <Button onClick={onExportMarkdown}>导出 Markdown</Button>
            <Button onClick={handleGeneratePaper} disabled={isGeneratingPaper}>{isGeneratingPaper ? '生成中...' : '生成异世界报纸'}</Button>
            <Button variant="secondary" onClick={downloadPaperHtml} disabled={!newspaper}>下载报纸 HTML</Button>
          </div>
        </div>
        {paperError && <div className="mb-4 text-sm text-red-300 bg-red-950/40 border border-red-900 rounded px-3 py-2">{paperError}</div>}
        {newspaper && (
          <div className="mb-6 bg-[#f0e6d2] text-[#1c1917] font-serif border-4 border-double border-[#292524] shadow-2xl mx-auto max-w-5xl">
            <div className="p-1">
              <div className="border border-[#44403c] p-6">
                {/* Header */}
                <div className="text-center border-b-4 border-double border-[#1c1917] pb-4 mb-6">
                  <div className="text-5xl md:text-7xl font-black tracking-widest text-[#1c1917] mb-2 drop-shadow-sm">{newspaper.masthead}</div>
                  <div className="text-sm md:text-base italic text-[#44403c] mb-3 tracking-widest">{newspaper.subtitle}</div>
                  <div className="flex justify-between items-center border-t border-b border-[#1c1917] py-1.5 text-xs md:text-sm font-bold uppercase tracking-wide">
                    <span>{newspaper.dateLine}</span>
                    <span>{newspaper.issueNo}</span>
                    <span className="hidden md:inline">售价：1 第纳尔</span>
                  </div>
                </div>

                {/* Body */}
                <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr_0.8fr] gap-6">
                  {/* Lead Story */}
                  <div>
                    <div className="inline-block bg-[#b91c1c] text-[#f0e6d2] text-[10px] px-2 py-0.5 font-bold tracking-widest mb-2">{newspaper.leadTag}</div>
                    <div className="text-3xl md:text-5xl font-black leading-[1.1] mb-3">{newspaper.leadTitle}</div>
                    <div className="text-base md:text-lg italic text-[#292524] border-l-4 border-[#b91c1c] pl-3 mb-4 leading-relaxed">
                      {newspaper.leadDeck}
                    </div>
                    <div className="text-[15px] leading-relaxed text-justify whitespace-pre-wrap">
                      {newspaper.leadBody}
                    </div>
                    
                    {/* Briefs Box */}
                    <div className="mt-6 bg-[#1c1917] text-[#f0e6d2] p-4 shadow-md">
                      <div className="font-bold text-lg border-b border-[#57534e] pb-1 mb-2">最新快讯</div>
                      <ul className="text-sm leading-6 list-disc pl-5 space-y-1">
                        {newspaper.briefs.map((line, idx) => <li key={`brief_${idx}`}>{line}</li>)}
                      </ul>
                    </div>
                  </div>

                  {/* Columns */}
                  <div className="flex flex-col gap-5 xl:border-l xl:border-r border-[#a8a29e] xl:px-5">
                    {newspaper.sections.slice(0, 6).map((section, idx) => (
                      <div key={`section_${idx}`} className={idx > 0 ? "border-t border-[#a8a29e] pt-4" : ""}>
                        <div className="inline-block bg-[#1c1917] text-[#f0e6d2] text-[10px] px-2 py-0.5 font-bold tracking-widest mb-1">{section.tag}</div>
                        <div className="text-xl font-bold leading-tight mb-1">{section.title}</div>
                        <div className="text-sm leading-relaxed text-[#292524]">{section.body}</div>
                      </div>
                    ))}
                  </div>

                  {/* Side Column */}
                  <div>
                    <div className="bg-[#e7ded0] p-4 border border-[#a8a29e] shadow-sm">
                      <div className="inline-block bg-[#1c1917] text-[#f0e6d2] text-[10px] px-2 py-0.5 font-bold tracking-widest mb-2">社评</div>
                      <div className="text-xl leading-relaxed font-bold italic text-[#7f1d1d] mb-3">
                        “{newspaper.sideQuote.replace(/^[“"]|[”"]$/g, '')}”
                      </div>
                      <div className="text-xs leading-relaxed text-[#44403c] border-t border-[#a8a29e] pt-3">
                        {newspaper.sideNote}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ticker Footer */}
                <div className="mt-6 pt-3 border-t-4 border-double border-[#1c1917] flex flex-wrap justify-center gap-3">
                  {newspaper.ticker.map((line, idx) => (
                    <span key={`ticker_${idx}`} className="text-xs font-bold bg-[#e7ded0] text-[#b91c1c] px-2 py-0.5 rounded shadow-sm">
                      {line.startsWith('#') ? line : `#${line}`}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
          <div className="bg-stone-900/70 border border-stone-700 rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-stone-200 font-semibold">进行中的战斗</div>
              <div className="text-xs text-stone-500">{activeBattles.length} 场</div>
            </div>
            {activeBattles.length === 0 ? (
              <div className="text-sm text-stone-500">当前没有战斗发生。</div>
            ) : (
              <div className="space-y-3">
                {activeBattles.map(battle => {
                  const expanded = expandedBattleId === battle.id;
                  return (
                    <div key={battle.id} className="bg-stone-950/60 border border-stone-800 rounded p-3 space-y-2">
                      <div className="flex items-center justify-between text-sm text-stone-200">
                        <div>{battle.locationName} · 第 {battle.startDay} 天开战</div>
                        <button
                          onClick={() => setExpandedBattleId(expanded ? null : battle.id)}
                          className="text-xs text-amber-300 hover:text-amber-200"
                        >
                          {expanded ? '收起' : '展开'}
                        </button>
                      </div>
                      <div className="text-xs text-stone-400">攻方：{battle.attackerName}</div>
                      <div className="text-xs text-stone-400">守方：{battle.defenderName}</div>
                      {expanded && (
                        <div className="text-xs text-stone-300 space-y-2">
                          <div>攻方构成：{formatTroops(battle.attackerTroops)}</div>
                          <div>守方构成：{formatTroops(battle.defenderTroops)}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-stone-900/70 border border-stone-700 rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-stone-200 font-semibold">战斗数量趋势</div>
              <div className="text-xs text-stone-500">近 {timeline.length} 天</div>
            </div>
            {timeline.length === 0 ? (
              <div className="text-sm text-stone-500">暂无统计数据。</div>
            ) : (
              <div className="flex items-center justify-center">
                <svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                  <rect x={0} y={0} width={chartWidth} height={chartHeight} fill="none" stroke="rgba(120,113,108,0.25)" />
                  <path d={buildLinePath()} fill="none" stroke="rgba(245,158,11,0.9)" strokeWidth={2} />
                  {timeline.map((point, index) => {
                    if (timeline.length === 1 || index === timeline.length - 1) {
                      const stepX = timeline.length > 1 ? (chartWidth - chartPadding * 2) / (timeline.length - 1) : 0;
                      const x = chartPadding + stepX * index;
                      const y = chartHeight - chartPadding - (point.count / maxBattleCount) * (chartHeight - chartPadding * 2);
                      return (
                        <circle key={`${point.day}-${point.count}`} cx={x} cy={y} r={3} fill="rgba(245,158,11,0.9)" />
                      );
                    }
                    return null;
                  })}
                </svg>
              </div>
            )}
          </div>
        </div>

        <div className="bg-stone-900/70 border border-stone-700 rounded p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-stone-200 font-semibold">全地图部队列表</div>
            <div className="text-xs text-stone-500">共 {filteredForces.length} 支</div>
          </div>
          <div className="flex flex-col md:flex-row gap-2 mb-3">
            <input
              value={forceQuery}
              onChange={e => setForceQuery(e.target.value)}
              placeholder="搜索：名称 / 地点 / 类型"
              className="flex-1 bg-stone-950 border border-stone-700 text-stone-200 px-3 py-2 rounded placeholder:text-stone-600"
            />
            <select
              value={forceKind}
              onChange={e => setForceKind(e.target.value)}
              className="bg-stone-950 border border-stone-700 text-stone-200 px-3 py-2 rounded"
            >
              <option value="ALL">全部类型</option>
              {forceKinds.map(kind => (
                <option key={`force_kind_${kind}`} value={kind}>{kind}</option>
              ))}
            </select>
          </div>
          {filteredForces.length === 0 ? (
            <div className="text-sm text-stone-500">暂无部队。</div>
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto scrollbar-hide pr-1">
              {filteredForces.map(force => {
                const expanded = expandedForceId === force.id;
                return (
                  <div key={force.id} className="bg-stone-950/60 border border-stone-800 rounded">
                    <button
                      className="w-full text-left px-3 py-2 hover:bg-stone-950/80"
                      onClick={() => setExpandedForceId(expanded ? null : force.id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-stone-200 font-semibold truncate">{force.name}</div>
                          <div className="text-xs text-stone-500 truncate">{force.kind} · {force.locationName}</div>
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <div className="text-sm text-stone-200">兵力 {force.troopCount}</div>
                          <div className="text-xs text-stone-500">战力 {Math.round(force.power)}</div>
                        </div>
                      </div>
                    </button>
                    {expanded && (
                      <div className="px-3 pb-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                          {force.troops
                            .filter(t => t.count > 0)
                            .sort((a, b) => (b.tier ?? 0) - (a.tier ?? 0) || b.count - a.count)
                            .slice(0, 24)
                            .map(t => (
                              <div
                                key={`${force.id}_${t.name}`}
                                className="flex items-center justify-between text-sm bg-stone-900/30 border border-stone-800 rounded px-2 py-1"
                              >
                                <div className="text-stone-300 truncate">
                                  {t.name}{typeof t.tier === 'number' ? ` (T${t.tier})` : ''}
                                </div>
                                <div className="text-stone-200">×{t.count}</div>
                              </div>
                            ))}
                        </div>
                        {force.troops.length > 24 && (
                          <div className="text-xs text-stone-600 mt-2">仅展示前 24 条兵种。</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          <div className="bg-stone-900/70 border border-stone-700 rounded p-4">
            <div className="text-stone-200 font-semibold mb-3">事件日志</div>
            {logs.length === 0 ? (
              <div className="text-sm text-stone-500">暂无记录。</div>
            ) : (
              <div className="max-h-[70vh] overflow-y-auto scrollbar-hide pr-1">
                <ul className="space-y-2 text-sm text-stone-300">
                  {logs.map((item, index) => (
                    <li key={`${index}_${item.slice(0, 8)}`} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="bg-stone-900/70 border border-stone-700 rounded p-4">
            <div className="text-stone-200 font-semibold mb-3">战斗详情</div>
            {worldBattleReports.length === 0 ? (
              <div className="text-sm text-stone-500">暂无战斗记录。</div>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto scrollbar-hide pr-1">
                {worldBattleReports.map(report => (
                  <div key={report.id} className="bg-stone-950/60 border border-stone-800 rounded p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm text-stone-200">
                      <div>第 {report.day} 天 · {report.battleLocation}</div>
                      <div className="text-xs text-slate-300">{outcomeLabel(report.outcome)}</div>
                    </div>
                    <div className="text-xs text-stone-500">敌军：{report.enemyName} · 记录时间 {report.createdAt || '未知'}</div>
                    <div className="text-xs text-stone-300">我方：{report.playerSide || '（无）'}</div>
                    <div className="text-xs text-stone-300">敌方：{report.enemySide || '（无）'}</div>
                    <div className="text-xs text-stone-400">伤情：{report.keyUnitDamageSummary || '（无）'}</div>
                    {report.rounds.length === 0 ? (
                      <div className="text-xs text-stone-500">暂无回合记录。</div>
                    ) : (
                      <div className="space-y-2">
                        {report.rounds.map(round => (
                          <div key={`${report.id}_${round.roundNumber}`} className="border border-stone-800/70 rounded p-2 text-xs text-stone-300 space-y-1">
                            <div className="text-stone-400">回合 {round.roundNumber}</div>
                            {round.description && <div className="text-stone-300">{round.description}</div>}
                            <div className="text-stone-400">我方伤亡：{formatTroopLoss(round.casualtiesA ?? (round as any).playerCasualties ?? [])}</div>
                            <div className="text-stone-400">我方关键单位受伤：{formatKeyUnitLoss(round.keyUnitDamageA ?? (round as any).heroInjuries ?? [])}</div>
                            <div className="text-stone-400">敌方关键单位受伤：{formatKeyUnitLoss(round.keyUnitDamageB ?? (round as any).enemyInjuries ?? [])}</div>
                            <div className="text-stone-400">敌方伤亡：{formatTroopLoss(round.casualtiesB ?? (round as any).enemyCasualties ?? [])}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-stone-900/70 border border-stone-700 rounded p-4">
            <div className="text-stone-200 font-semibold mb-3">兵种档案</div>
            <div className="bg-stone-950/60 border border-stone-800 rounded p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-stone-200 font-semibold">档案库</div>
                <div className="text-xs text-stone-500">{troopTypeCount} 个条目</div>
              </div>
              <div className="text-xs text-stone-400 mt-2 leading-relaxed">
                查看六维雷达图、筛选与统计信息。
              </div>
              <div className="mt-4">
                <Button
                  onClick={onOpenTroopArchive}
                  size="lg"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Scroll size={18} /> 打开兵种档案
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-stone-900/70 border border-stone-700 rounded p-4">
            <div className="text-stone-200 font-semibold mb-3">势力动态</div>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto scrollbar-hide pr-1">
              {factionSnapshots.map(faction => (
                <div key={faction.id} className="bg-stone-950/60 border border-stone-800 rounded p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: faction.color }} />
                      <div className="text-sm text-stone-200 font-semibold">{faction.name}</div>
                    </div>
                    <span className="text-xs text-stone-400">{focusLabel[faction.focus]} 擅长</span>
                  </div>
                  <div className="text-xs text-stone-500">{faction.description}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-stone-300">
                    <div>城市 {faction.cities}</div>
                    <div>堡垒 {faction.castles}</div>
                    <div>乡村 {faction.villages}</div>
                    <div>兵力 {faction.soldiers}</div>
                  </div>
                </div>
              ))}
              {factionSnapshots.length === 0 && (
                <div className="text-sm text-stone-500">暂无势力数据。</div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
          <div className="bg-stone-900/70 border border-stone-700 rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-stone-200 font-semibold flex items-center gap-2">
                <Hammer size={16} /> 攻城设施档案
              </div>
              <div className="text-xs text-stone-500">{siegeEngineArchive.length} 个条目</div>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-hide pr-1">
              {siegeEngineArchive.map(item => (
                <div key={item.type} className="bg-stone-950/60 border border-stone-800 rounded p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm text-stone-200">
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-xs text-stone-500">{item.type}</div>
                  </div>
                  <div className="text-xs text-stone-400">{item.description}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-stone-300">
                    <div>成本 {item.cost}</div>
                    <div>工期 {item.days} 天</div>
                    <div>耐久 {item.hp}</div>
                    <div>破墙 {item.wallDamage}</div>
                    <div>远程命中 +{pct(item.attackerRangedHit)}</div>
                    <div>远程伤害 +{pct(item.attackerRangedDamage)}</div>
                    <div>近战命中 +{pct(item.attackerMeleeHit)}</div>
                    <div>近战伤害 +{pct(item.attackerMeleeDamage)}</div>
                    <div>守方远程命中 -{pct(item.defenderRangedHitPenalty)}</div>
                    <div>守方远程伤害 -{pct(item.defenderRangedDamagePenalty)}</div>
                  </div>
                </div>
              ))}
              {siegeEngineArchive.length === 0 && (
                <div className="text-sm text-stone-500">暂无攻城设施数据。</div>
              )}
            </div>
          </div>

          <div className="bg-stone-900/70 border border-stone-700 rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-stone-200 font-semibold flex items-center gap-2">
                <Shield size={16} /> 守城设施档案
              </div>
              <div className="text-xs text-stone-500">{defenseArchive.length} 个条目</div>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-hide pr-1">
              {defenseArchive.map(item => (
                <div key={item.type} className="bg-stone-950/60 border border-stone-800 rounded p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm text-stone-200">
                    <div className="font-semibold">{item.sampleName}</div>
                    <div className="text-xs text-stone-500">{item.type}</div>
                  </div>
                  <div className="text-xs text-stone-400">{item.wallName} (Lv.{item.wallLevel})</div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-stone-300">
                    <div>城墙耐久 {item.wallHp}</div>
                    <div>器械耐久 {item.mechanismHp}</div>
                    <div>远程命中 +{pct(item.rangedHitBonus)}</div>
                    <div>远程伤害 +{pct(item.rangedDamageBonus)}</div>
                    <div>近战减伤 {pct(item.meleeDamageReduction)}</div>
                    <div>器械数量 {item.mechanisms.length}</div>
                  </div>
                  {item.mechanisms.length > 0 && (
                    <div className="flex flex-wrap gap-1 text-xs text-stone-400">
                      {item.mechanisms.map(mech => (
                        <span key={mech.name} className="px-1.5 py-0.5 bg-stone-800 rounded border border-stone-700">
                          {mech.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {defenseArchive.length === 0 && (
                <div className="text-sm text-stone-500">暂无守城设施数据。</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
