import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Repeat, Ban, Wallet } from 'lucide-react';

// Cible de gain dynamique garantissant la consistance :
// après un gain g, ratio = (jour+g)/(total+g) ≤ r  →  g_max = (r·total − jour) / (1 − r)
export const dynamicDailyTarget = (account, s) => {
  const r = (account.consistency_rule || 0) / 100;
  if (r <= 0 || r >= 1 || s.totalPnl <= 0) return null;
  const cap = (r * s.totalPnl - Math.max(s.dailyPnl, 0)) / (1 - r);
  return Math.max(0, cap);
};

const Row = ({ name, balance, goal, cap, blocked }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
    <div>
      <div className="text-xs font-bold text-foreground">{name}</div>
      <div className="text-[10px] text-muted-foreground font-mono">{Math.round(balance).toLocaleString()}€</div>
    </div>
    {blocked ? (
      <div className="flex items-center gap-1 text-[10px] font-bold text-yellow-400"><Ban className="w-3 h-3" />STOP gains (consistance)</div>
    ) : (
      <div className="text-right">
        <div className="text-xs font-mono font-bold text-primary">Cible: +{Math.round(goal)}€</div>
        <div className="text-[10px] text-muted-foreground font-mono">Plafond: +{Math.round(cap)}€</div>
      </div>
    )}
  </div>
);

export default function DynamicTargets({ stats }) {
  const rows = stats
    .filter(({ account }) => (account.consistency_rule || 0) > 0 && (account.current_balance || 0) > 0)
    .map(({ account, s }) => {
      const cap = dynamicDailyTarget(account, s);
      // Cible prudente: 1% du compte, plafonnée par le cap de consistance et le restant d'objectif
      const remainingTarget = Math.max(0, (account.overall_profit_target || 0) - ((account.current_balance || 0) - (account.account_size || 0)));
      const goal = cap == null ? null : Math.min(cap, (account.current_balance || 0) * 0.01, remainingTarget || cap);
      return { account, s, cap, goal, blocked: cap != null && cap <= 0 };
    });

  const totalGoal = rows.reduce((a, r) => a + (r.goal || 0), 0);

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground"><Target className="w-4 h-4 text-primary" />Objectifs journaliers dynamiques</div>
          <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1"><Wallet className="w-3 h-3" />Total: +{Math.round(totalGoal)}€ / jour</div>
        </div>
        <p className="text-[10px] text-muted-foreground mb-2">
          Ajustés automatiquement à la taille du compte et à la règle de consistance — la cible ne peut jamais faire dépasser le % journalier autorisé sur le total.
        </p>
        {rows.length === 0 && <div className="text-xs text-muted-foreground">Aucun compte avec règle de consistance configurée.</div>}
        {rows.map((r) => (
          <Row key={r.account.id} name={r.account.name} balance={r.account.current_balance} goal={r.goal} cap={r.cap} blocked={r.blocked} />
        ))}
        {rows.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground"><Repeat className="w-3 h-3" />Recalculé en temps réel à chaque trade enregistré.</div>
        )}
      </CardContent>
    </Card>
  );
}