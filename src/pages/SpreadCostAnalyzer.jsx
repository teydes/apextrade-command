import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Receipt, Brain, Loader2, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function SpreadCostAnalyzer() {
  const [spreadPips, setSpreadPips] = useState(0.8);
  const [pipValue, setPipValue] = useState(10);
  const [tradesPerMonth, setTradesPerMonth] = useState(50);
  const [commissionPerTrade, setCommissionPerTrade] = useState(3.5);
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const calc = useMemo(() => {
    const spreadCostPerTrade = spreadPips * pipValue;
    const totalCostPerTrade = spreadCostPerTrade + commissionPerTrade;
    const monthlyCost = totalCostPerTrade * tradesPerMonth;
    const yearlyCost = monthlyCost * 12;
    const yearlySpread = spreadCostPerTrade * tradesPerMonth * 12;
    const yearlyCommission = commissionPerTrade * tradesPerMonth * 12;
    const scenarios = [];
    for (let s = 0.2; s <= 3; s += 0.3) {
      const cost = (s * pipValue + commissionPerTrade) * tradesPerMonth * 12;
      scenarios.push({ spread: s.toFixed(1), yearlyCost: cost });
    }
    return { spreadCostPerTrade, totalCostPerTrade, monthlyCost, yearlyCost, yearlySpread, yearlyCommission, scenarios };
  }, [spreadPips, pipValue, tradesPerMonth, commissionPerTrade]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Spread/Cost Analysis: Spread=${spreadPips} pips, Pip value=${pipValue}, Commission=${commissionPerTrade}/trade, ${tradesPerMonth} trades/mois. Cost/trade=${calc.totalCostPerTrade.toFixed(2)}, Annuel=${calc.yearlyCost.toFixed(0)} (Spread=${calc.yearlySpread.toFixed(0)}, Commission=${calc.yearlyCommission.toFixed(0)}). Analyse: 1) Impact sur performance, 2) Optimisation (broker/stratégie), 3) Recommandation. Court.`,
        response_json_schema: { type: 'object', properties: { impact: { type: 'string' }, optimization: { type: 'string' }, recommendation: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ impact: 'Erreur', optimization: '', recommendation: '' }); }
    setAiLoading(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Receipt className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Spread & Cost Analyzer</h1><p className="text-sm text-muted-foreground">Impact du spread et commissions sur la rentabilité</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Paramètres</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Spread (pips)</Label><Input type="number" step="0.1" value={spreadPips} onChange={e => setSpreadPips(+e.target.value)} /></div>
            <div><Label>Valeur du pip (devise)</Label><Input type="number" value={pipValue} onChange={e => setPipValue(+e.target.value)} /></div>
            <div><Label>Trades/mois</Label><Input type="number" value={tradesPerMonth} onChange={e => setTradesPerMonth(+e.target.value)} /></div>
            <div><Label>Commission/trade</Label><Input type="number" step="0.1" value={commissionPerTrade} onChange={e => setCommissionPerTrade(+e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card className="card-trading glow-red">
          <CardHeader><CardTitle className="text-sm">Coûts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Spread/trade</span><span className="font-mono text-danger-red">€{calc.spreadCostPerTrade.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Coût total/trade</span><span className="font-mono text-warning-yellow">€{calc.totalCostPerTrade.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Mensuel</span><span className="font-mono text-danger-red">€{calc.monthlyCost.toFixed(0)}</span></div>
            <div className="flex justify-between border-t border-border pt-2"><span className="font-bold text-sm">Annuel</span><span className="font-mono text-2xl font-bold text-danger-red">€{calc.yearlyCost.toFixed(0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Annuel Spread</span><span className="font-mono text-danger-red">€{calc.yearlySpread.toFixed(0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Annuel Commission</span><span className="font-mono text-danger-red">€{calc.yearlyCommission.toFixed(0)}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Coût annuel par niveau de Spread</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={calc.scenarios}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="spread" stroke="hsl(215 20% 55%)" label={{ value: 'Spread (pips)', position: 'insideBottom' }} />
              <YAxis stroke="hsl(215 20% 55%)" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="yearlyCost" radius={[4, 4, 0, 0]}>{calc.scenarios.map((e, i) => <Cell key={i} fill={e.yearlyCost > 5000 ? '#EF4444' : e.yearlyCost > 2000 ? '#F59E0B' : '#00FF88'} />)}</Bar>
              <ReferenceLine y={calc.yearlyCost} stroke="#0088FF" strokeDasharray="5 5" label="Votre niveau" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Impact:</span> {ai.impact}</div><div><span className="text-primary font-bold">Optimisation:</span> {ai.optimization}</div><div><span className="text-primary font-bold">Recommandation:</span> {ai.recommendation}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}