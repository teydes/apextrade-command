import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, Brain, Loader2, Sigma } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function RMultipleAnalyzer() {
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
    if (trades.length < 10) return null;
    const rMultiples = trades.map(t => {
      const risk = Math.abs(t.entry_price - t.stop_loss) || 1;
      const reward = t.pnl || 0;
      return reward / risk;
    }).filter(r => !isNaN(r) && isFinite(r));

    const bins = [];
    for (let i = -5; i <= 5; i += 0.5) {
      const count = rMultiples.filter(r => r >= i && r < i + 0.5).length;
      bins.push({ range: `${i.toFixed(1)} to ${(i + 0.5).toFixed(1)}`, count, rangeStart: i, isWin: i >= 0 });
    }

    const avgR = rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length;
    const medianR = [...rMultiples].sort((a, b) => a - b)[Math.floor(rMultiples.length / 2)];
    const maxR = Math.max(...rMultiples);
    const minR = Math.min(...rMultiples);
    const expectancy = avgR;
    const sumR = rMultiples.reduce((a, b) => a + b, 0);
    const positiveR = rMultiples.filter(r => r > 0);
    const negativeR = rMultiples.filter(r => r < 0);
    const avgWinR = positiveR.length > 0 ? positiveR.reduce((a, b) => a + b, 0) / positiveR.length : 0;
    const avgLossR = negativeR.length > 0 ? negativeR.reduce((a, b) => a + b, 0) / negativeR.length : 0;
    const systemQuality = avgLossR !== 0 ? (avgR / Math.abs(avgLossR)) : 0;

    return { bins, avgR, medianR, maxR, minR, expectancy, sumR, avgWinR, avgLossR, systemQuality, total: rMultiples.length, positiveR: positiveR.length, negativeR: negativeR.length };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `R-Multiple Analysis: Avg R=${data.avgR.toFixed(2)}, Median=${data.medianR.toFixed(2)}, Max=${data.maxR.toFixed(2)}, Min=${data.minR.toFixed(2)}, Sum=${data.sumR.toFixed(1)}R over ${data.total} trades. Avg Win=${data.avgWinR.toFixed(2)}R, Avg Loss=${data.avgLossR.toFixed(2)}R, System Quality=${data.systemQuality.toFixed(2)}. Analyse: 1) Qualité du système ( expectancy > 0.3 = good), 2) Distribution anomalies, 3) Recommandation. Court.`,
        response_json_schema: { type: 'object', properties: { quality: { type: 'string' }, anomalies: { type: 'string' }, recommendation: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ quality: 'Erreur', anomalies: '', recommendation: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 10 trades requis</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Sigma className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">R-Multiple Analyzer</h1><p className="text-sm text-muted-foreground">Distribution des R-multiples et system quality</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-trading glow-green"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Expectancy</div><div className={`text-2xl font-mono font-bold ${data.avgR > 0 ? 'text-primary' : 'text-danger-red'}`}>{data.avgR.toFixed(2)}R</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Sum R</div><div className={`text-2xl font-mono font-bold ${data.sumR > 0 ? 'text-primary' : 'text-danger-red'}`}>{data.sumR.toFixed(1)}R</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">System Quality</div><div className={`text-2xl font-mono font-bold ${data.systemQuality > 0.3 ? 'text-primary' : 'text-warning-yellow'}`}>{data.systemQuality.toFixed(2)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Median R</div><div className="text-2xl font-mono font-bold text-accent">{data.medianR.toFixed(2)}R</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Avg Win</div><div className="text-2xl font-mono font-bold text-primary">{data.avgWinR.toFixed(2)}R</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Avg Loss</div><div className="text-2xl font-mono font-bold text-danger-red">{data.avgLossR.toFixed(2)}R</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Max R</div><div className="text-2xl font-mono font-bold text-primary">{data.maxR.toFixed(2)}R</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Min R</div><div className="text-2xl font-mono font-bold text-danger-red">{data.minR.toFixed(2)}R</div></CardContent></Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Distribution des R-Multiples</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data.bins}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="range" stroke="hsl(215 20% 55%)" tick={{ fontSize: 8 }} angle={-45} textAnchor="end" height={70} />
              <YAxis stroke="hsl(215 20% 55%)" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>{data.bins.map((e, i) => <Cell key={i} fill={e.isWin ? '#00FF88' : '#EF4444'} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Qualité:</span> {ai.quality}</div><div><span className="text-primary font-bold">Anomalies:</span> {ai.anomalies}</div><div><span className="text-primary font-bold">Recommandation:</span> {ai.recommendation}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}