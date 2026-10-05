// Agrégation multi-comptes: performance, risque, consistance
import { sum, sortByTime } from '@/lib/stats';

export const todayKey = () => new Date().toISOString().slice(0, 10);

export const accountStats = (account, trades) => {
  const at = (trades || []).filter((t) => t.account_id === account.id && typeof t.pnl === 'number');
  const dailyPnl = sum(at.filter((t) => (t.entry_time || '').slice(0, 10) === todayKey()).map((t) => t.pnl));
  const totalPnl = sum(at.map((t) => t.pnl));
  let eq = account.current_balance - totalPnl;
  let peak = Math.max(eq, account.account_size || 0);
  sortByTime(at).forEach((t) => { eq += t.pnl; peak = Math.max(peak, eq); });
  const currentDD = Math.max(0, peak - (account.current_balance || 0));
  const maxLimit = account.max_drawdown_limit || 0;
  const ddUsedPct = maxLimit > 0 ? (currentDD / maxLimit) * 100 : 0;
  const dailyLimit = account.daily_drawdown_limit || 0;
  const dailyUsedPct = dailyLimit > 0 && dailyPnl < 0 ? (Math.min(Math.abs(dailyPnl), dailyLimit) / dailyLimit) * 100 : 0;
  const target = account.overall_profit_target || 0;
  const targetPct = target > 0 ? Math.max(0, Math.min(100, ((account.current_balance - (account.account_size || 0)) / target) * 100)) : 0;
  const consistencyPct = totalPnl > 0 ? (dailyPnl / totalPnl) * 100 : 0;
  const rule = account.consistency_rule || 0;
  const consistencyStatus =
    rule > 0 && totalPnl > 0
      ? consistencyPct > rule ? 'violation' : consistencyPct > rule * 0.8 ? 'attention' : 'ok'
      : 'ok';
  const dailyTrades = at.filter((t) => (t.entry_time || '').slice(0, 10) === todayKey());
  return { dailyPnl, totalPnl, currentDD, ddUsedPct, dailyUsedPct, targetPct, consistencyPct, consistencyStatus, peak, tradesCount: at.length, dailyTradesCount: dailyTrades.length, dailyWinRate: dailyTrades.length ? (dailyTrades.filter((t) => t.pnl > 0).length / dailyTrades.length) * 100 : 0 };
};

export const computeAlerts = (accounts, trades) => {
  const alerts = [];
  (accounts || []).forEach((acc) => {
    const s = accountStats(acc, trades || []);
    const push = (level, label, pct) => alerts.push({ id: `${acc.id}-${label}-${level}`, account: acc.name, level, label, pct });
    if (s.dailyUsedPct >= 95) push('critical', 'DD journalier', s.dailyUsedPct);
    else if (s.dailyUsedPct >= 80) push('warning', 'DD journalier', s.dailyUsedPct);
    if (s.ddUsedPct >= 95) push('critical', 'DD max', s.ddUsedPct);
    else if (s.ddUsedPct >= 80) push('warning', 'DD max', s.ddUsedPct);
    if (s.targetPct >= 100) push('success', 'Objectif atteint', 100);
    if (s.consistencyStatus === 'violation') push('critical', 'Consistance', s.consistencyPct);
  });
  return alerts;
};

export const riskLevel = (pct) => (pct >= 85 ? 'danger' : pct >= 60 ? 'warning' : 'active');
export const barColor = (pct) => (pct >= 85 ? '#EF4444' : pct >= 60 ? '#F59E0B' : '#00FF88');