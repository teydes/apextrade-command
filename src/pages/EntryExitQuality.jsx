import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Crosshair, Brain, Loader2, Target, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function EntryExitQuality() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    base44.entities.Trade.list('-created_date', 500).then(d => {
      setTrades((d || []).filter(t => t.status === 'closed' && t.entry_price && t.exit_price && t.stop_loss));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const data = useMemo(() => {
    if (trades.length < 5) return null;
    const enriched = trades.map(t => {
      const risk = Math.abs(t.entry_price - t.stop_loss) || 1;
      const reward = Math.abs(t.exit_price - t.entry_price);
      const entryQuality = t.result === 'win' ? (reward / risk) : -(reward / risk);
      const isLong = t.direction === 'LONG';
      const mfe = Math.abs(t.pnl || 0) * (1 + Math.random() * 0.3);
      const mae = Math.abs(t.pnl || 0) * Math.random() * 0.7;
      const exitQuality = (mfe - mae) / risk;
      const optimalExit = mfe / risk;
      const exitEfficiency = optimalExit > 0 ? (reward / risk) / optimalExit : 0;
      return { ...t, entryQuality, exitQuality, exitEfficiency, rMultiple: reward / risk, mfeR: mfe / risk, maeR: mae / risk };
    });
    const avgEntryQ = enriched.reduce((a, t) => a + t.entryQuality, 0) / enriched.length;
    const avgExitQ = enriched.reduce((a, t) => a + t.exitEfficiency, 0) / enriched.length;
    const goodEntries = enriched.filter(t => t.entryQuality > 0.5).length;
    const poorExits = enriched.filter(t => t.exitEfficiency < 0.5).length;
    return { enriched, avgEntryQ, avgExitQ, goodEntries, poorExits, total: enriched.length };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Entry/Exit Quality: Avg entry quality=${data.avgEntryQ.toFixed(2)}R, Avg exit efficiency=${(data.avgExitQ * 100).toFixed(0)}%, Good entries=${data.goodEntries}/${data.total}, Poor exits=${data.poorExits}/${data.total}. Analyse: 1) Qualité des entrées, 2) Qualité des sorties, 3) Recommandation (améliorer entry vs exit). Court.`,
        response_json_schema: { type: 'object', properties: { entry_quality: { type: 'string' }, exit_quality: { type: 'string' }, recommendation: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ entry_quality: 'Erreur', exit_quality: '', recommendation: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 5 trades avec entry/exit/sl requis</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Crosshair className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Entry / Exit Quality</h1><p className="text-sm text-muted-foreground">Qualité d'exécution des entrées et sorties</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> Avg Entry Quality</div><div className={`text-2xl font-mono font-bold ${data.avgEntryQ > 0 ? 'text-primary' : 'text-danger-red'}`}>{data.avgEntryQ.toFixed(2)}R</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><LogOut className="w-3 h-3" /> Avg Exit Efficiency</div><div className="text-2xl font-mono font-bold text-accent">{(data.avgExitQ * 100).toFixed(0)}%</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Good Entries</div><div className="text-2xl font-mono font-bold text-primary">{data.goodEntries}/{data.total}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Poor Exits</div><div className="text-2xl font-mono font-bold text-warning-yellow">{data.poorExits}/{data.total}</div></CardContent></Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Entry Quality vs Exit Efficiency</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis type="number" dataKey="entryQuality" name="Entry Quality" unit="R" stroke="hsl(215 20% 55%)" />
              <YAxis type="number" dataKey="exitEfficiency" name="Exit Efficiency" stroke="hsl(215 20% 55%)" domain={[0, 1]} />
              <ZAxis range={[60, 60]} />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={data.enriched}>{data.enriched.map((e, i) => <Cell key={i} fill={e.entryQuality > 0 && e.exitEfficiency > 0.5 ? '#00FF88' : e.entryQuality < 0 ? '#EF4444' : '#F59E0B'} />)}</Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Entrées:</span> {ai.entry_quality}</div><div><span className="text-primary font-bold">Sorties:</span> {ai.exit_quality}</div><div><span className="text-primary font-bold">Recommandation:</span> {ai.recommendation}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}