import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, Shield } from 'lucide-react';

export default function MarginCalculator() {
  const [lotSize, setLotSize] = useState(1);
  const [leverage, setLeverage] = useState(30);
  const [entryPrice, setEntryPrice] = useState(1.0850);
  const [contractSize, setContractSize] = useState(100000);

  const calc = useMemo(() => {
    const positionValue = lotSize * contractSize * entryPrice;
    const marginRequired = positionValue / leverage;
    const marginPct = (marginRequired / positionValue) * 100;
    const pipValue = (contractSize * lotSize * 0.0001);
    return { positionValue, marginRequired, marginPct, pipValue };
  }, [lotSize, leverage, entryPrice, contractSize]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Margin Calculator</h1><p className="text-sm text-muted-foreground">Marge requise et valeur de position</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Paramètres</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Taille du lot</Label><Input type="number" step="0.01" value={lotSize} onChange={e => setLotSize(+e.target.value)} /></div>
            <div><Label>Levier</Label><Input type="number" value={leverage} onChange={e => setLeverage(+e.target.value)} /></div>
            <div><Label>Prix d'entrée</Label><Input type="number" step="0.0001" value={entryPrice} onChange={e => setEntryPrice(+e.target.value)} /></div>
            <div><Label>Taille du contrat</Label><Input type="number" value={contractSize} onChange={e => setContractSize(+e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card className="card-trading glow-green">
          <CardHeader><CardTitle className="text-sm">Résultats</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Valeur position</span><span className="font-mono text-accent">€{calc.positionValue.toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-border pt-2"><span className="font-bold text-sm">Marge requise</span><span className="font-mono text-2xl font-bold text-primary">€{calc.marginRequired.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Marge %</span><span className="font-mono text-muted-foreground">{calc.marginPct.toFixed(2)}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Valeur du pip</span><span className="font-mono text-warning-yellow">€{calc.pipValue.toFixed(4)}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}