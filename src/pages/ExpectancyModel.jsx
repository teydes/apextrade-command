import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, Calculator, Sigma } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ExpectancyModel() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [customWR, setCustomWR] = useState(null);
  const [customWinR, setCustomWinR] = useState(null);
  const [customLossR, setCustomLossR] = useState(null);

  useEffect(() => {
    base44.entities.Trade.list('-created_date', 500).then(data => {
      setTrades((data || []).filter(t => t.status === 'closed'));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    if (trades.length < 5) return null;
    const wins = trades.filter(t => t.result === 'win');
    const losses = trades.filter(t => t.result === 'loss');
    const bes = trades.filter(t => t.result === 'breakeven');
    const winRate = (wins.length / trades.length) * 100;
    const lossRate = (losses.length / trades.length) * 100;
    const beRate = (bes.length / trades.length) * 100;

    const avgWinR = wins.length > 0 ? wins.reduce((a, t) => a + (t.risk_reward || (t.pnl > 0 && t.pnl_pct ? Math.abs(t.pnl / (t.pnl_pct || 1)) : 1.5)), 0) / wins.length : 0;
    const avgLossR = losses.length > 0 ? losses.reduce((a, t) => a + (t.risk_reward || 1), 0) / losses.length : 1;

    const wr = customWR ?? winRate / 100;
    const awr = customWinR ?? avgWinR;
    const alr = customLossR ?? avgLossR;
    const beRateAdj = beRate / 100;
    const effectiveWR = wr;
    const effectiveLR = 1 - wr - beRateAdj;

    const expectancy = (effectiveWR * awr) - (effectiveLR * alr);
    const expectancyPct = expectancy * 100;
    const expectancyDollar = expectancy;

    const tradesPerMonth = 30;
    const monthlyExpectancy = expectancy * tradesPerMonth;
    const riskPerTrade = 1;
    const monthlyReturnPct = monthlyExpectancy * riskPerTrade;

    return {
      winRate, lossRate, beRate, avgWinR, avgLossR,
      expectancy, expectancyPct, monthlyExpectancy, monthlyReturnPct,
      tradesCount: trades.length, wins: wins.length, losses: losses.length, bes: bes.length,
      wr, awr, alr
    };
  }, [trades, customWR, customWinR, customLossR]);

  const runAI = async () => {
    if (!stats) return;
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse d'expectancy: Win rate=${stats.winRate.toFixed(1)}%, Avg Win=${stats.avgWinR.toFixed(2)}R, Avg Loss=${stats.avgLossR.toFixed(2)}R, Expectancy=${stats.expectancy.toFixed(3)}R/trade, Retour mensuel estimé=${stats.monthlyReturnPct.toFixed(1)}%. Analyse: 1) L'edge est-il suffisant? 2) Comment améliorer l'expectancy (augmenter WR vs R:R)? 3) Seuil de viabilité. Court.`,
        response_json_schema: { type: 'object', properties: { edge_assessment: { type: 'string' }, improvement: { type: 'string' }, viability: { type: 'string' } } }
      });
      setAiAnalysis(res);
    } catch (e) { setAiAnalysis({ edge_assessment: 'Erreur', improvement: '', viability: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Sigma className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Expectancy Model</h1>
          <p className="text-sm text-muted-foreground">E = (WR × AvgWin) − (LR × AvgLoss) — votre edge mathématique</p>
        </div>
      </div>

      {!stats ? (
        <Card className="card-trading"><CardContent className="py-12 text-center text-muted-foreground">Pas assez de trades</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="card-trading glow-green"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Expectancy / Trade</div><div className={`text-3xl font-mono font-bold ${stats.expectancy > 0 ? 'text-primary' : 'text-danger-red'}`}>{stats.expectancy.toFixed(3)}R</div></CardContent></Card>
            <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Retour mensuel estimé</div><div className="text-2xl font-mono font-bold text-accent">{stats.monthlyReturnPct.toFixed(1)}%</div></CardContent></Card>
            <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Win Rate</div><div className="text-2xl font-mono font-bold text-primary">{stats.winRate.toFixed(1)}%</div></CardContent></Card>
            <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Avg R:R</div><div className="text-2xl font-mono font-bold text-accent">{stats.avgWinR.toFixed(2)}:{stats.avgLossR.toFixed(2)}</div></CardContent></Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="card-trading">
              <CardHeader><CardTitle className="text-sm">Statistiques réelles</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total trades</span><span className="font-mono">{stats.tradesCount}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Wins / Losses / BE</span><span className="font-mono text-primary">{stats.wins} / <span className="text-danger-red">{stats.losses}</span> / {stats.bes}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Win Rate</span><span className="font-mono text-primary">{stats.winRate.toFixed(1)}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Loss Rate</span><span className="font-mono text-danger-red">{stats.lossRate.toFixed(1)}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Avg Win</span><span className="font-mono text-primary">{stats.avgWinR.toFixed(2)}R</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Avg Loss</span><span className="font-mono text-danger-red">{stats.avgLossR.toFixed(2)}R</span></div>
              </CardContent>
            </Card>

            <Card className="card-trading">
              <CardHeader><CardTitle className="text-sm">Simulateur (What-If)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Win Rate (%) — vide = réel</Label><Input type="number" placeholder={stats.winRate.toFixed(1)} onChange={e => setCustomWR(e.target.value ? +e.target.value / 100 : null)} /></div>
                <div><Label>Avg Win (R) — vide = réel</Label><Input type="number" step="0.1" placeholder={stats.avgWinR.toFixed(2)} onChange={e => setCustomWinR(e.target.value ? +e.target.value : null)} /></div>
                <div><Label>Avg Loss (R) — vide = réel</Label><Input type="number" step="0.1" placeholder={stats.avgLossR.toFixed(2)} onChange={e => setCustomLossR(e.target.value ? +e.target.value : null)} /></div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between text-lg"><span className="text-muted-foreground">Expectancy simulée</span><span className={`font-mono font-bold ${stats.expectancy > 0 ? 'text-primary' : 'text-danger-red'}`}>{stats.expectancy.toFixed(3)}R</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Retour mensuel</span><span className="font-mono text-accent">{stats.monthlyReturnPct.toFixed(1)}%</span></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="card-trading">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA de l'Edge</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={runAI} disabled={aiLoading}>
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                Évaluer la viabilité de l'edge
              </Button>
              {aiAnalysis && (
                <div className="space-y-2 text-sm">
                  <div><span className="text-primary font-bold">Edge:</span> {aiAnalysis.edge_assessment}</div>
                  <div><span className="text-primary font-bold">Amélioration:</span> {aiAnalysis.improvement}</div>
                  <div><span className="text-primary font-bold">Viabilité:</span> {aiAnalysis.viability}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}