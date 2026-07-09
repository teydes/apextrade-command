import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Coins, DollarSign } from 'lucide-react';

const PAIRS = {
  'EUR/USD': { pip: 0.0001, contract: 100000 },
  'GBP/USD': { pip: 0.0001, contract: 100000 },
  'USD/JPY': { pip: 0.01, contract: 100000 },
  'USD/CHF': { pip: 0.0001, contract: 100000 },
  'AUD/USD': { pip: 0.0001, contract: 100000 },
  'USD/CAD': { pip: 0.0001, contract: 100000 },
  'NQ1!': { pip: 1, contract: 20 },
  'ES1!': { pip: 0.25, contract: 50 },
  'CL1!': { pip: 0.01, contract: 1000 },
  'GC1!': { pip: 0.1, contract: 100 },
};

export default function PipCalculator() {
  const [pair, setPair] = useState('EUR/USD');
  const [lotSize, setLotSize] = useState(1);
  const [accountCurrency, setAccountCurrency] = useState('USD');

  const calc = useMemo(() => {
    const p = PAIRS[pair] || PAIRS['EUR/USD'];
    const pipValue = p.pip * p.contract * lotSize;
    const pipValueUSD = pipValue;
    const stopPips10 = pipValue * 10;
    const stopPips50 = pipValue * 50;
    return { pipValue: pipValueUSD, stop10: stopPips10, stop50: stopPips50, pipSize: p.pip };
  }, [pair, lotSize]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Coins className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Pip Value Calculator</h1><p className="text-sm text-muted-foreground">Valeur du pip par instrument</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Paramètres</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Paire</Label>
              <Select value={pair} onValueChange={setPair}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.keys(PAIRS).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Taille du lot</Label><Input type="number" step="0.01" value={lotSize} onChange={e => setLotSize(+e.target.value)} /></div>
            <div><Label>Devise du compte</Label>
              <Select value={accountCurrency} onValueChange={setAccountCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['USD', 'EUR', 'GBP', 'CHF'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="card-trading glow-green">
          <CardHeader><CardTitle className="text-sm">Résultats</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Taille du pip</span><span className="font-mono text-muted-foreground">{calc.pipSize}</span></div>
            <div className="flex justify-between border-t border-border pt-2"><span className="font-bold text-sm">Valeur du pip</span><span className="font-mono text-2xl font-bold text-primary">{accountCurrency === 'USD' ? '$' : '€'}{calc.pipValue.toFixed(4)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">10 pips SL</span><span className="font-mono text-danger-red">{accountCurrency === 'USD' ? '$' : '€'}{calc.stop10.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">50 pips SL</span><span className="font-mono text-danger-red">{accountCurrency === 'USD' ? '$' : '€'}{calc.stop50.toFixed(2)}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}