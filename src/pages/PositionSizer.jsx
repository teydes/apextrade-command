import { useState, useMemo } from 'react';
import { Calculator, TrendingUp, Shield, Brain, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip, Cell, ReferenceLine } from 'recharts';
import { toast } from 'sonner';

export default function PositionSizer() {
  const [accountSize, setAccountSize] = useState(10000);
  const [riskPct, setRiskPct] = useState(1);
  const [entryPrice, setEntryPrice] = useState(15000);
  const [stopLoss, setStopLoss] = useState(14900);
  const [takeProfit, setTakeProfit] = useState(15200);
  const [contractSize, setContractSize] = useState(1);
  const [winRate, setWinRate] = useState(55);
  const [trades, setTrades] = useState(20);

  const riskAmount = accountSize * riskPct / 100;
  const slDistance = Math.abs(entryPrice - stopLoss);
  const tpDistance = Math.abs(takeProfit - entryPrice);
  const rr = slDistance > 0 ? tpDistance / slDistance : 0;
  const contracts = slDistance > 0 ? riskAmount / (slDistance * contractSize) : 0;
  const positionValue = contracts * entryPrice * contractSize;
  const leverage = accountSize > 0 ? positionValue / accountSize : 0;
  const potentialLoss = riskAmount;
  const potentialProfit = riskAmount * rr;

  const edge = (winRate / 100) * rr - (1 - winRate / 100);
  const kelly = edge > 0 ? (winRate / 100 - (1 - winRate / 100) / rr) * 100 : 0;
  const kellyAmount = accountSize * kelly / 100;
  const halfKelly = kelly * 0.5;
  const quarterKelly = kelly * 0.25;

  // Expected value over N trades
  const evPerTrade = riskAmount * edge;
  const evTotal = evPerTrade * trades;

  // Optimal risk analysis (varying risk %)
  const riskAnalysis = useMemo(() => {
    const results = [];
    for (let r = 0.25; r <= 5; r += 0.25) {
      const ra = accountSize * r / 100;
      const ev = ra * edge * trades;
      // Approximate growth (using continuous compounding approximation)
      const growthRate = edge * r / 100;
      const finalBalance = accountSize * Math.exp(growthRate * trades);
      const maxDD = r * 3; // approximate max consecutive losses
      const riskScore = Math.max(0, 100 - r * 15);
      results.push({ risk: r, ev: Math.round(ev), final: Math.round(finalBalance), dd: Math.round(maxDD), score: riskScore });
    }
    return results;
  }, [accountSize, edge, trades]);

  const optimal = riskAnalysis.reduce((best, r) => r.score > best.score ? r : best, riskAnalysis[0]);

  const chartData = riskAnalysis.map(r => ({ risk: `${r.risk}%`, ev: r.ev, final: r.final, score: r.score }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Calculator className="w-5 h-5 text-blue-400" />Position Sizing Optimizer</h1>
        <p className="text-xs text-muted-foreground">Kelly Criterion · Expected Value · Optimal Risk · Growth Rate</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Inputs */}
        <div className="card-trading space-y-3">
          <div className="text-sm font-semibold">Trade Setup</div>
          {[
            { l: 'Capital (€)', v: accountSize, set: setAccountSize },
            { l: 'Risque %', v: riskPct, set: setRiskPct, step: 0.1 },
            { l: 'Prix Entry', v: entryPrice, set: setEntryPrice },
            { l: 'Stop Loss', v: stopLoss, set: setStopLoss },
            { l: 'Take Profit', v: takeProfit, set: setTakeProfit },
            { l: 'Taille contrat', v: contractSize, set: setContractSize, step: 0.1 },
            { l: 'Win Rate %', v: winRate, set: setWinRate },
            { l: 'Nb Trades', v: trades, set: setTrades },
          ].map(f => (
            <div key={f.l}>
              <Label className="text-[10px] text-muted-foreground">{f.l}</Label>
              <Input type="number" value={f.v} onChange={e => f.set(+e.target.value)} step={f.step || 1} className="h-8 bg-secondary text-xs" />
            </div>
          ))}
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card-trading text-center border-primary/20"><div className="text-2xl font-bold font-mono text-primary">{contracts.toFixed(2)}</div><div className="text-[10px] text-muted-foreground">Contrats / Lots</div></div>
            <div className="card-trading text-center"><div className="text-2xl font-bold font-mono text-blue-400">{rr.toFixed(2)}:1</div><div className="text-[10px] text-muted-foreground">Risk:Reward</div></div>
            <div className="card-trading text-center"><div className="text-2xl font-bold font-mono text-destructive">-{potentialLoss.toFixed(0)}€</div><div className="text-[10px] text-muted-foreground">Risque (perte)</div></div>
            <div className="card-trading text-center border-primary/20"><div className="text-2xl font-bold font-mono text-primary">+{potentialProfit.toFixed(0)}€</div><div className="text-[10px] text-muted-foreground">Gain potentiel</div></div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card-trading text-center"><div className="text-lg font-bold font-mono text-blue-400">{positionValue.toFixed(0)}€</div><div className="text-[10px] text-muted-foreground">Valeur position</div></div>
            <div className="card-trading text-center"><div className="text-lg font-bold font-mono text-yellow-400">{leverage.toFixed(1)}x</div><div className="text-[10px] text-muted-foreground">Levier effectif</div></div>
            <div className="card-trading text-center"><div className={`text-lg font-bold font-mono ${edge > 0 ? 'text-primary' : 'text-destructive'}`}>{edge > 0 ? '+' : ''}{evPerTrade.toFixed(2)}€</div><div className="text-[10px] text-muted-foreground">EV / trade</div></div>
            <div className="card-trading text-center border-primary/20"><div className={`text-lg font-bold font-mono ${evTotal > 0 ? 'text-primary' : 'text-destructive'}`}>{evTotal > 0 ? '+' : ''}{evTotal.toFixed(0)}€</div><div className="text-[10px] text-muted-foreground">EV / {trades} trades</div></div>
          </div>

          {/* Kelly Analysis */}
          <div className="card-trading border border-yellow-400/20 bg-yellow-400/5">
            <div className="flex items-center gap-2 mb-3"><Brain className="w-4 h-4 text-yellow-400" /><span className="text-sm font-semibold">Kelly Criterion Analysis</span></div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><div className="text-xl font-bold font-mono text-yellow-400">{kelly.toFixed(2)}%</div><div className="text-[10px] text-muted-foreground">Kelly plein</div><div className="text-[10px] text-muted-foreground font-mono">{kellyAmount.toFixed(0)}€</div></div>
              <div><div className="text-xl font-bold font-mono text-primary">{halfKelly.toFixed(2)}%</div><div className="text-[10px] text-muted-foreground">½ Kelly (recommandé)</div><div className="text-[10px] text-muted-foreground font-mono">{(accountSize * halfKelly / 100).toFixed(0)}€</div></div>
              <div><div className="text-xl font-bold font-mono text-blue-400">{quarterKelly.toFixed(2)}%</div><div className="text-[10px] text-muted-foreground">¼ Kelly (prudent)</div><div className="text-[10px] text-muted-foreground font-mono">{(accountSize * quarterKelly / 100).toFixed(0)}€</div></div>
            </div>
            {kelly < 0 && <div className="mt-2 text-xs text-destructive text-center">⚠️ Kelly négatif — ne pas trader, l'edge est insuffisant</div>}
          </div>

          {/* Optimal Risk Chart */}
          <div className="card-trading">
            <div className="text-sm font-semibold mb-2">Optimisation du risque — EV et croissance sur {trades} trades</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="risk" tick={{ fontSize: 8, fill: '#6B7280' }} interval={3} />
                <YAxis tick={{ fontSize: 9, fill: '#6B7280' }} />
                <RTooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)', fontSize: 11 }} />
                <ReferenceLine x={`${optimal.risk}%`} stroke="#00FF88" strokeDasharray="3 3" label={{ value: 'Optimal', fill: '#00FF88', fontSize: 9 }} />
                <Bar dataKey="ev" radius={[3, 3, 0, 0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.risk === `${optimal.risk}%` ? '#00FF88' : d.score > 70 ? '#0088FF66' : d.score > 40 ? '#F59E0B44' : '#EF444433'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card-trading border border-primary/20 bg-primary/5 flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="text-xs">
              <span className="text-primary font-semibold">Risque optimal: {optimal.risk}%</span>
              <span className="text-muted-foreground"> — EV: +{optimal.ev}€ · Balance projetée: {optimal.final}€ · DD max estimé: {optimal.dd}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}