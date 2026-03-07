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

  const escapeHtml = (value: string) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const normalizeChartRows = (rows?: Array<{ label: string; value: number }>, fallbackLabel = '项') => {
    const safe = Array.isArray(rows) ? rows : [];
    const normalized = safe
      .map((x, i) => ({
        label: String(x?.label ?? `${fallbackLabel}${i + 1}`),
        value: Math.max(0, Number(x?.value ?? 0))
      }))
      .filter(x => Number.isFinite(x.value))
      .slice(0, 16);
    return normalized.length > 0 ? normalized : [{ label: `${fallbackLabel}1`, value: 0 }];
  };

  const buildLinePathByRows = (rows: Array<{ label: string; value: number }>, width: number, height: number, padding: number) => {
    if (rows.length === 0) return '';
    const max = Math.max(1, ...rows.map(x => x.value));
    const stepX = rows.length > 1 ? (width - padding * 2) / (rows.length - 1) : 0;
    return rows.map((point, index) => {
      const x = padding + stepX * index;
      const y = height - padding - (point.value / max) * (height - padding * 2);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };

  const renderRelationGraphSvg = (issue: WorldNewspaperIssue, width: number, height: number) => {
    const nodesRaw = issue?.relationGraph?.nodes ?? [];
    const linksRaw = issue?.relationGraph?.links ?? [];
    const nodes = nodesRaw.slice(0, 14);
    if (nodes.length === 0) {
      return (
        <div className="text-xs text-stone-500">暂无关系图数据。</div>
      );
    }
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.36;
    const positions = new Map<string, { x: number; y: number; label: string; group?: string }>();
    nodes.forEach((node, index) => {
      const ang = (Math.PI * 2 * index) / nodes.length - Math.PI / 2;
      positions.set(node.id, {
        x: cx + Math.cos(ang) * radius,
        y: cy + Math.sin(ang) * radius,
        label: node.label,
        group: node.group
      });
    });
    const links = linksRaw
      .filter(l => positions.has(l.source) && positions.has(l.target))
      .slice(0, 24);
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <rect x={0} y={0} width={width} height={height} fill="rgba(255,255,255,0.58)" stroke="rgba(41,37,36,0.35)" />
        {links.map((link, idx) => {
          const a = positions.get(link.source)!;
          const b = positions.get(link.target)!;
          const positive = Number(link.weight) >= 0;
          return (
            <g key={`rl_${idx}`}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={positive ? 'rgba(21,128,61,0.75)' : 'rgba(185,28,28,0.78)'}
                strokeWidth={1 + Math.min(3, Math.abs(Number(link.weight || 0)) / 35)}
              />
            </g>
          );
        })}
        {[...positions.entries()].map(([id, p], idx) => (
          <g key={`rn_${id}_${idx}`}>
            <circle cx={p.x} cy={p.y} r={10} fill={p.group === 'FACTION' ? '#b91c1c' : '#1d4ed8'} stroke="#f8fafc" />
            <text x={p.x} y={p.y - 14} textAnchor="middle" fontSize="10" fill="#1f2937">{p.label}</text>
          </g>
        ))}
      </svg>
    );
  };

  const buildPaperHtml = (issue: WorldNewspaperIssue) => {
    const lineRows = normalizeChartRows(issue.charts?.line, '日');
    const barRows = normalizeChartRows(issue.charts?.bar, '部队');
    const progressRows = normalizeChartRows(issue.charts?.progress, '关系');
    const keywords = (issue.keywords && issue.keywords.length > 0 ? issue.keywords : issue.ticker).slice(0, 12);
    const lineW = 520;
    const lineH = 180;
    const linePath = buildLinePathByRows(lineRows, lineW, lineH, 22);
    const lineMax = Math.max(1, ...lineRows.map(r => r.value));
    const barMax = Math.max(1, ...barRows.map(r => r.value));
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
    const keywordBadges = keywords.map(line => `<span>#${escapeHtml(line)}</span>`).join('\n');
    const lineDots = lineRows.map((point, index) => {
      const stepX = lineRows.length > 1 ? (lineW - 44) / (lineRows.length - 1) : 0;
      const x = 22 + stepX * index;
      const y = lineH - 22 - (point.value / lineMax) * (lineH - 44);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.8" fill="#7f1d1d" />`;
    }).join('');
    const bars = barRows.slice(0, 8).map((row, idx) => {
      const bw = 56;
      const gap = 10;
      const x = 20 + idx * (bw + gap);
      const h = ((row.value / barMax) * 110);
      const y = 142 - h;
      return `<g><rect x="${x}" y="${y.toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" fill="#b45309"/><text x="${x + bw/2}" y="156" text-anchor="middle" font-size="9">${escapeHtml(row.label.slice(0,6))}</text></g>`;
    }).join('');
    const progressItems = progressRows.slice(0, 8).map(row => {
      const v = Math.max(0, Math.min(100, row.value));
      return `<div class="pr-item"><div class="pr-label">${escapeHtml(row.label)}</div><div class="pr-track"><div class="pr-fill" style="width:${v}%"></div></div><div class="pr-val">${Math.round(v)}</div></div>`;
    }).join('\n');
    const relationNodes = (issue.relationGraph?.nodes ?? []).slice(0, 14);
    const relationLinks = (issue.relationGraph?.links ?? []).slice(0, 24);
    const graphW = 520;
    const graphH = 270;
    const gx = graphW / 2;
    const gy = graphH / 2;
    const gr = Math.min(graphW, graphH) * 0.36;
    const pos = relationNodes.map((n, i) => {
      const ang = (Math.PI * 2 * i) / Math.max(1, relationNodes.length) - Math.PI / 2;
      return { id: n.id, label: n.label, x: gx + Math.cos(ang) * gr, y: gy + Math.sin(ang) * gr, group: n.group };
    });
    const posMap = new Map(pos.map(p => [p.id, p]));
    const relLines = relationLinks.filter(l => posMap.has(l.source) && posMap.has(l.target)).map(l => {
      const a = posMap.get(l.source)!;
      const b = posMap.get(l.target)!;
      const w = Number(l.weight || 0);
      const stroke = w >= 0 ? 'rgba(21,128,61,0.78)' : 'rgba(185,28,28,0.78)';
      const sw = 1 + Math.min(3, Math.abs(w) / 35);
      return `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${stroke}" stroke-width="${sw.toFixed(1)}"/>`;
    }).join('');
    const relNodes = pos.map(p => {
      const fill = p.group === 'FACTION' ? '#991b1b' : '#1d4ed8';
      return `<g><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="9" fill="${fill}" stroke="#f8fafc"/><text x="${p.x.toFixed(1)}" y="${(p.y - 14).toFixed(1)}" text-anchor="middle" font-size="10">${escapeHtml(p.label.slice(0,10))}</text></g>`;
    }).join('');
    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(issue.masthead)}</title>
  <style>
    body{margin:0;background:#ddd5c5;font-family: "Noto Serif SC","Songti SC",serif;color:#111}
    .paper{max-width:1240px;margin:16px auto;background:#f4ead6;border:1px solid #9d947f;box-shadow:0 8px 24px rgba(0,0,0,.22)}
    .head{padding:20px 26px;border-bottom:3px double #111;background:linear-gradient(180deg,#f8f1e3,#f1e5cd)}
    .mast{font-size:52px;font-weight:800;letter-spacing:2px}
    .sub{margin-top:4px;font-size:13px;color:#3f3f46}
    .meta{display:flex;justify-content:space-between;font-size:12px;margin-top:10px;color:#444}
    .body{display:grid;grid-template-columns:1.35fr 1fr 0.88fr;gap:16px;padding:16px 20px}
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
    .briefs{margin-top:16px;border-top:2px solid #111;padding-top:8px}
    .briefs h4{font-size:18px;margin:4px 0 8px}
    .briefs li{margin:6px 0;line-height:1.5;font-size:14px}
    .insight{margin:0 20px 8px;border:1px solid #8f8573;background:#f9f3e5;padding:12px;display:grid;grid-template-columns:1.1fr .9fr;gap:12px}
    .chart-title{font-size:12px;letter-spacing:1px;color:#444}
    .mini-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .pr-item{display:grid;grid-template-columns:1fr 3fr auto;gap:8px;align-items:center;font-size:12px}
    .pr-track{height:8px;background:#e5dbc4;border:1px solid #b6a98f}
    .pr-fill{height:100%;background:linear-gradient(90deg,#b45309,#d97706)}
    .keywords{border-top:2px solid #111;padding:9px 16px;display:flex;flex-wrap:wrap;gap:8px;background:#efe3c8}
    .keywords span{font-size:12px;padding:2px 8px;border:1px solid #8f8573;background:#f8f3e8}
    .mermaid{margin:8px 20px 16px;border:1px dashed #8f8573;background:#f8f2e2;padding:8px}
    .mermaid pre{margin:0;white-space:pre-wrap;font-size:11px;line-height:1.4}
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
    <section class="insight">
      <div>
        <div class="chart-title">战况折线</div>
        <svg width="${lineW}" height="${lineH}" viewBox="0 0 ${lineW} ${lineH}">
          <rect x="0" y="0" width="${lineW}" height="${lineH}" fill="rgba(255,255,255,.65)" stroke="rgba(41,37,36,.35)"/>
          <path d="${linePath}" fill="none" stroke="#7f1d1d" stroke-width="2.2"/>
          ${lineDots}
        </svg>
      </div>
      <div class="mini-grid">
        <div>
          <div class="chart-title">战力柱状</div>
          <svg width="100%" height="168" viewBox="0 0 560 168">
            <rect x="0" y="0" width="560" height="168" fill="rgba(255,255,255,.65)" stroke="rgba(41,37,36,.35)"/>
            ${bars}
          </svg>
        </div>
        <div>
          <div class="chart-title">关系条形</div>
          ${progressItems}
        </div>
      </div>
    </section>
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
        <div class="chart-title" style="margin-top:10px">关系图谱</div>
        <svg width="${graphW}" height="${graphH}" viewBox="0 0 ${graphW} ${graphH}">
          <rect x="0" y="0" width="${graphW}" height="${graphH}" fill="rgba(255,255,255,.65)" stroke="rgba(41,37,36,.35)"/>
          ${relLines}
          ${relNodes}
        </svg>
      </aside>
    </section>
    <footer class="keywords">${keywordBadges}</footer>
    <section class="mermaid"><pre>${escapeHtml(issue.mermaid || '')}</pre></section>
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

  const renderPaperLineChart = (rows: Array<{ label: string; value: number }>) => {
    const w = 520;
    const h = 180;
    const p = 22;
    const max = Math.max(1, ...rows.map(x => x.value));
    const path = buildLinePathByRows(rows, w, h, p);
    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
        <rect x={0} y={0} width={w} height={h} fill="rgba(255,255,255,0.58)" stroke="rgba(41,37,36,0.35)" />
        <path d={path} fill="none" stroke="rgba(127,29,29,0.95)" strokeWidth={2.2} />
        {rows.map((point, index) => {
          const stepX = rows.length > 1 ? (w - p * 2) / (rows.length - 1) : 0;
          const x = p + stepX * index;
          const y = h - p - (point.value / max) * (h - p * 2);
          return <circle key={`lc_${index}`} cx={x} cy={y} r={2.8} fill="rgba(127,29,29,0.95)" />;
        })}
      </svg>
    );
  };

  const renderPaperBarChart = (rows: Array<{ label: string; value: number }>) => {
    const w = 560;
    const h = 170;
    const max = Math.max(1, ...rows.map(x => x.value));
    const safe = rows.slice(0, 8);
    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
        <rect x={0} y={0} width={w} height={h} fill="rgba(255,255,255,0.58)" stroke="rgba(41,37,36,0.35)" />
        {safe.map((row, idx) => {
          const bw = 56;
          const gap = 10;
          const x = 20 + idx * (bw + gap);
          const hh = (row.value / max) * 110;
          const y = 142 - hh;
          return (
            <g key={`bc_${idx}`}>
              <rect x={x} y={y} width={bw} height={hh} fill="rgba(180,83,9,0.9)" />
              <text x={x + bw / 2} y={156} textAnchor="middle" fontSize="9" fill="#1f2937">{row.label.slice(0, 6)}</text>
            </g>
          );
        })}
      </svg>
    );
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
          <div className="mb-6 bg-[#f4ead6] text-stone-900 border border-[#9d947f] rounded overflow-hidden shadow-xl">
            <div className="border-b-[3px] border-stone-900 px-4 py-3 bg-gradient-to-b from-[#f8f1e3] to-[#f1e5cd]">
              <div className="text-3xl md:text-4xl font-black tracking-widest">{newspaper.masthead}</div>
              <div className="text-xs text-stone-700 mt-1">{newspaper.subtitle}</div>
              <div className="text-[11px] text-stone-600 mt-2 flex justify-between">
                <span>{newspaper.dateLine}</span>
                <span>{newspaper.issueNo}</span>
              </div>
            </div>
            <div className="mx-4 my-3 border border-[#8f8573] bg-[#f9f3e5] p-3 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-3">
              <div>
                <div className="text-[11px] tracking-widest text-stone-700 mb-1">战况折线</div>
                {renderPaperLineChart(normalizeChartRows(newspaper.charts?.line, '日'))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <div className="text-[11px] tracking-widest text-stone-700 mb-1">战力柱状</div>
                  {renderPaperBarChart(normalizeChartRows(newspaper.charts?.bar, '部队'))}
                </div>
                <div>
                  <div className="text-[11px] tracking-widest text-stone-700 mb-1">关系条形</div>
                  <div className="space-y-2">
                    {normalizeChartRows(newspaper.charts?.progress, '关系').slice(0, 8).map((row, idx) => {
                      const v = Math.max(0, Math.min(100, row.value));
                      return (
                        <div key={`pr_${idx}`} className="grid grid-cols-[1fr_3fr_auto] gap-2 items-center text-xs">
                          <div className="truncate">{row.label}</div>
                          <div className="h-2 bg-[#e5dbc4] border border-[#b6a98f]">
                            <div className="h-full bg-gradient-to-r from-amber-700 to-amber-500" style={{ width: `${v}%` }} />
                          </div>
                          <div>{Math.round(v)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 grid grid-cols-1 xl:grid-cols-[1.45fr_1fr_0.9fr] gap-4">
              <div>
                <div className="inline-flex text-[10px] tracking-widest border border-stone-800 px-2 py-0.5">{newspaper.leadTag}</div>
                <div className="text-3xl md:text-4xl font-black leading-tight mt-2">{newspaper.leadTitle}</div>
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
              <div>
                <div className="inline-flex text-[10px] tracking-widest border border-stone-800 px-2 py-0.5">社评</div>
                <div className="mt-2 border border-stone-800 bg-[#efe3c8] p-3 text-lg leading-8">{newspaper.sideQuote}</div>
                <div className="mt-3 text-sm leading-6 text-stone-800">{newspaper.sideNote}</div>
                <div className="text-[11px] tracking-widest text-stone-700 mt-3 mb-1">关系图谱</div>
                {renderRelationGraphSvg(newspaper, 520, 270)}
              </div>
            </div>
            <div className="mx-4 mb-3 border border-dashed border-[#8f8573] bg-[#f8f2e2] p-2">
              <div className="text-[11px] tracking-widest text-stone-700 mb-1">Mermaid 文本</div>
              <pre className="text-[11px] leading-5 whitespace-pre-wrap">{newspaper.mermaid}</pre>
            </div>
            <div className="border-t-2 border-stone-900 px-4 py-2 text-xs text-stone-700 flex flex-wrap gap-2 bg-[#efe3c8]">
              {(newspaper.keywords && newspaper.keywords.length > 0 ? newspaper.keywords : newspaper.ticker).slice(0, 12).map((line, idx) => (
                <span key={`keyword_${idx}`} className="px-2 py-0.5 border border-[#8f8573] bg-[#f8f3e8]">#{line}</span>
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
