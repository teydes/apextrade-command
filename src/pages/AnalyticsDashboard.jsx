import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { BarChart2, TrendingUp, Zap, RefreshCw, Target, Award, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import { toast } from 'sonner';

// Données mock enrichies
const MONTHLY_PNL = [
  { month: 'Jan', pnl: 1240, trades: 18, wr: 61 },
  { month: 'Fév', pnl: -320, trades: 22, wr: 45 },
  { month: 'Mar', pnl: 2100, trades: 16, wr: 75 },
  { month: 'Avr', pnl: 1780, trades: 20, wr: 70 },
  { month: 'Mai', pnl: 950, trades: 14, wr: 64 },
];

const SETUP_RADAR = [
  { metric: 'Win Rate', ICT_OB: 68, AMD: 72, FVG: 61, BOS: 44 },
  { metric: 'R:R', ICT_OB: 80, AMD: 90, FVG: 65, BOS: 40 },
  { metric: 'Fréquence', ICT_OB: 60, AMD: 35, FVG: 85, BOS: 95 },
  { metric: 'Consistance', ICT_OB: 75, AMD: 80, FVG: 55, BOS: 30 },
  { metric: 'PropFirm', ICT_OB: 70, AMD: 85, FVG: 60, BOS: 35 },
];

const SESSION_PIE = [
  { name: 'NY Open', value: 52, color: '#00FF88' },
  { name: 'London', value: 28, color: '#0088FF' },
  { name: 'Afternoon', value: 20, color: '#F59E0B' },
];

const HOURLY_HEATMAP = Array.from({ length: 24 }, (_, h) => ({
  hour: `${h}h`,
  wr: h >= 9 && h <= 11 ? 60 + Math.random() * 20 :
      h >= 14 && h <= 16 ? 65 + Math.random() * 20 :
      30 + Math.random() * 25,
  pnl: h >= 9 && h <= 16 ? Math.round(Math.random() * 300) : Math.round(Math.random() * 100 - 50),
}));

const MISTAKE_DISTRIBUTION = [
  { name: 'Entrée trop tôt', count: 14, pnl: -680 },
  { name: 'Sortie émotionnelle', count: 9, pnl: -420 },
  { name: 'Overtrading', count: 7, pnl: -510 },
  { name: 'Mauvais biais', count: 5, pnl: -320 },
  { name: 'Taille de position', count: 4, pnl: -190 },
];

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState('all');
  const [aiInsight, setAiInsight] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const { data: trades = [] } = useQuery({
    queryKey: ['all-trades-analytics'],
    queryFn: () => base44.entities.Trade.list('-created_date', 200),
  });

  // Données réelles si disponibles
  const realTotalPnl = trades.length > 0 ? trades.reduce((s, t) => s + (t.pnl || 0), 0) : null;
  const realTotalTrades = trades.length > 0 ? trades.length : null;
  const realWins = trades.filter(t => t.result === 'win').length;
  const realWR = trades.length > 0 ? ((realWins / trades.length) * 100).toFixed(1) : null;

  // Agrégation par mois depuis les vraies données
  const monthlyFromReal = trades.length > 0 ? Object.values(
    trades.reduce((acc, t) => {
      const m = t.entry_time ? new Date(t.entry_time).toLocaleDateString('fr-FR', { month: 'short' }) : 'N/A';
      if (!acc[m]) acc[m] = { month: m, pnl: 0, trades: 0, wins: 0 };
      acc[m].pnl += t.pnl || 0; acc[m].trades++; if (t.result === 'win') acc[m].wins++;
      acc[m].wr = Math.round((acc[m].wins / acc[m].trades) * 100);
      return acc;
    }, {})
  ) : null;

  const displayMonthly = monthlyFromReal || MONTHLY_PNL;
  const totalPnl = realTotalPnl ?? MONTHLY_PNL.reduce((s, m) => s + m.pnl, 0);
  const totalTrades = realTotalTrades ?? MONTHLY_PNL.reduce((s, m) => s + m.trades, 0);
  const avgWR = realWR ?? (MONTHLY_PNL.reduce((s, m) => s + m.wr, 0) / MONTHLY_PNL.length).toFixed(1);
  const bestMonth = displayMonthly.reduce((a, b) => a.pnl > b.pnl ? a : b);
  const worstMonth = displayMonthly.reduce((a, b) => a.pnl < b.pnl ? a : b);

  const getAIInsight = async () => {
    setLoadingAI(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un analyste performance trading NQ Futures expert. Synthétise ces données analytics et fournis des insights stratégiques actionnables.

Performance globale (${trades.length > 0 ? 'données réelles' : 'données simulées'}):
- PnL total: ${totalPnl}€ sur ${totalTrades} trades
- Win Rate moyen: ${avgWR}%
- Meilleur mois: ${bestMonth.month} (+${bestMonth.pnl}€, WR:${bestMonth.wr || '—'}%)
- Pire mois: ${worstMonth.month} (${worstMonth.pnl}€, WR:${worstMonth.wr || '—'}%)

Erreurs identifiées: ${MISTAKE_DISTRIBUTION.map(e => `${e.name}(${e.count}x, ${e.pnl}€)`).join(', ')}

Setups (WR/Fréquence): ICT_OB:68%/3.2j | AMD:72%/1.8j | FVG:61%/4.5j | BOS:44%/5.1j
Sessions: NY Open 52% du PnL | London 28% | Afternoon 20%

Retourne UNIQUEMENT JSON sans markdown:
{
  "global_verdict": "<synthèse en 2 phrases>",
  "performance_score": <0-100>,
  "top_insights": [{"title":"<titre>","detail":"<detail actionnable>","priority":"haute"|"moyenne"}],
  "focus_areas": ["<domaine 1>","<domaine 2>","<domaine 3>"],
  "monthly_trend": "improving"|"declining"|"stable",
  "next_30_days_target": <pnl cible en €>
}`,
      response_json_schema: {
        type: "object", properties: {
          global_verdict: { type: "string" }, performance_score: { type: "number" },
          top_insights: { type: "array", items: { type: "object", properties: { title: { type: "string" }, detail: { type: "string" }, priority: { type: "string" } } } },
          focus_areas: { type: "array", items: { type: "string" } },
          monthly_trend: { type: "string" }, next_30_days_target: { type: "number" }
        }
      }
    });
    setAiInsight(res);
    setLoadingAI(false);
  };

  const trendColor = { improving: 'text-primary', declining: 'text-destructive', stable: 'text-yellow-400' };

  // Export CSV complet
  const exportCSV = () => {
    const headers = ['Mois', 'PnL (€)', 'Trades', 'Win Rate (%)'];
    const rows = MONTHLY_PNL.map(m => [m.month, m.pnl, m.trades, m.wr]);
    const errorRows = MISTAKE_DISTRIBUTION.map(m => [m.name, m.count, m.pnl, '']);
    const csv = [
      '=== PERFORMANCE MENSUELLE ===',
      headers.join(','),
      ...rows.map(r => r.join(',')),
      '',
      '=== ERREURS IDENTIFIÉES ===',
      'Erreur,Occurrences,Impact PnL (€),',
      ...errorRows.map(r => r.join(',')),
      '',
      `=== SYNTHÈSE ===`,
      `PnL Total,${totalPnl}€`,
      `Win Rate Moyen,${avgWR}%`,
      `Total Trades,${totalTrades}`,
      `Score Performance,${aiInsight?.performance_score || 'N/A'}`,
      `Export généré,${new Date().toLocaleDateString('fr-FR')}`,
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ghost_trader_analytics_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Export CSV généré');
  };

  const exportJSON = () => {
    const data = {
      exported_at: new Date().toISOString(),
      summary: { total_pnl: totalPnl, total_trades: totalTrades, avg_win_rate: avgWR, best_month: bestMonth, worst_month: worstMonth },
      monthly_pnl: MONTHLY_PNL,
      mistake_distribution: MISTAKE_DISTRIBUTION,
      session_breakdown: SESSION_PIE,
      ai_insight: aiInsight || null,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ghost_trader_analytics_${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Export JSON généré');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-400" />
            Analytics Dashboard IA
          </h1>
          <p className="text-xs text-muted-foreground">Performance globale · Patterns d'erreurs · Insights IA</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {trades.length > 0 && <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded">● {trades.length} trades réels chargés</span>}
          <div className="flex gap-1">
            {['1m', '3m', 'all'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`text-xs px-2 py-1 rounded ${period === p ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                {p}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1 text-xs h-8">
            <Download className="w-3 h-3" />CSV
          </Button>
          <Button size="sm" variant="outline" onClick={exportJSON} className="gap-1 text-xs h-8">
            <FileText className="w-3 h-3" />JSON
          </Button>
          <Button size="sm" onClick={getAIInsight} disabled={loadingAI} className="gap-1 text-xs">
            <Zap className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />
            {loadingAI ? 'Analyse...' : 'Insights IA'}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'PnL Total', value: `${totalPnl >= 0 ? '+' : ''}${totalPnl}€`, color: totalPnl >= 0 ? 'text-primary' : 'text-destructive' },
          { label: 'Trades', value: totalTrades },
          { label: 'Win Rate Moy.', value: `${avgWR}%`, color: parseFloat(avgWR) >= 60 ? 'text-primary' : 'text-yellow-400' },
          { label: 'Meilleur Mois', value: `+${bestMonth.pnl}€`, color: 'text-primary' },
          { label: 'Pire Mois', value: `${worstMonth.pnl}€`, color: 'text-destructive' },
        ].map(k => (
          <div key={k.label} className="card-trading text-center py-2">
            <div className={`text-xl font-bold font-mono ${k.color || 'text-foreground'}`}>{k.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* AI Insight Banner */}
      {aiInsight && (
        <div className="card-trading border border-blue-400/30 bg-blue-400/5 space-y-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-center">
              <div className={`text-2xl font-bold font-mono ${aiInsight.performance_score >= 70 ? 'text-primary' : aiInsight.performance_score >= 50 ? 'text-yellow-400' : 'text-destructive'}`}>{aiInsight.performance_score}</div>
              <div className="text-[10px] text-muted-foreground">Score</div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-blue-400">Analyse IA</span>
                <span className={`text-xs font-bold ${trendColor[aiInsight.monthly_trend]}`}>● {aiInsight.monthly_trend}</span>
                {aiInsight.next_30_days_target && <span className="text-xs text-muted-foreground ml-2">Objectif 30j: <span className="text-primary font-mono">{aiInsight.next_30_days_target}€</span></span>}
              </div>
              <p className="text-xs text-muted-foreground">{aiInsight.global_verdict}</p>
            </div>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setAiInsight(null)}>✕</Button>
          </div>
          {aiInsight.top_insights?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {aiInsight.top_insights.map((ins, i) => (
                <div key={i} className={`p-2 rounded border text-xs ${ins.priority === 'haute' ? 'border-destructive/30 bg-destructive/5' : 'border-yellow-400/20 bg-yellow-400/5'}`}>
                  <div className="font-semibold mb-0.5">{ins.title}</div>
                  <div className="text-muted-foreground">{ins.detail}</div>
                </div>
              ))}
            </div>
          )}
          {aiInsight.focus_areas?.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {aiInsight.focus_areas.map((f, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-blue-400/10 text-blue-400 border border-blue-400/20">🎯 {f}</span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PnL mensuel */}
        <div className="card-trading">
          <span className="text-xs font-semibold block mb-3">PnL Mensuel {trades.length > 0 ? '(données réelles)' : '(simulation)'}</span>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={displayMonthly}>
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', borderRadius: 6, fontSize: 10 }}
                formatter={v => [`${v}€`, 'PnL']} />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                {MONTHLY_PNL.map((e, i) => (
                  <Cell key={i} fill={e.pnl >= 0 ? '#00FF88' : '#EF4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition sessions */}
        <div className="card-trading">
          <span className="text-xs font-semibold block mb-3">Répartition PnL par Session</span>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={140}>
              <PieChart>
                <Pie data={SESSION_PIE} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                  {SESSION_PIE.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={v => [`${v}%`, 'Part PnL']} contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', borderRadius: 6, fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {SESSION_PIE.map(s => (
                <div key={s.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className="font-mono font-bold ml-auto" style={{ color: s.color }}>{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Radar setups */}
        <div className="card-trading">
          <span className="text-xs font-semibold block mb-3">Radar Performance Setups</span>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={SETUP_RADAR}>
              <PolarGrid stroke="#1e293b" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9, fill: '#64748b' }} />
              <Radar name="ICT OB" dataKey="ICT_OB" stroke="#00FF88" fill="#00FF88" fillOpacity={0.1} strokeWidth={1.5} />
              <Radar name="AMD" dataKey="AMD" stroke="#0088FF" fill="#0088FF" fillOpacity={0.1} strokeWidth={1.5} />
              <Radar name="FVG" dataKey="FVG" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} strokeWidth={1.5} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Erreurs */}
        <div className="card-trading">
          <span className="text-xs font-semibold block mb-3">Distribution des Erreurs (impact PnL)</span>
          <div className="space-y-2">
            {MISTAKE_DISTRIBUTION.map(m => (
              <div key={m.name} className="flex items-center gap-2 text-xs">
                <span className="w-24 text-muted-foreground truncate flex-shrink-0">{m.name}</span>
                <div className="flex-1 progress-bar">
                  <div className="progress-bar-fill bg-destructive/60" style={{ width: `${(m.count / 14) * 100}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground w-8 text-center">{m.count}x</span>
                <span className="font-mono font-bold text-destructive w-16 text-right">{m.pnl}€</span>
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap horaire */}
        <div className="card-trading lg:col-span-2">
          <span className="text-xs font-semibold block mb-3">Win Rate par Heure (sur 24h)</span>
          <div className="flex gap-0.5 overflow-x-auto">
            {HOURLY_HEATMAP.map(h => (
              <div key={h.hour} className="flex flex-col items-center gap-1 min-w-[28px]">
                <div className="w-6 rounded" style={{
                  height: 40,
                  background: h.wr >= 65 ? `rgba(0,255,136,${h.wr / 100})` : h.wr >= 50 ? `rgba(245,158,11,${h.wr / 100})` : `rgba(239,68,68,${h.wr / 100})`
                }} title={`WR: ${h.wr.toFixed(0)}%`} />
                <span className="text-[8px] text-muted-foreground">{h.hour}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-primary/80 inline-block" />WR ≥ 65%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-yellow-400/80 inline-block" />WR 50-65%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-destructive/80 inline-block" />WR &lt; 50%</span>
          </div>
        </div>
      </div>
    </div>
  );
}