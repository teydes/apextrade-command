import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Thermometer, Brain, Loader2, Gauge } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function VolatilityRegime() {
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
    const pnls = trades.map(t => t.pnl || 0);
    const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    const variance = pnls.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / pnls.length;
    const std = Math.sqrt(variance);
    const avgWin = pnls.filter(p => p > 0).reduce((a, b) => a + b, 0) / Math.max(pnls.filter(p => p > 0).length, 1);
    const avgLoss = Math.abs(pnls.filter(p => p < 0).reduce((a, b) => a + b, 0) / Math.max(pnls.filter(p => p < 0).length, 1));
    const rollingVol = [];
    const window = 10;
    for (let i = window; i <= pnls.length; i++) {
      const slice = pnls.slice(i - window, i);
      const m = slice.reduce((a, b) => a + b, 0) / slice.length;
      const v = slice.reduce((a, b) => a + Math.pow(b - m, 2), 0) / slice.length;
      rollingVol.push({ idx: i, vol: Math.sqrt(v) });
    }
    const avgVol = rollingVol.reduce((a, d) => a + d.vol, 0) / Math.max(rollingVol.length, 1);
    const currentVol = rollingVol[rollingVol.length - 1]?.vol || 0;
    const volRatio = avgVol > 0 ? currentVol / avgVol : 1;
    let regime = 'NORMAL';
    if (volRatio > 1.5) regime = 'HIGH VOLATILITY';
    else if (volRatio < 0.6) regime = 'LOW VOLATILITY';
    const buckets = { 'Low Vol': { count: 0, pnl: 0, wins: 0 }, 'Normal': { count: 0, pnl: 0, wins: 0 }, 'High Vol': { count: 0, pnl: 0, wins: 0 } };
    rollingVol.forEach((d, i) => {
      const actualPnl = pnls[i + window - 1] || 0;
      const actualResult = trades[i + window - 1]?.result;
      let key = 'Normal';
      if (d.vol < avgVol * 0.7) key = 'Low Vol';
      else if (d.vol > avgVol * 1.3) key = 'High Vol';
      buckets[key].count++;
      buckets[key].pnl += actualPnl;
      if (actualResult === 'win') buckets[key].wins++;
    });
    const chartData = Object.entries(buckets).map(([k, v]) => ({ regime: k, ...v, wr: v.count > 0 ? (v.wins / v.count) * 100 : 0, avgPnL: v.count > 0 ? v.pnl / v.count : 0 }));
    return { rollingVol, avgVol, currentVol, volRatio, regime, chartData, std, avgWin, avgLoss };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Volatility Regime: Current=${data.regime} (ratio=${data.volRatio.toFixed(2)}), Avg vol=${data.avgVol.toFixed(0)}, Current=${data.currentVol.toFixed(0)}. Performance: ${data.chartData.map(d => `${d.regime}: WR=${d.wr.toFixed(0)}% PnL=${d.pnl.toFixed(0)}`).join(', ')}. Analyse: 1) Régime actuel, 2) Impact sur stratégie, 3) Adaptation recommandée. Court.`,
        response_json_schema: { type: 'object', properties: { current_regime: { type: 'string' }, impact: { type: 'string' }, adaptation: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ current_regime: 'Erreur', impact: '', adaptation: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 10 trades requis</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Gauge className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Volatility Regime Detector</h1><p className="text-sm text-muted-foreground">Détection de régime de volatilité et impact</p></div>
      </div>

      <Card className={`card-trading ${data.regime === 'HIGH VOLATILITY' ? 'glow-red' : data.regime === 'LOW VOLATILITY' ? 'glow-blue' : 'glow-green'}`}>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <Thermometer className={`w-10 h-10 ${data.regime === 'HIGH VOLATILITY' ? 'text-danger-red' : data.regime === 'LOW VOLATILITY' ? 'text-accent' : 'text-primary'}`} />
            <div>
              <div className="text-2xl font-bold">{data.regime}</div>
              <div className="text-sm text-muted-foreground">Ratio volatilité: {data.volRatio.toFixed(2)}x vs moyenne</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Rolling Volatility (fenêtre 10 trades)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.rollingVol}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="idx" stroke="hsl(215 20% 55%)" />
              <YAxis stroke="hsl(215 20% 55%)" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="vol" radius={[2, 2, 0, 0]}>{data.rollingVol.map((e, i) => <Cell key={i} fill={e.vol > data.avgVol * 1.3 ? '#EF4444' : e.vol < data.avgVol * 0.7 ? '#0088FF' : '#00FF88'} />)}</Bar>
              <ReferenceLine y={data.avgVol} stroke="#F59E0B" strokeDasharray="5 5" label="Avg" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Performance par Régime</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="regime" stroke="hsl(215 20% 55%)" />
              <YAxis stroke="hsl(215 20% 55%)" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>{data.chartData.map((e, i) => <Cell key={i} fill={e.pnl > 0 ? '#00FF88' : '#EF4444'} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Régime:</span> {ai.current_regime}</div><div><span className="text-primary font-bold">Impact:</span> {ai.impact}</div><div><span className="text-primary font-bold">Adaptation:</span> {ai.adaptation}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}