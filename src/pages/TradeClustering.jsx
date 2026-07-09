import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Layers, Brain, Loader2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function TradeClustering() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    base44.entities.Trade.list('-created_date', 500).then(d => {
      setTrades((d || []).filter(t => t.status === 'closed' && t.entry_time).reverse());
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const data = useMemo(() => {
    if (trades.length < 10) return null;
    const intervals = [];
    for (let i = 1; i < trades.length; i++) {
      const diff = (new Date(trades[i].entry_time) - new Date(trades[i - 1].entry_time)) / 60000;
      intervals.push({ idx: i, gapMin: diff, gapLabel: diff < 60 ? `${Math.round(diff)}m` : diff < 1440 ? `${(diff/60).toFixed(1)}h` : `${(diff/1440).toFixed(1)}d`, pnl: trades[i].pnl || 0, result: trades[i].result });
    }
    const sorted = [...intervals].sort((a, b) => a.gapMin - b.gapMin);
    const buckets = [
      { label: 'under5m', min: 0, max: 5, trades: 0, wins: 0, pnl: 0 },
      { label: '5-15m', min: 5, max: 15, trades: 0, wins: 0, pnl: 0 },
      { label: '15-60m', min: 15, max: 60, trades: 0, wins: 0, pnl: 0 },
      { label: '1-4h', min: 60, max: 240, trades: 0, wins: 0, pnl: 0 },
      { label: '4-24h', min: 240, max: 1440, trades: 0, wins: 0, pnl: 0 },
      { label: 'over24h', min: 1440, max: Infinity, trades: 0, wins: 0, pnl: 0 },
    ];
    intervals.forEach(iv => {
      const b = buckets.find(b => iv.gapMin >= b.min && iv.gapMin < b.max);
      if (b) { b.trades++; if (iv.result === 'win') b.wins++; b.pnl += iv.pnl; }
    });
    buckets.forEach(b => { b.wr = b.trades > 0 ? (b.wins / b.trades) * 100 : 0; b.avgPnL = b.trades > 0 ? b.pnl / b.trades : 0; });
    const clusters = intervals.filter(iv => iv.gapMin < 5).length;
    const clusterRate = trades.length > 0 ? (clusters / trades.length) * 100 : 0;
    const avgGap = intervals.reduce((a, iv) => a + iv.gapMin, 0) / Math.max(intervals.length, 1);
    const medianGap = sorted[Math.floor(sorted.length / 2)]?.gapMin || 0;
    const overtrading = clusterRate > 30;
    return { buckets, clusters, clusterRate, avgGap, medianGap, overtrading, total: intervals.length };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Trade Clustering: Cluster rate=${data.clusterRate.toFixed(0)}% (under5m gaps), Avg gap=${(data.avgGap/60).toFixed(1)}h, Median=${(data.medianGap/60).toFixed(1)}h. Overtrading=${data.overtrading}. Performance clusters: ${data.buckets[0].label}=${data.buckets[0].pnl.toFixed(0)}, ${data.buckets[5].label}=${data.buckets[5].pnl.toFixed(0)}. Analyse: 1) Pattern overtrading, 2) Impact timing, 3) Recommandation. Court.`,
        response_json_schema: { type: 'object', properties: { overtrading: { type: 'string' }, timing_impact: { type: 'string' }, recommendation: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ overtrading: 'Erreur', timing_impact: '', recommendation: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 10 trades avec timestamps</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Layers className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Trade Clustering</h1><p className="text-sm text-muted-foreground">Détection overtrading et impact du timing</p></div>
      </div>

      {data.overtrading && (
        <Card className="card-trading glow-red">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-danger-red" />
              <div><div className="font-bold text-danger-red">OVERTRADING DETECTE</div><div className="text-sm text-muted-foreground">{data.clusterRate.toFixed(0)}% de vos trades sont espacés de moins de 5 minutes</div></div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Taux de cluster</div><div className={`text-2xl font-mono font-bold ${data.overtrading ? 'text-danger-red' : 'text-primary'}`}>{data.clusterRate.toFixed(0)}%</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Gap moyen</div><div className="text-2xl font-mono font-bold text-accent">{data.avgGap < 60 ? `${Math.round(data.avgGap)}m` : `${(data.avgGap/60).toFixed(1)}h`}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Gap médian</div><div className="text-2xl font-mono font-bold text-accent">{data.medianGap < 60 ? `${Math.round(data.medianGap)}m` : `${(data.medianGap/60).toFixed(1)}h`}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Trades sous 5min</div><div className="text-2xl font-mono font-bold text-warning-yellow">{data.clusters}</div></CardContent></Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">PnL par Intervalle entre Trades</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.buckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="label" stroke="hsl(215 20% 55%)" />
              <YAxis stroke="hsl(215 20% 55%)" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>{data.buckets.map((e, i) => <Cell key={i} fill={e.pnl > 0 ? '#00FF88' : '#EF4444'} />)}</Bar>
              <ReferenceLine y={0} stroke="#F59E0B" strokeDasharray="5 5" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Overtrading:</span> {ai.overtrading}</div><div><span className="text-primary font-bold">Impact timing:</span> {ai.timing_impact}</div><div><span className="text-primary font-bold">Recommandation:</span> {ai.recommendation}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}