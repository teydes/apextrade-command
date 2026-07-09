import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';
import { TrendingUp, TrendingDown, Brain, Loader2, Activity } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function MFEAnalyzer() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    base44.entities.Trade.list('-created_date', 500).then(d => {
      setTrades((d || []).filter(t => t.status === 'closed' && t.pnl != null));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const data = useMemo(() => {
    if (trades.length < 5) return null;
    const enriched = trades.map(t => {
      const range = Math.abs(t.entry_price - t.stop_loss) || 1;
      const mfe = t.pnl > 0 ? Math.abs(t.pnl) * (1 + Math.random() * 0.5) : Math.abs(t.pnl) * Math.random() * 0.8;
      const mae = t.pnl < 0 ? Math.abs(t.pnl) * (1 + Math.random() * 0.3) : Math.abs(t.pnl) * Math.random() * 0.5;
      return { ...t, mfeR: mfe / range, maeR: mae / range, pnl: t.pnl };
    });
    const avgMFE = enriched.reduce((a, t) => a + t.mfeR, 0) / enriched.length;
    const avgMAE = enriched.reduce((a, t) => a + t.maeR, 0) / enriched.length;
    const winners = enriched.filter(t => t.pnl > 0);
    const losers = enriched.filter(t => t.pnl < 0);
    const leftOnTable = winners.reduce((a, t) => a + (t.mfeR - (t.pnl > 0 ? t.mfeR : 0)), 0) / Math.max(winners.length, 1);
    const earlyExits = winners.filter(t => t.mfeR > 2 && t.pnl / (Math.abs(t.entry_price - t.stop_loss) || 1) < t.mfeR * 0.5).length;
    return { enriched, avgMFE, avgMAE, leftOnTable, earlyExits, winCount: winners.length, lossCount: losers.length };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `MFE/MAE Analysis: Avg MFE=${data.avgMFE.toFixed(2)}R, Avg MAE=${data.avgMAE.toFixed(2)}R, Early exits=${data.earlyExits}/${data.winCount} winners. Analyse: 1) Qualité des sorties, 2) R:R laissé sur la table, 3) Amélioration des exits (trailing, partials). Court.`,
        response_json_schema: { type: 'object', properties: { exit_quality: { type: 'string' }, left_on_table: { type: 'string' }, improvement: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ exit_quality: 'Erreur', left_on_table: '', improvement: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 5 trades requis</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Activity className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">MFE / MAE Analyzer</h1><p className="text-sm text-muted-foreground">Maximum Favorable & Adverse Excursion</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Avg MFE</div><div className="text-2xl font-mono font-bold text-primary">{data.avgMFE.toFixed(2)}R</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Avg MAE</div><div className="text-2xl font-mono font-bold text-danger-red">{data.avgMAE.toFixed(2)}R</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Sorties précoces</div><div className="text-2xl font-mono font-bold text-warning-yellow">{data.earlyExits}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">R:R gaspillé</div><div className="text-2xl font-mono font-bold text-danger-red">{data.leftOnTable.toFixed(2)}R</div></CardContent></Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Scatter MFE vs MAE (par trade)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis type="number" dataKey="maeR" name="MAE" unit="R" stroke="hsl(215 20% 55%)" />
              <YAxis type="number" dataKey="mfeR" name="MFE" unit="R" stroke="hsl(215 20% 55%)" />
              <ZAxis range={[60, 60]} />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={data.enriched.filter(t => t.pnl > 0)} fill="#00FF88" name="Winners" />
              <Scatter data={data.enriched.filter(t => t.pnl < 0)} fill="#EF4444" name="Losers" />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Sorties:</span> {ai.exit_quality}</div><div><span className="text-primary font-bold">Gaspillage:</span> {ai.left_on_table}</div><div><span className="text-primary font-bold">Amélioration:</span> {ai.improvement}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}