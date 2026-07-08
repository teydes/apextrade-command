import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, AreaChart, Area } from 'recharts';
import { Activity, Brain, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function OrderFlowAnalyzer() {
  const [symbol, setSymbol] = useState('NQ1!');
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const orderFlow = useMemo(() => {
    const levels = 15;
    const data = [];
    let cumulativeDelta = 0;
    for (let i = 0; i < levels; i++) {
      const price = 18500 - (levels / 2 - i) * 5;
      const bidVol = Math.floor(Math.random() * 800 + 100);
      const askVol = Math.floor(Math.random() * 800 + 100);
      const delta = askVol - bidVol;
      cumulativeDelta += delta;
      const imbalance = askVol / (bidVol + askVol);
      data.push({ price, bidVol, askVol, delta, cumulativeDelta, imbalance: (imbalance * 100).toFixed(0) });
    }
    const totalBid = data.reduce((a, d) => a + d.bidVol, 0);
    const totalAsk = data.reduce((a, d) => a + d.askVol, 0);
    const totalDelta = totalAsk - totalBid;
    const cvd = data.map((d, i) => ({ idx: i + 1, cvd: data.slice(0, i + 1).reduce((a, x) => a + x.delta, 0) }));
    const pocLevel = data.reduce((max, d) => (d.bidVol + d.askVol) > (max.bidVol + max.askVol) ? d : max, data[0]);
    const maxImbalance = data.reduce((max, d) => Math.abs(d.imbalance - 50) > Math.abs(max.imbalance - 50) ? d : max, data[0]);
    return { data, totalBid, totalAsk, totalDelta, cvd, pocLevel, maxImbalance };
  }, [symbol]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Order Flow Analysis ${symbol}: Total Delta=${orderFlow.totalDelta} (Ask=${orderFlow.totalAsk} vs Bid=${orderFlow.totalBid}), POC=${orderFlow.pocLevel.price}, Max imbalance=${orderFlow.maxImbalance.imbalance}% à ${orderFlow.maxImbalance.price}. CVD trend=${orderFlow.cvd[orderFlow.cvd.length-1].cvd > 0 ? 'Bullish' : 'Bearish'}. Analyse: 1) Pression acheteur/vendeur, 2) Absorption détectée, 3) Setup order flow recommandé. Court.`,
        response_json_schema: { type: 'object', properties: { pressure: { type: 'string' }, absorption: { type: 'string' }, setup: { type: 'string' } } }
      });
      setAiAnalysis(res);
    } catch (e) { setAiAnalysis({ pressure: 'Erreur', absorption: '', setup: '' }); }
    setAiLoading(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Activity className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Order Flow Analyzer</h1>
          <p className="text-sm text-muted-foreground">Delta, CVD, bid/ask imbalance, absorption detection</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Total Delta</div><div className={`text-2xl font-mono font-bold ${orderFlow.totalDelta > 0 ? 'text-primary' : 'text-danger-red'}`}>{orderFlow.totalDelta > 0 ? '+' : ''}{orderFlow.totalDelta}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Ask Volume</div><div className="text-2xl font-mono font-bold text-primary">{orderFlow.totalAsk.toLocaleString()}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Bid Volume</div><div className="text-2xl font-mono font-bold text-danger-red">{orderFlow.totalBid.toLocaleString()}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">POC Level</div><div className="text-2xl font-mono font-bold text-warning-yellow">{orderFlow.pocLevel.price}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Bid/Ask Volume par Niveau</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={orderFlow.data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                <XAxis type="number" stroke="hsl(215 20% 55%)" />
                <YAxis type="category" dataKey="price" stroke="hsl(215 20% 55%)" tick={{ fontSize: 9 }} width={60} />
                <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                <Bar dataKey="bidVol" name="Bid" fill="#EF4444" stackId="a" />
                <Bar dataKey="askVol" name="Ask" fill="#00FF88" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">CVD (Cumulative Volume Delta)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={orderFlow.cvd}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                <XAxis dataKey="idx" stroke="hsl(215 20% 55%)" />
                <YAxis stroke="hsl(215 20% 55%)" />
                <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                <Area type="monotone" dataKey="cvd" stroke="#0088FF" fill="#0088FF22" />
                <ReferenceLine y={0} stroke="#F59E0B" strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Delta par Niveau</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={orderFlow.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="price" stroke="hsl(215 20% 55%)" tick={{ fontSize: 9 }} />
              <YAxis stroke="hsl(215 20% 55%)" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="delta" radius={[4, 4, 0, 0]}>
                {orderFlow.data.map((entry, i) => <Cell key={i} fill={entry.delta > 0 ? '#00FF88' : '#EF4444'} />)}
              </Bar>
              <ReferenceLine y={0} stroke="hsl(215 20% 55%)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA Order Flow</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            Analyser le flux d'ordres
          </Button>
          {aiAnalysis && (
            <div className="space-y-2 text-sm">
              <div><span className="text-primary font-bold">Pression:</span> {aiAnalysis.pressure}</div>
              <div><span className="text-primary font-bold">Absorption:</span> {aiAnalysis.absorption}</div>
              <div><span className="text-primary font-bold">Setup:</span> {aiAnalysis.setup}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}