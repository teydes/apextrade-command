import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, Calculator, Target, Percent } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function RiskRewardCalculator() {
  const [entry, setEntry] = useState(18500);
  const [stop, setStop] = useState(18450);
  const [tp1, setTp1] = useState(18600);
  const [tp2, setTp2] = useState(18650);
  const [tp3, setTp3] = useState(18700);
  const [accountSize, setAccountSize] = useState(100000);
  const [riskPct, setRiskPct] = useState(1);
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    base44.entities.Trade.list('-created_date', 100).then(data => setTrades(data || [])).catch(() => {});
  }, []);

  const calc = useMemo(() => {
    const risk = Math.abs(entry - stop);
    if (risk === 0) return null;
    const reward1 = Math.abs(tp1 - entry);
    const reward2 = Math.abs(tp2 - entry);
    const reward3 = Math.abs(tp3 - entry);
    const rr1 = reward1 / risk;
    const rr2 = reward2 / risk;
    const rr3 = reward3 / risk;
    const riskAmount = accountSize * (riskPct / 100);
    const positionSize = riskAmount / risk;
    const reward1Amount = riskAmount * rr1;
    const reward2Amount = riskAmount * rr2;
    const reward3Amount = riskAmount * rr3;
    const blendedRR = (rr1 * 0.5 + rr2 * 0.3 + rr3 * 0.2);
    return { risk, rr1, rr2, rr3, riskAmount, positionSize, reward1Amount, reward2Amount, reward3Amount, blendedRR };
  }, [entry, stop, tp1, tp2, tp3, accountSize, riskPct]);

  const recentRR = useMemo(() => {
    const closed = trades.filter(t => t.status === 'closed' && t.risk_reward);
    if (closed.length === 0) return null;
    const avg = closed.reduce((a, t) => a + t.risk_reward, 0) / closed.length;
    const best = Math.max(...closed.map(t => t.risk_reward));
    const worst = Math.min(...closed.map(t => t.risk_reward));
    return { avg, best, worst, count: closed.length };
  }, [trades]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Calculator className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">R:R Calculator Pro</h1>
          <p className="text-sm text-muted-foreground">Calculateur Risk:Reward avec sizing multi-TP et blended R:R</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Setup</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Entry Price</Label><Input type="number" value={entry} onChange={e => setEntry(+e.target.value)} /></div>
            <div><Label>Stop Loss</Label><Input type="number" value={stop} onChange={e => setStop(+e.target.value)} /></div>
            <div><Label>Take Profit 1 (50%)</Label><Input type="number" value={tp1} onChange={e => setTp1(+e.target.value)} /></div>
            <div><Label>Take Profit 2 (30%)</Label><Input type="number" value={tp2} onChange={e => setTp2(+e.target.value)} /></div>
            <div><Label>Take Profit 3 (20%)</Label><Input type="number" value={tp3} onChange={e => setTp3(+e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Position Sizing</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Account Size</Label><Input type="number" value={accountSize} onChange={e => setAccountSize(+e.target.value)} /></div>
            <div><Label>Risk per Trade (%)</Label><Input type="number" step="0.1" value={riskPct} onChange={e => setRiskPct(+e.target.value)} /></div>
            {calc && (
              <div className="border-t border-border pt-3 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Risk Amount</span><span className="font-mono text-danger-red">€{calc.riskAmount.toFixed(0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Position Size</span><span className="font-mono text-accent">{calc.positionSize.toFixed(2)} units</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">TP1 Reward</span><span className="font-mono text-primary">€{calc.reward1Amount.toFixed(0)} ({calc.rr1.toFixed(2)}R)</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">TP2 Reward</span><span className="font-mono text-primary">€{calc.reward2Amount.toFixed(0)} ({calc.rr2.toFixed(2)}R)</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">TP3 Reward</span><span className="font-mono text-primary">€{calc.reward3Amount.toFixed(0)} ({calc.rr3.toFixed(2)}R)</span></div>
                <div className="flex justify-between border-t border-border pt-2"><span className="font-bold">Blended R:R</span><span className="font-mono font-bold text-lg text-primary">{calc.blendedRR.toFixed(2)}R</span></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {recentRR && (
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Historique R:R ({recentRR.count} trades)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><div className="text-xs text-muted-foreground">Moyen</div><div className="text-xl font-mono font-bold text-accent">{recentRR.avg.toFixed(2)}R</div></div>
              <div><div className="text-xs text-muted-foreground">Meilleur</div><div className="text-xl font-mono font-bold text-primary">{recentRR.best.toFixed(2)}R</div></div>
              <div><div className="text-xs text-muted-foreground">Pire</div><div className="text-xl font-mono font-bold text-danger-red">{recentRR.worst.toFixed(2)}R</div></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}