import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, RefreshCw, Brain, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'];

export default function CurrencyStrength() {
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const strength = useMemo(() => {
    const data = CURRENCIES.map(c => {
      const base = Math.random() * 4 - 2;
      return { currency: c, strength: base, vol: Math.random() * 0.5 + 0.5 };
    }).sort((a, b) => b.strength - a.strength);
    const pairs = [];
    for (let i = 0; i < CURRENCIES.length; i++) {
      for (let j = i + 1; j < CURRENCIES.length; j++) {
        const s1 = data.find(d => d.currency === CURRENCIES[i]).strength;
        const s2 = data.find(d => d.currency === CURRENCIES[j]).strength;
        const diff = s1 - s2;
        if (Math.abs(diff) > 0.8) pairs.push({ pair: `${CURRENCIES[i]}/${CURRENCIES[j]}`, strength: diff, direction: diff > 0 ? 'LONG' : 'SHORT' });
      }
    }
    return { data, pairs: pairs.sort((a, b) => Math.abs(b.strength) - Math.abs(a.strength)).slice(0, 8) };
  }, []);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const top = strength.data.slice(0, 3).map(d => `${d.currency}: ${d.strength.toFixed(2)}`).join(', ');
      const bottom = strength.data.slice(-3).map(d => `${d.currency}: ${d.strength.toFixed(2)}`).join(', ');
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Currency Strength: Top=${top}, Bottom=${bottom}. Pairs à fort delta: ${strength.pairs.slice(0, 4).map(p => `${p.pair} (${p.direction})`).join(', ')}. Analyse: 1) Devise la plus forte/faible, 2) Meilleures opportunités, 3) Recommandation. Court.`,
        response_json_schema: { type: 'object', properties: { strongest: { type: 'string' }, weakest: { type: 'string' }, opportunities: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ strongest: 'Erreur', weakest: '', opportunities: '' }); }
    setAiLoading(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <DollarSign className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Currency Strength Meter</h1><p className="text-sm text-muted-foreground">Force relative des devises et opportunités</p></div>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Force des Devises</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={strength.data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis type="number" domain={[-3, 3]} stroke="hsl(215 20% 55%)" />
              <YAxis type="category" dataKey="currency" stroke="hsl(215 20% 55%)" width={60} />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="strength" radius={[0, 4, 4, 0]}>{strength.data.map((e, i) => <Cell key={i} fill={e.strength > 1 ? '#00FF88' : e.strength > 0 ? '#00FF8888' : e.strength > -1 ? '#EF444488' : '#EF4444'} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Paires à Fort Delta (Opportunités)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {strength.pairs.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded bg-secondary/50">
                <span className="font-mono font-bold">{p.pair}</span>
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-sm ${p.strength > 0 ? 'text-primary' : 'text-danger-red'}`}>{p.strength > 0 ? '+' : ''}{p.strength.toFixed(2)}</span>
                  <span className={`text-xs px-2 py-1 rounded ${p.direction === 'LONG' ? 'bg-primary/20 text-primary' : 'bg-danger-red/20 text-danger-red'}`}>{p.direction}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Plus forte:</span> {ai.strongest}</div><div><span className="text-primary font-bold">Plus faible:</span> {ai.weakest}</div><div><span className="text-primary font-bold">Opportunités:</span> {ai.opportunities}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}