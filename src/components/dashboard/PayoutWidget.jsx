import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DollarSign, ArrowUpRight, Calculator } from 'lucide-react';
import { BarChart, Bar, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const PROPFIRMS_PAYOUT = {
  MFF: { split: 0.80, min: 500 },
  Tradefy: { split: 0.85, min: 100 },
  Lucid: { split: 0.80, min: 200 },
};

export default function PayoutWidget() {
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts-payout-widget'],
    queryFn: () => base44.entities.TradingAccount.list(),
  });
  const { data: reports = [] } = useQuery({
    queryKey: ['reports-payout-widget'],
    queryFn: () => base44.entities.DailyReport.list('-date', 30),
  });

  const activeAccounts = accounts.filter(a => a.status === 'active');

  const accountsWithPayout = useMemo(() => {
    return activeAccounts.map(acc => {
      const pfConfig = PROPFIRMS_PAYOUT[acc.propfirm] || { split: 0.80, min: 500 };
      const monthlyPnl = reports.filter(r => r.account_id === acc.id || r.phase === acc.phase).reduce((s, r) => s + (r.net_pnl || 0), 0);
      const payoutEligible = monthlyPnl > pfConfig.min;
      return { ...acc, monthlyPnl, payoutEligible, estimatedPayout: payoutEligible ? Math.round(monthlyPnl * pfConfig.split) : 0 };
    });
  }, [activeAccounts, reports]);

  const totalEstimatedPayout = accountsWithPayout.reduce((s, a) => s + a.estimatedPayout, 0);
  const totalMonthlyPnl = accountsWithPayout.reduce((s, a) => s + a.monthlyPnl, 0);
  const eligibleCount = accountsWithPayout.filter(a => a.payoutEligible).length;

  if (accounts.length === 0) {
    return (
      <div className="card-trading">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold">Simulateur Payouts</span>
          </div>
          <Link to="/payout-simulator" className="text-xs text-primary hover:underline flex items-center gap-1">
            Ouvrir <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="text-center py-3">
          <Calculator className="w-6 h-6 mx-auto mb-2 text-yellow-400 opacity-50" />
          <p className="text-xs text-muted-foreground mb-2">Simulez vos payouts PropFirm</p>
          <Link to="/payout-simulator">
            <button className="text-xs px-3 py-1.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 hover:bg-yellow-400/20 transition-all">
              Lancer la simulation
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const chartData = accountsWithPayout.map(a => ({
    name: a.propfirm || a.name?.slice(0, 6),
    pnl: Math.max(0, a.monthlyPnl),
    target: a.overall_profit_target || 2500,
  }));

  return (
    <div className="card-trading">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-semibold">Payouts Estimés</span>
          {eligibleCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 animate-pulse">
              {eligibleCount} eligible{eligibleCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <Link to="/payout-simulator" className="text-xs text-primary hover:underline flex items-center gap-1">
          Simuler <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2 rounded bg-primary/5 border border-primary/20 text-center">
          <div className="text-[10px] text-muted-foreground">Payout Estimé</div>
          <div className="text-lg font-bold font-mono text-primary">{totalEstimatedPayout.toLocaleString()}€</div>
        </div>
        <div className="p-2 rounded bg-secondary/40 text-center">
          <div className="text-[10px] text-muted-foreground">PnL Mensuel</div>
          <div className={`text-lg font-bold font-mono ${totalMonthlyPnl >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {totalMonthlyPnl >= 0 ? '+' : ''}{totalMonthlyPnl.toLocaleString()}€
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={60}>
          <BarChart data={chartData} barSize={14}>
            <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', fontSize: 9, borderRadius: 4 }} formatter={v => [`${v}€`, '']} />
            <Bar dataKey="pnl" name="PnL" radius={[2, 2, 0, 0]}>
              {chartData.map((_, i) => <Cell key={i} fill="#00FF88" />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      <div className="space-y-1 mt-2">
        {accountsWithPayout.slice(0, 3).map(acc => (
          <div key={acc.id} className="flex items-center gap-2 text-xs">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${acc.payoutEligible ? 'bg-primary' : 'bg-muted-foreground'}`} />
            <span className="text-muted-foreground flex-1 truncate">{acc.propfirm} {acc.name}</span>
            <span className={`font-mono font-bold ${acc.payoutEligible ? 'text-primary' : 'text-muted-foreground'}`}>
              {acc.payoutEligible ? `+${acc.estimatedPayout}€` : 'Non eligible'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}