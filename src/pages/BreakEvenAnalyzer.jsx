import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { Target, Brain, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function BreakEvenAnalyzer() {
  const [avgWinR, setAvgWinR] = useState(2);
  const [avgLossR, setAvgLossR] = useState(1);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    base44.entities.Trade.list('-created_date', 500).then(data => {
      setTrades((data || []).filter(t => t.status === 'closed'));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const breakEvenWR = useMemo(() => {
    return avgLossR / (avgWinR + avgLossR) * 100;
  }, [avgWinR, avgLossR]);

  const curve = useMemo(() => {
    const data = [];
    for (let wr = 0; wr <= 100; wr += 2) {
      const p = wr / 100;
      const expectancy = (p * avgWinR) - ((1 - p) * avgLossR);
      data.push({ wr, expectancy, breakeven: 0 });
    }
    return data;
  }, [avgWinR, avgLossR]);

  const currentStats = useMemo(() => {
    if (trades.length < 5) return null;
    const wins = trades.filter(t => t.result === 'win');
    const wr = (wins.length / trades.length) * 100;
    const edge = wr - breakEvenWR;
    return { wr, edge, trades: trades.length, profitable: edge > 0 };
  }, [trades, breakEvenWR]);

  const scenarios = useMemo(() => {
    const data = [];
    for (let wr = 30; wr <= 70; wr += 5) {
      const p = wr / 100;
      const expectancy = (p * avgWinR) - ((1 - p) * avgLossR);
      const monthly = expectancy * 30;
      data.push({ wr, expectancy: expectancy.toFixed(3), monthly: monthly.toFixed(1), isBreakeven: wr === Math.round(breakEvenWR / 5) * 5 });
    }
    return data;
  }, [avgWinR, avgLossR, breakEvenWR]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse Break-Even: R:R=${avgWinR}:${avgLossR}, Break-even WR=${breakEvenWR.toFixed(1)}%. ${currentStats ? `WR actuel=${currentStats.wr.toFixed(1)}%, Edge=${currentStats.edge.toFixed(1)}%.` : ''} Analyse: 1) Marge de sécurité, 2) Sensibilité (impact de -5% WR), 3) Recommandation (améliorer WR vs R:R). Court.`,
        response_json_schema: { type: 'object', properties: { safety_margin: { type: 'string' }, sensitivity: { type: 'string' }, recommendation: { type: 'string' } } }
      });
      setAiAnalysis(res);
    } catch (e) { setAiAnalysis({ safety_margin: 'Erreur', sensitivity: '', recommendation: '' }); }
    setAiLoading(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Target className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Break-Even Analyzer</h1>
          <p className="text-sm text-muted-foreground">Win rate minimum requis vs votre edge actuel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Paramètres R:R</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Avg Win (R)</Label><Input type="number" step="0.1" value={avgWinR} onChange={e => setAvgWinR(+e.target.value)} /></div>
            <div><Label>Avg Loss (R)</Label><Input type="number" step="0.1" value={avgLossR} onChange={e => setAvgLossR(+e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card className="card-trading glow-green">
          <CardHeader><CardTitle className="text-sm">Break-Even Win Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div className="text-4xl font-mono font-bold text-primary">{breakEvenWR.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground mt-2">Minimum pour être profitable</div>
            </div>
            {currentStats && (
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Votre WR</span><span className="font-mono font-bold">{currentStats.wr.toFixed(1)}%</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Edge</span><span className={`font-mono font-bold ${currentStats.edge > 0 ? 'text-primary' : 'text-danger-red'}`}>{currentStats.edge > 0 ? '+' : ''}{currentStats.edge.toFixed(1)}%</span></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={runAI} disabled={aiLoading} className="w-full">
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              Analyser
            </Button>
            {aiAnalysis && (
              <div className="space-y-2 text-xs">
                <div><span className="text-primary font-bold">Marge:</span> {aiAnalysis.safety_margin}</div>
                <div><span className="text-primary font-bold">Sensibilité:</span> {aiAnalysis.sensitivity}</div>
                <div><span className="text-primary font-bold">Recommandation:</span> {aiAnalysis.recommendation}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {currentStats && (
        <Card className={`card-trading ${currentStats.profitable ? 'glow-green' : 'glow-red'}`}>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              {currentStats.profitable ? <CheckCircle className="w-8 h-8 text-primary" /> : <XCircle className="w-8 h-8 text-danger-red" />}
              <div>
                <div className="font-bold text-lg">{currentStats.profitable ? 'STRATÉGIE PROFITABLE' : 'STRATÉGIE NON PROFITABLE'}</div>
                <div className="text-sm text-muted-foreground">
                  {currentStats.profitable
                    ? `Vous avez ${currentStats.edge.toFixed(1)}% de marge au-dessus du break-even`
                    : `Vous êtes ${Math.abs(currentStats.edge).toFixed(1)}% sous le break-even`}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Expectancy vs Win Rate</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={curve}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="wr" label={{ value: 'Win Rate (%)', position: 'insideBottom' }} stroke="hsl(215 20% 55%)" />
              <YAxis stroke="hsl(215 20% 55%)" label={{ value: 'Expectancy (R)', angle: -90, position: 'insideLeft' }} />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Area type="monotone" dataKey="expectancy" stroke="#00FF88" fill="#00FF8822" />
              <ReferenceLine y={0} stroke="#F59E0B" strokeDasharray="5 5" label="Break-Even" />
              {currentStats && <ReferenceLine x={currentStats.wr} stroke="#0088FF" strokeDasharray="5 5" label="Votre WR" />}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Scénarios</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2">Win Rate</th>
                  <th className="text-right p-2">Expectancy (R)</th>
                  <th className="text-right p-2">Retour mensuel (R)</th>
                  <th className="text-center p-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map(s => (
                  <tr key={s.wr} className={`border-b border-border/50 ${s.isBreakeven ? 'bg-warning-yellow/10' : ''}`}>
                    <td className="p-2 font-mono">{s.wr}%</td>
                    <td className={`p-2 font-mono text-right ${parseFloat(s.expectancy) > 0 ? 'text-primary' : 'text-danger-red'}`}>{s.expectancy}</td>
                    <td className={`p-2 font-mono text-right ${parseFloat(s.monthly) > 0 ? 'text-primary' : 'text-danger-red'}`}>{s.monthly}</td>
                    <td className="p-2 text-center">
                      {parseFloat(s.expectancy) > 0 ? <CheckCircle className="w-4 h-4 text-primary inline" /> : <XCircle className="w-4 h-4 text-danger-red inline" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}