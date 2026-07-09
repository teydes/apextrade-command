import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { Gauge, Brain, Loader2, Activity } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function SharpeOptimizer() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    base44.entities.Trade.list('-created_date', 500).then(d => {
      setTrades((d || []).filter(t => t.status === 'closed'));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const data = useMemo(() => {
    if (trades.length < 20) return null;
    const computeSharpe = (arr) => {
      if (arr.length < 2) return 0;
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
      const std = Math.sqrt(variance);
      return std > 0 ? (mean / std) * Math.sqrt(252) : 0;
    };
    const baseline = computeSharpe(trades.map(t => t.pnl || 0));
    const byStrategy = {};
    trades.forEach(t => { if (t.strategy) { if (!byStrategy[t.strategy]) byStrategy[t.strategy] = []; byStrategy[t.strategy].push(t.pnl || 0); } });
    const strategySharpes = Object.entries(byStrategy).map(([s, pnls]) => ({ strategy: s, sharpe: computeSharpe(pnls), count: pnls.length, pnl: pnls.reduce((a, b) => a + b, 0) })).sort((a, b) => b.sharpe - a.sharpe);
    const topStrategies = strategySharpes.filter(s => s.sharpe > 0).slice(0, 3).map(s => s.strategy);
    const optimizedTrades = trades.filter(t => !t.strategy || topStrategies.includes(t.strategy));
    const optimizedSharpe = computeSharpe(optimizedTrades.map(t => t.pnl || 0));
    const improvement = optimizedSharpe - baseline;
    const filters = [
      { name: 'Baseline', sharpe: baseline, trades: trades.length },
      { name: 'Top Strategies', sharpe: optimizedSharpe, trades: optimizedTrades.length },
    ];
    const bySession = {};
    trades.forEach(t => { if (t.session) { if (!bySession[t.session]) bySession[t.session] = []; bySession[t.session].push(t.pnl || 0); } });
    const bestSession = Object.entries(bySession).map(([s, pnls]) => ({ session: s, sharpe: computeSharpe(pnls) })).sort((a, b) => b.sharpe - a.sharpe)[0];
    if (bestSession) {
      const sessionFiltered = trades.filter(t => t.session === bestSession.session);
      filters.push({ name: `Best Session (${bestSession.session})`, sharpe: bestSession.sharpe, trades: sessionFiltered.length });
    }
    const radarData = strategySharpes.slice(0, 6).map(s => ({ strategy: s.strategy, sharpe: s.sharpe }));
    return { baseline, optimizedSharpe, improvement, strategySharpes, filters, radarData, topStrategies };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Sharpe Optimizer: Baseline Sharpe=${data.baseline.toFixed(2)}, Optimized=${data.optimizedSharpe.toFixed(2)} (+${data.improvement.toFixed(2)}). Top strategies: ${data.topStrategies.join(', ')}. Filters: ${data.filters.map(f => `${f.name}=${f.sharpe.toFixed(2)}`).join(', ')}. Analyse: 1) Potentiel d'optimisation, 2) Filtres les plus impactants, 3) Recommandation. Court.`,
        response_json_schema: { type: 'object', properties: { potential: { type: 'string' }, best_filters: { type: 'string' }, recommendation: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ potential: 'Erreur', best_filters: '', recommendation: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 20 trades requis</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Gauge className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Sharpe Optimizer</h1><p className="text-sm text-muted-foreground">Identification des filtres pour maximiser le Sharpe</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Sharpe baseline</div><div className="text-2xl font-mono font-bold text-accent">{data.baseline.toFixed(2)}</div></CardContent></Card>
        <Card className="card-trading glow-green"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Sharpe optimisé</div><div className="text-2xl font-mono font-bold text-primary">{data.optimizedSharpe.toFixed(2)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Amélioration</div><div className={`text-2xl font-mono font-bold ${data.improvement > 0 ? 'text-primary' : 'text-danger-red'}`}>{data.improvement > 0 ? '+' : ''}{data.improvement.toFixed(2)}</div></CardContent></Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Sharpe par Filtre</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.filters}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="name" stroke="hsl(215 20% 55%)" tick={{ fontSize: 9 }} />
              <YAxis stroke="hsl(215 20% 55%)" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="sharpe" radius={[4, 4, 0, 0]}>{data.filters.map((e, i) => <Cell key={i} fill={e.sharpe > data.baseline ? '#00FF88' : '#0088FF'} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Sharpe par Stratégie</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.strategySharpes} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                <XAxis type="number" stroke="hsl(215 20% 55%)" />
                <YAxis type="category" dataKey="strategy" stroke="hsl(215 20% 55%)" tick={{ fontSize: 9 }} width={80} />
                <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                <Bar dataKey="sharpe" radius={[0, 4, 4, 0]}>{data.strategySharpes.map((e, i) => <Cell key={i} fill={e.sharpe > data.baseline ? '#00FF88' : '#EF4444'} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Radar Sharpe</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={data.radarData}>
                <PolarGrid stroke="hsl(222 47% 16%)" />
                <PolarAngleAxis dataKey="strategy" stroke="hsl(215 20% 55%)" tick={{ fontSize: 9 }} />
                <Radar dataKey="sharpe" stroke="#00FF88" fill="#00FF8833" strokeWidth={2} />
                <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Potentiel:</span> {ai.potential}</div><div><span className="text-primary font-bold">Meilleurs filtres:</span> {ai.best_filters}</div><div><span className="text-primary font-bold">Recommandation:</span> {ai.recommendation}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}