import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { GitCompare, Brain, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function BacktestCompare() {
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
    const strategies = [...new Set(trades.map(t => t.strategy).filter(Boolean))];
    if (strategies.length < 2) return null;
    const byStrategy = {};
    strategies.forEach(s => {
      const stTrades = trades.filter(t => t.strategy === s);
      let eq = 0, peak = 0, maxDD = 0;
      const curve = [{ idx: 0, [s]: 0 }];
      stTrades.forEach((t, i) => {
        eq += t.pnl || 0;
        if (eq > peak) peak = eq;
        const dd = peak > 0 ? ((peak - eq) / peak) * 100 : 0;
        if (dd > maxDD) maxDD = dd;
        curve.push({ idx: i + 1, [s]: eq });
      });
      const wins = stTrades.filter(t => t.result === 'win').length;
      const totalPnL = eq;
      const wr = (wins / stTrades.length) * 100;
      const avgR = stTrades.reduce((a, t) => a + (t.risk_reward || 0), 0) / stTrades.length;
      byStrategy[s] = { curve, maxDD, totalPnL, wr, avgR, count: stTrades.length, name: s };
    });
    const maxLen = Math.max(...Object.values(byStrategy).map(s => s.curve.length));
    const mergedCurve = [];
    for (let i = 0; i < maxLen; i++) {
      const point = { idx: i };
      Object.values(byStrategy).forEach(s => { point[s.name] = s.curve[i]?.[s.name] ?? s.curve[s.curve.length - 1]?.[s.name] ?? 0; });
      mergedCurve.push(point);
    }
    return { byStrategy, mergedCurve, strategies };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const summary = Object.values(data.byStrategy).map(s => `${s.name}: ${s.count}t, WR=${s.wr.toFixed(0)}%, PnL=${s.totalPnL.toFixed(0)}, DD=${s.maxDD.toFixed(1)}%, R=${s.avgR.toFixed(2)}`).join('; ');
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Backtest Comparison: ${summary}. Analyse: 1) Meilleure stratégie globale, 2) Risk-adjusted, 3) Recommandation de focus. Court.`,
        response_json_schema: { type: 'object', properties: { best: { type: 'string' }, risk_adjusted: { type: 'string' }, recommendation: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ best: 'Erreur', risk_adjusted: '', recommendation: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 20 trades sur 2+ stratégies requis</div>;

  const colors = ['#00FF88', '#0088FF', '#F59E0B', '#EF4444', '#A855F7', '#00CED1'];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <GitCompare className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Backtest Compare</h1><p className="text-sm text-muted-foreground">Comparaison de courbes d'équity par stratégie</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.values(data.byStrategy).map((s, i) => (
          <Card key={s.name} className="card-trading" style={{ borderColor: colors[i % colors.length] + '44' }}>
            <CardContent className="pt-4">
              <div className="font-bold text-sm mb-2" style={{ color: colors[i % colors.length] }}>{s.name}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Trades:</span> <span className="font-mono">{s.count}</span></div>
                <div><span className="text-muted-foreground">WR:</span> <span className="font-mono text-primary">{s.wr.toFixed(0)}%</span></div>
                <div><span className="text-muted-foreground">PnL:</span> <span className={`font-mono ${s.totalPnL > 0 ? 'text-primary' : 'text-danger-red'}`}>{s.totalPnL > 0 ? '+' : ''}{s.totalPnL.toFixed(0)}</span></div>
                <div><span className="text-muted-foreground">MaxDD:</span> <span className="font-mono text-danger-red">{s.maxDD.toFixed(1)}%</span></div>
                <div><span className="text-muted-foreground">Avg R:</span> <span className="font-mono text-accent">{s.avgR.toFixed(2)}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Courbes d'Equity Comparées</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data.mergedCurve}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="idx" stroke="hsl(215 20% 55%)" />
              <YAxis stroke="hsl(215 20% 55%)" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Legend />
              <ReferenceLine y={0} stroke="#F59E0B" strokeDasharray="5 5" />
              {data.strategies.map((s, i) => (
                <Line key={s} type="monotone" dataKey={s} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Comparer</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Meilleure:</span> {ai.best}</div><div><span className="text-primary font-bold">Risk-adjusted:</span> {ai.risk_adjusted}</div><div><span className="text-primary font-bold">Recommandation:</span> {ai.recommendation}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}