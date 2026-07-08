import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, Brain, Loader2, Coins, Calculator } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function CompoundingCalculator() {
  const [startCapital, setStartCapital] = useState(10000);
  const [monthlyReturn, setMonthlyReturn] = useState(10);
  const [monthlyContribution, setMonthlyContribution] = useState(0);
  const [months, setMonths] = useState(24);
  const [withdrawalPct, setWithdrawalPct] = useState(0);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const projection = useMemo(() => {
    const data = [{ month: 0, balance: startCapital, contribution: startCapital, gains: 0, withdrawn: 0 }];
    let balance = startCapital;
    let totalContrib = startCapital;
    let totalGains = 0;
    let totalWithdrawn = 0;

    for (let m = 1; m <= months; m++) {
      const gains = balance * (monthlyReturn / 100);
      totalGains += gains;
      balance += gains;
      balance += monthlyContribution;
      totalContrib += monthlyContribution;
      const withdraw = balance * (withdrawalPct / 100);
      balance -= withdraw;
      totalWithdrawn += withdraw;
      data.push({ month: m, balance, contribution: totalContrib, gains: totalGains, withdrawn: totalWithdrawn });
    }

    const finalBalance = balance;
    const totalReturn = ((finalBalance - totalContrib) / totalContrib) * 100;
    const multiplier = finalBalance / startCapital;

    return { data, finalBalance, totalContrib, totalGains, totalWithdrawn, totalReturn, multiplier };
  }, [startCapital, monthlyReturn, monthlyContribution, months, withdrawalPct]);

  const milestones = useMemo(() => {
    const ms = [];
    let balance = startCapital;
    let m = 0;
    const targets = [25000, 50000, 100000, 250000, 500000, 1000000];
    for (const target of targets) {
      while (balance < target && m < 600) {
        balance = balance * (1 + monthlyReturn / 100) + monthlyContribution - balance * (withdrawalPct / 100);
        m++;
      }
      if (m < 600) ms.push({ target, months: m, years: (m / 12).toFixed(1) });
    }
    return ms;
  }, [startCapital, monthlyReturn, monthlyContribution, withdrawalPct]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Projection composé: Capital initial=${startCapital}, Rendement mensuel=${monthlyReturn}%, Contribution mensuelle=${monthlyContribution}, Sur ${months} mois. Résultat: Balance finale=${projection.finalBalance.toFixed(0)}, Gain total=${projection.totalGains.toFixed(0)}, Multiplicateur=${projection.multiplier.toFixed(1)}x. Analyse: 1) Réalisme du rendement, 2) Impact du composé long terme, 3) Risques. Court.`,
        response_json_schema: { type: 'object', properties: { realism: { type: 'string' }, compounding_impact: { type: 'string' }, risks: { type: 'string' } } }
      });
      setAiAnalysis(res);
    } catch (e) { setAiAnalysis({ realism: 'Erreur', compounding_impact: '', risks: '' }); }
    setAiLoading(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Coins className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Compounding Calculator</h1>
          <p className="text-sm text-muted-foreground">Projection de croissance composée avec milestones</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Paramètres</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Capital initial</Label><Input type="number" value={startCapital} onChange={e => setStartCapital(+e.target.value)} /></div>
            <div><Label>Rendement mensuel (%)</Label><Input type="number" step="0.1" value={monthlyReturn} onChange={e => setMonthlyReturn(+e.target.value)} /></div>
            <div><Label>Contribution mensuelle</Label><Input type="number" value={monthlyContribution} onChange={e => setMonthlyContribution(+e.target.value)} /></div>
            <div><Label>Retrait mensuel (%)</Label><Input type="number" step="0.1" value={withdrawalPct} onChange={e => setWithdrawalPct(+e.target.value)} /></div>
            <div><Label>Durée (mois)</Label><Input type="number" value={months} onChange={e => setMonths(+e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card className="card-trading glow-green">
          <CardHeader><CardTitle className="text-sm">Résultats</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Balance finale</span><span className="font-mono text-xl font-bold text-primary">€{projection.finalBalance.toFixed(0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Gains totaux</span><span className="font-mono text-sm text-accent">€{projection.totalGains.toFixed(0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Contributions</span><span className="font-mono text-sm">€{projection.totalContrib.toFixed(0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Retraits</span><span className="font-mono text-sm text-danger-red">€{projection.totalWithdrawn.toFixed(0)}</span></div>
            <div className="flex justify-between border-t border-border pt-2"><span className="font-bold text-sm">Multiplicateur</span><span className="font-mono text-lg font-bold text-primary">{projection.multiplier.toFixed(1)}x</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Retour total</span><span className="font-mono text-sm text-accent">{projection.totalReturn.toFixed(0)}%</span></div>
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
                <div><span className="text-primary font-bold">Réalisme:</span> {aiAnalysis.realism}</div>
                <div><span className="text-primary font-bold">Composé:</span> {aiAnalysis.compounding_impact}</div>
                <div><span className="text-primary font-bold">Risques:</span> {aiAnalysis.risks}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Courbe de Croissance Composée</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={projection.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="month" label={{ value: 'Mois', position: 'insideBottom' }} stroke="hsl(215 20% 55%)" />
              <YAxis stroke="hsl(215 20% 55%)" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Area type="monotone" dataKey="balance" name="Balance" stroke="#00FF88" fill="#00FF8822" />
              <Area type="monotone" dataKey="contribution" name="Contributions" stroke="#0088FF" fill="#0088FF11" />
              <ReferenceLine y={startCapital} stroke="#F59E0B" strokeDasharray="5 5" label="Capital initial" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Milestones</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {milestones.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded bg-secondary/50">
                <div>
                  <div className="text-xs text-muted-foreground">Objectif</div>
                  <div className="font-mono font-bold text-primary">€{m.target.toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Atteint en</div>
                  <div className="font-mono font-bold text-accent">{m.months} mois</div>
                  <div className="text-xs text-muted-foreground">({m.years} ans)</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}