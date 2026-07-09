import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Line, ComposedChart, ReferenceLine } from 'recharts';
import { Zap, Brain, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function TradeEfficiency() {
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
    const totalPnL = trades.reduce((a, t) => a + (t.pnl || 0), 0);
    const totalRisk = trades.reduce((a, t) => a + (t.risk_reward || 1), 0);
    const totalWins = trades.filter(t => t.result === 'win').length;
    const wr = (totalWins / trades.length) * 100;
    const pnlPerTrade = totalPnL / trades.length;
    const riskAdjustedReturn = totalPnL / Math.sqrt(trades.length);
    const winners = trades.filter(t => t.result === 'win');
    const losers = trades.filter(t => t.result === 'loss');
    const avgWinR = winners.length > 0 ? winners.reduce((a, t) => a + (t.risk_reward || 0), 0) / winners.length : 0;
    const avgLossR = losers.length > 0 ? losers.reduce((a, t) => a + (t.risk_reward || 0), 0) / losers.length : 0;
    const cumulative = [];
    let cumPnL = 0, cumRisk = 0;
    trades.forEach((t, i) => {
      cumPnL += t.pnl || 0;
      cumRisk += t.risk_reward || 1;
      cumulative.push({ idx: i + 1, cumPnL, cumRisk, efficiency: cumRisk > 0 ? cumPnL / cumRisk : 0 });
    });
    const riskEfficiency = totalRisk > 0 ? (totalPnL / totalRisk) : 0;
    const overallEfficiency = ((wr / 100) * avgWinR - (1 - wr / 100) * avgLossR);
    return { totalPnL, totalRisk, wr, pnlPerTrade, riskAdjustedReturn, avgWinR, avgLossR, cumulative, riskEfficiency, overallEfficiency, totalTrades: trades.length };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Trade Efficiency: PnL/Trade=${data.pnlPerTrade.toFixed(0)}, PnL/Risk=${data.riskEfficiency.toFixed(2)}, Overall=${data.overallEfficiency.toFixed(2)}R, WR=${data.wr.toFixed(0)}%, Avg Win=${data.avgWinR.toFixed(2)}R, Avg Loss=${data.avgLossR.toFixed(2)}R. Analyse: 1) Efficacité globale, 2) Goulots d'étranglement, 3) Recommandation. Court.`,
        response_json_schema: { type: 'object', properties: { efficiency: { type: 'string' }, bottlenecks: { type: 'string' }, recommendation: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ efficiency: 'Erreur', bottlenecks: '', recommendation: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 10 trades requis</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Zap className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Trade Efficiency</h1><p className="text-sm text-muted-foreground">Métriques d'efficacité globale</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-trading glow-green"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> PnL/Trade</div><div className={`text-2xl font-mono font-bold ${data.pnlPerTrade > 0 ? 'text-primary' : 'text-danger-red'}`}>{data.pnlPerTrade > 0 ? '+' : ''}{data.pnlPerTrade.toFixed(0)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> PnL/Risk</div><div className={`text-2xl font-mono font-bold ${data.riskEfficiency > 0 ? 'text-primary' : 'text-danger-red'}`}>{data.riskEfficiency.toFixed(2)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Overall Efficiency</div><div className={`text-2xl font-mono font-bold ${data.overallEfficiency > 0 ? 'text-primary' : 'text-danger-red'}`}>{data.overallEfficiency.toFixed(2)}R</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Risk-adj return</div><div className={`text-2xl font-mono font-bold ${data.riskAdjustedReturn > 0 ? 'text-primary' : 'text-danger-red'}`}>{data.riskAdjustedReturn.toFixed(0)}</div></CardContent></Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Cumulative Efficiency (PnL/Risk au fil du temps)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data.cumulative}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="idx" stroke="hsl(215 20% 55%)" />
              <YAxis stroke="hsl(215 20% 55%)" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="cumRisk" name="Cum Risk" fill="#0088FF33" />
              <Line type="monotone" dataKey="cumPnL" name="Cum PnL" stroke="#00FF88" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="efficiency" name="Efficiency" stroke="#F59E0B" strokeWidth={1} dot={false} />
              <ReferenceLine y={0} stroke="#F59E0B" strokeDasharray="5 5" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-muted-foreground">Total PnL:</span> <span className={`font-mono ${data.totalPnL > 0 ? 'text-primary' : 'text-danger-red'}`}>{data.totalPnL.toFixed(0)}</span></div>
            <div><span className="text-muted-foreground">Total Risk:</span> <span className="font-mono text-accent">{data.totalRisk.toFixed(1)}R</span></div>
            <div><span className="text-muted-foreground">Win Rate:</span> <span className="font-mono text-primary">{data.wr.toFixed(0)}%</span></div>
            <div><span className="text-muted-foreground">Trades:</span> <span className="font-mono">{data.totalTrades}</span></div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Efficacité:</span> {ai.efficiency}</div><div><span className="text-primary font-bold">Goulots:</span> {ai.bottlenecks}</div><div><span className="text-primary font-bold">Recommandation:</span> {ai.recommendation}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}