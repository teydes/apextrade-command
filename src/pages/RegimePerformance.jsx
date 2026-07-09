import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Line, ComposedChart, ReferenceLine } from 'recharts';
import { Gauge, Brain, Loader2, Activity } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function RegimePerformance() {
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
    const window = 10;
    const rollingVol = [];
    for (let i = window; i <= pnls.length; i++) {
      const slice = pnls.slice(i - window, i);
      const m = slice.reduce((a, b) => a + b, 0) / slice.length;
      const v = slice.reduce((a, b) => a + Math.pow(b - m, 2), 0) / slice.length;
      rollingVol.push({ idx: i, vol: Math.sqrt(v), pnl: pnls[i - 1] || 0, trade: trades[i - 1] });
    }
    const avgVol = rollingVol.reduce((a, d) => a + d.vol, 0) / Math.max(rollingVol.length, 1);
    const regimes = { 'Trending Bull': { count: 0, pnl: 0, wins: 0, vol: 0 }, 'Trending Bear': { count: 0, pnl: 0, wins: 0, vol: 0 }, 'Range Low Vol': { count: 0, pnl: 0, wins: 0, vol: 0 }, 'Range High Vol': { count: 0, pnl: 0, wins: 0, vol: 0 }, 'Choppy': { count: 0, pnl: 0, wins: 0, vol: 0 } };
    let prevPnl = 0;
    rollingVol.forEach(d => {
      const trend = d.pnl > prevPnl ? 'up' : 'down';
      const volLevel = d.vol > avgVol ? 'high' : 'low';
      let regime = 'Choppy';
      if (volLevel === 'low' && (trend === 'up' || trend === 'down')) {
        regime = trend === 'up' ? 'Trending Bull' : 'Trending Bear';
      } else if (volLevel === 'high' && Math.abs(d.pnl - prevPnl) < d.vol) {
        regime = 'Range High Vol';
      } else if (volLevel === 'low') {
        regime = 'Range Low Vol';
      }
      regimes[regime].count++;
      regimes[regime].pnl += d.pnl;
      regimes[regime].vol += d.vol;
      if (d.pnl > 0) regimes[regime].wins++;
      prevPnl = d.pnl;
    });
    const chartData = Object.entries(regimes).map(([name, r]) => ({ regime: name, ...r, wr: r.count > 0 ? (r.wins / r.count) * 100 : 0, avgVol: r.count > 0 ? r.vol / r.count : 0 })).filter(r => r.count > 0);
    const bestRegime = chartData.reduce((max, r) => r.pnl > max.pnl ? r : max, chartData[0] || { regime: '', pnl: 0 });
    const worstRegime = chartData.reduce((min, r) => r.pnl < min.pnl ? r : min, chartData[0] || { regime: '', pnl: 0 });
    const currentVol = rollingVol[rollingVol.length - 1]?.vol || 0;
    const currentTrend = (rollingVol[rollingVol.length - 1]?.pnl || 0) > (rollingVol[rollingVol.length - 2]?.pnl || 0) ? 'Bull' : 'Bear';
    const currentRegime = currentVol > avgVol ? `Range High Vol (${currentTrend})` : `Trending ${currentTrend}`;
    return { rollingVol, chartData, bestRegime, worstRegime, currentRegime, avgVol, currentVol };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Regime Performance: Current=${data.currentRegime}, Best regime=${data.bestRegime.regime} (${data.bestRegime.pnl.toFixed(0)}), Worst=${data.worstRegime.regime} (${data.worstRegime.pnl.toFixed(0)}). Performance: ${data.chartData.map(r => `${r.regime}: ${r.count}t, WR=${r.wr.toFixed(0)}%, PnL=${r.pnl.toFixed(0)}`).join('; ')}. Analyse: 1) Régime optimal, 2) Adaptation requise, 3) Recommandation. Court.`,
        response_json_schema: { type: 'object', properties: { optimal: { type: 'string' }, adaptation: { type: 'string' }, recommendation: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ optimal: 'Erreur', adaptation: '', recommendation: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 20 trades requis</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Gauge className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Regime Performance</h1><p className="text-sm text-muted-foreground">Performance par régime de marché</p></div>
      </div>

      <Card className="card-trading glow-green">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <Activity className="w-8 h-8 text-accent" />
            <div><div className="text-xs text-muted-foreground">Régime actuel</div><div className="text-xl font-bold text-primary">{data.currentRegime}</div></div>
            <div className="ml-auto text-right"><div className="text-xs text-muted-foreground">Vol ratio</div><div className="text-lg font-mono font-bold text-accent">{(data.currentVol / data.avgVol).toFixed(2)}x</div></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="card-trading glow-green"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Meilleur régime</div><div className="text-lg font-bold text-primary">{data.bestRegime.regime}</div><div className="text-sm font-mono text-primary">{data.bestRegime.pnl.toFixed(0)}</div></CardContent></Card>
        <Card className="card-trading glow-red"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Pire régime</div><div className="text-lg font-bold text-danger-red">{data.worstRegime.regime}</div><div className="text-sm font-mono text-danger-red">{data.worstRegime.pnl.toFixed(0)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Régimes détectés</div><div className="text-2xl font-mono font-bold text-accent">{data.chartData.length}</div></CardContent></Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">PnL par Régime</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis type="number" stroke="hsl(215 20% 55%)" />
              <YAxis type="category" dataKey="regime" stroke="hsl(215 20% 55%)" tick={{ fontSize: 10 }} width={120} />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>{data.chartData.map((e, i) => <Cell key={i} fill={e.pnl > 0 ? '#00FF88' : '#EF4444'} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Win Rate par Régime</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="regime" stroke="hsl(215 20% 55%)" tick={{ fontSize: 9 }} />
              <YAxis stroke="hsl(215 20% 55%)" unit="%" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="wr" radius={[4, 4, 0, 0]} fill="#0088FF" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Optimal:</span> {ai.optimal}</div><div><span className="text-primary font-bold">Adaptation:</span> {ai.adaptation}</div><div><span className="text-primary font-bold">Recommandation:</span> {ai.recommendation}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}