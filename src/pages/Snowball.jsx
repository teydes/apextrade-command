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

  // MFF plan — compte 50K SANS évaluation, objectif 3000€ puis boule de neige
  const mffPlan = [
    { step: 1, action: '🟢 Ouvrir compte MFF 50K (SANS évaluation)', duration: 'J0', capital: '50K', pnl: '480€', highlight: true },
    { step: 2, action: '⚡ Atteindre 3 000€ de profit (objectif interne)', duration: 'J1–J10', capital: '50K', pnl: '3 000€', highlight: true },
    { step: 3, action: '💰 1er payout MFF (90% = 2 700€) — LIBERTÉ TOTALE', duration: 'J+14', capital: '50K', pnl: '~2 700€', highlight: true },
    { step: 4, action: 'Ouvrir 2e compte MFF 50K + Tradefy 25K (copy)', duration: 'M2', capital: '125K', pnl: '~5 400€/m' },
    { step: 5, action: 'Ajouter Lucid 50K + UFunded 25K (4 comptes)', duration: 'M3', capital: '250K', pnl: '~9 000€/m' },
    { step: 6, action: 'Scaling 6 comptes copy (MFF ×2, Tradefy ×2, Lucid ×2)', duration: 'M4', capital: '400K', pnl: '~15 000€/m' },
    { step: 7, action: '10 comptes actifs en copy trading simultané', duration: 'M6', capital: '600K', pnl: '~22 000€/m' },
    { step: 8, action: '15 comptes actifs — Objectif 1M€ atteint', duration: 'M10-12', capital: '900K+', pnl: 'OBJECTIF 🎯' },
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
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Plan Boule de Neige — MFF 50K Sans Évaluation</span>
          <span className="ml-auto text-xs px-2 py-0.5 rounded bg-primary/20 text-primary font-bold">SANS ÉVAL · Objectif 3 000€</span>
        </div>
        <div className="p-2 mb-3 rounded bg-yellow-400/5 border border-yellow-400/20 text-xs text-yellow-400">
          ⚡ Le compte MFF 50K ne nécessite <strong>aucune évaluation</strong> — accès direct au capital. 
          Après 3 000€ de profit, le 2e jour consécutif de gains revient entièrement. Objectif : 1er payout en J+14.
        </div>
        <div className="space-y-2">
          {mffPlan.map(step => (
            <div key={step.step} className={`flex items-center gap-3 p-3 rounded-lg text-sm transition-all ${step.highlight ? 'bg-primary/10 border border-primary/20' : 'bg-secondary/40'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${step.highlight ? 'bg-primary text-background' : 'bg-secondary text-muted-foreground'}`}>
                {step.step}
              </div>
              <div className="flex-1">
                <div className={`font-medium ${step.highlight ? 'text-foreground' : 'text-muted-foreground'}`}>{step.action}</div>
              </div>
              <div className="text-right text-xs">
                <div className="text-muted-foreground">{step.duration}</div>
                <div className={`font-mono font-bold ${step.highlight ? 'text-primary' : 'text-muted-foreground'}`}>{step.pnl}</div>
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