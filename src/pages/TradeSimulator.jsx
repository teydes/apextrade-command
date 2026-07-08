import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { Dices, FlaskConical, Brain, Loader2, TrendingUp, RotateCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function TradeSimulator() {
  const [startCapital, setStartCapital] = useState(10000);
  const [tradesPerMonth, setTradesPerMonth] = useState(30);
  const [winRate, setWinRate] = useState(55);
  const [avgWinR, setAvgWinR] = useState(2);
  const [avgLossR, setAvgLossR] = useState(1);
  const [riskPct, setRiskPct] = useState(1);
  const [months, setMonths] = useState(12);
  const [simulations, setSimulations] = useState(100);
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const runSimulation = () => {
    setRunning(true);
    setTimeout(() => {
      const p = winRate / 100;
      const q = 1 - p;
      const allPaths = [];
      const finalBalances = [];

      for (let s = 0; s < simulations; s++) {
        let balance = startCapital;
        const path = [{ month: 0, balance }];
        for (let m = 1; m <= months; m++) {
          for (let t = 0; t < tradesPerMonth; t++) {
            const riskAmount = balance * (riskPct / 100);
            if (Math.random() < p) balance += riskAmount * avgWinR;
            else balance -= riskAmount * avgLossR;
            if (balance <= 0) { balance = 0; break; }
          }
          path.push({ month: m, balance, sim: s });
          if (balance <= 0) break;
        }
        allPaths.push(path);
        finalBalances.push(balance);
      }

      finalBalances.sort((a, b) => a - b);
      const median = finalBalances[Math.floor(simulations * 0.5)];
      const p5 = finalBalances[Math.floor(simulations * 0.05)];
      const p95 = finalBalances[Math.floor(simulations * 0.95)];
      const mean = finalBalances.reduce((a, b) => a + b, 0) / simulations;
      const blown = finalBalances.filter(b => b <= 0).length;
      const probProfit = finalBalances.filter(b => b > startCapital).length / simulations * 100;

      const medianPath = allPaths.sort((a, b) => a[a.length - 1].balance - b[b.length - 1].balance)[Math.floor(simulations * 0.5)];
      const bestPath = allPaths.reduce((a, b) => (a[a.length-1].balance > b[b.length-1].balance ? a : b));
      const worstPath = allPaths.reduce((a, b) => (a[a.length-1].balance < b[b.length-1].balance ? a : b));

      setResults({ median, p5, p95, mean, blown, probProfit, medianPath, bestPath, worstPath });
      setRunning(false);
    }, 50);
  };

  const chartData = useMemo(() => {
    if (!results) return [];
    const data = [];
    for (let m = 0; m <= months; m++) {
      data.push({
        month: m,
        median: results.medianPath[m]?.balance || 0,
        best: results.bestPath[m]?.balance || 0,
        worst: results.worstPath[m]?.balance || 0,
      });
    }
    return data;
  }, [results, months]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Simulation Monte Carlo trading: ${simulations} runs sur ${months} mois. Win rate=${winRate}%, Risk=${riskPct}%, Avg Win=${avgWinR}R, Avg Loss=${avgLossR}R. Résultats: Médian=${results?.median?.toFixed(0)}, P5=${results?.p5?.toFixed(0)}, P95=${results?.p95?.toFixed(0)}, Probabilité profit=${results?.probProfit?.toFixed(0)}%, Comptes blown=${results?.blown}. Analyse: viabilité, risques, ajustements recommandés.`,
        response_json_schema: { type: 'object', properties: { viability: { type: 'string' }, risks: { type: 'string' }, adjustments: { type: 'string' } } }
      });
      setAiAnalysis(res);
    } catch (e) { setAiAnalysis({ viability: 'Erreur', risks: '', adjustments: '' }); }
    setAiLoading(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <FlaskConical className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Trade Simulator</h1>
          <p className="text-sm text-muted-foreground">Simulateur Monte Carlo - projetez {simulations} scénarios futurs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Paramètres</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Capital départ</Label><Input type="number" value={startCapital} onChange={e => setStartCapital(+e.target.value)} /></div>
            <div><Label>Trades/mois</Label><Input type="number" value={tradesPerMonth} onChange={e => setTradesPerMonth(+e.target.value)} /></div>
            <div><Label>Win Rate (%)</Label><Input type="number" value={winRate} onChange={e => setWinRate(+e.target.value)} /></div>
            <div><Label>Avg Win (R)</Label><Input type="number" step="0.1" value={avgWinR} onChange={e => setAvgWinR(+e.target.value)} /></div>
            <div><Label>Avg Loss (R)</Label><Input type="number" step="0.1" value={avgLossR} onChange={e => setAvgLossR(+e.target.value)} /></div>
            <div><Label>Risk/Trade (%)</Label><Input type="number" step="0.1" value={riskPct} onChange={e => setRiskPct(+e.target.value)} /></div>
            <div><Label>Mois</Label><Input type="number" value={months} onChange={e => setMonths(+e.target.value)} /></div>
            <div><Label>Simulations</Label><Input type="number" value={simulations} onChange={e => setSimulations(+e.target.value)} /></div>
            <Button onClick={runSimulation} disabled={running} className="w-full">
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Dices className="w-4 h-4" />}
              Lancer {simulations} simulations
            </Button>
          </CardContent>
        </Card>

        {results && (
          <>
            <Card className="card-trading">
              <CardHeader><CardTitle className="text-sm">Résultats ({simulations} runs)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between"><span className="text-muted-foreground">Balance médiane</span><span className="font-mono text-lg text-primary">€{results.median.toFixed(0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Moyenne</span><span className="font-mono text-lg text-accent">€{results.mean.toFixed(0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">P5 (pessimiste)</span><span className="font-mono text-lg text-danger-red">€{results.p5.toFixed(0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">P95 (optimiste)</span><span className="font-mono text-lg text-primary">€{results.p95.toFixed(0)}</span></div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between"><span className="text-muted-foreground">Probabilité profit</span><span className="font-mono text-lg text-primary">{results.probProfit.toFixed(0)}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Comptes blown</span><span className="font-mono text-lg text-danger-red">{results.blown}/{simulations}</span></div>
                </div>
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
                    <div><span className="text-primary font-bold">Viabilité:</span> {aiAnalysis.viability}</div>
                    <div><span className="text-primary font-bold">Risques:</span> {aiAnalysis.risks}</div>
                    <div><span className="text-primary font-bold">Ajustements:</span> {aiAnalysis.adjustments}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {results && (
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Projection Equity Curve ({months} mois)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                <XAxis dataKey="month" label={{ value: 'Mois', position: 'insideBottom' }} stroke="hsl(215 20% 55%)" />
                <YAxis stroke="hsl(215 20% 55%)" />
                <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                <Area type="monotone" dataKey="best" name="Best case" stroke="#00FF88" fill="#00FF8811" />
                <Area type="monotone" dataKey="median" name="Médiane" stroke="#0088FF" fill="#0088FF22" />
                <Area type="monotone" dataKey="worst" name="Worst case" stroke="#EF4444" fill="#EF444411" />
                <ReferenceLine y={startCapital} stroke="#F59E0B" strokeDasharray="5 5" label="Capital initial" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}