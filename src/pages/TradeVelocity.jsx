import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Timer, Brain, Loader2, Activity } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function TradeVelocity() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [windowSize, setWindowSize] = useState(10);
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
    const velocity = [];
    for (let i = 0; i <= trades.length - windowSize; i++) {
      const window = trades.slice(i, i + windowSize);
      const firstTime = new Date(window[0].entry_time);
      const lastTime = new Date(window[window.length - 1].entry_time);
      const hoursDiff = (lastTime - firstTime) / (1000 * 60 * 60);
      const tradesPerHour = hoursDiff > 0 ? windowSize / hoursDiff : 0;
      const tradesPerDay = tradesPerHour * 24;
      const pnl = window.reduce((a, t) => a + (t.pnl || 0), 0);
      velocity.push({ idx: i + windowSize, tradesPerHour, tradesPerDay, pnl, hoursSpan: hoursDiff });
    }
    const avgVelocity = velocity.reduce((a, v) => a + v.tradesPerDay, 0) / Math.max(velocity.length, 1);
    const maxVelocity = Math.max(...velocity.map(v => v.tradesPerDay));
    const minVelocity = Math.min(...velocity.map(v => v.tradesPerDay));
    const currentVelocity = velocity[velocity.length - 1]?.tradesPerDay || 0;
    const avgHoursPerTrade = velocity.reduce((a, v) => a + (v.hoursSpan / windowSize), 0) / Math.max(velocity.length, 1);
    const overtrading = currentVelocity > avgVelocity * 1.5;
    const highVelocityPnL = velocity.filter(v => v.tradesPerDay > avgVelocity).reduce((a, v) => a + v.pnl, 0);
    const lowVelocityPnL = velocity.filter(v => v.tradesPerDay <= avgVelocity).reduce((a, v) => a + v.pnl, 0);
    return { velocity, avgVelocity, maxVelocity, minVelocity, currentVelocity, avgHoursPerTrade, overtrading, highVelocityPnL, lowVelocityPnL };
  }, [trades, windowSize]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Trade Velocity: Avg=${data.avgVelocity.toFixed(1)}/day, Current=${data.currentVelocity.toFixed(1)}/day, Max=${data.maxVelocity.toFixed(1)}, Min=${data.minVelocity.toFixed(1)}, Avg hours/trade=${data.avgHoursPerTrade.toFixed(1)}. High-velocity PnL=${data.highVelocityPnL.toFixed(0)}, Low-velocity PnL=${data.lowVelocityPnL.toFixed(0)}. Overtrading=${data.overtrading}. Analyse: 1) Cadence optimale, 2) Impact de la vélocité sur PnL, 3) Recommandation. Court.`,
        response_json_schema: { type: 'object', properties: { optimal_cadence: { type: 'string' }, velocity_impact: { type: 'string' }, recommendation: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ optimal_cadence: 'Erreur', velocity_impact: '', recommendation: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 10 trades avec timestamps</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Activity className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Trade Velocity</h1><p className="text-sm text-muted-foreground">Cadence de trading et impact sur performance</p></div>
      </div>

      <Card className="card-trading">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div><Label>Fenêtre (trades)</Label><Input type="number" value={windowSize} onChange={e => setWindowSize(+e.target.value)} className="w-24" /></div>
            <div className="ml-auto text-right"><div className="text-xs text-muted-foreground">Cadence actuelle</div><div className="text-2xl font-mono font-bold text-accent">{data.currentVelocity.toFixed(1)}/day</div></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Timer className="w-3 h-3" /> Avg cadence</div><div className="text-2xl font-mono font-bold text-accent">{data.avgVelocity.toFixed(1)}/day</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Max cadence</div><div className="text-2xl font-mono font-bold text-danger-red">{data.maxVelocity.toFixed(1)}/day</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Avg hours/trade</div><div className="text-2xl font-mono font-bold text-warning-yellow">{data.avgHoursPerTrade.toFixed(1)}h</div></CardContent></Card>
        <Card className={`card-trading ${data.overtrading ? 'glow-red' : 'glow-green'}`}><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Statut</div><div className={`text-xl font-mono font-bold ${data.overtrading ? 'text-danger-red' : 'text-primary'}`}>{data.overtrading ? 'OVERTRADING' : 'NORMAL'}</div></CardContent></Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Trade Velocity (trades/day)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.velocity}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="idx" stroke="hsl(215 20% 55%)" />
              <YAxis stroke="hsl(215 20% 55%)" unit="/d" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="tradesPerDay" radius={[2, 2, 0, 0]}>{data.velocity.map((e, i) => <Cell key={i} fill={e.tradesPerDay > data.avgVelocity * 1.5 ? '#EF4444' : e.tradesPerDay < data.avgVelocity * 0.5 ? '#0088FF' : '#00FF88'} />)}</Bar>
              <ReferenceLine y={data.avgVelocity} stroke="#F59E0B" strokeDasharray="5 5" label="Avg" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between p-3 rounded bg-secondary/50"><span className="text-muted-foreground">PnL haute vélocité:</span> <span className={`font-mono font-bold ${data.highVelocityPnL > 0 ? 'text-primary' : 'text-danger-red'}`}>{data.highVelocityPnL.toFixed(0)}</span></div>
            <div className="flex items-center justify-between p-3 rounded bg-secondary/50"><span className="text-muted-foreground">PnL basse vélocité:</span> <span className={`font-mono font-bold ${data.lowVelocityPnL > 0 ? 'text-primary' : 'text-danger-red'}`}>{data.lowVelocityPnL.toFixed(0)}</span></div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Cadence optimale:</span> {ai.optimal_cadence}</div><div><span className="text-primary font-bold">Impact vélocité:</span> {ai.velocity_impact}</div><div><span className="text-primary font-bold">Recommandation:</span> {ai.recommendation}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}