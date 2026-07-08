import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from 'recharts';
import { FlaskConical, Brain, Loader2, Play, CheckCircle, XCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function BacktestEngine() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [splitPct, setSplitPct] = useState(70);

  useEffect(() => {
    base44.entities.Trade.list('-created_date', 500).then(data => {
      setTrades((data || []).filter(t => t.status === 'closed').reverse());
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const results = useMemo(() => {
    if (trades.length < 20) return null;
    const splitIdx = Math.floor(trades.length * (splitPct / 100));
    const inSample = trades.slice(0, splitIdx);
    const outSample = trades.slice(splitIdx);

    const compute = (arr) => {
      const wins = arr.filter(t => t.result === 'win');
      const losses = arr.filter(t => t.result === 'loss');
      const totalPnL = arr.reduce((a, t) => a + (t.pnl || 0), 0);
      const wr = arr.length > 0 ? (wins.length / arr.length) * 100 : 0;
      const avgWin = wins.length > 0 ? wins.reduce((a, t) => a + (t.pnl || 0), 0) / wins.length : 0;
      const avgLoss = losses.length > 0 ? losses.reduce((a, t) => a + (t.pnl || 0), 0) / losses.length : 0;
      const pf = losses.length > 0 && avgLoss !== 0 ? (wins.length * avgWin) / Math.abs(losses.length * avgLoss) : 0;
      let equity = 0, peak = 0, maxDD = 0;
      arr.forEach(t => { equity += t.pnl || 0; if (equity > peak) peak = equity; const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0; if (dd > maxDD) maxDD = dd; });
      return { count: arr.length, wins: wins.length, losses: losses.length, totalPnL, wr, avgWin, avgLoss, pf, maxDD, equity: equity };
    };

    const isStats = compute(inSample);
    const osStats = compute(outSample);

    const wrDegradation = isStats.wr > 0 ? ((osStats.wr - isStats.wr) / isStats.wr) * 100 : 0;
    const pfDegradation = isStats.pf > 0 ? ((osStats.pf - isStats.pf) / isStats.pf) * 100 : 0;
    const pnlDegradation = isStats.totalPnL > 0 ? ((osStats.totalPnL - isStats.totalPnL) / isStats.totalPnL) * 100 : 0;
    const robust = Math.abs(wrDegradation) < 15 && Math.abs(pfDegradation) < 20;

    const isCurve = [];
    let eq1 = 0;
    inSample.forEach((t, i) => { eq1 += t.pnl || 0; isCurve.push({ idx: i + 1, equity: eq1, type: 'IS' }); });
    const osCurve = [];
    let eq2 = eq1;
    outSample.forEach((t, i) => { eq2 += t.pnl || 0; osCurve.push({ idx: splitIdx + i + 1, equity: eq2, type: 'OOS' }); });
    const fullCurve = [...isCurve, ...osCurve];

    return { isStats, osStats, wrDegradation, pfDegradation, pnlDegradation, robust, fullCurve, splitIdx };
  }, [trades, splitPct]);

  const runAI = async () => {
    if (!results) return;
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Walk-Forward Analysis: In-Sample (${results.isStats.count} trades): WR=${results.isStats.wr.toFixed(1)}%, PF=${results.isStats.pf.toFixed(2)}, PnL=${results.isStats.totalPnL.toFixed(0)}, MaxDD=${results.isStats.maxDD.toFixed(1)}%. Out-of-Sample (${results.osStats.count} trades): WR=${results.osStats.wr.toFixed(1)}%, PF=${results.osStats.pf.toFixed(2)}, PnL=${results.osStats.totalPnL.toFixed(0)}. Dégradation WR=${results.wrDegradation.toFixed(1)}%, PF=${results.pfDegradation.toFixed(1)}%. Robuste=${results.robust}. Analyse: 1) Viabilité (overfitting?), 2) Confiance out-of-sample, 3) Recommandations. Court.`,
        response_json_schema: { type: 'object', properties: { viability: { type: 'string' }, confidence: { type: 'string' }, recommendations: { type: 'string' } } }
      });
      setAiAnalysis(res);
    } catch (e) { setAiAnalysis({ viability: 'Erreur', confidence: '', recommendations: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <FlaskConical className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Walk-Forward Backtest Engine</h1>
          <p className="text-sm text-muted-foreground">Validation In-Sample vs Out-of-Sample — détection d'overfitting</p>
        </div>
      </div>

      {!results ? (
        <Card className="card-trading"><CardContent className="py-12 text-center text-muted-foreground">Minimum 20 trades fermés requis</CardContent></Card>
      ) : (
        <>
          <Card className="card-trading">
            <CardContent className="py-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Label>Split In-Sample / Out-of-Sample</Label>
                <Input type="number" min="50" max="90" value={splitPct} onChange={e => setSplitPct(+e.target.value)} className="w-20" />
                <span className="text-sm text-muted-foreground">→ {splitPct}% IS / {100 - splitPct}% OOS</span>
                <div className={`ml-auto flex items-center gap-2 px-3 py-1 rounded ${results.robust ? 'bg-primary/20 text-primary' : 'bg-danger-red/20 text-danger-red'}`}>
                  {results.robust ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  <span className="font-bold">{results.robust ? 'STRATÉGIE ROBUSTE' : 'OVERFITTING DÉTECTÉ'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="card-trading glow-green">
              <CardHeader><CardTitle className="text-sm text-primary">In-Sample ({results.isStats.count} trades)</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Win Rate" value={`${results.isStats.wr.toFixed(1)}%`} />
                <Row label="Profit Factor" value={results.isStats.pf.toFixed(2)} />
                <Row label="Total PnL" value={results.isStats.totalPnL.toFixed(0)} color="text-primary" />
                <Row label="Max Drawdown" value={`${results.isStats.maxDD.toFixed(1)}%`} color="text-danger-red" />
                <Row label="Avg Win" value={results.isStats.avgWin.toFixed(0)} color="text-primary" />
                <Row label="Avg Loss" value={results.isStats.avgLoss.toFixed(0)} color="text-danger-red" />
              </CardContent>
            </Card>
            <Card className="card-trading">
              <CardHeader><CardTitle className="text-sm text-accent">Out-of-Sample ({results.osStats.count} trades)</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Win Rate" value={`${results.osStats.wr.toFixed(1)}%`} />
                <Row label="Profit Factor" value={results.osStats.pf.toFixed(2)} />
                <Row label="Total PnL" value={results.osStats.totalPnL.toFixed(0)} color={results.osStats.totalPnL > 0 ? 'text-primary' : 'text-danger-red'} />
                <Row label="Max Drawdown" value={`${results.osStats.maxDD.toFixed(1)}%`} color="text-danger-red" />
                <Row label="Avg Win" value={results.osStats.avgWin.toFixed(0)} color="text-primary" />
                <Row label="Avg Loss" value={results.osStats.avgLoss.toFixed(0)} color="text-danger-red" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Dégradation WR</div><div className={`text-2xl font-mono font-bold ${Math.abs(results.wrDegradation) < 15 ? 'text-primary' : 'text-danger-red'}`}>{results.wrDegradation > 0 ? '+' : ''}{results.wrDegradation.toFixed(1)}%</div></CardContent></Card>
            <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Dégradation PF</div><div className={`text-2xl font-mono font-bold ${Math.abs(results.pfDegradation) < 20 ? 'text-primary' : 'text-danger-red'}`}>{results.pfDegradation > 0 ? '+' : ''}{results.pfDegradation.toFixed(1)}%</div></CardContent></Card>
            <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Dégradation PnL</div><div className={`text-2xl font-mono font-bold ${results.pnlDegradation > -30 ? 'text-primary' : 'text-danger-red'}`}>{results.pnlDegradation > 0 ? '+' : ''}{results.pnlDegradation.toFixed(1)}%</div></CardContent></Card>
          </div>

          <Card className="card-trading">
            <CardHeader><CardTitle className="text-sm">Equity Curve — IS vs OOS</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={results.fullCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                  <XAxis dataKey="idx" stroke="hsl(215 20% 55%)" />
                  <YAxis stroke="hsl(215 20% 55%)" />
                  <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                  <Line type="monotone" dataKey="equity" stroke="#00FF88" strokeWidth={2} dot={false} />
                  <ReferenceLine x={results.splitIdx} stroke="#F59E0B" strokeDasharray="5 5" label="Split IS/OOS" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="card-trading">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA Walk-Forward</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={runAI} disabled={aiLoading}>
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                Évaluer l'overfitting
              </Button>
              {aiAnalysis && (
                <div className="space-y-2 text-sm">
                  <div><span className="text-primary font-bold">Viabilité:</span> {aiAnalysis.viability}</div>
                  <div><span className="text-primary font-bold">Confiance:</span> {aiAnalysis.confidence}</div>
                  <div><span className="text-primary font-bold">Recommandations:</span> {aiAnalysis.recommendations}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Row({ label, value, color = '' }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className={`font-mono ${color || ''}`}>{value}</span></div>;
}