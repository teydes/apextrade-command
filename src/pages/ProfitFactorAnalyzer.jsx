import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, PieChart, Pie } from 'recharts';
import { DollarSign, Brain, Loader2, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ProfitFactorAnalyzer() {
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
    const wins = trades.filter(t => t.result === 'win');
    const losses = trades.filter(t => t.result === 'loss');
    const grossProfit = wins.reduce((a, t) => a + (t.pnl || 0), 0);
    const grossLoss = Math.abs(losses.reduce((a, t) => a + (t.pnl || 0), 0));
    const pf = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    const netProfit = grossProfit - grossLoss;
    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
    const rr = avgLoss > 0 ? avgWin / avgLoss : 0;
    const expectancy = (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss;
    const payoff = rr;
    const breakEvenWR = rr > 0 ? (1 / (1 + rr)) * 100 : 0;
    const edge = winRate - breakEvenWR;
    const monthlyPF = [];
    const byMonth = {};
    trades.forEach(t => {
      const d = new Date(t.entry_time || t.created_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = { month: key, profit: 0, loss: 0 };
      if ((t.pnl || 0) > 0) byMonth[key].profit += t.pnl;
      else byMonth[key].loss += Math.abs(t.pnl || 0);
    });
    Object.values(byMonth).forEach(m => { m.pf = m.loss > 0 ? m.profit / m.loss : m.profit > 0 ? 99 : 0; monthlyPF.push(m); });
    monthlyPF.sort((a, b) => a.month.localeCompare(b.month));
    const qualityScore = pf > 2 ? 'A' : pf > 1.5 ? 'B' : pf > 1.1 ? 'C' : 'D';
    return { grossProfit, grossLoss, pf, netProfit, winRate, avgWin, avgLoss, rr, expectancy, breakEvenWR, edge, monthlyPF, qualityScore, wins: wins.length, losses: losses.length, totalTrades };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Profit Factor Analysis: PF=${data.pf.toFixed(2)}, Gross P=${data.grossProfit.toFixed(0)}, Gross L=${data.grossLoss.toFixed(0)}, WR=${data.winRate.toFixed(1)}%, R:R=${data.rr.toFixed(2)}, Expectancy=${data.expectancy.toFixed(0)}, Edge=${data.edge.toFixed(1)}%. Quality=${data.qualityScore}. Analyse: 1) Qualité du système (PF>1.5=good, >2=excellent), 2) Durabilité, 3) Recommandation. Court.`,
        response_json_schema: { type: 'object', properties: { quality: { type: 'string' }, durability: { type: 'string' }, recommendation: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ quality: 'Erreur', durability: '', recommendation: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 10 trades requis</div>;

  const pieData = [{ name: 'Gross Profit', value: data.grossProfit, fill: '#00FF88' }, { name: 'Gross Loss', value: data.grossLoss, fill: '#EF4444' }];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <DollarSign className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Profit Factor Analyzer</h1><p className="text-sm text-muted-foreground">Analyse approfondie du profit factor et qualité système</p></div>
      </div>

      <Card className={`card-trading glow-green ${data.pf > 2 ? 'glow-green' : data.pf < 1.2 ? 'glow-red' : ''}`}>
        <CardContent className="py-6">
          <div className="flex items-center gap-6">
            <div><div className="text-xs text-muted-foreground mb-1">Profit Factor</div><div className={`text-4xl font-mono font-bold ${data.pf > 1.5 ? 'text-primary' : 'text-danger-red'}`}>{data.pf.toFixed(2)}</div></div>
            <div className="border-l border-border pl-6"><div className="text-xs text-muted-foreground mb-1">Quality Score</div><div className={`text-4xl font-mono font-bold ${data.qualityScore === 'A' ? 'text-primary' : data.qualityScore === 'D' ? 'text-danger-red' : 'text-warning-yellow'}`}>{data.qualityScore}</div></div>
            <div className="border-l border-border pl-6"><div className="text-xs text-muted-foreground mb-1">Edge</div><div className={`text-4xl font-mono font-bold ${data.edge > 0 ? 'text-primary' : 'text-danger-red'}`}>{data.edge > 0 ? '+' : ''}{data.edge.toFixed(1)}%</div></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Gross Profit</div><div className="text-2xl font-mono font-bold text-primary">{data.grossProfit.toFixed(0)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Gross Loss</div><div className="text-2xl font-mono font-bold text-danger-red">{data.grossLoss.toFixed(0)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Net Profit</div><div className={`text-2xl font-mono font-bold ${data.netProfit > 0 ? 'text-primary' : 'text-danger-red'}`}>{data.netProfit.toFixed(0)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Expectancy</div><div className={`text-2xl font-mono font-bold ${data.expectancy > 0 ? 'text-primary' : 'text-danger-red'}`}>{data.expectancy.toFixed(0)}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Gross Profit vs Loss</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={e => e.name}>{pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} /></PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Monthly PF Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.monthlyPF}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                <XAxis dataKey="month" stroke="hsl(215 20% 55%)" tick={{ fontSize: 9 }} />
                <YAxis stroke="hsl(215 20% 55%)" />
                <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                <Bar dataKey="pf" radius={[4, 4, 0, 0]}>{data.monthlyPF.map((e, i) => <Cell key={i} fill={e.pf > 1.5 ? '#00FF88' : e.pf > 1 ? '#F59E0B' : '#EF4444'} />)}</Bar>
                <ReferenceLine y={1} stroke="#0088FF" strokeDasharray="5 5" label="Break-even" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Qualité:</span> {ai.quality}</div><div><span className="text-primary font-bold">Durabilité:</span> {ai.durability}</div><div><span className="text-primary font-bold">Recommandation:</span> {ai.recommendation}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}