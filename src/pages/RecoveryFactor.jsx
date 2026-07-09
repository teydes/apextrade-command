import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from 'recharts';
import { RefreshCw, Brain, Loader2, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function RecoveryFactor() {
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
    let equity = 0, peak = 0, maxDD = 0, maxDDAmount = 0;
    const curve = [{ idx: 0, equity: 0, dd: 0, underwater: false }];
    let underwaterStart = null;
    const underwaterPeriods = [];
    trades.forEach((t, i) => {
      equity += t.pnl || 0;
      if (equity > peak) {
        if (underwaterStart !== null) { underwaterPeriods.push({ start: underwaterStart, end: i, duration: i - underwaterStart }); underwaterStart = null; }
        peak = equity;
      }
      const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
      const ddAmount = peak - equity;
      if (dd > maxDD) maxDD = dd;
      if (ddAmount > maxDDAmount) maxDDAmount = ddAmount;
      if (equity < peak && underwaterStart === null) underwaterStart = i;
      curve.push({ idx: i + 1, equity, dd: -dd, underwater: equity < peak });
    });
    if (underwaterStart !== null) underwaterPeriods.push({ start: underwaterStart, end: trades.length, duration: trades.length - underwaterStart });
    const totalReturn = equity;
    const recoveryFactor = maxDDAmount > 0 ? totalReturn / maxDDAmount : 0;
    const painIndex = curve.reduce((a, p) => a + Math.abs(p.dd), 0) / curve.length;
    const maxUnderwaterDuration = underwaterPeriods.length > 0 ? Math.max(...underwaterPeriods.map(p => p.duration)) : 0;
    const avgUnderwaterDuration = underwaterPeriods.length > 0 ? underwaterPeriods.reduce((a, p) => a + p.duration, 0) / underwaterPeriods.length : 0;
    const ulcerIndex = Math.sqrt(curve.reduce((a, p) => a + Math.pow(p.dd, 2), 0) / curve.length);
    const martinRatio = ulcerIndex > 0 ? (totalReturn / trades.length) / (ulcerIndex / 100) : 0;
    const currentUnderwater = equity < peak;
    return { curve, maxDD, maxDDAmount, totalReturn, recoveryFactor, painIndex, maxUnderwaterDuration, avgUnderwaterDuration, ulcerIndex, martinRatio, underwaterPeriods, currentUnderwater };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Recovery Factor: RF=${data.recoveryFactor.toFixed(2)}, Pain Index=${data.painIndex.toFixed(2)}, Ulcer Index=${data.ulcerIndex.toFixed(2)}, Martin Ratio=${data.martinRatio.toFixed(2)}, Max underwater=${data.maxUnderwaterDuration} trades, Current underwater=${data.currentUnderwater}. Analyse: 1) Capacité de récupération, 2) Qualité du rendement (RF>3=good), 3) Recommandation. Court.`,
        response_json_schema: { type: 'object', properties: { recovery: { type: 'string' }, quality: { type: 'string' }, recommendation: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ recovery: 'Erreur', quality: '', recommendation: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 10 trades requis</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <RefreshCw className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Recovery Factor</h1><p className="text-sm text-muted-foreground">Recovery factor, pain index, ulcer index</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-trading glow-green"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Recovery Factor</div><div className={`text-2xl font-mono font-bold ${data.recoveryFactor > 3 ? 'text-primary' : 'text-warning-yellow'}`}>{data.recoveryFactor.toFixed(2)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Pain Index</div><div className="text-2xl font-mono font-bold text-danger-red">{data.painIndex.toFixed(2)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Ulcer Index</div><div className="text-2xl font-mono font-bold text-warning-yellow">{data.ulcerIndex.toFixed(2)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Martin Ratio</div><div className="text-2xl font-mono font-bold text-accent">{data.martinRatio.toFixed(2)}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Max Underwater</div><div className="text-2xl font-mono font-bold text-danger-red">{data.maxUnderwaterDuration} trades</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Avg Underwater</div><div className="text-2xl font-mono font-bold text-warning-yellow">{data.avgUnderwaterDuration.toFixed(0)} trades</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Max DD</div><div className="text-2xl font-mono font-bold text-danger-red">{data.maxDD.toFixed(1)}%</div></CardContent></Card>
        <Card className={`card-trading ${data.currentUnderwater ? 'glow-red' : 'glow-green'}`}><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Statut actuel</div><div className={`text-xl font-mono font-bold ${data.currentUnderwater ? 'text-danger-red' : 'text-primary'}`}>{data.currentUnderwater ? 'UNDERWATER' : 'AT PEAK'}</div></CardContent></Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Equity & Underwater Curve</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data.curve}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="idx" stroke="hsl(215 20% 55%)" />
              <YAxis stroke="hsl(215 20% 55%)" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Line type="monotone" dataKey="equity" name="Equity" stroke="#00FF88" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="dd" name="Drawdown %" stroke="#EF4444" strokeWidth={1} dot={false} />
              <ReferenceLine y={0} stroke="#F59E0B" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Récupération:</span> {ai.recovery}</div><div><span className="text-primary font-bold">Qualité:</span> {ai.quality}</div><div><span className="text-primary font-bold">Recommandation:</span> {ai.recommendation}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}