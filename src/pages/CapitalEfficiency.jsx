import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Zap, Brain, Loader2, Percent } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function CapitalEfficiency() {
  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Trade.list('-created_date', 500),
      base44.entities.TradingAccount.list(),
    ]).then(([tr, acc]) => {
      setTrades((tr || []).filter(t => t.status === 'closed'));
      setAccounts(acc || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const data = useMemo(() => {
    if (trades.length < 5) return null;
    const totalCapital = accounts.reduce((a, acc) => a + (acc.account_size || 0), 0) || 100000;
    const totalPnL = trades.reduce((a, t) => a + (t.pnl || 0), 0);
    const totalR = trades.reduce((a, t) => a + (t.risk_reward || 0), 0);
    const avgR = totalR / trades.length;
    const roi = (totalPnL / totalCapital) * 100;
    const tradesPerMonth = trades.length / Math.max(1, Math.ceil((new Date() - new Date(trades[0]?.entry_time || trades[0]?.created_date)) / (30 * 24 * 60 * 60 * 1000)));
    const pnlPerTrade = totalPnL / trades.length;
    const capitalUtilization = (Math.abs(trades.reduce((a, t) => a + Math.abs(t.pnl || 0), 0)) / totalCapital) * 100;
    const efficiency = roi / Math.max(trades.length, 1) * 100;
    const byAccount = {};
    trades.forEach(t => {
      if (!t.account_id) return;
      if (!byAccount[t.account_id]) byAccount[t.account_id] = { id: t.account_id, pnl: 0, trades: 0, capital: 0 };
      byAccount[t.account_id].pnl += t.pnl || 0;
      byAccount[t.account_id].trades++;
    });
    accounts.forEach(a => { if (byAccount[a.id]) byAccount[a.id].capital = a.account_size || 0; });
    const accountData = Object.values(byAccount).map(a => ({ ...a, roi: a.capital > 0 ? (a.pnl / a.capital) * 100 : 0 })).sort((a, b) => b.roi - a.roi);
    return { totalCapital, totalPnL, roi, avgR, tradesPerMonth, pnlPerTrade, capitalUtilization, efficiency, accountData };
  }, [trades, accounts]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Capital Efficiency: ROI=${data.roi.toFixed(1)}%, Capital=${data.totalCapital.toFixed(0)}, PnL=${data.totalPnL.toFixed(0)}, Trades/mois=${data.tradesPerMonth.toFixed(1)}, PnL/trade=${data.pnlPerTrade.toFixed(0)}, Capital utilization=${data.capitalUtilization.toFixed(1)}%. Analyse: 1) Efficacité du capital, 2) Gaspillage, 3) Optimisation. Court.`,
        response_json_schema: { type: 'object', properties: { efficiency: { type: 'string' }, waste: { type: 'string' }, optimization: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ efficiency: 'Erreur', waste: '', optimization: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 5 trades requis</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Zap className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Capital Efficiency</h1><p className="text-sm text-muted-foreground">ROI, utilisation du capital et efficacité</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-trading glow-green"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Percent className="w-3 h-3" /> ROI</div><div className={`text-2xl font-mono font-bold ${data.roi > 0 ? 'text-primary' : 'text-danger-red'}`}>{data.roi > 0 ? '+' : ''}{data.roi.toFixed(1)}%</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Capital total</div><div className="text-2xl font-mono font-bold text-accent">{data.totalCapital.toFixed(0)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">PnL/trade</div><div className={`text-2xl font-mono font-bold ${data.pnlPerTrade > 0 ? 'text-primary' : 'text-danger-red'}`}>{data.pnlPerTrade > 0 ? '+' : ''}{data.pnlPerTrade.toFixed(0)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Trades/mois</div><div className="text-2xl font-mono font-bold text-warning-yellow">{data.tradesPerMonth.toFixed(1)}</div></CardContent></Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">ROI par Compte</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.accountData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis type="number" unit="%" stroke="hsl(215 20% 55%)" />
              <YAxis type="category" dataKey="id" stroke="hsl(215 20% 55%)" tick={{ fontSize: 9 }} width={100} />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="roi" radius={[0, 4, 4, 0]}>{data.accountData.map((e, i) => <Cell key={i} fill={e.roi > 0 ? '#00FF88' : '#EF4444'} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-muted-foreground">Capital utilization:</span> <span className="font-mono text-warning-yellow">{data.capitalUtilization.toFixed(1)}%</span></div>
            <div><span className="text-muted-foreground">Efficiency score:</span> <span className="font-mono text-primary">{data.efficiency.toFixed(1)}</span></div>
            <div><span className="text-muted-foreground">Total PnL:</span> <span className={`font-mono ${data.totalPnL > 0 ? 'text-primary' : 'text-danger-red'}`}>{data.totalPnL.toFixed(0)}</span></div>
            <div><span className="text-muted-foreground">Avg R:</span> <span className="font-mono text-accent">{data.avgR.toFixed(2)}R</span></div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Efficacité:</span> {ai.efficiency}</div><div><span className="text-primary font-bold">Gaspillage:</span> {ai.waste}</div><div><span className="text-primary font-bold">Optimisation:</span> {ai.optimization}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}