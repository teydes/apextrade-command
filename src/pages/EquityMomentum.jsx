import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { Waves, Brain, Loader2, Activity } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function EquityMomentum() {
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
    if (trades.length < 20) return null;
    let equity = 0;
    const curve = [{ idx: 0, equity: 0, sma5: 0, sma20: 0, momentum: 0 }];
    const equities = [0];
    trades.forEach((t, i) => {
      equity += t.pnl || 0;
      equities.push(equity);
      const sma5 = equities.slice(-5).reduce((a, b) => a + b, 0) / Math.min(equities.length, 5);
      const sma20 = equities.slice(-20).reduce((a, b) => a + b, 0) / Math.min(equities.length, 20);
      const momentum = sma5 - sma20;
      curve.push({ idx: i + 1, equity, sma5, sma20, momentum });
    });
    const currentMomentum = curve[curve.length - 1].momentum;
    const maxMomentum = Math.max(...curve.map(c => c.momentum));
    const minMomentum = Math.min(...curve.map(c => c.momentum));
    const positiveMomentum = curve.filter(c => c.momentum > 0).length;
    const pctPositive = (positiveMomentum / curve.length) * 100;
    const trend = currentMomentum > 0 ? 'BULLISH' : 'BEARISH';
    const strength = Math.abs(currentMomentum) / Math.max(Math.abs(maxMomentum), Math.abs(minMomentum), 1);
    const momentumChanges = [];
    for (let i = 1; i < curve.length; i++) {
      if ((curve[i].momentum > 0) !== (curve[i - 1].momentum > 0)) momentumChanges.push(i);
    }
    const lastChange = momentumChanges[momentumChanges.length - 1] || 0;
    const tradesSinceFlip = curve.length - lastChange;
    return { curve, currentMomentum, maxMomentum, minMomentum, pctPositive, trend, strength, momentumChanges, tradesSinceFlip };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Equity Momentum: Current=${data.currentMomentum.toFixed(0)}, Trend=${data.trend}, Strength=${(data.strength * 100).toFixed(0)}%, % positive=${data.pctPositive.toFixed(0)}%, Trades since flip=${data.tradesSinceFlip}. Analyse: 1) Momentum actuel, 2) Durée du trend, 3) Recommandation. Court.`,
        response_json_schema: { type: 'object', properties: { momentum: { type: 'string' }, trend_duration: { type: 'string' }, recommendation: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ momentum: 'Erreur', trend_duration: '', recommendation: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 20 trades requis</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Waves className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Equity Momentum</h1><p className="text-sm text-muted-foreground">Momentum de la courbe d'équity (SMA crossover)</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={`card-trading ${data.trend === 'BULLISH' ? 'glow-green' : 'glow-red'}`}>
          <CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Activity className="w-3 h-3" /> Momentum</div><div className={`text-2xl font-mono font-bold ${data.currentMomentum > 0 ? 'text-primary' : 'text-danger-red'}`}>{data.currentMomentum > 0 ? '+' : ''}{data.currentMomentum.toFixed(0)}</div><div className="text-xs text-muted-foreground">{data.trend}</div></CardContent>
        </Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Force du trend</div><div className="text-2xl font-mono font-bold text-accent">{(data.strength * 100).toFixed(0)}%</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">% temps haussier</div><div className="text-2xl font-mono font-bold text-primary">{data.pctPositive.toFixed(0)}%</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Trades depuis flip</div><div className="text-2xl font-mono font-bold text-warning-yellow">{data.tradesSinceFlip}</div></CardContent></Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Equity avec SMA 5 & 20</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data.curve}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="idx" stroke="hsl(215 20% 55%)" />
              <YAxis stroke="hsl(215 20% 55%)" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Line type="monotone" dataKey="equity" name="Equity" stroke="#00FF88" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="sma5" name="SMA 5" stroke="#0088FF" strokeWidth={1} dot={false} />
              <Line type="monotone" dataKey="sma20" name="SMA 20" stroke="#F59E0B" strokeWidth={1} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Momentum (SMA5 - SMA20)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.curve}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="idx" stroke="hsl(215 20% 55%)" />
              <YAxis stroke="hsl(215 20% 55%)" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Area type="monotone" dataKey="momentum" stroke="#00FF88" fill="#00FF8822" />
              <ReferenceLine y={0} stroke="#F59E0B" strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Momentum:</span> {ai.momentum}</div><div><span className="text-primary font-bold">Durée trend:</span> {ai.trend_duration}</div><div><span className="text-primary font-bold">Recommandation:</span> {ai.recommendation}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}