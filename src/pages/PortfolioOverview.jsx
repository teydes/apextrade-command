import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import RiskMonitor from '@/components/shared/RiskMonitor';
import DynamicTargets from '@/components/overview/DynamicTargets';
import PreTradeRisk from '@/components/overview/PreTradeRisk';
import GlobalEquityChart from '@/components/overview/GlobalEquityChart';
import GlobalAIReview from '@/components/overview/GlobalAIReview';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { accountStats, computeAlerts, riskLevel, barColor } from '@/lib/portfolio';
import { sum } from '@/lib/stats';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Globe, Wallet, TrendingDown, TrendingUp, ShieldAlert, Activity, Target, Repeat } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, sub, color = 'text-foreground' }) => (
  <Card className="bg-card border-border">
    <CardContent className="p-3">
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wide">
        <Icon className="w-3 h-3" />{label}
      </div>
      <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </CardContent>
  </Card>
);

const UsageBar = ({ label, pct, right, icon: Icon }) => (
  <div>
    <div className="flex justify-between text-[10px] mb-0.5">
      <span className="text-muted-foreground flex items-center gap-1">{Icon && <Icon className="w-2.5 h-2.5" />}{label}</span>
      <span className={`font-mono font-bold ${pct >= 85 ? 'text-red-400' : pct >= 60 ? 'text-yellow-400' : 'text-green-400'}`}>{right ?? `${pct.toFixed(0)}%`}</span>
    </div>
    <div className="h-1.5 rounded bg-secondary overflow-hidden">
      <div className="h-full rounded transition-all" style={{ width: `${Math.min(100, pct)}%`, background: barColor(pct) }} />
    </div>
  </div>
);

const AccountCard = ({ account, s }) => (
  <Card className="bg-card border-border">
    <CardContent className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`status-dot ${riskLevel(Math.max(s.dailyUsedPct, s.ddUsedPct))}`} />
          <div>
            <div className="text-sm font-bold text-foreground">{account.name}</div>
            <div className="text-[10px] text-muted-foreground">{account.propfirm || account.broker || '—'} · {account.phase}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-mono font-bold text-foreground">{Math.round(account.current_balance || 0).toLocaleString()}€</div>
          <div className={`text-[10px] font-mono ${s.dailyPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            Jour: {s.dailyPnl >= 0 ? '+' : ''}{Math.round(s.dailyPnl)}€
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">{s.dailyTradesCount} trades · WR {s.dailyWinRate.toFixed(0)}%</div>
          {s.targetPct >= 100 && (
            <div className="text-[9px] font-bold text-green-400 bg-green-500/10 rounded px-1.5 py-0.5 inline-block">PAYOUT PRÊT</div>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {account.daily_drawdown_limit > 0 && <UsageBar label="DD journalier" pct={s.dailyUsedPct} />}
        {account.max_drawdown_limit > 0 && <UsageBar label="DD max" pct={s.ddUsedPct} />}
        {account.overall_profit_target > 0 && (
          <div>
            <div className="flex justify-between text-[10px] mb-0.5">
              <span className="text-muted-foreground flex items-center gap-1"><Target className="w-2.5 h-2.5" />Objectif profit</span>
              <span className="font-mono font-bold text-primary">{s.targetPct.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 rounded bg-secondary overflow-hidden">
              <div className="h-full rounded bg-primary transition-all" style={{ width: `${s.targetPct}%` }} />
            </div>
          </div>
        )}
        {account.consistency_rule > 0 && (
          <div>
            <div className="flex justify-between text-[10px] mb-0.5">
              <span className="text-muted-foreground flex items-center gap-1"><Repeat className="w-2.5 h-2.5" />Consistance du jour (max {account.consistency_rule}%)</span>
              <span className={`font-mono font-bold ${s.consistencyStatus === 'violation' ? 'text-red-400' : s.consistencyStatus === 'attention' ? 'text-yellow-400' : 'text-green-400'}`}>
                {s.consistencyPct.toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 rounded bg-secondary overflow-hidden">
              <div className={`h-full rounded transition-all ${s.consistencyStatus === 'violation' ? 'bg-red-500' : s.consistencyStatus === 'attention' ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, s.consistencyPct)}%` }} />
            </div>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

export default function PortfolioOverview() {
  const qc = useQueryClient();
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['portfolio-accounts'],
    queryFn: () => base44.entities.TradingAccount.list(),
    refetchInterval: 30000,
  });
  const { data: trades = [] } = useQuery({
    queryKey: ['portfolio-trades'],
    queryFn: () => base44.entities.Trade.list('-entry_time', 500),
    refetchInterval: 30000,
  });

  // Temps réel: rafraîchit dès qu'un compte ou un trade change
  useEffect(() => {
    const u1 = base44.entities.TradingAccount.subscribe(() => qc.invalidateQueries({ queryKey: ['portfolio-accounts'] }));
    const u2 = base44.entities.Trade.subscribe(() => qc.invalidateQueries({ queryKey: ['portfolio-trades'] }));
    return () => { u1(); u2(); };
  }, [qc]);

  const stats = accounts.map((a) => ({ account: a, s: accountStats(a, trades) }));
  const alerts = computeAlerts(accounts, trades);
  const activeAlerts = alerts.filter((a) => a.level !== 'success');
  const totalEquity = sum(accounts.map((a) => a.current_balance || 0));
  const dailyPnl = sum(stats.map((x) => x.s.dailyPnl));
  const maxUsage = Math.max(0, ...stats.map((x) => Math.max(x.s.dailyUsedPct, x.s.ddUsedPct)));
  const accountsAtRisk = stats.filter((x) => Math.max(x.s.dailyUsedPct, x.s.ddUsedPct) >= 60).length;
  const pnlChart = stats.map((x) => ({ name: x.account.name, value: Math.round(x.s.totalPnl) }));

  const exportCSV = () => {
    const lines = ['Compte,Solde,PnL Jour,PnL Total,DD Jour %,DD Max %,Objectif %,Consistance %,Statut,Trades Jour,WR Jour %'];
    stats.forEach(({ account, s }) => lines.push([
      account.name, Math.round(account.current_balance || 0), Math.round(s.dailyPnl), Math.round(s.totalPnl),
      s.dailyUsedPct.toFixed(1), s.ddUsedPct.toFixed(1), s.targetPct.toFixed(1), s.consistencyPct.toFixed(1),
      s.consistencyStatus, s.dailyTradesCount, s.dailyWinRate.toFixed(1),
    ].join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portefeuille_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="p-6 flex items-center justify-center min-h-[400px] text-xs text-muted-foreground font-mono">Chargement du centre de contrôle…</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <RiskMonitor accounts={accounts} trades={trades} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Vue Globale Multi-Comptes</h1>
            <p className="text-xs text-muted-foreground">Performance, risque cumulé et consistance — un seul écran</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
            <span className="status-dot active" />TEMPS RÉEL · 30s
          </div>
          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={exportCSV}>
            <Download className="w-3 h-3" />Export CSV
          </Button>
        </div>
      </div>

      {activeAlerts.length > 0 && (
        <Card className="bg-card border-red-500/40">
          <CardContent className="p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-red-400"><ShieldAlert className="w-4 h-4" />Alertes limites actives</div>
            {activeAlerts.map((a) => (
              <div key={a.id} className={`text-xs flex items-center gap-2 ${a.level === 'critical' ? 'text-red-400' : 'text-yellow-400'}`}>
                <span className="status-dot danger" />
                <span className="font-bold">{a.account}</span> — {a.label}: <span className="font-mono">{a.pct.toFixed(0)}%</span> de la limite utilisée
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Wallet} label="Equity totale" value={`${Math.round(totalEquity).toLocaleString()}€`} sub={`${accounts.length} comptes`} />
        <StatCard icon={TrendingUp} label="PnL du jour" value={`${dailyPnl >= 0 ? '+' : ''}${Math.round(dailyPnl)}€`} color={dailyPnl >= 0 ? 'text-green-400' : 'text-red-400'} sub="tous comptes" />
        <StatCard icon={TrendingDown} label="Risque max" value={`${maxUsage.toFixed(0)}%`} color={maxUsage >= 85 ? 'text-red-400' : maxUsage >= 60 ? 'text-yellow-400' : 'text-green-400'} sub="pire utilisation DD" />
        <StatCard icon={ShieldAlert} label="Comptes à risque" value={`${accountsAtRisk}/${accounts.length}`} color={accountsAtRisk > 0 ? 'text-yellow-400' : 'text-green-400'} sub={activeAlerts.length ? `${activeAlerts.length} alerte(s)` : 'aucune alerte'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {stats.map(({ account, s }) => <AccountCard key={account.id} account={account} s={s} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <DynamicTargets stats={stats} />
        <PreTradeRisk stats={stats} />
      </div>

      <GlobalEquityChart trades={trades} />

      <GlobalAIReview stats={stats} totalEquity={totalEquity} dailyPnl={dailyPnl} />

      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm font-bold mb-2"><Activity className="w-4 h-4 text-primary" />PnL total par compte</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pnlChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '12px' }} />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {pnlChart.map((d, i) => <Cell key={i} fill={d.value >= 0 ? '#00FF88' : '#EF4444'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}