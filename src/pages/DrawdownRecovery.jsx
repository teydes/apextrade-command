import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingDown, Brain, Loader2, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function DrawdownRecovery() {
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
    let equity = 0, peak = 0, maxDD = 0;
    const equityCurve = [{ idx: 0, equity: 0, dd: 0 }];
    const ddPeriods = [];
    let inDD = false, ddStart = 0, ddDepth = 0;

    trades.forEach((t, i) => {
      equity += t.pnl || 0;
      if (equity > peak) {
        if (inDD) { ddPeriods.push({ start: ddStart, end: i, depth: ddDepth, duration: i - ddStart, recovered: true }); inDD = false; }
        peak = equity;
      }
      const dd = peak > 0 ? ((peak - equity) / Math.max(peak, 1)) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
      if (equity < peak && !inDD) { inDD = true; ddStart = i; ddDepth = dd; }
      if (inDD && dd > ddDepth) ddDepth = dd;
      equityCurve.push({ idx: i + 1, equity, dd: -dd });
    });
    if (inDD) ddPeriods.push({ start: ddStart, end: trades.length, depth: ddDepth, duration: trades.length - ddStart, recovered: false });

    const recovered = ddPeriods.filter(d => d.recovered);
    const unrecovered = ddPeriods.filter(d => !d.recovered);
    const avgRecoveryTime = recovered.length > 0 ? recovered.reduce((a, d) => a + d.duration, 0) / recovered.length : 0;
    const maxRecoveryTime = recovered.length > 0 ? Math.max(...recovered.map(d => d.duration)) : 0;
    const maxDDPeriod = ddPeriods.reduce((max, d) => d.depth > max.depth ? d : max, { depth: 0, duration: 0 });
    const recoveryRate = ddPeriods.length > 0 ? (recovered.length / ddPeriods.length) * 100 : 100;

    return { equityCurve, ddPeriods, maxDD, avgRecoveryTime, maxRecoveryTime, maxDDPeriod, recoveryRate, recovered: recovered.length, unrecovered: unrecovered.length, currentDD: equity < peak ? ((peak - equity) / Math.max(peak, 1)) * 100 : 0 };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Drawdown Recovery: Max DD=${data.maxDD.toFixed(1)}%, Avg recovery=${data.avgRecoveryTime.toFixed(0)} trades, Max recovery=${data.maxRecoveryTime} trades, Recovery rate=${data.recoveryRate.toFixed(0)}%, Current DD=${data.currentDD.toFixed(1)}%. Analyse: 1) Résilience, 2) Risque de drawdown prolongé, 3) Recommandation de risk management. Court.`,
        response_json_schema: { type: 'object', properties: { resilience: { type: 'string' }, risk: { type: 'string' }, recommendation: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ resilience: 'Erreur', risk: '', recommendation: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 10 trades requis</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <RefreshCw className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Drawdown Recovery</h1><p className="text-sm text-muted-foreground">Temps de récupération et résilience</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Max Drawdown</div><div className="text-2xl font-mono font-bold text-danger-red">{data.maxDD.toFixed(1)}%</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Avg Recovery</div><div className="text-2xl font-mono font-bold text-accent">{data.avgRecoveryTime.toFixed(0)} trades</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Max Recovery</div><div className="text-2xl font-mono font-bold text-warning-yellow">{data.maxRecoveryTime} trades</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Recovery Rate</div><div className="text-2xl font-mono font-bold text-primary">{data.recoveryRate.toFixed(0)}%</div></CardContent></Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Drawdown Curve</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.equityCurve}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="idx" stroke="hsl(215 20% 55%)" />
              <YAxis stroke="hsl(215 20% 55%)" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="dd" name="Drawdown %" radius={[2, 2, 0, 0]}>{data.equityCurve.map((e, i) => <Cell key={i} fill={e.dd < -5 ? '#EF4444' : e.dd < -2 ? '#F59E0B' : '#00FF8833'} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {data.currentDD > 0 && (
        <Card className="card-trading glow-red">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-6 h-6 text-danger-red" />
              <div><div className="font-bold text-danger-red">Drawdown en cours: {data.currentDD.toFixed(1)}%</div><div className="text-sm text-muted-foreground">Non encore récupéré — réduit le risk si nécessaire</div></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Périodes de Drawdown</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.ddPeriods.slice(-15).map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded bg-secondary/50">
                <span className="font-mono text-xs text-muted-foreground">#{p.start}-{p.end}</span>
                <span className="font-mono text-sm text-danger-red">-{p.depth.toFixed(1)}%</span>
                <span className="font-mono text-xs text-accent">{p.duration} trades</span>
                <span className={`text-xs px-2 py-0.5 rounded ${p.recovered ? 'bg-primary/20 text-primary' : 'bg-danger-red/20 text-danger-red'}`}>{p.recovered ? 'Récupéré' : 'En cours'}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Résilience:</span> {ai.resilience}</div><div><span className="text-primary font-bold">Risque:</span> {ai.risk}</div><div><span className="text-primary font-bold">Recommandation:</span> {ai.recommendation}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}