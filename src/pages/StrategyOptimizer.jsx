import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Brain, Crosshair, TrendingUp, TrendingDown, Activity, Zap, GitBranch, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip, ReferenceLine, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { toast } from 'sonner';

export default function StrategyOptimizer() {
  const [strategy, setStrategy] = useState('ICT/SMC');
  const [aiAdvice, setAiAdvice] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const { data: trades = [] } = useQuery({ queryKey: ['optimizer-trades'], queryFn: () => base44.entities.Trade.list('-entry_time', 500) });

  const strategies = ['ICT/SMC', 'AMD/IFVG', 'Footprint', 'Order Book', 'Pullback', 'Breakout', 'Range', 'Trend Following', 'Mean Reversion', 'Scalping', 'Mixed'];

  const analysis = useMemo(() => {
    const stratTrades = trades.filter(t => t.strategy === strategy && t.status === 'closed');
    const allClosed = trades.filter(t => t.status === 'closed');

    // Timeframe breakdown
    const tfStats = {};
    stratTrades.forEach(t => {
      const tf = t.timeframe || 'unknown';
      if (!tfStats[tf]) tfStats[tf] = { wins: 0, total: 0, pnl: 0 };
      tfStats[tf].total++;
      tfStats[tf].pnl += t.pnl || 0;
      if (t.result === 'win') tfStats[tf].wins++;
    });
    const tfData = Object.entries(tfStats).map(([tf, s]) => ({ tf, wr: s.total > 0 ? Math.round(s.wins / s.total * 100) : 0, pnl: Math.round(s.pnl), total: s.total }));

    // Session breakdown
    const sessStats = {};
    stratTrades.forEach(t => {
      const s = t.session || 'unknown';
      if (!sessStats[s]) sessStats[s] = { wins: 0, total: 0, pnl: 0 };
      sessStats[s].total++;
      sessStats[s].pnl += t.pnl || 0;
      if (t.result === 'win') sessStats[s].wins++;
    });
    const sessData = Object.entries(sessStats).map(([s, st]) => ({ session: s, wr: st.total > 0 ? Math.round(st.wins / st.total * 100) : 0, pnl: Math.round(st.pnl), total: st.total }));

    // Pattern breakdown
    const patStats = {};
    stratTrades.forEach(t => {
      if (!t.pattern) return;
      const p = t.pattern;
      if (!patStats[p]) patStats[p] = { wins: 0, total: 0, pnl: 0 };
      patStats[p].total++;
      patStats[p].pnl += t.pnl || 0;
      if (t.result === 'win') patStats[p].wins++;
    });
    const patData = Object.entries(patStats).map(([p, s]) => ({ pattern: p, wr: s.total > 0 ? Math.round(s.wins / s.total * 100) : 0, pnl: Math.round(s.pnl), total: s.total })).sort((a, b) => b.pnl - a.pnl);

    // Direction analysis
    const longTrades = stratTrades.filter(t => t.direction === 'LONG');
    const shortTrades = stratTrades.filter(t => t.direction === 'SHORT');
    const longWR = longTrades.length > 0 ? Math.round(longTrades.filter(t => t.result === 'win').length / longTrades.length * 100) : 0;
    const shortWR = shortTrades.length > 0 ? Math.round(shortTrades.filter(t => t.result === 'win').length / shortTrades.length * 100) : 0;
    const longPnl = longTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    const shortPnl = shortTrades.reduce((s, t) => s + (t.pnl || 0), 0);

    // R:R analysis
    const rrTrades = stratTrades.filter(t => t.risk_reward);
    const avgRR = rrTrades.length > 0 ? rrTrades.reduce((s, t) => s + t.risk_reward, 0) / rrTrades.length : 0;

    // Overall metrics
    const totalPnl = stratTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    const wins = stratTrades.filter(t => t.result === 'win').length;
    const winRate = stratTrades.length > 0 ? Math.round(wins / stratTrades.length * 100) : 0;
    const avgPnl = stratTrades.length > 0 ? totalPnl / stratTrades.length : 0;
    const profitFactor = (() => {
      const grossProfit = stratTrades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
      const grossLoss = Math.abs(stratTrades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
      return grossLoss > 0 ? grossProfit / grossLoss : 0;
    })();

    // Compare with other strategies
    const allStratStats = strategies.map(s => {
      const st = allClosed.filter(t => t.strategy === s);
      const pnl = st.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const wr = st.length > 0 ? Math.round(st.filter(t => t.result === 'win').length / st.length * 100) : 0;
      return { strategy: s, pnl: Math.round(pnl), wr, total: st.length };
    }).filter(s => s.total > 0).sort((a, b) => b.pnl - a.pnl);

    // Radar data (normalized 0-100)
    const radarData = [
      { metric: 'Win Rate', value: Math.min(winRate, 100) },
      { metric: 'R:R', value: Math.min(avgRR * 33, 100) },
      { metric: 'Volume', value: Math.min(stratTrades.length / 10, 100) },
      { metric: 'Profit Factor', value: Math.min(profitFactor * 33, 100) },
      { metric: 'Long WR', value: longWR },
      { metric: 'Short WR', value: shortWR },
    ];

    return { stratTrades, tfData, sessData, patData, longWR, shortWR, longPnl, shortPnl, avgRR, totalPnl, winRate, avgPnl, profitFactor, allStratStats, radarData, count: stratTrades.length };
  }, [trades, strategy]);

  const getAIAdvice = async () => {
    if (analysis.count < 5) { toast.error(`Seulement ${analysis.count} trades pour ${strategy}`); return; }
    setLoadingAI(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Expert optimisation stratégie trading. Analyse la stratégie "${strategy}" (${analysis.count} trades).
WR: ${analysis.winRate}% | PF: ${analysis.profitFactor.toFixed(2)} | Avg PnL: ${analysis.avgPnl.toFixed(1)}€ | Total: ${analysis.totalPnl.toFixed(0)}€ | Avg R:R: ${analysis.avgRR.toFixed(2)}
Long WR: ${analysis.longWR}% (${analysis.longPnl.toFixed(0)}€) | Short WR: ${analysis.shortWR}% (${analysis.shortPnl.toFixed(0)}€)
Meilleur TF: ${analysis.tfData.sort((a, b) => b.pnl - a.pnl)[0]?.tf || 'N/A'}
Meilleure session: ${analysis.sessData.sort((a, b) => b.pnl - a.pnl)[0]?.session || 'N/A'}
Meilleur pattern: ${analysis.patData[0]?.pattern || 'N/A'} (WR ${analysis.patData[0]?.wr}%, ${analysis.patData[0]?.pnl}€)

Retourne JSON: {"grade":"A-F","strengths":["<force1>","<force2>"],"weaknesses":["<faiblesse1>"],"optimizations":["<opt1>","<opt2>"],"focus":"<sur quoi se concentrer>","drop":"<ce qu'il faut abandonner>","next_step":"<prochaine étape>"}`,
      response_json_schema: { type: "object", properties: { grade: { type: "string" }, strengths: { type: "array", items: { type: "string" } }, weaknesses: { type: "array", items: { type: "string" } }, optimizations: { type: "array", items: { type: "string" } }, focus: { type: "string" }, drop: { type: "string" }, next_step: { type: "string" } } }
    });
    setAiAdvice(res); setLoadingAI(false);
  };

  const gradeColor = { A: 'text-primary', B: 'text-green-400', C: 'text-yellow-400', D: 'text-orange-400', F: 'text-destructive' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><GitBranch className="w-5 h-5 text-green-400" />Strategy Optimizer</h1>
          <p className="text-xs text-muted-foreground">Décomposition par TF/Session/Pattern · Radar de performance · {analysis.count} trades</p>
        </div>
        <div className="flex gap-2">
          <Select value={strategy} onValueChange={setStrategy}><SelectTrigger className="h-8 bg-secondary text-xs w-36"><SelectValue /></SelectTrigger><SelectContent>{strategies.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          <Button size="sm" onClick={getAIAdvice} disabled={loadingAI} className="gap-1 text-xs"><Brain className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />Optimisation IA</Button>
        </div>
      </div>

      {analysis.count === 0 ? (
        <div className="card-trading text-center py-16 text-xs text-muted-foreground"><Crosshair className="w-12 h-12 mx-auto mb-3 opacity-20" />Aucun trade trouvé pour la stratégie "{strategy}"</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {[{ l: 'Win Rate', v: `${analysis.winRate}%`, c: analysis.winRate >= 60 ? 'text-primary' : 'text-yellow-400' },
              { l: 'Profit Factor', v: analysis.profitFactor.toFixed(2), c: analysis.profitFactor >= 1.5 ? 'text-primary' : 'text-destructive' },
              { l: 'Total PnL', v: `${analysis.totalPnl > 0 ? '+' : ''}${analysis.totalPnl.toFixed(0)}€`, c: analysis.totalPnl > 0 ? 'text-primary' : 'text-destructive' },
              { l: 'Avg PnL', v: `${analysis.avgPnl > 0 ? '+' : ''}${analysis.avgPnl.toFixed(1)}€`, c: analysis.avgPnl > 0 ? 'text-primary' : 'text-destructive' },
              { l: 'Long WR', v: `${analysis.longWR}%`, c: 'text-green-400' },
              { l: 'Short WR', v: `${analysis.shortWR}%`, c: 'text-red-400' },
            ].map(s => (
              <div key={s.l} className="card-trading text-center"><div className={`text-lg font-bold font-mono ${s.c}`}>{s.v}</div><div className="text-[10px] text-muted-foreground">{s.l}</div></div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Radar */}
            <div className="card-trading">
              <div className="text-sm font-semibold mb-2">Profil de Performance — {strategy}</div>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={analysis.radarData}>
                  <PolarGrid stroke="hsl(222 47% 20%)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#6B7280' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8, fill: '#6B7280' }} />
                  <Radar dataKey="value" stroke="#00FF88" fill="#00FF8833" strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Strategy comparison */}
            <div className="card-trading">
              <div className="text-sm font-semibold mb-2">Comparaison Stratégies</div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analysis.allStratStats} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#6B7280' }} />
                  <YAxis type="category" dataKey="strategy" tick={{ fontSize: 9, fill: '#6B7280' }} width={80} />
                  <RTooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)', fontSize: 11 }} />
                  <Bar dataKey="pnl" radius={[0, 3, 3, 0]}>
                    {analysis.allStratStats.map((d, i) => <Cell key={i} fill={d.strategy === strategy ? '#00FF88' : d.pnl > 0 ? '#0088FF66' : '#EF444466'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Timeframe breakdown */}
          {analysis.tfData.length > 0 && (
            <div className="card-trading">
              <div className="text-sm font-semibold mb-2">Performance par Timeframe</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {analysis.tfData.map(tf => (
                  <div key={tf.tf} className={`p-2 rounded border text-center ${tf.pnl > 0 ? 'border-primary/20 bg-primary/5' : 'border-destructive/20 bg-destructive/5'}`}>
                    <div className="font-bold text-sm">{tf.tf}</div>
                    <div className={`text-lg font-mono font-bold ${tf.wr >= 60 ? 'text-primary' : 'text-yellow-400'}`}>{tf.wr}%</div>
                    <div className="text-[10px] text-muted-foreground">{tf.total} trades</div>
                    <div className={`text-xs font-mono ${tf.pnl > 0 ? 'text-primary' : 'text-destructive'}`}>{tf.pnl > 0 ? '+' : ''}{tf.pnl}€</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Session breakdown */}
          {analysis.sessData.length > 0 && (
            <div className="card-trading">
              <div className="text-sm font-semibold mb-2">Performance par Session</div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={analysis.sessData}>
                  <XAxis dataKey="session" tick={{ fontSize: 9, fill: '#6B7280' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#6B7280' }} />
                  <RTooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)', fontSize: 11 }} />
                  <Bar dataKey="wr" radius={[3, 3, 0, 0]}>
                    {analysis.sessData.map((d, i) => <Cell key={i} fill={d.wr >= 60 ? '#00FF88' : d.wr >= 40 ? '#F59E0B' : '#EF4444'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pattern breakdown */}
          {analysis.patData.length > 0 && (
            <div className="card-trading">
              <div className="text-sm font-semibold mb-2">Performance par Pattern ({analysis.patData.length})</div>
              <div className="space-y-1.5">
                {analysis.patData.slice(0, 10).map(p => (
                  <div key={p.pattern} className="flex items-center gap-2 text-xs">
                    <span className="font-mono w-40 truncate text-muted-foreground">{p.pattern}</span>
                    <div className="flex-1 h-4 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${p.wr}%`, background: p.wr >= 60 ? '#00FF88' : p.wr >= 40 ? '#F59E0B' : '#EF4444' }} />
                    </div>
                    <span className={`font-mono w-10 text-right ${p.wr >= 60 ? 'text-primary' : 'text-yellow-400'}`}>{p.wr}%</span>
                    <span className="text-muted-foreground w-8 text-right">{p.total}</span>
                    <span className={`font-mono w-16 text-right ${p.pnl > 0 ? 'text-primary' : 'text-destructive'}`}>{p.pnl > 0 ? '+' : ''}{p.pnl}€</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aiAdvice && (
            <div className="card-trading border border-green-400/30 bg-green-400/5 space-y-3">
              <div className="flex items-center gap-3"><Brain className="w-4 h-4 text-green-400" /><span className="text-sm font-semibold">Optimisation IA — {strategy}</span><span className={`ml-auto text-2xl font-bold font-mono ${gradeColor[aiAdvice.grade]}`}>{aiAdvice.grade}</span></div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><div className="text-[10px] text-primary font-semibold uppercase mb-1">✅ Forces</div>{aiAdvice.strengths?.map((s, i) => <div key={i} className="text-muted-foreground">• {s}</div>)}</div>
                <div><div className="text-[10px] text-destructive font-semibold uppercase mb-1">⚠️ Faiblesses</div>{aiAdvice.weaknesses?.map((w, i) => <div key={i} className="text-muted-foreground">• {w}</div>)}</div>
              </div>
              <div className="p-2 bg-blue-400/5 border border-blue-400/20 rounded text-xs"><span className="text-blue-400 font-semibold">🎯 Focus: </span><span className="text-muted-foreground">{aiAdvice.focus}</span></div>
              <div className="p-2 bg-destructive/5 border border-destructive/20 rounded text-xs"><span className="text-destructive font-semibold">🗑 Abandonner: </span><span className="text-muted-foreground">{aiAdvice.drop}</span></div>
              {aiAdvice.optimizations?.map((o, i) => <div key={i} className="text-xs text-primary pl-2 border-l-2 border-primary/50">⚡ {o}</div>)}
              <div className="p-2 bg-primary/5 border border-primary/20 rounded text-xs"><span className="text-primary font-semibold">➡️ Prochaine étape: </span><span className="text-muted-foreground">{aiAdvice.next_step}</span></div>
            </div>
          )}
        </>
      )}
    </div>
  );
}