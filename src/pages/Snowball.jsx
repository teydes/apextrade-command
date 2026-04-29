import { useState, useMemo } from 'react';
import { Snowflake, TrendingUp, Target, Plus, Minus, Calculator } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Snowball() {
  const [startCapital, setStartCapital] = useState(50000);
  const [dailyTarget, setDailyTarget] = useState(500);
  const [tradingDays, setTradingDays] = useState(20);
  const [reinvestPct, setReinvestPct] = useState(80);
  const [nbAccounts, setNbAccounts] = useState(1);
  const [targetAmount, setTargetAmount] = useState(1000000);

  const data = useMemo(() => {
    const months = [];
    let balance = startCapital;
    let accounts = nbAccounts;

    for (let m = 0; m <= 12; m++) {
      const monthlyProfit = dailyTarget * tradingDays * accounts;
      const reinvested = monthlyProfit * (reinvestPct / 100);
      const withdrawn = monthlyProfit * (1 - reinvestPct / 100);

      months.push({
        month: m === 0 ? 'Départ' : `M${m}`,
        balance: Math.round(balance),
        accounts,
        monthly_profit: Math.round(monthlyProfit),
        withdrawn: Math.round(withdrawn),
        target: targetAmount,
      });

      balance += reinvested;
      // Add new account every time balance crosses a multiple of starting capital
      if (m > 0 && Math.floor(balance / startCapital) > accounts) {
        accounts = Math.min(Math.floor(balance / startCapital), 20);
      }
    }
    return months;
  }, [startCapital, dailyTarget, tradingDays, reinvestPct, nbAccounts, targetAmount]);

  const finalBalance = data[data.length - 1]?.balance || 0;
  const monthsToTarget = data.findIndex(d => d.balance >= targetAmount);
  const totalProfit = finalBalance - startCapital;

  // MFF specific plan
  const mffPlan = [
    { step: 1, action: 'Passer la qualification MFF 50K', duration: '~10 jours', capital: '50K', pnl: '3000€+' },
    { step: 2, 'action': 'Recevoir 1er payout (90%)', duration: 'J+30', capital: '50K', pnl: '~2 250€' },
    { step: 3, action: 'Ouvrir 2e compte MFF 50K', duration: 'M2', capital: '100K', pnl: '~4 500€/m' },
    { step: 4, action: 'Ajouter Apex 50K', duration: 'M3', capital: '150K', pnl: '~6 750€/m' },
    { step: 5, action: 'Ajouter TopStep + TradeDay', duration: 'M4-5', capital: '250K', pnl: '~11 250€/m' },
    { step: 6, action: '10 comptes actifs', duration: 'M6', capital: '500K', pnl: '~22 500€/m' },
    { step: 7, action: 'Objectif 1M€ atteint', duration: 'M10-12', capital: '1M+', pnl: 'OBJECTIF' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Snowflake className="w-5 h-5 text-blue-400" />
        <div>
          <h1 className="text-xl font-bold">Plan Boule de Neige</h1>
          <p className="text-xs text-muted-foreground">Simulateur multi-comptes → 1 000 000€ en 12 mois</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Parameters */}
        <div className="card-trading space-y-4">
          <div className="text-sm font-semibold">Paramètres</div>

          <Param label="Capital de départ" value={`${startCapital.toLocaleString()}€`}>
            <Slider value={[startCapital]} onValueChange={([v]) => setStartCapital(v)} min={10000} max={200000} step={5000} className="mt-2" />
          </Param>

          <Param label="Objectif journalier" value={`${dailyTarget}€/jour`}>
            <Slider value={[dailyTarget]} onValueChange={([v]) => setDailyTarget(v)} min={100} max={2000} step={50} className="mt-2" />
          </Param>

          <Param label="Jours de trading/mois" value={`${tradingDays} jours`}>
            <Slider value={[tradingDays]} onValueChange={([v]) => setTradingDays(v)} min={10} max={22} step={1} className="mt-2" />
          </Param>

          <Param label="Réinvestissement" value={`${reinvestPct}%`}>
            <Slider value={[reinvestPct]} onValueChange={([v]) => setReinvestPct(v)} min={0} max={100} step={5} className="mt-2" />
          </Param>

          <Param label="Comptes initiaux" value={nbAccounts}>
            <div className="flex items-center gap-2 mt-2">
              <button onClick={() => setNbAccounts(Math.max(1, nbAccounts - 1))} className="w-7 h-7 rounded bg-secondary flex items-center justify-center"><Minus className="w-3 h-3" /></button>
              <span className="flex-1 text-center font-mono font-bold text-lg">{nbAccounts}</span>
              <button onClick={() => setNbAccounts(Math.min(20, nbAccounts + 1))} className="w-7 h-7 rounded bg-secondary flex items-center justify-center"><Plus className="w-3 h-3" /></button>
            </div>
          </Param>
        </div>

        {/* Chart */}
        <div className="lg:col-span-2 space-y-3">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card-trading text-center">
              <div className="text-xs text-muted-foreground mb-1">Balance M12</div>
              <div className="text-xl font-bold font-mono text-primary">{finalBalance >= 1000000 ? '🎯' : ''} {finalBalance.toLocaleString()}€</div>
            </div>
            <div className="card-trading text-center">
              <div className="text-xs text-muted-foreground mb-1">Profit total</div>
              <div className="text-xl font-bold font-mono text-green-400">+{totalProfit.toLocaleString()}€</div>
            </div>
            <div className="card-trading text-center">
              <div className="text-xs text-muted-foreground mb-1">Objectif 1M€</div>
              <div className="text-xl font-bold font-mono text-yellow-400">{monthsToTarget > 0 ? `M${monthsToTarget}` : finalBalance >= targetAmount ? '✅ Atteint' : '> 12 mois'}</div>
            </div>
          </div>

          {/* Growth chart */}
          <div className="card-trading">
            <span className="text-sm font-semibold block mb-3">Courbe de Croissance (12 mois)</span>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="snowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00FF88" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00FF88" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', borderRadius: 6, fontSize: 11 }}
                  formatter={(v) => [`${v.toLocaleString()}€`]} />
                <ReferenceLine y={targetAmount} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: '1M€ 🎯', fill: '#F59E0B', fontSize: 10 }} />
                <Area type="monotone" dataKey="balance" stroke="#00FF88" fill="url(#snowGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* MFF 10-day strategy */}
      <div className="card-trading">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Stratégie 1er Payout MFF — Objectif 10 Jours</span>
          <span className="text-xs text-muted-foreground ml-auto">Qualification: 3 000€ · DD Max: 2 000€</span>
        </div>
        <div className="space-y-2">
          {mffPlan.map(step => (
            <div key={step.step} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40 text-sm">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${step.step <= 2 ? 'bg-primary text-background' : 'bg-secondary text-muted-foreground'}`}>
                {step.step}
              </div>
              <div className="flex-1">
                <div className={`font-medium ${step.step <= 2 ? 'text-foreground' : 'text-muted-foreground'}`}>{step.action}</div>
              </div>
              <div className="text-right text-xs">
                <div className="text-muted-foreground">{step.duration}</div>
                <div className="font-mono text-primary">{step.pnl}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Param({ label, value, children }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-bold text-foreground">{value}</span>
      </div>
      {children}
    </div>
  );
}