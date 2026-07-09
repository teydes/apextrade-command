import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from 'recharts';
import { TrendingUp, Brain, Loader2, Activity } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function DrawdownProbability() {
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
    const pnls = trades.map(t => t.pnl || 0);
    const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    const variance = pnls.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / pnls.length;
    const std = Math.sqrt(variance);
    const wins = trades.filter(t => t.result === 'win').length;
    const wr = wins / trades.length;
    const avgWin = pnls.filter(p => p > 0).reduce((a, b) => a + b, 0) / Math.max(wins, 1);
    const avgLoss = Math.abs(pnls.filter(p => p < 0).reduce((a, b) => a + b, 0) / Math.max(trades.length - wins, 1));
    const ddLevels = [5, 10, 15, 20, 25, 30, 40, 50];
    const probs = ddLevels.map(dd => {
      let count = 0;
      const runs = 500;
      const tradeCount = 200;
      for (let r = 0; r < runs; r++) {
        let equity = 10000, peak = 10000, maxDD = 0;
        for (let t = 0; t < tradeCount; t++) {
          const isWin = Math.random() < wr;
          const pnl = isWin ? avgWin : -avgLoss;
          equity += pnl;
          if (equity > peak) peak = equity;
          const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
          if (dd > maxDD) maxDD = dd;
        }
        if (maxDD >= dd) count++;
      }
      return { ddLevel: dd, probability: (count / runs) * 100 };
    });
    const expectedDD = probs.reduce((sum, p) => sum + p.ddLevel * (p.probability / 100), 0);
    const worstCase = probs.find(p => p.probability < 5)?.ddLevel || 50;
    const currentEquity = pnls.reduce((a, b) => a + b, 0);
    let peak = 0, currentDD = 0;
    let eq = 0;
    pnls.forEach(p => { eq += p; if (eq > peak) peak = eq; const dd = peak > 0 ? ((peak - eq) / peak) * 100 : 0; if (dd > currentDD) currentDD = dd; });
    return { probs, expectedDD, worstCase, currentDD, mean, std, wr: wr * 100, avgWin, avgLoss, totalTrades: trades.length };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Drawdown Probability: Expected DD=${data.expectedDD.toFixed(1)}%, Current DD=${data.currentDD.toFixed(1)}%, P(20% DD)=${data.probs.find(p => p.ddLevel === 20)?.probability.toFixed(0)}%, P(30% DD)=${data.probs.find(p => p.ddLevel === 30)?.probability.toFixed(0)}%, Worst case=${data.worstCase}%. Analyse: 1) Risque de drawdown, 2) Tolérance au risque, 3) Recommandation de risk management. Court.`,
        response_json_schema: { type: 'object', properties: { risk: { type: 'string' }, tolerance: { type: 'string' }, recommendation: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ risk: 'Erreur', tolerance: '', recommendation: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 20 trades requis</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Activity className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Drawdown Probability</h1><p className="text-sm text-muted-foreground">Probabilité Monte Carlo de niveaux de drawdown</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-trading glow-green"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">DD attendu</div><div className="text-2xl font-mono font-bold text-warning-yellow">{data.expectedDD.toFixed(1)}%</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">DD actuel</div><div className="text-2xl font-mono font-bold text-danger-red">{data.currentDD.toFixed(1)}%</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Worst case (5%)</div><div className="text-2xl font-mono font-bold text-danger-red">{data.worstCase}%</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Trades analysés</div><div className="text-2xl font-mono font-bold text-accent">{data.totalTrades}</div></CardContent></Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Probabilité de Drawdown par Niveau</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data.probs}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="ddLevel" stroke="hsl(215 20% 55%)" unit="%" />
              <YAxis stroke="hsl(215 20% 55%)" unit="%" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="probability" radius={[4, 4, 0, 0]}>{data.probs.map((e, i) => <Cell key={i} fill={e.probability > 50 ? '#EF4444' : e.probability > 20 ? '#F59E0B' : '#00FF88'} />)}</Bar>
              <ReferenceLine y={50} stroke="#EF4444" strokeDasharray="5 5" label="50% prob" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-muted-foreground">P(10% DD):</span> <span className="font-mono text-primary">{data.probs.find(p => p.ddLevel === 10)?.probability.toFixed(0)}%</span></div>
            <div><span className="text-muted-foreground">P(20% DD):</span> <span className="font-mono text-warning-yellow">{data.probs.find(p => p.ddLevel === 20)?.probability.toFixed(0)}%</span></div>
            <div><span className="text-muted-foreground">P(30% DD):</span> <span className="font-mono text-danger-red">{data.probs.find(p => p.ddLevel === 30)?.probability.toFixed(0)}%</span></div>
            <div><span className="text-muted-foreground">P(50% DD):</span> <span className="font-mono text-danger-red">{data.probs.find(p => p.ddLevel === 50)?.probability.toFixed(0)}%</span></div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Risque:</span> {ai.risk}</div><div><span className="text-primary font-bold">Tolérance:</span> {ai.tolerance}</div><div><span className="text-primary font-bold">Recommandation:</span> {ai.recommendation}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}