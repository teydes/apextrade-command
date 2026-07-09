import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, ReferenceLine } from 'recharts';
import { TrendingUp, Brain, Loader2, LineChart as LineIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function EquityCurveStats() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    base44.entities.Trade.list('-created_date', 500).then(d => {
      setTrades((d || []).filter(t => t.status === 'closed').reverse());
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const data = useMemo(() => {
    if (trades.length < 10) return null;
    let equity = 0;
    const curve = [{ idx: 0, equity: 0, drawdown: 0 }];
    let peak = 0, maxDD = 0;
    trades.forEach((t, i) => {
      equity += t.pnl || 0;
      if (equity > peak) peak = equity;
      const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
      curve.push({ idx: i + 1, equity, drawdown: -dd });
    });
    const pnls = trades.map(t => t.pnl || 0);
    const returns = [];
    for (let i = 1; i < pnls.length; i++) returns.push(pnls[i] / Math.max(Math.abs(pnls[i - 1]), 1));
    const meanRet = returns.reduce((a, b) => a + b, 0) / Math.max(returns.length, 1);
    const varianceRet = returns.reduce((a, b) => a + Math.pow(b - meanRet, 2), 0) / Math.max(returns.length, 1);
    const stdRet = Math.sqrt(varianceRet);
    const sharpe = stdRet > 0 ? (meanRet / stdRet) * Math.sqrt(252) : 0;
    const downsideReturns = returns.filter(r => r < 0);
    const downsideDev = Math.sqrt(downsideReturns.reduce((a, r) => a + r * r, 0) / Math.max(downsideReturns.length, 1));
    const sortino = downsideDev > 0 ? (meanRet / downsideDev) * Math.sqrt(252) : 0;
    const totalPnL = equity;
    const totalReturn = trades.length > 0 ? totalPnL / Math.max(Math.abs(trades[0].pnl || 1), 1) * 100 : 0;
    const cagr = totalPnL > 0 && trades.length > 0 ? (Math.pow(1 + totalReturn / 100, 252 / Math.max(trades.length, 1)) - 1) * 100 : 0;
    const marRatio = maxDD > 0 ? cagr / maxDD : 0;
    const rMultiple = trades.map(t => t.risk_reward || 1);
    const avgR = rMultiple.reduce((a, b) => a + b, 0) / Math.max(rMultiple.length, 1);
    const monthlyData = [];
    const byMonth = {};
    trades.forEach(t => {
      const d = new Date(t.entry_time || t.created_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = { month: key, pnl: 0, trades: 0 };
      byMonth[key].pnl += t.pnl || 0;
      byMonth[key].trades++;
    });
    Object.values(byMonth).forEach(m => monthlyData.push(m));
    return { curve, maxDD, sharpe, sortino, cagr, marRatio, totalPnL, totalReturn, avgR, monthlyData, finalEquity: equity };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Equity Curve Stats: Final equity=${data.finalEquity.toFixed(0)}, Max DD=${data.maxDD.toFixed(1)}%, Sharpe=${data.sharpe.toFixed(2)}, Sortino=${data.sortino.toFixed(2)}, CAGR=${data.cagr.toFixed(1)}%, MAR=${data.marRatio.toFixed(2)}, Avg R=${data.avgR.toFixed(2)}. Analyse: 1) Qualité de la courbe, 2) Risk-adjusted returns, 3) Recommandation. Court.`,
        response_json_schema: { type: 'object', properties: { curve_quality: { type: 'string' }, risk_adjusted: { type: 'string' }, recommendation: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ curve_quality: 'Erreur', risk_adjusted: '', recommendation: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 10 trades requis</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <LineIcon className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Equity Curve Stats</h1><p className="text-sm text-muted-foreground">Métriques avancées de courbe d'équity</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Equity finale</div><div className={`text-2xl font-mono font-bold ${data.finalEquity > 0 ? 'text-primary' : 'text-danger-red'}`}>{data.finalEquity > 0 ? '+' : ''}{data.finalEquity.toFixed(0)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Max Drawdown</div><div className="text-2xl font-mono font-bold text-danger-red">{data.maxDD.toFixed(1)}%</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Sharpe</div><div className="text-2xl font-mono font-bold text-accent">{data.sharpe.toFixed(2)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Sortino</div><div className="text-2xl font-mono font-bold text-accent">{data.sortino.toFixed(2)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">CAGR</div><div className="text-2xl font-mono font-bold text-primary">{data.cagr.toFixed(1)}%</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">MAR Ratio</div><div className="text-2xl font-mono font-bold text-warning-yellow">{data.marRatio.toFixed(2)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Total Return</div><div className="text-2xl font-mono font-bold text-primary">{data.totalReturn.toFixed(0)}%</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Avg R</div><div className="text-2xl font-mono font-bold text-accent">{data.avgR.toFixed(2)}R</div></CardContent></Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Equity Curve</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.curve}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="idx" stroke="hsl(215 20% 55%)" />
              <YAxis stroke="hsl(215 20% 55%)" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Area type="monotone" dataKey="equity" stroke="#00FF88" fill="#00FF8822" />
              <ReferenceLine y={0} stroke="#F59E0B" strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">PnL Mensuel</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="month" stroke="hsl(215 20% 55%)" tick={{ fontSize: 9 }} />
              <YAxis stroke="hsl(215 20% 55%)" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="pnl" radius={[4,!4, 0, 0]}>{data.monthlyData.map((e, i) => <Cell key={i} fill={e.pnl > 0 ? '#00FF88' : '#EF4444'} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Courbe:</span> {ai.curve_quality}</div><div><span className="text-primary font-bold">Risk-adjusted:</span> {ai.risk_adjusted}</div><div><span className="text-primary font-bold">Recommandation:</span> {ai.recommendation}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}