import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, Ruler } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ATRPositionSizer() {
  const [accountSize, setAccountSize] = useState(100000);
  const [riskPct, setRiskPct] = useState(1);
  const [entryPrice, setEntryPrice] = useState(18500);
  const [atrValue, setAtrValue] = useState(50);
  const [atrMultiplier, setAtrMultiplier] = useState(1.5);
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const calc = useMemo(() => {
    const riskAmount = accountSize * (riskPct / 100);
    const stopDistance = atrValue * atrMultiplier;
    const stopPrice = entryPrice - stopDistance;
    const positionSize = stopDistance > 0 ? riskAmount / stopDistance : 0;
    const positionValue = positionSize * entryPrice;
    const leverage = accountSize > 0 ? positionValue / accountSize : 0;
    const stopPct = (stopDistance / entryPrice) * 100;
    const target1 = entryPrice + stopDistance * 2;
    const target2 = entryPrice + stopDistance * 3;
    const potentialLoss = riskAmount;
    const potentialGain = riskAmount * 2;
    return { riskAmount, stopDistance, stopPrice, positionSize, positionValue, leverage, stopPct, target1, target2, potentialLoss, potentialGain };
  }, [accountSize, riskPct, entryPrice, atrValue, atrMultiplier]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `ATR Position Sizing: Account=${accountSize}, Risk=${riskPct}%, Entry=${entryPrice}, ATR=${atrValue}, SL multiplier=${atrMultiplier}x. Stop=${calc.stopPrice.toFixed(1)}, Size=${calc.positionSize.toFixed(2)} units, Leverage=${calc.leverage.toFixed(2)}x, Stop=${calc.stopPct.toFixed(2)}%. Analyse: 1) Adéquation du risk, 2) Niveau de levier, 3) Recommandation. Court.`,
        response_json_schema: { type: 'object', properties: { risk_assessment: { type: 'string' }, leverage: { type: 'string' }, recommendation: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ risk_assessment: 'Erreur', leverage: '', recommendation: '' }); }
    setAiLoading(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Ruler className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">ATR Position Sizer</h1><p className="text-sm text-muted-foreground">Sizing basé sur l'ATR pour stops dynamiques</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Paramètres</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Capital</Label><Input type="number" value={accountSize} onChange={e => setAccountSize(+e.target.value)} /></div>
            <div><Label>Risk %</Label><Input type="number" step="0.1" value={riskPct} onChange={e => setRiskPct(+e.target.value)} /></div>
            <div><Label>Prix d'entrée</Label><Input type="number" value={entryPrice} onChange={e => setEntryPrice(+e.target.value)} /></div>
            <div><Label>ATR</Label><Input type="number" value={atrValue} onChange={e => setAtrValue(+e.target.value)} /></div>
            <div><Label>ATR Multiplier (stop)</Label><Input type="number" step="0.1" value={atrMultiplier} onChange={e => setAtrMultiplier(+e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card className="card-trading glow-green">
          <CardHeader><CardTitle className="text-sm">Résultats</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Risk Amount</span><span className="font-mono text-danger-red">€{calc.riskAmount.toFixed(0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Stop Distance</span><span className="font-mono text-warning-yellow">{calc.stopDistance.toFixed(1)} pts</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Stop Price</span><span className="font-mono text-danger-red">{calc.stopPrice.toFixed(1)}</span></div>
            <div className="flex justify-between border-t border-border pt-2"><span className="font-bold text-sm">Position Size</span><span className="font-mono text-xl font-bold text-primary">{calc.positionSize.toFixed(2)}u</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Position Value</span><span className="font-mono text-accent">€{calc.positionValue.toFixed(0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Levier</span><span className={`font-mono font-bold ${calc.leverage > 5 ? 'text-danger-red' : 'text-primary'}`}>{calc.leverage.toFixed(2)}x</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Stop %</span><span className="font-mono text-muted-foreground">{calc.stopPct.toFixed(2)}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">TP1 (2R)</span><span className="font-mono text-primary">{calc.target1.toFixed(1)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">TP2 (3R)</span><span className="font-mono text-primary">{calc.target2.toFixed(1)}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Risk:</span> {ai.risk_assessment}</div><div><span className="text-primary font-bold">Levier:</span> {ai.leverage}</div><div><span className="text-primary font-bold">Recommandation:</span> {ai.recommendation}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}