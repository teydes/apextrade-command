import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Grid3x3, Brain, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function SequenceMatrix() {
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
    const wins = trades.filter(t => t.result === 'win').length;
    const wr = wins / trades.length;
    const lr = 1 - wr;
    const matrix = [];
    for (let streak = 1; streak <= 8; streak++) {
      const probLoss = Math.pow(lr, streak);
      const probWin = Math.pow(wr, streak);
      const expectedOccurrenceLoss = Math.floor((trades.length - streak + 1) * probLoss);
      const expectedOccurrenceWin = Math.floor((trades.length - streak + 1) * probWin);
      let actualLoss = 0, actualWin = 0, current = 0, lastResult = null;
      trades.forEach(t => {
        const r = t.result === 'win' ? 'W' : 'L';
        if (r === lastResult) current++; else current = 1;
        if (current === streak) { if (r === 'W') actualWin++; else actualLoss++; current = 0; }
        lastResult = r;
      });
      matrix.push({ streak, probLoss: probLoss * 100, probWin: probWin * 100, expectedLoss: expectedOccurrenceLoss, expectedWin: expectedOccurrenceWin, actualLoss, actualWin });
    }
    const maxLossStreak = matrix.reduce((max, m) => m.actualLoss > 0 ? m.streak : max, 0);
    const maxWinStreak = matrix.reduce((max, m) => m.actualWin > 0 ? m.streak : max, 0);
    return { matrix, wr: wr * 100, lr: lr * 100, maxLossStreak, maxWinStreak, total: trades.length };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Sequence Matrix: WR=${data.wr.toFixed(1)}%, Max loss streak=${data.maxLossStreak}, Max win streak=${data.maxWinStreak}. Analyse: 1) Conformité avec probabilités, 2) Anomalies (streaks excessifs), 3) Impact psychologique. Court.`,
        response_json_schema: { type: 'object', properties: { conformity: { type: 'string' }, anomalies: { type: 'string' }, psychology: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ conformity: 'Erreur', anomalies: '', psychology: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 20 trades requis</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Grid3x3 className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Sequence Matrix</h1><p className="text-sm text-muted-foreground">Probabilités de streaks vs réalité</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Win Rate</div><div className="text-2xl font-mono font-bold text-primary">{data.wr.toFixed(1)}%</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Loss Rate</div><div className="text-2xl font-mono font-bold text-danger-red">{data.lr.toFixed(1)}%</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Max Loss Streak</div><div className="text-2xl font-mono font-bold text-danger-red">{data.maxLossStreak}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Max Win Streak</div><div className="text-2xl font-mono font-bold text-primary">{data.maxWinStreak}</div></CardContent></Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Matrice des Probabilités de Streaks</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border"><th className="text-left p-2">Streak</th><th className="text-right p-2">P(Loss streak)</th><th className="text-right p-2">P(Win streak)</th><th className="text-right p-2">Expected L</th><th className="text-right p-2">Actual L</th><th className="text-right p-2">Expected W</th><th className="text-right p-2">Actual W</th></tr></thead>
              <tbody>
                {data.matrix.map(m => (
                  <tr key={m.streak} className="border-b border-border/50 row-hover">
                    <td className="p-2 font-mono font-bold">{m.streak}x</td>
                    <td className="p-2 text-right font-mono text-danger-red">{m.probLoss < 0.1 ? '<0.1' : m.probLoss.toFixed(1)}%</td>
                    <td className="p-2 text-right font-mono text-primary">{m.probWin < 0.1 ? '<0.1' : m.probWin.toFixed(1)}%</td>
                    <td className="p-2 text-right font-mono text-muted-foreground">{m.expectedLoss}</td>
                    <td className={`p-2 text-right font-mono ${m.actualLoss > m.expectedLoss ? 'text-danger-red font-bold' : ''}`}>{m.actualLoss}</td>
                    <td className="p-2 text-right font-mono text-muted-foreground">{m.expectedWin}</td>
                    <td className={`p-2 text-right font-mono ${m.actualWin > m.expectedWin ? 'text-primary font-bold' : ''}`}>{m.actualWin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Conformité:</span> {ai.conformity}</div><div><span className="text-primary font-bold">Anomalies:</span> {ai.anomalies}</div><div><span className="text-primary font-bold">Psychologie:</span> {ai.psychology}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}