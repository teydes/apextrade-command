import { useState } from 'react';
import { TrendingUp, TrendingDown, Shield, Plus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ACCOUNTS = [
  { id: 'mff-50k', name: 'MFF 50K', propfirm: 'MyFundedFutures', size: 50000, balance: 53580, phase: 'Backtest', status: 'active', dailyPnl: 435, dd_used: 320, dd_max: 2000, wr: 67, cost: 165 },
  { id: 'mff-150k', name: 'MFF 150K', propfirm: 'MyFundedFutures', size: 150000, balance: 150000, phase: 'Évaluation', status: 'inactive', dailyPnl: 0, dd_used: 0, dd_max: 4500, wr: 0, cost: 320 },
  { id: 'ftuk-100k', name: 'FTUK 100K', propfirm: 'FTUK', size: 100000, balance: 100000, phase: 'Évaluation', status: 'inactive', dailyPnl: 0, dd_used: 0, dd_max: 5000, wr: 0, cost: 299 },
];

const RECOMMENDATION = {
  account: 'MFF 50K',
  reason: 'Avec 4500€ de capital initial et 480€/mois de charges, le compte 50K MFF à 165€ est le plus adapté. Profit factor requis: ~1.5 — atteignable avec WR>60% et RR>2.0. Le 150K est prématuré avant validation backtest stable.',
  cost: '165€ / évaluation',
  target_daily: '500€/jour',
  target_monthly: '~8 000€/mois (60% payout)',
};

export default function MultiAccountPanel() {
  const [selected, setSelected] = useState('mff-50k');
  const [showReco, setShowReco] = useState(false);

  const totalEquity = ACCOUNTS.filter(a => a.status === 'active').reduce((s, a) => s + a.balance, 0);
  const totalDailyPnl = ACCOUNTS.filter(a => a.status === 'active').reduce((s, a) => s + a.dailyPnl, 0);

  return (
    <div className="card-trading space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Tableau Multi-Comptes</span>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-muted-foreground font-mono">Total: <span className="text-primary">{totalEquity.toLocaleString()}€</span></span>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-yellow-400" onClick={() => setShowReco(!showReco)}>
            🎯 Recommandation
          </Button>
        </div>
      </div>

      {/* Reco */}
      {showReco && (
        <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 text-xs space-y-1.5">
          <div className="font-semibold text-primary">✅ Compte recommandé : {RECOMMENDATION.account} — {RECOMMENDATION.cost}</div>
          <p className="text-muted-foreground">{RECOMMENDATION.reason}</p>
          <div className="flex gap-4 mt-2">
            <span className="text-primary font-mono font-bold">{RECOMMENDATION.target_daily}</span>
            <span className="text-muted-foreground">objectif journalier</span>
            <span className="text-yellow-400 font-mono font-bold">{RECOMMENDATION.target_monthly}</span>
            <span className="text-muted-foreground">estimé mensuel</span>
          </div>
        </div>
      )}

      {/* Account cards */}
      <div className="space-y-2">
        {ACCOUNTS.map(a => {
          const sel = selected === a.id;
          const ddPct = a.dd_max > 0 ? (a.dd_used / a.dd_max) * 100 : 0;
          const growthPct = a.size > 0 ? (((a.balance - a.size) / a.size) * 100).toFixed(1) : 0;
          return (
            <div key={a.id} onClick={() => setSelected(a.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${sel ? 'border-primary/50 bg-primary/5' : 'border-border bg-secondary/20 hover:border-border/80'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.status === 'active' ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold">{a.name}</span>
                    <span className="text-[10px] text-muted-foreground">{a.propfirm}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${a.status === 'active' ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>{a.phase}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-mono font-bold ${a.dailyPnl > 0 ? 'text-green-400' : a.dailyPnl < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                    {a.dailyPnl > 0 ? '+' : ''}{a.dailyPnl}€
                  </div>
                  <div className="text-[10px] text-muted-foreground">aujourd'hui</div>
                </div>
                {a.status === 'active' && growthPct > 0 && (
                  <div className="text-right">
                    <div className="text-xs font-mono text-primary">+{growthPct}%</div>
                    <div className="text-[10px] text-muted-foreground">growth</div>
                  </div>
                )}
                <ChevronRight className={`w-3 h-3 flex-shrink-0 transition-transform ${sel ? 'text-primary rotate-90' : 'text-muted-foreground'}`} />
              </div>

              {/* DD bar */}
              {a.status === 'active' && sel && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Drawdown utilisé</span>
                    <span className={ddPct > 70 ? 'text-destructive' : ddPct > 40 ? 'text-yellow-400' : 'text-primary'}>{ddPct.toFixed(0)}% — {a.dd_used}€ / {a.dd_max}€</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${ddPct}%`, background: ddPct > 70 ? '#EF4444' : ddPct > 40 ? '#F59E0B' : '#00FF88' }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border">
        <span className="text-[10px] text-muted-foreground">P&L Consolidé Journalier</span>
        <span className={`text-sm font-mono font-bold ${totalDailyPnl >= 0 ? 'text-primary' : 'text-destructive'}`}>{totalDailyPnl >= 0 ? '+' : ''}{totalDailyPnl}€</span>
      </div>
    </div>
  );
}