import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from 'recharts';
import { TrendingDown, Waves, Clock, Brain, Loader2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function DrawdownAnalysis() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    base44.entities.Trade.list('-created_date', 500).then(data => {
      setTrades((data || []).filter(t => t.status === 'closed').reverse());
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const analysis = useMemo(() => {
    if (trades.length < 5) return null;
    let equity = 0, peak = 0, maxDD = 0, maxDDEquity = 0, ddStart = 0, ddEnd = 0, recoveryIdx = -1;
    let currentDDStart = 0;
    const underwater = [];
    const equityCurve = [];
    const drawdowns = [];

    trades.forEach((t, i) => {
      equity += t.pnl || 0;
      if (equity > peak) { peak = equity; currentDDStart = i; }
      const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
      underwater.push({ idx: i + 1, drawdown: -dd, equity });
      equityCurve.push({ idx: i + 1, equity, peak });
      if (dd > maxDD) { maxDD = dd; ddStart = currentDDStart; ddEnd = i; maxDDEquity = equity; }
    });

    const ddDurations = [];
    let inDD = false, ddStartIdx = 0;
    underwater.forEach((d, i) => {
      if (d.drawdown < 0 && !inDD) { inDD = true; ddStartIdx = i; }
      if (d.drawdown >= 0 && inDD) { inDD = false; ddDurations.push(i - ddStartIdx); }
    });

    const avgDD = underwater.reduce((a, d) => a + Math.abs(d.drawdown), 0) / underwater.length;
    const maxDuration = ddDurations.length > 0 ? Math.max(...ddDurations) : 0;
    const recoveryTime = maxDuration;
    const ulcerIndex = Math.sqrt(underwater.reduce((a, d) => a + d.drawdown * d.drawdown, 0) / underwater.length);

    return { underwater, equityCurve, maxDD, avgDD, maxDuration, recoveryTime, ulcerIndex, ddStart, ddEnd, drawdowns };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse drawdown: Max DD=${analysis?.maxDD?.toFixed(1)}%, Avg DD=${analysis?.avgDD?.toFixed(1)}%, Max duration=${analysis?.maxDuration} trades, Ulcer Index=${analysis?.ulcerIndex?.toFixed(2)}. Donne: 1) Gravité du drawdown, 2) Comparaison aux standards pro (<10% bon, >25% critique), 3) Stratégies de réduction. Court.`,
        response_json_schema: { type: 'object', properties: { severity: { type: 'string' }, benchmark: { type: 'string' }, strategies: { type: 'string' } } }
      });
      setAiAnalysis(res);
    } catch (e) { setAiAnalysis({ severity: 'Erreur', benchmark: '', strategies: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <TrendingDown className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Drawdown Analysis</h1>
          <p className="text-sm text-muted-foreground">Underwater equity curve, profondeur et durée des drawdowns</p>
        </div>
      </div>

      {!analysis ? (
        <Card className="card-trading"><CardContent className="py-12 text-center text-muted-foreground">Pas assez de trades</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="card-trading glow-red"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Max Drawdown</div><div className="text-3xl font-mono font-bold text-danger-red">{analysis.maxDD.toFixed(1)}%</div></CardContent></Card>
            <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Avg Drawdown</div><div className="text-2xl font-mono font-bold text-warning-yellow">{analysis.avgDD.toFixed(1)}%</div></CardContent></Card>
            <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Max Duration</div><div className="text-2xl font-mono font-bold text-accent">{analysis.maxDuration} trades</div></CardContent></Card>
            <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Waves className="w-3 h-3" /> Ulcer Index</div><div className="text-2xl font-mono font-bold text-primary">{analysis.ulcerIndex.toFixed(2)}</div></CardContent></Card>
          </div>

          <Card className="card-trading">
            <CardHeader><CardTitle className="text-sm">Underwater Equity Curve</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={analysis.underwater}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                  <XAxis dataKey="idx" stroke="hsl(215 20% 55%)" />
                  <YAxis stroke="hsl(215 20% 55%)" />
                  <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                  <Area type="monotone" dataKey="drawdown" stroke="#EF4444" fill="#EF444444" />
                  <ReferenceLine y={0} stroke="#00FF88" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="card-trading">
            <CardHeader><CardTitle className="text-sm">Equity vs Peak</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={analysis.equityCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                  <XAxis dataKey="idx" stroke="hsl(215 20% 55%)" />
                  <YAxis stroke="hsl(215 20% 55%)" />
                  <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                  <Area type="monotone" dataKey="peak" stroke="#0088FF" fill="#0088FF22" />
                  <Area type="monotone" dataKey="equity" stroke="#00FF88" fill="#00FF8822" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="card-trading">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA du Drawdown</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={runAI} disabled={aiLoading}>
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                Analyser la gravité du drawdown
              </Button>
              {aiAnalysis && (
                <div className="space-y-2 text-sm">
                  <div><span className="text-primary font-bold">Gravité:</span> {aiAnalysis.severity}</div>
                  <div><span className="text-primary font-bold">Benchmark:</span> {aiAnalysis.benchmark}</div>
                  <div><span className="text-primary font-bold">Stratégies:</span> {aiAnalysis.strategies}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}