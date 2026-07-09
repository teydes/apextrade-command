import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { RefreshCw, Moon } from 'lucide-react';

export default function SwapCalculator() {
  const [pair, setPair] = useState('EUR/USD');
  const [lotSize, setLotSize] = useState(1);
  const [swapLong, setSwapLong] = useState(-3.5);
  const [swapShort, setSwapShort] = useState(1.2);
  const [daysHeld, setDaysHeld] = useState(7);

  const calc = useMemo(() => {
    const nightlyLong = swapLong * lotSize;
    const nightlyShort = swapShort * lotSize;
    const totalLong = nightlyLong * daysHeld;
    const totalShort = nightlyShort * daysHeld;
    const weeklyLong = nightlyLong * 5;
    const monthlyLong = nightlyLong * 30;
    const tripleSwapNight = nightlyLong * 3;
    return { nightlyLong, nightlyShort, totalLong, totalShort, weeklyLong, monthlyLong, tripleSwapNight };
  }, [pair, lotSize, swapLong, swapShort, daysHeld]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Moon className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Swap Calculator</h1><p className="text-sm text-muted-foreground">Coût/gain du swap overnight</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Paramètres</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Paire</Label>
              <Select value={pair} onValueChange={setPair}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'NQ1!', 'ES1!'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Taille du lot</Label><Input type="number" step="0.01" value={lotSize} onChange={e => setLotSize(+e.target.value)} /></div>
            <div><Label>Swap Long (points/lot)</Label><Input type="number" step="0.1" value={swapLong} onChange={e => setSwapLong(+e.target.value)} /></div>
            <div><Label>Swap Short (points/lot)</Label><Input type="number" step="0.1" value={swapShort} onChange={e => setSwapShort(+e.target.value)} /></div>
            <div><Label>Days held</Label><Input type="number" value={daysHeld} onChange={e => setDaysHeld(+e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card className="card-trading glow-green">
          <CardHeader><CardTitle className="text-sm">Coût du Swap</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Swap Long/nuit</span><span className={`font-mono ${calc.nightlyLong < 0 ? 'text-danger-red' : 'text-primary'}`}>{calc.nightlyLong.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Swap Short/nuit</span><span className={`font-mono ${calc.nightlyShort < 0 ? 'text-danger-red' : 'text-primary'}`}>{calc.nightlyShort.toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-border pt-2"><span className="font-bold text-sm">Total Long ({daysHeld}j)</span><span className={`font-mono text-xl font-bold ${calc.totalLong < 0 ? 'text-danger-red' : 'text-primary'}`}>{calc.totalLong.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Total Short ({daysHeld}j)</span><span className={`font-mono ${calc.totalShort < 0 ? 'text-danger-red' : 'text-primary'}`}>{calc.totalShort.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Hebdo Long (5j)</span><span className={`font-mono ${calc.weeklyLong < 0 ? 'text-danger-red' : 'text-primary'}`}>{calc.weeklyLong.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Mensuel Long (30j)</span><span className={`font-mono ${calc.monthlyLong < 0 ? 'text-danger-red' : 'text-primary'}`}>{calc.monthlyLong.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Triple swap (Mercredi)</span><span className={`font-mono ${calc.tripleSwapNight < 0 ? 'text-danger-red' : 'text-primary'}`}>{calc.tripleSwapNight.toFixed(2)}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}