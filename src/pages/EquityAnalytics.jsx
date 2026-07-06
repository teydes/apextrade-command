import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Activity, Brain, Maximize2, AlertTriangle, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip, ReferenceLine, Cell } from 'recharts';
import { toast } from 'sonner';

export default function EquityAnalytics() {
  const [period, setPeriod] = useState(100);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const { data: trades = [] } = useQuery({ queryKey: ['equity-trades'], queryFn: () => base44.entities.Trade.list('-entry_time', 500) });
  const closedTrades = useMemo(() => trades.filter(t => t.status === 'closed').slice(0, period).reverse(), [trades, period]);

  // Build equity curve
  const equityData = useMemo(() => {
    let balance = 10000;
    let peak = balance;
    const data = [];
    closedTrades.forEach((t, i) => {
      balance += t.pnl || 0;
      if (balance > peak) peak = balance;
      const dd = peak > 0 ? ((peak - balance) / peak) * 100 : 0;
      data.push({ trade: i + 1, equity: Math.round(balance), drawdown: Math.round(dd * 10) / 10, pnl: t.pnl || 0, date: t.entry_time?.slice(5, 10) });
    });
    return data;
  }, [closedTrades]);

  // Advanced metrics
  const metrics = useMemo(() => {
    if (closedTrades.length === 0) return {};
    const wins = closedTrades.filter(t => t.result === 'win');
    const losses = closedTrades.filter(t => t.result === 'loss');
    const pnls = closedTrades.map(t => t.pnl || 0);
    const grossProfit = wins.reduce((s, t) => s + (t.pnl || 0), 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.pnl || 0), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
    const expectancy = pnls.reduce((s, p) => s + p, 0) / pnls.length;
    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
    const winRate = (wins.length / closedTrades.length) * 100;
    const lossRate = (losses.length / closedTrades.length) * 100;
    const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : 0;

    // Max drawdown
    let peak = 10000;
    let maxDD = 0;
    let maxDDDuration = 0;
    let currentDDDuration = 0;
    let balance = 10000;
    closedTrades.forEach(t => {
      balance += t.pnl || 0;
      if (balance > peak) { peak = balance; currentDDDuration = 0; }
      else { currentDDDuration++; if (currentDDDuration > maxDDDuration) maxDDDuration = currentDDDuration; }
      const dd = peak > 0 ? ((peak - balance) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
    });

    // Streaks
    let maxWinStreak = 0, maxLossStreak = 0, curWinS = 0, curLossS = 0;
    closedTrades.forEach(t => {
      if (t.result === 'win') { curWinS++; curLossS = 0; if (curWinS > maxWinStreak) maxWinStreak = curWinS; }
      else if (t.result === 'loss') { curLossS++; curWinS = 0; if (curLossS > maxLossStreak) maxLossStreak = curLossS; }
    });

    // Sharpe-like ratio (simplified)
    const mean = pnls.reduce((s, p) => s + p, 0) / pnls.length;
    const stdDev = Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / pnls.length);
    const sharpe = stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0;

    // Recovery factor
    const finalBalance = 10000 + pnls.reduce((s, p) => s + p, 0);
    const totalProfit = finalBalance - 10000;
    const recoveryFactor = maxDD > 0 ? totalProfit / (maxDD * 10000 / 100) : 0;

    // R multiple (if risk_reward available)
    const rMultiples = closedTrades.filter(t => t.risk_reward).map(t => t.result === 'win' ? t.risk_reward : -1);
    const avgR = rMultiples.length > 0 ? rMultiples.reduce((s, r) => s + r, 0) / rMultiples.length : 0;

    return { profitFactor, expectancy, avgWin, avgLoss, winRate, lossRate, payoffRatio, maxDD, maxDDDuration, maxWinStreak, maxLossStreak, sharpe, recoveryFactor, avgR, totalProfit, finalBalance, totalTrades: closedTrades.length };
  }, [closedTrades]);

  // PnL distribution
  const pnlDist = useMemo(() => {
    const buckets = {};
    closedTrades.forEach(t => {
      const p = t.pnl || 0;
      const bucket = p > 0 ? `+${Math.floor(p / 50) * 50}-${Math.floor(p / 50) * 50 + 50}` : `${Math.ceil(p / 50) * 50 - 50}-${Math.ceil(p / 50) * 50}`;
      buckets[bucket] = (buckets[bucket] || 0) + 1;
    });
    return Object.entries(buckets).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])).map(([range, count]) => ({ range, count }));
  }, [closedTrades]);

  const getAIAnalysis = async () => {
    if (closedTrades.length < 10) { toast.error('Min 10 trades'); return; }
    setLoadingAI(true);
    const m = metrics;
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyste quantitatif trading. Analyse ces métriques sur ${m.totalTrades} trades:
PF: ${m.profitFactor.toFixed(2)} | WR: ${m.winRate.toFixed(1)}% | Expectancy: ${m.expectancy.toFixed(1)}€ | Sharpe: ${m.sharpe.toFixed(2)} | MaxDD: ${m.maxDD.toFixed(1)}% | Recovery: ${m.recoveryFactor.toFixed(2)} | Avg R: ${m.avgR.toFixed(2)} | Max Loss Streak: ${m.maxLossStreak} | Payoff: ${m.payoffRatio.toFixed(2)}

Retourne JSON: {"grade":"A-F","overall_health":"<santé globale>","strengths":["<force1>","<force2>"],"weaknesses":["<faiblesse1>"],"risk_assessment":"<évaluation risque>","optimization":"<optimisation suggérée>","next_steps":"<prochaines étapes>"}`,
      response_json_schema: { type: "object", properties: { grade: { type: "string" }, overall_health: { type: "string" }, strengths: { type: "array", items: { type: "string" } }, weaknesses: { type: "array", items: { type: "string" } }, risk_assessment: { type: "string" }, optimization: { type: "string" }, next_steps: { type: "string" } } }
    });
    setAiAnalysis(res); setLoadingAI(false);
  };

  if (closedTrades.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold flex items-center gap-2"><Activity className="w-5 h-5 text-blue-400" />Equity Analytics</h1>
        <div className="card-trading text-center py-16 text-xs text-muted-foreground"><Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />Aucun trade clôturé à analyser</div>
      </div>
    );
  }

  const gradeColor = { A: 'text-primary', B: 'text-green-400', C: 'text-yellow-400', D: 'text-orange-400', F: 'text-destructive' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Activity className="w-5 h-5 text-blue-400" />Equity Analytics</h1>
          <p className="text-xs text-muted-foreground">Profit Factor · Sharpe · Drawdown · Recovery · {metrics.totalTrades} trades analysés</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(period)} onValueChange={v => setPeriod(+v)}><SelectTrigger className="h-8 bg-secondary text-xs w-28"><SelectValue /></SelectTrigger><SelectContent>{[50, 100, 200, 500].map(p => <SelectItem key={p} value={String(p)}>{p} trades</SelectItem>)}</SelectContent></Select>
          <Button size="sm" onClick={getAIAnalysis} disabled={loadingAI} className="gap-1 text-xs"><Brain className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />Analyse IA</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="card-trading text-center border-primary/20"><TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" /><div className="text-xl font-bold font-mono text-primary">{metrics.profitFactor.toFixed(2)}</div><div className="text-[10px] text-muted-foreground">Profit Factor</div></div>
        <div className="card-trading text-center"><Award className="w-4 h-4 text-yellow-400 mx-auto mb-1" /><div className="text-xl font-bold font-mono text-yellow-400">{metrics.winRate.toFixed(0)}%</div><div className="text-[10px] text-muted-foreground">Win Rate</div></div>
        <div className="card-trading text-center"><Activity className="w-4 h-4 text-blue-400 mx-auto mb-1" /><div className="text-xl font-bold font-mono text-blue-400">{metrics.sharpe.toFixed(2)}</div><div className="text-[10px] text-muted-foreground">Sharpe Ratio</div></div>
        <div className={`card-trading text-center ${metrics.maxDD > 15 ? 'border-destructive/30' : ''}`}><TrendingDown className={`w-4 h-4 mx-auto mb-1 ${metrics.maxDD > 15 ? 'text-destructive' : 'text-orange-400'}`} /><div className={`text-xl font-bold font-mono ${metrics.maxDD > 15 ? 'text-destructive' : 'text-orange-400'}`}>{metrics.maxDD.toFixed(1)}%</div><div className="text-[10px] text-muted-foreground">Max Drawdown</div></div>
        <div className="card-trading text-center border-primary/20"><Maximize2 className="w-4 h-4 text-primary mx-auto mb-1" /><div className="text-xl font-bold font-mono text-primary">{metrics.recoveryFactor.toFixed(2)}</div><div className="text-[10px] text-muted-foreground">Recovery Factor</div></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{ l: 'Expectancy', v: `${metrics.expectancy >= 0 ? '+' : ''}${metrics.expectancy.toFixed(1)}€`, c: metrics.expectancy > 0 ? 'text-primary' : 'text-destructive' },
          { l: 'Avg Win', v: `+${metrics.avgWin.toFixed(0)}€`, c: 'text-primary' },
          { l: 'Avg Loss', v: `-${metrics.avgLoss.toFixed(0)}€`, c: 'text-destructive' },
          { l: 'Payoff Ratio', v: metrics.payoffRatio.toFixed(2), c: 'text-blue-400' },
          { l: 'Max Win Streak', v: metrics.maxWinStreak, c: 'text-primary' },
          { l: 'Max Loss Streak', v: metrics.maxLossStreak, c: 'text-destructive' },
          { l: 'Avg R Multiple', v: `${metrics.avgR >= 0 ? '+' : ''}${metrics.avgR.toFixed(2)}R`, c: metrics.avgR > 0 ? 'text-primary' : 'text-destructive' },
          { l: 'DD Duration', v: `${metrics.maxDDDuration} trades`, c: 'text-orange-400' },
        ].map(s => (
          <div key={s.l} className="card-trading text-center"><div className={`text-sm font-bold font-mono ${s.c}`}>{s.v}</div><div className="text-[10px] text-muted-foreground">{s.l}</div></div>
        ))}
      </div>

      {/* Equity Curve */}
      <div className="card-trading">
        <div className="text-sm font-semibold mb-2">Courbe d'équité (Capital de base: 10 000€ → {metrics.finalBalance.toFixed(0)}€)</div>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={equityData}>
            <defs><linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00FF88" stopOpacity={0.3} /><stop offset="95%" stopColor="#00FF88" stopOpacity={0} /></linearGradient></defs>
            <XAxis dataKey="trade" tick={{ fontSize: 9, fill: '#6B7280' }} />
            <YAxis tick={{ fontSize: 9, fill: '#6B7280' }} />
            <RTooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)', fontSize: 11 }} />
            <ReferenceLine y={10000} stroke="#6B7280" strokeDasharray="3 3" />
            <Area type="monotone" dataKey="equity" stroke="#00FF88" strokeWidth={2} fill="url(#eqGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Drawdown Chart */}
      <div className="card-trading">
        <div className="text-sm font-semibold mb-2">Drawdown (%)</div>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={equityData}>
            <defs><linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} /><stop offset="95%" stopColor="#EF4444" stopOpacity={0} /></linearGradient></defs>
            <XAxis dataKey="trade" tick={{ fontSize: 9, fill: '#6B7280' }} />
            <YAxis tick={{ fontSize: 9, fill: '#6B7280' }} />
            <RTooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)', fontSize: 11 }} />
            <Area type="monotone" dataKey="drawdown" stroke="#EF4444" strokeWidth={1.5} fill="url(#ddGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* PnL Distribution */}
      <div className="card-trading">
        <div className="text-sm font-semibold mb-2">Distribution des PnL</div>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={pnlDist}>
            <XAxis dataKey="range" tick={{ fontSize: 8, fill: '#6B7280' }} />
            <YAxis tick={{ fontSize: 9, fill: '#6B7280' }} />
            <RTooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)', fontSize: 11 }} />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {pnlDist.map((d, i) => <Cell key={i} fill={d.range.startsWith('+') ? '#00FF8866' : '#EF444466'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {aiAnalysis && (
        <div className="card-trading border border-blue-400/30 bg-blue-400/5 space-y-3">
          <div className="flex items-center gap-3"><Brain className="w-4 h-4 text-blue-400" /><span className="text-sm font-semibold">Analyse Quantitative IA</span><span className={`ml-auto text-2xl font-bold font-mono ${gradeColor[aiAnalysis.grade] || 'text-foreground'}`}>{aiAnalysis.grade}</span></div>
          <p className="text-xs text-muted-foreground italic">{aiAnalysis.overall_health}</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><div className="text-[10px] text-primary font-semibold uppercase mb-1">✅ Forces</div>{aiAnalysis.strengths?.map((s, i) => <div key={i} className="text-muted-foreground">• {s}</div>)}</div>
            <div><div className="text-[10px] text-destructive font-semibold uppercase mb-1">⚠️ Faiblesses</div>{aiAnalysis.weaknesses?.map((w, i) => <div key={i} className="text-muted-foreground">• {w}</div>)}</div>
          </div>
          <div className="p-2 bg-yellow-400/5 border border-yellow-400/20 rounded text-xs"><span className="text-yellow-400 font-semibold">Risque: </span><span className="text-muted-foreground">{aiAnalysis.risk_assessment}</span></div>
          <div className="p-2 bg-primary/5 border border-primary/20 rounded text-xs"><span className="text-primary font-semibold">Optimisation: </span><span className="text-muted-foreground">{aiAnalysis.optimization}</span></div>
          <div className="p-2 bg-blue-400/5 border border-blue-400/20 rounded text-xs"><span className="text-blue-400 font-semibold">Prochaines étapes: </span><span className="text-muted-foreground">{aiAnalysis.next_steps}</span></div>
        </div>
      )}
    </div>
  );
}