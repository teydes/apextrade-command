import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sigma, Brain, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ZScoreAnalyzer() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    base44.entities.Trade.list('-created_date', 500).then(d => {
      setTrades((d || []).filter(t => t.status === 'closed'));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const data = useMemo(() => {
    if (trades.length < 20) return null;
    const wins = trades.filter(t => t.result === 'win').length;
    const losses = trades.length - wins;
    const wr = wins / trades.length;
    const lossRate = 1 - wr;
    const R = trades.length;
    let totalRuns = 1;
    let maxStreak = 0;
    let currentStreak = 0;
    let lastResult = null;
    trades.forEach(t => {
      const r = t.result === 'win' ? 'W' : 'L';
      if (r !== lastResult) { totalRuns++; currentStreak = 1; } else { currentStreak++; }
      if (currentStreak > maxStreak) maxStreak = currentStreak;
      lastResult = r;
    });
    const expectedRuns = 1 + 2 * wr * lossRate * R;
    const zScore = (totalRuns - expectedRuns) / Math.sqrt(2 * wr * lossRate * (2 * wr * lossRate * R - wr * lossRate * (1 - 3 * wr * lossRate) - wr * lossRate));
    const isRandom = Math.abs(zScore) < 1.96;
    const streaks = { winMax: 0, lossMax: 0, currentWin: 0, currentLoss: 0 };
    let cw = 0, cl = 0;
    trades.forEach(t => {
      if (t.result === 'win') { cw++; cl = 0; if (cw > streaks.winMax) streaks.winMax = cw; }
      else { cl++; cw = 0; if (cl > streaks.lossMax) streaks.lossMax = cl; }
    });
    streaks.currentWin = cw; streaks.currentLoss = cl;
    return { wins, losses, wr: wr * 100, totalRuns, expectedRuns, zScore, isRandom, maxStreak, streaks, total: R };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Z-Score Analysis: Z=${data.zScore.toFixed(2)}, Runs=${data.totalRuns} (expected ${data.expectedRuns.toFixed(1)}), WR=${data.wr.toFixed(1)}%, Max win streak=${data.streaks.winMax}, Max loss streak=${data.streaks.lossMax}. Random=${data.isRandom}. Analyse: 1) Pattern (trending vs mean-reverting), 2) Significativité, 3) Recommandation. Court.`,
        response_json_schema: { type: 'object', properties: { pattern: { type: 'string' }, significance: { type: 'string' }, recommendation: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ pattern: 'Erreur', significance: '', recommendation: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 20 trades requis</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Sigma className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Z-Score Analyzer</h1><p className="text-sm text-muted-foreground">Test de randomité des séquences de trades</p></div>
      </div>

      <Card className={`card-trading ${data.isRandom ? 'glow-blue' : 'glow-green'}`}>
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            {data.isRandom ? <CheckCircle className="w-12 h-12 text-accent" /> : <XCircle className="w-12 h-12 text-primary" />}
            <div>
              <div className="text-2xl font-bold">{data.isRandom ? 'SÉQUENCE ALÉATOIRE' : 'PATTERN DÉTECTÉ'}</div>
              <div className="text-sm text-muted-foreground">{data.isRandom ? 'Vos trades suivent un pattern aléatoire' : `Pattern ${data.zScore > 0 ? 'tendance (streaks)' : 'mean-reverting (alternance)'}`}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Z-Score</div><div className={`text-2xl font-mono font-bold ${Math.abs(data.zScore) > 1.96 ? 'text-primary' : 'text-accent'}`}>{data.zScore.toFixed(2)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Runs observés</div><div className="text-2xl font-mono font-bold text-accent">{data.totalRuns}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Runs attendus</div><div className="text-2xl font-mono font-bold text-muted-foreground">{data.expectedRuns.toFixed(0)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Win Rate</div><div className="text-2xl font-mono font-bold text-primary">{data.wr.toFixed(1)}%</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Max Win Streak</div><div className="text-2xl font-mono font-bold text-primary">{data.streaks.winMax}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Max Loss Streak</div><div className="text-2xl font-mono font-bold text-danger-red">{data.streaks.lossMax}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Streak Gagnant actuel</div><div className="text-2xl font-mono font-bold text-primary">{data.streaks.currentWin}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Streak Perdant actuel</div><div className="text-2xl font-mono font-bold text-danger-red">{data.streaks.currentLoss}</div></CardContent></Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Pattern:</span> {ai.pattern}</div><div><span className="text-primary font-bold">Significativité:</span> {ai.significance}</div><div><span className="text-primary font-bold">Recommandation:</span> {ai.recommendation}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}