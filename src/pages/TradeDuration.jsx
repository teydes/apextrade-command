import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock, Brain, Loader2, Timer } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function TradeDuration() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    base44.entities.Trade.list('-created_date', 500).then(d => {
      setTrades((d || []).filter(t => t.status === 'closed' && t.entry_time && t.exit_time));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const data = useMemo(() => {
    if (trades.length < 5) return null;
    const enriched = trades.map(t => {
      const durMs = new Date(t.exit_time) - new Date(t.entry_time);
      const durMin = durMs / 60000;
      return { ...t, durMin, durLabel: durMin < 60 ? `${Math.round(durMin)}m` : durMin < 1440 ? `${(durMin/60).toFixed(1)}h` : `${(durMin/1440).toFixed(1)}d` };
    });
    const buckets = { '<15m': { count: 0, pnl: 0, wins: 0 }, '15-60m': { count: 0, pnl: 0, wins: 0 }, '1-4h': { count: 0, pnl: 0, wins: 0 }, '4-12h': { count: 0, pnl: 0, wins: 0 }, '12-24h': { count: 0, pnl: 0, wins: 0 }, '>24h': { count: 0, pnl: 0, wins: 0 } };
    enriched.forEach(t => {
      const m = t.durMin;
      let key = '>24h';
      if (m < 15) key = '<15m';
      else if (m < 60) key = '15-60m';
      else if (m < 240) key = '1-4h';
      else if (m < 720) key = '4-12h';
      else if (m < 1440) key = '12-24h';
      buckets[key].count++;
      buckets[key].pnl += t.pnl || 0;
      if (t.result === 'win') buckets[key].wins++;
    });
    const chartData = Object.entries(buckets).map(([k, v]) => ({ bucket: k, ...v, wr: v.count > 0 ? (v.wins / v.count) * 100 : 0, avgPnL: v.count > 0 ? v.pnl / v.count : 0 }));
    const avgDur = enriched.reduce((a, t) => a + t.durMin, 0) / enriched.length;
    const bestBucket = chartData.reduce((max, d) => d.pnl > max.pnl ? d : max, chartData[0]);
    return { chartData, avgDur, bestBucket, total: enriched.length };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Trade Duration: Avg=${(data.avgDur/60).toFixed(1)}h, Best bucket=${data.bestBucket.bucket} (PnL=${data.bestBucket.pnl.toFixed(0)}), ${data.total} trades. Analyse: 1) Durée optimale, 2) Style de trading détecté, 3) Recommandation timing. Court.`,
        response_json_schema: { type: 'object', properties: { optimal_duration: { type: 'string' }, trading_style: { type: 'string' }, recommendation: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ optimal_duration: 'Erreur', trading_style: '', recommendation: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 5 trades avec entry/exit time</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Timer className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Trade Duration Analyzer</h1><p className="text-sm text-muted-foreground">Performance par durée de position</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Durée moyenne</div><div className="text-2xl font-mono font-bold text-primary">{data.avgDur < 60 ? `${Math.round(data.avgDur)}m` : `${(data.avgDur/60).toFixed(1)}h`}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Meilleure durée</div><div className="text-2xl font-mono font-bold text-accent">{data.bestBucket.bucket}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">PnL meilleur bucket</div><div className="text-2xl font-mono font-bold text-primary">{data.bestBucket.pnl.toFixed(0)}</div></CardContent></Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">PnL par bucket de durée</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="bucket" stroke="hsl(215 20% 55%)" />
              <YAxis stroke="hsl(215 20% 55%)" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>{data.chartData.map((e, i) => <Cell key={i} fill={e.pnl > 0 ? '#00FF88' : '#EF4444'} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Win Rate par bucket</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="bucket" stroke="hsl(215 20% 55%)" />
              <YAxis stroke="hsl(215 20% 55%)" unit="%" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="wr" name="Win Rate" radius={[4, 4, 0, 0]} fill="#0088FF" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Durée optimale:</span> {ai.optimal_duration}</div><div><span className="text-primary font-bold">Style:</span> {ai.trading_style}</div><div><span className="text-primary font-bold">Recommandation:</span> {ai.recommendation}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}