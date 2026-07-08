import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Crosshair, Target } from 'lucide-react';

const METHODS = [
  { id: 'classic', name: 'Classic' },
  { id: 'camarilla', name: 'Camarilla' },
  { id: 'woodie', name: 'Woodie' },
  { id: 'fibonacci', name: 'Fibonacci' },
  { id: 'demark', name: 'DeMark' },
];

export default function PivotCalculator() {
  const [high, setHigh] = useState(18500);
  const [low, setLow] = useState(18300);
  const [close, setClose] = useState(18420);
  const [open, setOpen] = useState(18400);
  const [method, setMethod] = useState('classic');

  const pivots = useMemo(() => {
    const h = high, l = low, c = close, o = open;
    let levels = {};

    if (method === 'classic') {
      const pp = (h + l + c) / 3;
      levels = {
        'R3': h + 2 * (pp - l),
        'R2': pp + (h - l),
        'R1': 2 * pp - l,
        'PP': pp,
        'S1': 2 * pp - h,
        'S2': pp - (h - l),
        'S3': l - 2 * (h - pp),
      };
    } else if (method === 'camarilla') {
      const pp = (h + l + c) / 3;
      const range = h - l;
      levels = {
        'R4': c + range * 1.1 / 2,
        'R3': c + range * 1.1 / 4,
        'R2': c + range * 1.1 / 6,
        'R1': c + range * 1.1 / 12,
        'PP': pp,
        'S1': c - range * 1.1 / 12,
        'S2': c - range * 1.1 / 6,
        'S3': c - range * 1.1 / 4,
        'S4': c - range * 1.1 / 2,
      };
    } else if (method === 'woodie') {
      const pp = (h + l + 2 * c) / 4;
      const range = h - l;
      levels = {
        'R3': h + 2 * (pp - l),
        'R2': pp + range,
        'R1': 2 * pp - l,
        'PP': pp,
        'S1': 2 * pp - h,
        'S2': pp - range,
        'S3': l - 2 * (h - pp),
      };
    } else if (method === 'fibonacci') {
      const pp = (h + l + c) / 3;
      const range = h - l;
      levels = {
        'R3': pp + range * 1.000,
        'R2': pp + range * 0.618,
        'R1': pp + range * 0.382,
        'PP': pp,
        'S1': pp - range * 0.382,
        'S2': pp - range * 0.618,
        'S3': pp - range * 1.000,
      };
    } else if (method === 'demark') {
      let pp;
      if (c > o) pp = (h + 2 * l + c) / 4;
      else if (c < o) pp = (2 * h + l + c) / 4;
      else pp = (h + l + 2 * c) / 4;
      const range = h - l;
      levels = {
        'R1': pp + range * 0.382,
        'PP': pp,
        'S1': pp - range * 0.382,
      };
    }

    return Object.entries(levels).sort((a, b) => {
      const order = ['R4', 'R3', 'R2', 'R1', 'PP', 'S1', 'S2', 'S3', 'S4'];
      return order.indexOf(b[0]) - order.indexOf(a[0]);
    });
  }, [high, low, close, open, method]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Crosshair className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Pivot Point Calculator</h1>
          <p className="text-sm text-muted-foreground">Niveaux de pivot: Classic, Camarilla, Woodie, Fibonacci, DeMark</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Données HLC</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>High</Label><Input type="number" value={high} onChange={e => setHigh(+e.target.value)} /></div>
            <div><Label>Low</Label><Input type="number" value={low} onChange={e => setLow(+e.target.value)} /></div>
            <div><Label>Close</Label><Input type="number" value={close} onChange={e => setClose(+e.target.value)} /></div>
            {method === 'demark' && <div><Label>Open</Label><Input type="number" value={open} onChange={e => setOpen(+e.target.value)} /></div>}
          </CardContent>
        </Card>

        <Card className="card-trading md:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Niveaux de Pivot</CardTitle>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>{METHODS.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pivots.map(([label, value]) => {
                const isResistance = label.startsWith('R');
                const isSupport = label.startsWith('S');
                const isPP = label === 'PP';
                return (
                  <div key={label} className={`flex items-center justify-between p-3 rounded-md ${isPP ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/50'}`}>
                    <span className={`font-mono font-bold text-sm ${isResistance ? 'text-primary' : isSupport ? 'text-danger-red' : 'text-warning-yellow'}`}>{label}</span>
                    <span className="font-mono text-lg">{value.toFixed(2)}</span>
                    {isResistance && <span className="text-xs text-muted-foreground">Résistance</span>}
                    {isSupport && <span className="text-xs text-muted-foreground">Support</span>}
                    {isPP && <span className="text-xs text-primary">Pivot Point</span>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-trading">
        <CardContent className="py-4">
          <div className="text-xs text-muted-foreground space-y-1">
            <p><span className="text-primary font-bold">Classic:</span> PP = (H + L + C) / 3 — méthode standard</p>
            <p><span className="text-primary font-bold">Camarilla:</span> Focus sur R3/S3 pour reversals, R4/S4 pour breakouts</p>
            <p><span className="text-primary font-bold">Woodie:</span> Plus de poids au close — PP = (H + L + 2×C) / 4</p>
            <p><span className="text-primary font-bold">Fibonacci:</span> PP + niveaux 38.2% / 61.8% / 100% du range</p>
            <p><span className="text-primary font-bold">DeMark:</span> Dépend de la relation open/close — projection du range × 0.382</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}