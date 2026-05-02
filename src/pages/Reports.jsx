import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Download, RefreshCw, Filter, TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle2, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 as b44 } from '@/api/base44Client';
import { toast } from 'sonner';
import StatCard from '@/components/shared/StatCard';

const mockTrades = [
  { date: '2024-04-01', pnl: 320, result: 'win', setup: 'OB+FVG', session: 'New York', rr: 2.4 },
  { date: '2024-04-01', pnl: -95, result: 'loss', setup: 'BOS+CHoCH', session: 'New York', rr: 1.2 },
  { date: '2024-04-02', pnl: 540, result: 'win', setup: 'AMD Expansion', session: 'Pre-Market', rr: 3.0 },
  { date: '2024-04-02', pnl: 210, result: 'win', setup: 'IFVG Fill', session: 'New York', rr: 1.8 },
  { date: '2024-04-03', pnl: -180, result: 'loss', setup: 'OB Retest', session: 'London', rr: 0.9 },
  { date: '2024-04-04', pnl: 620, result: 'win', setup: 'OB+FVG', session: 'New York', rr: 3.5 },
  { date: '2024-04-05', pnl: 0, result: 'breakeven', setup: 'AMD', session: 'New York', rr: 0 },
];

const setupStats = [
  { name: 'OB+FVG', wins: 8, losses: 1, avg_rr: 2.8 },
  { name: 'AMD/IFVG', wins: 6, losses: 2, avg_rr: 2.1 },
  { name: 'BOS+CHoCH', wins: 4, losses: 3, avg_rr: 1.6 },
  { name: 'Footprint', wins: 5, losses: 1, avg_rr: 3.2 },
];

const sessionStats = [
  { session: 'Pre-Market', pnl: 820, trades: 3 },
  { session: 'London', pnl: -180, trades: 2 },
  { session: 'New York', pnl: 1420, trades: 9 },
];

const COLORS = ['#00FF88', '#EF4444', '#F59E0B'];

export default function Reports() {
  const [period, setPeriod] = useState('week');
  const [phase, setPhase] = useState('all');
  const [aiReport, setAiReport] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const wins = mockTrades.filter(t => t.result === 'win').length;
  const losses = mockTrades.filter(t => t.result === 'loss').length;
  const bes = mockTrades.filter(t => t.result === 'breakeven').length;
  const totalPnl = mockTrades.reduce((s, t) => s + t.pnl, 0);
  const winRate = ((wins / mockTrades.length) * 100).toFixed(1);
  const avgRR = (mockTrades.reduce((s, t) => s + t.rr, 0) / mockTrades.length).toFixed(2);
  const bestTrade = Math.max(...mockTrades.map(t => t.pnl));
  const worstTrade = Math.min(...mockTrades.map(t => t.pnl));
  const profitFactor = wins > 0 && losses > 0 ? (mockTrades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0) / Math.abs(mockTrades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0))).toFixed(2) : 'N/A';

  const exportCSV = () => {
    const headers = ['Date', 'Setup', 'Session', 'Direction', 'P&L', 'R:R', 'Résultat'];
    const rows = mockTrades.map(t => [t.date, t.setup, t.session, '', t.pnl, t.rr, t.result]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'rapport_trades.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const getAIReport = async () => {
    setLoadingAI(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un coach de trading expert ICT/SMC spécialisé sur le NQ Futures.
Analyse ces statistiques et retourne UNIQUEMENT un JSON (sans markdown) avec cette structure:
{
  "score": <number 0-10>,
  "verdict": "<synthèse en 1 phrase>",
  "forces": ["<force 1>", "<force 2>"],
  "suggestions": [
    { "category": "Setup"|"Session"|"R:R"|"Psychologie"|"Risque", "priority": "haute"|"moyenne"|"basse", "title": "<titre court>", "detail": "<action concrète 1-2 phrases>" }
  ]
}

Données:
- Win Rate: ${winRate}%, P&L: ${totalPnl}€, Avg R:R: ${avgRR}, Profit Factor: ${profitFactor}
- Best: +${bestTrade}€, Worst: ${worstTrade}€
- Setups: ${setupStats.map(s => `${s.name}: ${s.wins}W/${s.losses}L RR:${s.avg_rr}`).join(', ')}
- Sessions: ${sessionStats.map(s => `${s.session}: ${s.pnl}€`).join(', ')}

Fournis 5-6 suggestions concrètes et actionnables, orientées PropFirm MFF.`,
      response_json_schema: {
        type: "object",
        properties: {
          score: { type: "number" },
          verdict: { type: "string" },
          forces: { type: "array", items: { type: "string" } },
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                priority: { type: "string" },
                title: { type: "string" },
                detail: { type: "string" }
              }
            }
          }
        }
      }
    });
    setAiReport(res);
    setLoadingAI(false);
  };

  const pieData = [
    { name: 'Win', value: wins },
    { name: 'Loss', value: losses },
    { name: 'BE', value: bes },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Rapports & Analyses
          </h1>
          <p className="text-xs text-muted-foreground">Statistiques · Rapport IA · Journal des performances</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-8 w-28 text-xs bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[{v:'day',l:'Aujourd\'hui'},{v:'week',l:'Semaine'},{v:'month',l:'Mois'},{v:'all',l:'Tout'}].map(p =>
                <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={phase} onValueChange={setPhase}>
            <SelectTrigger className="h-8 w-28 text-xs bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[{v:'all',l:'Toutes phases'},{v:'backtest_local',l:'Backtest'},{v:'demo',l:'Demo'},{v:'live',l:'Live'}].map(p =>
                <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Win Rate" value={`${winRate}%`} color={parseFloat(winRate) >= 60 ? 'text-green-400' : 'text-red-400'} icon={Target} />
        <StatCard label="P&L Net" value={`${totalPnl >= 0 ? '+' : ''}${totalPnl}€`} color={totalPnl >= 0 ? 'text-green-400' : 'text-red-400'} icon={TrendingUp} />
        <StatCard label="Avg R:R" value={`${avgRR}:1`} color="text-blue-400" />
        <StatCard label="Profit Factor" value={profitFactor} color="text-yellow-400" />
        <StatCard label="Best / Worst" value={`+${bestTrade}€`} sub={`${worstTrade}€`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Win/Loss Pie */}
        <div className="card-trading">
          <span className="text-sm font-semibold block mb-3">Répartition W/L/BE</span>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={10}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', borderRadius: 6, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Setup performance */}
        <div className="card-trading">
          <span className="text-sm font-semibold block mb-3">Performance par Setup</span>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={setupStats} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} width={70} />
              <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', borderRadius: 6, fontSize: 11 }} />
              <Bar dataKey="wins" fill="#00FF88" radius={[0, 3, 3, 0]} name="Wins" />
              <Bar dataKey="losses" fill="#EF4444" radius={[0, 3, 3, 0]} name="Losses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Session PnL */}
        <div className="card-trading">
          <span className="text-sm font-semibold block mb-3">P&L par Session</span>
          <div className="space-y-2 mt-4">
            {sessionStats.map(s => (
              <div key={s.session} className="flex items-center gap-2 text-xs">
                <span className="w-24 text-muted-foreground">{s.session}</span>
                <div className="flex-1 progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${Math.abs(s.pnl) / 15}%`, background: s.pnl >= 0 ? '#00FF88' : '#EF4444' }} />
                </div>
                <span className={`font-mono w-16 text-right font-bold ${s.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{s.pnl >= 0 ? '+' : ''}{s.pnl}€</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Report */}
      <div className="card-trading">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">Rapport IA — Analyse des Performances</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1 text-xs">
              <Download className="w-3 h-3" />CSV
            </Button>
            <Button size="sm" onClick={getAIReport} disabled={loadingAI} className="gap-2 text-xs">
              <RefreshCw className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />
              {loadingAI ? 'Génération...' : 'Générer Rapport'}
            </Button>
          </div>
        </div>
        {aiReport ? (
          <div className="space-y-4">
            {/* Score + verdict */}
            <div className="flex items-center gap-4 p-3 bg-secondary/30 rounded-lg">
              <div className="text-center">
                <div className={`text-3xl font-bold font-mono ${aiReport.score >= 7 ? 'text-primary' : aiReport.score >= 5 ? 'text-yellow-400' : 'text-destructive'}`}>{aiReport.score}<span className="text-base text-muted-foreground">/10</span></div>
                <div className="text-[10px] text-muted-foreground">Score</div>
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold mb-1">Verdict</div>
                <div className="text-xs text-muted-foreground">{aiReport.verdict}</div>
              </div>
            </div>
            {/* Forces */}
            {aiReport.forces?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-primary mb-2">✅ Points forts</div>
                <div className="space-y-1">
                  {aiReport.forces.map((f, i) => (
                    <div key={i} className="flex gap-2 text-xs p-2 bg-primary/5 rounded border border-primary/20">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Suggestions */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Suggestions ({aiReport.suggestions?.length})</div>
              <div className="space-y-2">
                {aiReport.suggestions?.map((s, i) => {
                  const priorityColor = s.priority === 'haute' ? 'border-destructive/40 bg-destructive/5' : s.priority === 'moyenne' ? 'border-yellow-400/40 bg-yellow-400/5' : 'border-primary/30 bg-primary/5';
                  const badgeCls = s.priority === 'haute' ? 'bg-destructive/20 text-destructive' : s.priority === 'moyenne' ? 'bg-yellow-400/20 text-yellow-400' : 'bg-primary/20 text-primary';
                  const Icon = s.priority === 'haute' ? AlertTriangle : s.priority === 'moyenne' ? Minus : CheckCircle2;
                  return (
                    <div key={i} className={`flex gap-3 p-3 rounded-lg border ${priorityColor}`}>
                      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${s.priority === 'haute' ? 'text-destructive' : s.priority === 'moyenne' ? 'text-yellow-400' : 'text-primary'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold">{s.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badgeCls}`}>{s.category}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{s.detail}</div>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded self-start flex-shrink-0 ${badgeCls}`}>{s.priority}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground text-center py-6">
            Cliquez sur "Générer Rapport" pour obtenir une analyse IA complète avec score, forces et suggestions actionnables
          </div>
        )}
      </div>
    </div>
  );
}