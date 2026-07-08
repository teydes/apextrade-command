import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Zap, TrendingDown, DollarSign } from 'lucide-react';

export default function SlippageCalculator() {
  const [tradeSize, setTradeSize] = useState(10);
  const [entryPrice, setEntryPrice] = useState(18500);
  const [slippagePerUnit, setSlippagePerUnit] = useState(0.5);
  const [tradesPerMonth, setTradesPerMonth] = useState(30);
  const [accountSize, setAccountSize] = useState(100000);

  const calc = useMemo(() => {
    const slippageCostPerTrade = tradeSize * slippagePerUnit;
    const monthlyCost = slippageCostPerTrade * tradesPerMonth;
    const yearlyCost = monthlyCost * 12;
    const costPctOfAccount = (yearlyCost / accountSize) * 100;
    const priceImpactPct = (slippagePerUnit / entryPrice) * 100;

    const scenarios = [];
    for (let s = 0; s <= 2; s += 0.25) {
      const cost = tradeSize * s * tradesPerMonth * 12;
      scenarios.push({ slippage: s, yearlyCost: cost, costPct: (cost / accountSize) * 100 });
    }

    return { slippageCostPerTrade, monthlyCost, yearlyCost, costPctOfAccount, priceImpactPct, scenarios };
  }, [tradeSize, entryPrice, slippagePerUnit, tradesPerMonth, accountSize]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Zap className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Slippage Calculator</h1>
          <p className="text-sm text-muted-foreground">Impact du slippage sur la performance long-terme</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Paramètres</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Taille position (unités)</Label><Input type="number" value={tradeSize} onChange={e => setTradeSize(+e.target.value)} /></div>
            <div><Label>Prix d'entrée</Label><Input type="number" value={entryPrice} onChange={e => setEntryPrice(+e.target.value)} /></div>
            <div><Label>Slippage par unité</Label><Input type="number" step="0.1" value={slippagePerUnit} onChange={e => setSlippagePerUnit(+e.target.value)} /></div>
            <div><Label>Trades/mois</Label><Input type="number" value={tradesPerMonth} onChange={e => setTradesPerMonth(+e.target.value)} /></div>
            <div><Label>Capital compte</Label><Input type="number" value={accountSize} onChange={e => setAccountSize(+e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card className="card-trading glow-red">
          <CardHeader><CardTitle className="text-sm">Coût du Slippage</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Par trade</span><span className="font-mono text-lg text-danger-red">€{calc.slippageCostPerTrade.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Par mois</span><span className="font-mono text-lg text-danger-red">€{calc.monthlyCost.toFixed(0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Par an</span><span className="font-mono text-2xl font-bold text-danger-red">€{calc.yearlyCost.toFixed(0)}</span></div>
            <div className="flex justify-between border-t border-border pt-2"><span className="text-muted-foreground text-sm">% du capital/an</span><span className="font-mono text-lg font-bold text-warning-yellow">{calc.costPctOfAccount.toFixed(2)}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Impact prix</span><span className="font-mono text-sm text-accent">{calc.priceImpactPct.toFixed(3)}%</span></div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Impact du Slippage — Scénarios annuels</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={calc.scenarios}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="slippage" stroke="hsl(215 20% 55%)" label={{ value: 'Slippage/unité', position: 'insideBottom' }} />
              <YAxis stroke="hsl(215 20% 55%)" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="yearlyCost" name="Coût annuel" radius={[4, 4, 0, 0]}>
                {calc.scenarios.map((entry, i) => <Cell key={i} fill={entry.costPct > 2 ? '#EF4444' : entry.costPct > 1 ? '#F59E0B' : '#00FF88'} />)}
              </Bar>
              <ReferenceLine y={accountSize * 0.01} stroke="#F59E0B" strokeDasharray="5 5" label="1% du capital" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-warning-yellow" />
            <div className="text-sm">
              <span className="font-bold">Sur 5 ans:</span> <span className="font-mono text-danger-red">€{(calc.yearlyCost * 5).toFixed(0)}</span>
              <span className="text-muted-foreground"> de coût de slippage cumulé — soit </span>
              <span className="font-mono text-warning-yellow">{(calc.costPctOfAccount * 5).toFixed(1)}%</span>
              <span className="text-muted-foreground"> du capital</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}