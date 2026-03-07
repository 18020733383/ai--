import React from 'react';
import { Hammer, History, Scroll, Shield } from 'lucide-react';
import { BattleResult, FactionSpecialization, Location, SiegeEngineType, WorldBattleReport } from '../types';
import { Button } from '../components/Button';
import { WorldNewspaperIssue } from '../services/geminiService';

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

  const paperLinePoints = (values: number[], width: number, height: number, pad = 12) => {
    const safe = values.length > 0 ? values : [0];
    const max = Math.max(1, ...safe);
    const step = safe.length > 1 ? (width - pad * 2) / (safe.length - 1) : 0;
    return safe.map((v, i) => {
      const x = pad + step * i;
      const y = height - pad - (v / max) * (height - pad * 2);
      return { x, y, v };
    });
  };
  const paperLinePath = (values: number[], width: number, height: number, pad = 12) => {
    const points = paperLinePoints(values, width, height, pad);
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  };
  const relationLayout = (nodes: string[]) => {
    const safe = nodes.length > 0 ? nodes : ['A', 'B', 'C'];
    const cx = 150;
    const cy = 110;
    const r = 78;
    return safe.map((name, idx) => {
      const angle = (Math.PI * 2 * idx) / safe.length - Math.PI / 2;
      return { name, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
    });
  };

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
    const keywordBar = issue.visuals.keywords.map(line => `<span>${escapeHtml(line)}</span>`).join('\n');
    const linePath = paperLinePath(issue.visuals.lineTrend, 300, 120, 14);
    const lineDots = paperLinePoints(issue.visuals.lineTrend, 300, 120, 14)
      .map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="#8b0000"></circle>`)
      .join('');
    const colMax = Math.max(1, ...issue.visuals.columnStats.map(x => x.value));
    const colBars = issue.visuals.columnStats.slice(0, 6).map((item, idx) => {
      const h = Math.max(6, (item.value / colMax) * 90);
      const x = 14 + idx * 46;
      return `<g><rect x="${x}" y="${104 - h}" width="30" height="${h}" fill="#3f3f46"></rect><text x="${x + 15}" y="116" text-anchor="middle" font-size="10">${escapeHtml(item.label)}</text></g>`;
    }).join('');
    const barMax = Math.max(1, ...issue.visuals.barStats.map(x => x.value));
    const barRows = issue.visuals.barStats.slice(0, 6).map((item, idx) => {
      const w = Math.max(12, (item.value / barMax) * 180);
      const y = 14 + idx * 18;
      return `<g><text x="2" y="${y + 10}" font-size="10">${escapeHtml(item.label)}</text><rect x="76" y="${y}" width="${w}" height="11" fill="#57534e"></rect></g>`;
    }).join('');
    const relNodes = relationLayout(issue.visuals.relationNodes);
    const relMap = new Map(relNodes.map(n => [n.name, n]));
    const relEdges = issue.visuals.relationEdges.slice(0, 12).map(edge => {
      const a = relMap.get(edge.from);
      const b = relMap.get(edge.to);
      if (!a || !b) return '';
      const color = edge.value >= 0 ? '#166534' : '#991b1b';
      const width = 1 + Math.min(2.4, Math.abs(edge.value) / 45);
      return `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${color}" stroke-width="${width.toFixed(2)}"></line>`;
    }).join('');
    const relLabels = relNodes.map(n => `<g><circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="11" fill="#f4e6c8" stroke="#57534e"></circle><text x="${n.x.toFixed(1)}" y="${(n.y + 4).toFixed(1)}" font-size="9" text-anchor="middle">${escapeHtml(n.name)}</text></g>`).join('');
    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(issue.masthead)}</title>
  <style>
    body{margin:0;background:#d8d2c3;font-family: "Noto Serif SC","Songti SC",serif;color:#111}
    .paper{max-width:1240px;margin:16px auto;background:#efe3c7;border:1px solid #978d7a;box-shadow:0 6px 20px rgba(0,0,0,.18)}
    .head{padding:18px 24px;border-bottom:2px solid #1c1917;background:linear-gradient(180deg,#f4ead4 0%,#e8dcc0 100%)}
    .mast{font-size:48px;font-weight:700;letter-spacing:2px}
    .sub{margin-top:4px;font-size:13px;color:#333}
    .meta{display:flex;justify-content:space-between;font-size:12px;margin-top:10px;color:#444}
    .body{display:grid;grid-template-columns:1.42fr 1fr 0.92fr;gap:16px;padding:16px 20px}
    .lead h1{font-size:44px;line-height:1.08;margin:8px 0}
    .lead .deck{font-size:16px;color:#222;border-left:4px solid #111;padding-left:10px}
    .lead p{font-size:16px;line-height:1.7;text-align:justify}
    .tag{display:inline-block;font-size:11px;padding:2px 8px;border:1px solid #111;letter-spacing:1px}
    .cols{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .col-item{border-top:1px solid #1f2937;padding-top:8px}
    .col-item h3{font-size:24px;line-height:1.2;margin:6px 0}
    .col-item p{font-size:14px;line-height:1.65}
    .side .quote{border:1px solid #111;padding:10px;background:#f3ead7;font-size:18px;line-height:1.5}
    .side .note{margin-top:10px;font-size:13px;line-height:1.6;color:#333}
    .viz{margin-top:14px;border-top:1px solid #111;padding-top:8px}
    .viz h4{margin:2px 0 8px;font-size:13px;letter-spacing:1px}
    .viz-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .viz-card{border:1px solid #44403c;background:#f6edd8;padding:6px}
    .mermaid{margin-top:10px;border:1px dashed #57534e;background:#f8f1df;padding:8px;white-space:pre-wrap;font-family:ui-monospace,Menlo,monospace;font-size:11px}
    .briefs{margin-top:16px;border-top:2px solid #111;padding-top:8px}
    .briefs h4{font-size:18px;margin:4px 0 8px}
    .briefs li{margin:6px 0;line-height:1.5;font-size:14px}
    .ticker{border-top:1px solid #111;padding:8px 18px;display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:#333}
    .ticker span{padding-right:10px;border-right:1px solid #999}
    .keywords{border-top:1px solid #44403c;background:#d6c39e;padding:8px 18px;display:flex;flex-wrap:wrap;gap:8px;font-size:12px}
    .keywords .label{font-weight:700;margin-right:6px}
    .keywords span{background:#f4ecd9;border:1px solid #6b5f46;padding:1px 6px}
  </style>
</head>
<body>
  <main class="paper">
    <header class="head">
      <div class="mast">${escapeHtml(issue.masthead)}</div>
      <div class="sub">${escapeHtml(issue.subtitle)}</div>
      <div class="meta">
        <span>${escapeHtml(issue.dateLine)}</span>
        <span>${escapeHtml(issue.issueNo)}</span>
      </div>
    </header>
    <section class="body">
      <article class="lead">
        <div class="tag">${escapeHtml(issue.leadTag)}</div>
        <h1>${escapeHtml(issue.leadTitle)}</h1>
        <div class="deck">${escapeHtml(issue.leadDeck)}</div>
        <p>${escapeHtml(issue.leadBody)}</p>
        <div class="briefs">
          <h4>快讯</h4>
          <ul>${briefs}</ul>
        </div>
      </article>
      <section class="cols">${columns}</section>
      <aside class="side">
        <div class="tag">社评</div>
        <div class="quote">${escapeHtml(issue.sideQuote)}</div>
        <div class="note">${escapeHtml(issue.sideNote)}</div>
        <div class="viz">
          <h4>数据图版</h4>
          <div class="viz-grid">
            <div class="viz-card">
              <svg width="300" height="120" viewBox="0 0 300 120">
                <rect x="0" y="0" width="300" height="120" fill="none" stroke="#78716c"></rect>
                <path d="${linePath}" fill="none" stroke="#7f1d1d" stroke-width="2"></path>
                ${lineDots}
              </svg>
            </div>
            <div class="viz-card">
              <svg width="300" height="120" viewBox="0 0 300 120">
                <rect x="0" y="0" width="300" height="120" fill="none" stroke="#78716c"></rect>
                ${colBars}
              </svg>
            </div>
            <div class="viz-card">
              <svg width="300" height="130" viewBox="0 0 300 130">
                <rect x="0" y="0" width="300" height="130" fill="none" stroke="#78716c"></rect>
                ${barRows}
              </svg>
            </div>
            <div class="viz-card">
              <svg width="300" height="220" viewBox="0 0 300 220">
                <rect x="0" y="0" width="300" height="220" fill="none" stroke="#78716c"></rect>
                ${relEdges}
                ${relLabels}
              </svg>
            </div>
          </div>
          <pre class="mermaid">${escapeHtml(issue.visuals.mermaidFlow)}</pre>
        </div>
      </aside>
    </section>
    <footer class="ticker">${ticker}</footer>
    <footer class="keywords"><span class="label">关键词：</span>${keywordBar}</footer>
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
          <div className="mb-6 bg-[#efe3c7] text-stone-900 border border-[#9a8d78] rounded overflow-hidden shadow-2xl">
            <div className="border-b-2 border-stone-900 px-4 py-3 bg-gradient-to-b from-[#f6ecd7] to-[#e8dbc0]">
              <div className="text-3xl md:text-5xl font-black tracking-[0.2em]">{newspaper.masthead}</div>
              <div className="text-xs text-stone-700 mt-1">{newspaper.subtitle}</div>
              <div className="text-[11px] text-stone-600 mt-2 flex justify-between">
                <span>{newspaper.dateLine}</span>
                <span>{newspaper.issueNo}</span>
              </div>
            </div>
            <div className="p-4 grid grid-cols-1 xl:grid-cols-[1.42fr_1fr_0.92fr] gap-4">
              <div>
                <div className="inline-flex text-[10px] tracking-widest border border-stone-800 px-2 py-0.5">{newspaper.leadTag}</div>
                <div className="text-3xl md:text-5xl font-black leading-[1.05] mt-2">{newspaper.leadTitle}</div>
                <div className="text-sm mt-2 border-l-4 border-stone-900 pl-3 text-stone-800">{newspaper.leadDeck}</div>
                <div className="text-[15px] leading-7 mt-3 whitespace-pre-wrap">{newspaper.leadBody}</div>
                <div className="mt-4 border-t-2 border-stone-900 pt-2">
                  <div className="font-bold text-lg">快讯</div>
                  <ul className="mt-1 text-sm leading-6 list-disc pl-5">
                    {newspaper.briefs.map((line, idx) => <li key={`brief_${idx}`}>{line}</li>)}
                  </ul>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-3">
                {newspaper.sections.slice(0, 6).map((section, idx) => (
                  <div key={`section_${idx}`} className="border-t border-stone-700 pt-2">
                    <div className="inline-flex text-[10px] tracking-widest border border-stone-800 px-2 py-0.5">{section.tag}</div>
                    <div className="text-xl font-black leading-tight mt-1">{section.title}</div>
                    <div className="text-sm leading-6 mt-1 text-stone-800">{section.body}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <div>
                  <div className="inline-flex text-[10px] tracking-widest border border-stone-800 px-2 py-0.5">社评</div>
                  <div className="mt-2 border border-stone-800 bg-[#efe3c8] p-3 text-lg leading-8">{newspaper.sideQuote}</div>
                  <div className="mt-2 text-sm leading-6 text-stone-800">{newspaper.sideNote}</div>
                </div>
                <div className="border-t border-stone-900 pt-2">
                  <div className="font-semibold text-sm mb-2 tracking-widest">数据图版</div>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="bg-[#f7efdd] border border-stone-700 p-1">
                      <svg width={300} height={120} viewBox="0 0 300 120" className="w-full h-auto">
                        <rect x={0} y={0} width={300} height={120} fill="none" stroke="rgba(120,113,108,0.8)" />
                        <path d={paperLinePath(newspaper.visuals.lineTrend, 300, 120, 14)} fill="none" stroke="rgba(127,29,29,0.9)" strokeWidth={2} />
                        {paperLinePoints(newspaper.visuals.lineTrend, 300, 120, 14).map((p, idx) => <circle key={`lp_${idx}`} cx={p.x} cy={p.y} r={2.5} fill="rgba(127,29,29,0.9)" />)}
                      </svg>
                    </div>
                    <div className="bg-[#f7efdd] border border-stone-700 p-1">
                      <svg width={300} height={120} viewBox="0 0 300 120" className="w-full h-auto">
                        <rect x={0} y={0} width={300} height={120} fill="none" stroke="rgba(120,113,108,0.8)" />
                        {(() => {
                          const list = newspaper.visuals.columnStats.slice(0, 6);
                          const max = Math.max(1, ...list.map(x => x.value));
                          return list.map((item, idx) => {
                            const h = Math.max(6, (item.value / max) * 90);
                            const x = 14 + idx * 46;
                            return (
                              <g key={`cb_${idx}`}>
                                <rect x={x} y={104 - h} width={30} height={h} fill="rgba(63,63,70,0.92)" />
                                <text x={x + 15} y={116} fontSize={10} textAnchor="middle">{item.label}</text>
                              </g>
                            );
                          });
                        })()}
                      </svg>
                    </div>
                    <div className="bg-[#f7efdd] border border-stone-700 p-1">
                      <svg width={300} height={132} viewBox="0 0 300 132" className="w-full h-auto">
                        <rect x={0} y={0} width={300} height={132} fill="none" stroke="rgba(120,113,108,0.8)" />
                        {(() => {
                          const list = newspaper.visuals.barStats.slice(0, 6);
                          const max = Math.max(1, ...list.map(x => x.value));
                          return list.map((item, idx) => {
                            const w = Math.max(12, (item.value / max) * 180);
                            const y = 12 + idx * 19;
                            return (
                              <g key={`hb_${idx}`}>
                                <text x={2} y={y + 10} fontSize={10}>{item.label}</text>
                                <rect x={76} y={y} width={w} height={11} fill="rgba(87,83,78,0.92)" />
                              </g>
                            );
                          });
                        })()}
                      </svg>
                    </div>
                    <div className="bg-[#f7efdd] border border-stone-700 p-1">
                      <svg width={300} height={220} viewBox="0 0 300 220" className="w-full h-auto">
                        <rect x={0} y={0} width={300} height={220} fill="none" stroke="rgba(120,113,108,0.8)" />
                        {(() => {
                          const nodes = relationLayout(newspaper.visuals.relationNodes);
                          const map = new Map(nodes.map(n => [n.name, n]));
                          return (
                            <>
                              {newspaper.visuals.relationEdges.slice(0, 12).map((edge, idx) => {
                                const a = map.get(edge.from);
                                const b = map.get(edge.to);
                                if (!a || !b) return null;
                                const color = edge.value >= 0 ? 'rgba(22,101,52,0.85)' : 'rgba(153,27,27,0.85)';
                                const width = 1 + Math.min(2.4, Math.abs(edge.value) / 45);
                                return <line key={`re_${idx}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={width} />;
                              })}
                              {nodes.map((n, idx) => (
                                <g key={`rn_${idx}`}>
                                  <circle cx={n.x} cy={n.y} r={11} fill="rgba(244,230,200,1)" stroke="rgba(87,83,78,0.9)" />
                                  <text x={n.x} y={n.y + 4} fontSize={9} textAnchor="middle">{n.name}</text>
                                </g>
                              ))}
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  </div>
                  <pre className="mt-2 text-[11px] leading-4 bg-[#f8f1df] border border-dashed border-stone-600 p-2 whitespace-pre-wrap">{newspaper.visuals.mermaidFlow}</pre>
                </div>
              </div>
            </div>
            <div className="border-t border-stone-900 px-4 py-2 text-xs text-stone-700 flex flex-wrap gap-2">
              {newspaper.ticker.map((line, idx) => <span key={`ticker_${idx}`} className="pr-2 border-r border-stone-400">• {line}</span>)}
            </div>
            <div className="border-t border-stone-700 bg-[#d6c39e] px-4 py-2 text-xs text-stone-900 flex flex-wrap items-center gap-2">
              <span className="font-bold mr-1">关键词：</span>
              {newspaper.visuals.keywords.map((word, idx) => (
                <span key={`kw_${idx}`} className="px-2 py-0.5 border border-[#6b5f46] bg-[#f4ecd9]">{word}</span>
              ))}
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
