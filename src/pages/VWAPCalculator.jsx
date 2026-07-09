import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from 'recharts';
import { TrendingUp, Calculator } from 'lucide-react';

export default function VWAPCalculator() {
  const [basePrice, setBasePrice] = useState(18500);
  const [volatility, setVolatility] = useState(0.5);
  const [sessions, setSessions] = useState(20);

  const calc = useMemo(() => {
    const data = [];
    let vwap = basePrice;
    let cumPV = 0, cumV = 0;
    for (let i = 0; i < sessions; i++) {
      const price = basePrice + (Math.random() - 0.5) * basePrice * volatility * 0.01 * Math.sqrt(i + 1);
      const volume = Math.floor(Math.random() * 10000 + 5000) * (1 + Math.sin(i / 3) * 0.3);
      cumPV += price * volume;
      cumV += volume;
      vwap = cumPV / cumV;
      const band1Up = vwap * (1 + 0.001 * (i + 1) / 10);
      const band1Dn = vwap * (1 - 0.001 * (i + 1) / 10);
      const band2Up = vwap * (1 + 0.002 * (i + 1) / 10);
      const band2Dn = vwap * (1 - 0.002 * (i + 1) / 10);
      const deviation = ((price - vwap) / vwap) * 100;
      data.push({ session: i + 1, price, vwap, band1Up, band1Dn, band2Up, band2Dn, volume, deviation });
    }
    const currentPrice = data[data.length - 1].price;
    const currentVWAP = data[data.length - 1].vwap;
    const position = currentPrice > currentVWAP ? 'ABOVE' : 'BELOW';
    const deviation = ((currentPrice - currentVWAP) / currentVWAP) * 100;
    return { data, currentPrice, currentVWAP, position, deviation };
  }, [basePrice, volatility, sessions]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <TrendingUp className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">VWAP Calculator</h1><p className="text-sm text-muted-foreground">Volume Weighted Average Price avec bands</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-trading">
          <CardContent className="pt-4 space-y-3">
            <div><Label>Prix de base</Label><Input type="number" value={basePrice} onChange={e => setBasePrice(+e.target.value)} /></div>
            <div><Label>Volatilité %</Label><Input type="number" step="0.1" value={volatility} onChange={e => setVolatility(+e.target.value)} /></div>
            <div><Label>Nombre de sessions</Label><Input type="number" value={sessions} onChange={e => setSessions(+e.target.value)} /></div>
          </CardContent>
        </Card>
        <Card className="card-trading glow-green">
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-1">VWAP actuel</div>
            <div className="text-2xl font-mono font-bold text-primary">{calc.currentVWAP.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="card-trading">
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-1">Prix actuel</div>
            <div className="text-2xl font-mono font-bold text-accent">{calc.currentPrice.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className={`card-trading ${calc.position === 'ABOVE' ? 'glow-green' : 'glow-red'}`}>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-1">Position vs VWAP</div>
            <div className={`text-xl font-mono font-bold ${calc.position === 'ABOVE' ? 'text-primary' : 'text-danger-red'}`}>{calc.position}</div>
            <div className={`text-xs ${calc.deviation > 0 ? 'text-primary' : 'text-danger-red'}`}>{calc.deviation > 0 ? '+' : ''}{calc.deviation.toFixed(2)}%</div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Prix vs VWAP avec Bands</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={calc.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="session" stroke="hsl(215 20% 55%)" />
              <YAxis stroke="hsl(215 20% 55%)" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Area type="monotone" dataKey="price" name="Prix" stroke="#00FF88" fill="#00FF8811" strokeWidth={2} />
              <Area type="monotone" dataKey="vwap" name="VWAP" stroke="#0088FF" fill="none" strokeDasharray="5 5" strokeWidth={2} />
              <Area type="monotone" dataKey="band1Up" name="Band +1" stroke="#F59E0B55" fill="none" />
              <Area type="monotone" dataKey="band1Dn" name="Band -1" stroke="#F59E0B55" fill="none" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Déviation vs VWAP</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={calc.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="session" stroke="hsl(215 20% 55%)" />
              <YAxis stroke="hsl(215 20% 55%)" unit="%" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="deviation" radius={[2, 2, 0, 0]}>{calc.data.map((e, i) => <Cell key={i} fill={e.deviation > 0 ? '#00FF88' : '#EF4444'} />)}</Bar>
              <ReferenceLine y={0} stroke="#F59E0B" strokeDasharray="5 5" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}