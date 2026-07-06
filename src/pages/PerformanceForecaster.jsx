import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Brain, TrendingUp, TrendingDown, Target, Calendar, Activity, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip, ReferenceLine } from 'recharts';
import { toast } from 'sonner';

export default function PerformanceForecaster() {
  const [horizon, setHorizon] = useState(60);
  const [scenarios, setScenarios] = useState({ conservative: true, base: true, aggressive: false });
  const [forecast, setForecast] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const { data: trades = [] } = useQuery({ queryKey: ['forecast-trades'], queryFn: () => base44.entities.Trade.list('-entry_time', 500) });

  const stats = useMemo(() => {
    const closed = trades.filter(t => t.status === 'closed');
    if (closed.length < 5) return null;
    const wins = closed.filter(t => t.result === 'win');
    const losses = closed.filter(t => t.result === 'loss');
    const totalPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0);
    const winRate = wins.length / closed.length;
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.pnl || 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + (t.pnl || 0), 0) / losses.length) : 0;
    const expectancy = totalPnl / closed.length;
    const avgTradesPerDay = closed.length / Math.max(1, Math.ceil((Date.now() - new Date(closed[closed.length - 1].entry_time || Date.now()).getTime()) / 86400000));
    const last30 = closed.slice(0, 30);
    const recentPnl = last30.reduce((s, t) => s + (t.pnl || 0), 0);
    const recentWR = last30.filter(t => t.result === 'win').length / last30.length;
    return { winRate: winRate * 100, avgWin, avgLoss, expectancy, totalPnl, avgTradesPerDay, recentPnl, recentWR: recentWR * 100, totalTrades: closed.length };
  }, [trades]);

  // Forecast scenarios
  const forecastData = useMemo(() => {
    if (!stats) return [];
    const data = [];
    let balCons = 10000, balBase = 10000, balAggr = 10000;
    const tradesPerDay = Math.max(0.5, stats.avgTradesPerDay);
    const tradesPerStep = tradesPerDay; // per day

    for (let d = 0; d <= horizon; d++) {
      // Conservative: 70% of base expectancy
      balCons += stats.expectancy * 0.7 * tradesPerStep;
      // Base: 100%
      balBase += stats.expectancy * tradesPerStep;
      // Aggressive: 130% (assuming increased risk)
      balAggr += stats.expectancy * 1.3 * tradesPerStep;

      // Add some variance
      const variance = (Math.random() - 0.5) * stats.avgLoss * 0.5;
      balCons = Math.max(1000, balCons + variance * 0.5);
      balBase = Math.max(1000, balBase + variance);
      balAggr = Math.max(1000, balAggr + variance * 1.5);

      data.push({ day: d, conservative: Math.round(balCons), base: Math.round(balBase), aggressive: Math.round(balAggr) });
    }
    return data;
  }, [stats, horizon]);

  const milestones = forecastData.filter((_, i) => i % Math.max(1, Math.floor(horizon / 5)) === 0);

  const getAIForecast = async () => {
    if (!stats) { toast.error('Pas assez de données'); return; }
    setLoadingAI(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyste performance trading. Prévois les ${horizon} prochains jours.
Stats actuelles (${stats.totalTrades} trades):
WR: ${stats.winRate.toFixed(1)}% | Avg Win: ${stats.avgWin.toFixed(0)}€ | Avg Loss: ${stats.avgLoss.toFixed(0)}€
Expectancy: ${stats.expectancy.toFixed(1)}€ | Trades/jour: ${stats.avgTradesPerDay.toFixed(1)}
PnL total: ${stats.totalPnl.toFixed(0)}€ | 30 derniers jours PnL: ${stats.recentPnl.toFixed(0)}€ (WR ${stats.recentWR.toFixed(0)}%)

Retourne JSON: {"projection":"<projection globale>","30_day":"<prévision 30j>","90_day":"<prévision 90j>","key_risks":["<risque1>","<risque2>"],"opportunities":["<opp1>"],"milestone":"<prochain jalon>","recommendation":"<recommandation>","confidence":<0-100>}`,
      response_json_schema: { type: "object", properties: { projection: { type: "string" }, "30_day": { type: "string" }, "90_day": { type: "string" }, key_risks: { type: "array", items: { type: "string" } }, opportunities: { type: "array", items: { type: "string" } }, milestone: { type: "string" }, recommendation: { type: "string" }, confidence: { type: "number" } } }
    });
    setForecast(res); setLoadingAI(false);
  };

  if (!stats) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-purple-400" />Performance Forecaster</h1>
        <div className="card-trading text-center py-16 text-xs text-muted-foreground"><Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />Minimum 5 trades clôturés nécessaires</div>
      </div>
    );
  }

  const finalCons = forecastData[forecastData.length - 1]?.conservative || 0;
  const finalBase = forecastData[forecastData.length - 1]?.base || 0;
  const finalAggr = forecastData[forecastData.length - 1]?.aggressive || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-purple-400" />Performance Forecaster</h1>
          <p className="text-xs text-muted-foreground">Projections {horizon} jours · 3 scénarios · Based on {stats.totalTrades} trades · EV {stats.expectancy.toFixed(1)}€/trade</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(horizon)} onValueChange={v => setHorizon(+v)}><SelectTrigger className="h-8 bg-secondary text-xs w-32"><SelectValue /></SelectTrigger><SelectContent>{[30, 60, 90, 180].map(h => <SelectItem key={h} value={String(h)}>{h} jours</SelectItem>)}</SelectContent></Select>
          <Button size="sm" onClick={getAIForecast} disabled={loadingAI} className="gap-1 text-xs"><Brain className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />Forecast IA</Button>
        </div>
      </div>

      {/* Current stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[{ l: 'Win Rate', v: `${stats.winRate.toFixed(0)}%`, c: 'text-primary' },
          { l: 'Avg Win', v: `+${stats.avgWin.toFixed(0)}€`, c: 'text-primary' },
          { l: 'Avg Loss', v: `-${stats.avgLoss.toFixed(0)}€`, c: 'text-destructive' },
          { l: 'Expectancy', v: `${stats.expectancy >= 0 ? '+' : ''}${stats.expectancy.toFixed(1)}€`, c: stats.expectancy > 0 ? 'text-primary' : 'text-destructive' },
          { l: 'Trades/Jour', v: stats.avgTradesPerDay.toFixed(1), c: 'text-blue-400' }
        ].map(s => (
          <div key={s.l} className="card-trading text-center"><div className={`text-lg font-bold font-mono ${s.c}`}>{s.v}</div><div className="text-[10px] text-muted-foreground">{s.l}</div></div>
        ))}
      </div>

      {/* Forecast chart */}
      <div className="card-trading">
        <div className="text-sm font-semibold mb-2">Projection de Capital — {horizon} jours (base 10 000€)</div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={forecastData}>
            <defs>
              <linearGradient id="consGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} /><stop offset="95%" stopColor="#F59E0B" stopOpacity={0} /></linearGradient>
              <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00FF88" stopOpacity={0.3} /><stop offset="95%" stopColor="#00FF88" stopOpacity={0} /></linearGradient>
              <linearGradient id="aggrGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#A855F7" stopOpacity={0.3} /><stop offset="95%" stopColor="#A855F7" stopOpacity={0} /></linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#6B7280' }} />
            <YAxis tick={{ fontSize: 9, fill: '#6B7280' }} domain={['auto', 'auto']} />
            <RTooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)', fontSize: 11 }} />
            <ReferenceLine y={10000} stroke="#6B7280" strokeDasharray="3 3" />
            {scenarios.conservative && <Area type="monotone" dataKey="conservative" stroke="#F59E0B" strokeWidth={1.5} fill="url(#consGrad)" name="Conservateur" />}
            {scenarios.base && <Area type="monotone" dataKey="base" stroke="#00FF88" strokeWidth={2} fill="url(#baseGrad)" name="Base" />}
            {scenarios.aggressive && <Area type="monotone" dataKey="aggressive" stroke="#A855F7" strokeWidth={1.5} fill="url(#aggrGrad)" name="Agressif" />}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Scenarios toggle + results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { key: 'conservative', label: 'Conservateur (70% EV)', color: 'text-yellow-400', final: finalCons, pct: ((finalCons - 10000) / 10000 * 100) },
          { key: 'base', label: 'Base (100% EV)', color: 'text-primary', final: finalBase, pct: ((finalBase - 10000) / 10000 * 100) },
          { key: 'aggressive', label: 'Agressif (130% EV)', color: 'text-purple-400', final: finalAggr, pct: ((finalAggr - 10000) / 10000 * 100) },
        ].map(s => (
          <div key={s.key} className={`card-trading border ${scenarios[s.key] ? 'border-border' : 'border-border opacity-50'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${s.color}`}>{s.label}</span>
              <input type="checkbox" checked={scenarios[s.key]} onChange={e => setScenarios({ ...scenarios, [s.key]: e.target.checked })} className="accent-primary" />
            </div>
            <div className={`text-xl font-bold font-mono mt-1 ${s.pct >= 0 ? 'text-primary' : 'text-destructive'}`}>{s.final.toFixed(0)}€</div>
            <div className={`text-xs ${s.pct >= 0 ? 'text-primary' : 'text-destructive'}`}>{s.pct >= 0 ? '+' : ''}{s.pct.toFixed(1)}% en {horizon}j</div>
          </div>
        ))}
      </div>

      {/* Milestones */}
      <div className="card-trading">
        <div className="text-sm font-semibold mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-yellow-400" />Jalons projetés</div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {milestones.map((m, i) => (
            <div key={i} className="flex items-center gap-2 flex-shrink-0">
              <div className="p-2 rounded bg-secondary/50 text-center min-w-80">
                <div className="text-[10px] text-muted-foreground">Jour {m.day}</div>
                <div className="font-mono font-bold text-primary">{m.base.toFixed(0)}€</div>
                <div className="text-[9px] text-muted-foreground">{((m.base - 10000) / 10000 * 100).toFixed(0)}%</div>
              </div>
              {i < milestones.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {forecast && (
        <div className="card-trading border border-purple-400/30 bg-purple-400/5 space-y-3">
          <div className="flex items-center gap-3"><Brain className="w-4 h-4 text-purple-400" /><span className="text-sm font-semibold">Forecast IA</span><span className="ml-auto text-lg font-bold font-mono text-purple-400">{forecast.confidence}% confidence</span></div>
          <p className="text-xs text-muted-foreground italic">{forecast.projection}</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2 bg-secondary/50 rounded"><div className="text-muted-foreground">30 jours</div><div className="text-foreground">{forecast["30_day"]}</div></div>
            <div className="p-2 bg-secondary/50 rounded"><div className="text-muted-foreground">90 jours</div><div className="text-foreground">{forecast["90_day"]}</div></div>
          </div>
          <div className="p-2 bg-yellow-400/5 border border-yellow-400/20 rounded text-xs"><span className="text-yellow-400 font-semibold">🎯 Prochain jalon: </span><span className="text-muted-foreground">{forecast.milestone}</span></div>
          {forecast.key_risks?.length > 0 && <div className="space-y-1">{forecast.key_risks.map((r, i) => <div key={i} className="text-xs text-destructive pl-2 border-l-2 border-destructive/50">⚠️ {r}</div>)}</div>}
          {forecast.opportunities?.length > 0 && <div className="space-y-1">{forecast.opportunities.map((o, i) => <div key={i} className="text-xs text-primary pl-2 border-l-2 border-primary/50">✓ {o}</div>)}</div>}
          <div className="p-2 bg-primary/5 border border-primary/20 rounded text-xs"><span className="text-primary font-semibold">💡 </span><span className="text-muted-foreground">{forecast.recommendation}</span></div>
        </div>
      )}
    </div>
  );
}