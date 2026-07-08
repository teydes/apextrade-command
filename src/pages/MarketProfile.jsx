import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Line, ComposedChart } from 'recharts';
import { BarChart3, Brain, Loader2, Layers } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function MarketProfile() {
  const [symbol, setSymbol] = useState('NQ1!');
  const [basePrice, setBasePrice] = useState(18500);
  const [range, setRange] = useState(100);
  const [bins, setBins] = useState(20);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const profile = useMemo(() => {
    const binSize = range / bins;
    const histogram = [];
    for (let i = 0; i < bins; i++) {
      const price = basePrice - range / 2 + i * binSize;
      const volume = Math.floor(Math.random() * 1000 + 200) * (1 + Math.exp(-Math.pow((i - bins / 2) / (bins / 4), 2)) * 2);
      histogram.push({ price: price.toFixed(1), volume: Math.floor(volume), priceLevel: price });
    }
    const poc = histogram.reduce((max, h) => h.volume > max.volume ? h : max, histogram[0]);
    const sorted = [...histogram].sort((a, b) => b.volume - a.volume);
    const totalVol = histogram.reduce((a, h) => a + h.volume, 0);
    let cumVol = 0;
    const valueArea = [];
    for (const h of sorted) {
      valueArea.push(h);
      cumVol += h.volume;
      if (cumVol >= totalVol * 0.70) break;
    }
    const vaHigh = Math.max(...valueArea.map(h => h.priceLevel));
    const vaLow = Math.min(...valueArea.map(h => h.priceLevel));
    const ibRange = range * 0.4;
    const ibHigh = basePrice + ibRange / 2;
    const ibLow = basePrice - ibRange / 2;
    return { histogram, poc, vaHigh, vaLow, ibHigh, ibLow, totalVol };
  }, [symbol, basePrice, range, bins]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Market Profile ${symbol}: POC=${profile.poc.price}, VAH=${profile.vaHigh.toFixed(1)}, VAL=${profile.vaLow.toFixed(1)}, IB High=${profile.ibHigh.toFixed(1)}, IB Low=${profile.ibLow.toFixed(1)}. Analyse: 1) Type de jour (Trend vs Range), 2) Niveaux clés à surveiller, 3) Stratégie recommandée (scalping POC, breakout VA, fade IB). Court.`,
        response_json_schema: { type: 'object', properties: { day_type: { type: 'string' }, key_levels: { type: 'string' }, strategy: { type: 'string' } } }
      });
      setAiAnalysis(res);
    } catch (e) { setAiAnalysis({ day_type: 'Erreur', key_levels: '', strategy: '' }); }
    setAiLoading(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Market Profile</h1>
          <p className="text-sm text-muted-foreground">Volume Profile, POC, Value Area (VAH/VAL), Initial Balance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">POC (Point of Control)</div><div className="text-2xl font-mono font-bold text-primary">{profile.poc.price}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">VAH (Value Area High)</div><div className="text-2xl font-mono font-bold text-accent">{profile.vaHigh.toFixed(1)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">VAL (Value Area Low)</div><div className="text-2xl font-mono font-bold text-accent">{profile.vaLow.toFixed(1)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Value Area Width</div><div className="text-2xl font-mono font-bold text-warning-yellow">{(profile.vaHigh - profile.vaLow).toFixed(1)}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Paramètres</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Symbol</Label><Input value={symbol} onChange={e => setSymbol(e.target.value)} /></div>
            <div><Label>Prix de base</Label><Input type="number" value={basePrice} onChange={e => setBasePrice(+e.target.value)} /></div>
            <div><Label>Range</Label><Input type="number" value={range} onChange={e => setRange(+e.target.value)} /></div>
            <div><Label>Nombre de bins</Label><Input type="number" value={bins} onChange={e => setBins(+e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card className="card-trading md:col-span-2">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Layers className="w-4 h-4 text-primary" /> Volume Profile</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={profile.histogram} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                <XAxis type="number" stroke="hsl(215 20% 55%)" />
                <YAxis type="category" dataKey="price" stroke="hsl(215 20% 55%)" tick={{ fontSize: 9 }} width={60} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                <Bar dataKey="volume" radius={[0, 4, 4, 0]}>
                  {profile.histogram.map((entry, i) => {
                    const inVA = entry.priceLevel >= profile.vaLow && entry.priceLevel <= profile.vaHigh;
                    const isPOC = entry.priceLevel === profile.poc.priceLevel;
                    return <Cell key={i} fill={isPOC ? '#F59E0B' : inVA ? '#00FF88' : '#0088FF44'} />;
                  })}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="card-trading">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-muted-foreground">Initial Balance High:</span> <span className="font-mono text-primary">{profile.ibHigh.toFixed(1)}</span></div>
            <div><span className="text-muted-foreground">Initial Balance Low:</span> <span className="font-mono text-danger-red">{profile.ibLow.toFixed(1)}</span></div>
            <div><span className="text-muted-foreground">Total Volume:</span> <span className="font-mono text-accent">{profile.totalVol.toLocaleString()}</span></div>
            <div><span className="text-muted-foreground">VA % of range:</span> <span className="font-mono text-warning-yellow">{((profile.vaHigh - profile.vaLow) / range * 100).toFixed(0)}%</span></div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA du Profile</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            Analyser le profile de marché
          </Button>
          {aiAnalysis && (
            <div className="space-y-2 text-sm">
              <div><span className="text-primary font-bold">Type de jour:</span> {aiAnalysis.day_type}</div>
              <div><span className="text-primary font-bold">Niveaux clés:</span> {aiAnalysis.key_levels}</div>
              <div><span className="text-primary font-bold">Stratégie:</span> {aiAnalysis.strategy}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}