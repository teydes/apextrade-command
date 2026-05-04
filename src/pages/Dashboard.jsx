import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import StatCard from '@/components/shared/StatCard';
import PreFlightChecklist from '@/components/shared/PreFlightChecklist';
import PnLGauge from '@/components/shared/PnLGauge';
import MultiAccountPanel from '@/components/dashboard/MultiAccountPanel';
import RiskManager from '@/components/dashboard/RiskManager';
import NewsCalendar from '@/components/dashboard/NewsCalendar';
import DailyMission from '@/components/dashboard/DailyMission';
import MarketBias from '@/components/dashboard/MarketBias';
import KillSwitchBanner from '@/components/shared/KillSwitchBanner';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import {
  TrendingUp, TrendingDown, Target, Shield, Zap, Activity, ArrowUpRight,
  Bot, BarChart2, Landmark, BookOpen, Dices, Clock, Wifi
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const pnlData = [
  { day: 'L', pnl: 320 }, { day: 'M', pnl: -180 }, { day: 'Me', pnl: 540 },
  { day: 'J', pnl: 620 }, { day: 'V', pnl: 280 }, { day: 'S', pnl: 0 }, { day: 'D', pnl: 0 },
];

const equityCurve = [
  { date: '01/04', eq: 50000 }, { date: '05/04', eq: 50820 }, { date: '10/04', eq: 51340 },
  { date: '15/04', eq: 51160 }, { date: '20/04', eq: 52280 }, { date: '25/04', eq: 52900 },
  { date: '29/04', eq: 53580 },
];

const recentTrades = [
  { id: 1, time: '09:42', symbol: 'NQ1!', dir: 'LONG', setup: 'OB + FVG', pnl: 320, result: 'win' },
  { id: 2, time: '10:15', symbol: 'NQ1!', dir: 'SHORT', setup: 'BOS + CHoCH', pnl: -95, result: 'loss' },
  { id: 3, time: '11:03', symbol: 'NQ1!', dir: 'LONG', setup: 'IFVG + AMD', pnl: 210, result: 'win' },
  { id: 4, time: '13:30', symbol: 'NQ1!', dir: 'LONG', setup: 'OB Retest', pnl: 0, result: 'breakeven' },
];

const QUICK_LINKS = [
  { to: '/backtest-auto', label: 'Backtest Auto', icon: Bot, color: 'text-blue-400' },
  { to: '/analytics', label: 'Analytics IA', icon: BarChart2, color: 'text-purple-400' },
  { to: '/prop-capital', label: 'Capital MFF', icon: Landmark, color: 'text-yellow-400' },
  { to: '/montecarlo', label: 'Monte Carlo', icon: Dices, color: 'text-orange-400' },
  { to: '/journal', label: 'Journal IA', icon: BookOpen, color: 'text-cyan-400' },
  { to: '/livefeed', label: 'Flux Live', icon: Wifi, color: 'text-primary' },
];

export default function Dashboard() {
  const [tick, setTick] = useState(0);
  const { data: signals = [] } = useQuery({ queryKey: ['signals'], queryFn: () => base44.entities.Signal.list('-created_date', 5) });

  // Simulate price tick for visual liveliness
  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 3000);
    return () => clearInterval(t);
  }, []);

  const todayPnL = 435;
  const dailyTarget = 500;
  const maxDD = 2000;
  const usedDD = 320;
  const accountBalance = 53580;
  const winRate = 67;
  const weekTotal = pnlData.reduce((s, d) => s + d.pnl, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" />
            Ghost Trader — Dashboard
          </h1>
          <p className="text-xs text-muted-foreground">
            MFF · Compte 50K · NQ Futures · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <PreFlightChecklist compact />
      </div>

      {/* Kill Switch Banner */}
      <KillSwitchBanner ddPct={Math.round((usedDD/maxDD)*100)} consecutiveLosses={0} />

      {/* Quick nav */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {QUICK_LINKS.map(l => (
          <Link key={l.to} to={l.to}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-card border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group">
            <l.icon className={`w-4 h-4 ${l.color} group-hover:scale-110 transition-transform`} />
            <span className="text-[10px] text-muted-foreground text-center leading-tight">{l.label}</span>
          </Link>
        ))}
      </div>

      {/* Top stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="P&L Journalier" value={`+${todayPnL}€`} sub={`Objectif: ${dailyTarget}€`} color="text-green-400" icon={TrendingUp} glow="green" />
        <StatCard label="Solde Compte" value={`${accountBalance.toLocaleString()}€`} sub="+3 580€ depuis début" color="text-foreground" icon={Activity} />
        <StatCard label="Drawdown Utilisé" value={`${usedDD}€`} sub={`Max: ${maxDD}€ (${((usedDD/maxDD)*100).toFixed(0)}%)`} color="text-yellow-400" icon={Shield} />
        <StatCard label="Win Rate" value={`${winRate}%`} sub="14W / 7L ce mois" color="text-blue-400" icon={Target} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Equity curve */}
        <div className="lg:col-span-2 card-trading">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">Courbe d'Équité</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-primary font-mono">+3 580€ (+7.16%)</span>
              <Link to="/analytics">
                <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 text-muted-foreground hover:text-primary">
                  <ArrowUpRight className="w-3 h-3" />Analytics
                </Button>
              </Link>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={equityCurve}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF88" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00FF88" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', borderRadius: 6, fontSize: 11 }}
                formatter={v => [`${v.toLocaleString()}€`, 'Équité']} />
              <Area type="monotone" dataKey="eq" stroke="#00FF88" fill="url(#eqGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* PnL Gauge + Drawdown */}
        <div className="space-y-3">
          <PnLGauge current={todayPnL} target={dailyTarget} label="Objectif Journalier" />
          <div className="card-trading">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">Drawdown Journalier</span>
              <span className={`font-mono font-bold ${usedDD / maxDD > 0.7 ? 'text-destructive' : 'text-yellow-400'}`}>{((usedDD/maxDD)*100).toFixed(0)}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${(usedDD/maxDD)*100}%`, background: usedDD/maxDD > 0.7 ? '#EF4444' : '#F59E0B' }} />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-muted-foreground">0€</span>
              <span className="text-yellow-400 font-mono">{usedDD}€ / {maxDD}€</span>
            </div>
          </div>
          {/* MFF Kill Switch mini */}
          <div className={`card-trading border ${usedDD / maxDD > 0.7 ? 'border-destructive/50 bg-destructive/5' : 'border-border'}`}>
            <div className="flex items-center gap-2 text-xs">
              <Shield className={`w-3.5 h-3.5 ${usedDD / maxDD > 0.7 ? 'text-destructive' : 'text-primary'}`} />
              <span className="text-muted-foreground flex-1">Kill Switch MFF</span>
              <span className={`font-bold ${usedDD / maxDD > 0.7 ? 'text-destructive' : 'text-primary'}`}>
                {usedDD / maxDD > 0.7 ? '⚠️ DANGER' : '✅ SAFE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* P&L hebdo + Recent trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-trading">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">P&L Cette Semaine</span>
            <span className={`text-xs font-mono font-bold ${weekTotal >= 0 ? 'text-primary' : 'text-destructive'}`}>{weekTotal >= 0 ? '+' : ''}{weekTotal}€</span>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={pnlData}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', borderRadius: 6, fontSize: 11 }}
                formatter={v => [`${v}€`, 'P&L']} />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                {pnlData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#00FF88' : '#EF4444'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card-trading">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">Trades Récents</span>
            <Link to="/backtest"><Button size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground">Voir tout →</Button></Link>
          </div>
          <div className="space-y-2">
            {recentTrades.map(t => (
              <div key={t.id} className="flex items-center gap-2 text-xs p-2 rounded bg-secondary/50 hover:bg-secondary transition-colors">
                <span className="text-muted-foreground font-mono w-10">{t.time}</span>
                <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${t.dir === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{t.dir}</span>
                <span className="text-muted-foreground flex-1 truncate">{t.setup}</span>
                <span className={`font-mono font-bold ${t.pnl > 0 ? 'text-green-400' : t.pnl < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {t.pnl > 0 ? '+' : ''}{t.pnl}€
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Signals + Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-trading">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Signaux TradingView</span>
            <span className="ml-auto text-xs text-primary bg-primary/10 px-2 py-0.5 rounded animate-pulse">LIVE</span>
          </div>
          {signals.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-6">
              <Zap className="w-6 h-6 mx-auto mb-2 opacity-30" />
              En attente de signaux webhook TradingView...
            </div>
          ) : (
            signals.slice(0, 4).map(s => (
              <div key={s.id} className="flex items-center gap-2 text-xs p-2 rounded bg-secondary/50 mb-1.5">
                <span className={`status-dot ${s.status === 'pending' ? 'warning' : s.status === 'executed' ? 'active' : 'inactive'}`} />
                <span className={`font-bold ${s.direction === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>{s.direction}</span>
                <span className="text-muted-foreground">{s.symbol}</span>
                <span className="ml-auto text-muted-foreground capitalize">{s.status}</span>
              </div>
            ))
          )}
        </div>
        <PreFlightChecklist />
      </div>

      {/* Biais + Mission + Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MarketBias />
        <DailyMission />
        <RiskManager />
      </div>

      {/* News + Accounts */}
      <NewsCalendar />
      <MultiAccountPanel />
    </div>
  );
}