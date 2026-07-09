import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { Search, Brain, Loader2, Target } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function OptimalRiskFinder() {
  const [accountSize, setAccountSize] = useState(100000);
  const [winRate, setWinRate] = useState(55);
  const [avgWinR, setAvgWinR] = useState(2);
  const [avgLossR, setAvgLossR] = useState(1);
  const [maxDD, setMaxDD] = useState(20);
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const simulation = useMemo(() => {
    const results = [];
    for (let riskPct = 0.5; riskPct <= 10; riskPct += 0.5) {
      let equities = [];
      let ddBreaches = 0;
      const runs = 1000;
      const tradesPerRun = 200;
      for (let r = 0; r < runs; r++) {
        let equity = accountSize;
        let peak = accountSize;
        let maxDrawdown = 0;
        for (let t = 0; t < tradesPerRun; t++) {
          const isWin = Math.random() < (winRate / 100);
          const pnl = isWin ? equity * (riskPct / 100) * avgWinR : -equity * (riskPct / 100) * avgLossR;
          equity += pnl;
          if (equity > peak) peak = equity;
          const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
          if (dd > maxDrawdown) maxDrawdown = dd;
          if (equity <= 0) { equity = 0; break; }
        }
        equities.push(equity);
        if (maxDrawdown > maxDD) ddBreaches++;
      }
      const avgEquity = equities.reduce((a, b) => a + b, 0) / runs;
      const medianEquity = [...equities].sort((a, b) => a - b)[Math.floor(runs / 2)];
      const survivalRate = ((runs - ddBreaches) / runs) * 100;
      const growthRate = ((avgEquity - accountSize) / accountSize) * 100;
      const score = growthRate * (survivalRate / 100);
      results.push({ riskPct, avgEquity, medianEquity, survivalRate, growthRate, ddBreaches, score });
    }
    const optimal = results.reduce((max, r) => r.score > max.score ? r : max, results[0]);
    return { results, optimal };
  }, [accountSize, winRate, avgWinR, avgLossR, maxDD]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Optimal Risk Finder: WR=${winRate}%, R:R=${avgWinR}:${avgLossR}, Max DD toléré=${maxDD}%. Optimal risk=${simulation.optimal.riskPct}% (growth=${simulation.optimal.growthRate.toFixed(0)}%, survival=${simulation.optimal.survivalRate.toFixed(0)}%). Analyse: 1) Niveau de risque optimal, 2) Trade-off risque/rendement, 3) Recommandation. Court.`,
        response_json_schema: { type: 'object', properties: { optimal_risk: { type: 'string' }, tradeoff: { type: 'string' }, recommendation: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ optimal_risk: 'Erreur', tradeoff: '', recommendation: '' }); }
    setAiLoading(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Search className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Optimal Risk Finder</h1><p className="text-sm text-muted-foreground">Monte Carlo pour trouver le risk % optimal</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-trading">
          <CardContent className="pt-4 space-y-3">
            <div><Label>Capital</Label><Input type="number" value={accountSize} onChange={e => setAccountSize(+e.target.value)} /></div>
            <div><Label>Win Rate %</Label><Input type="number" step="0.1" value={winRate} onChange={e => setWinRate(+e.target.value)} /></div>
          </CardContent>
        </Card>
        <Card className="card-trading">
          <CardContent className="pt-4 space-y-3">
            <div><Label>Avg Win (R)</Label><Input type="number" step="0.1" value={avgWinR} onChange={e => setAvgWinR(+e.target.value)} /></div>
            <div><Label>Avg Loss (R)</Label><Input type="number" step="0.1" value={avgLossR} onChange={e => setAvgLossR(+e.target.value)} /></div>
          </CardContent>
        </Card>
        <Card className="card-trading">
          <CardContent className="pt-4 space-y-3">
            <div><Label>Max DD toléré %</Label><Input type="number" value={maxDD} onChange={e => setMaxDD(+e.target.value)} /></div>
          </CardContent>
        </Card>
        <Card className="card-trading glow-green">
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> Risk Optimal</div>
            <div className="text-3xl font-mono font-bold text-primary">{simulation.optimal.riskPct}%</div>
            <div className="text-xs text-muted-foreground mt-1">Growth: {simulation.optimal.growthRate.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">Survival: {simulation.optimal.survivalRate.toFixed(0)}%</div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Growth Rate vs Risk %</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={simulation.results}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="riskPct" stroke="hsl(215 20% 55%)" unit="%" />
              <YAxis stroke="hsl(215 20% 55%)" unit="%" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Area type="monotone" dataKey="growthRate" stroke="#00FF88" fill="#00FF8822" />
              <ReferenceLine x={simulation.optimal.riskPct} stroke="#F59E0B" strokeDasharray="5 5" label="Optimal" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Survival Rate vs Risk %</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={simulation.results}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="riskPct" stroke="hsl(215 20% 55%)" unit="%" />
              <YAxis stroke="hsl(215 20% 55%)" unit="%" domain={[0, 100]} />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Area type="monotone" dataKey="survivalRate" stroke="#0088FF" fill="#0088FF22" />
              <ReferenceLine y={95} stroke="#F59E0B" strokeDasharray="5 5" label="Min 95%" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Risk optimal:</span> {ai.optimal_risk}</div><div><span className="text-primary font-bold">Trade-off:</span> {ai.tradeoff}</div><div><span className="text-primary font-bold">Recommandation:</span> {ai.recommendation}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}