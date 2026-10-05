import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

const LEVELS = {
  danger: { icon: XCircle, cls: 'text-red-400', bg: 'bg-red-500/10' },
  warning: { icon: AlertTriangle, cls: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  info: { icon: Info, cls: 'text-blue-400', bg: 'bg-blue-500/10' },
  success: { icon: CheckCircle2, cls: 'text-green-400', bg: 'bg-green-500/10' },
};

// Suggestions intelligentes: analyse par règles de l'état du portefeuille
export default function SmartSuggestions({ stats, trades }) {
  const suggestions = useMemo(() => {
    const out = [];
    stats.forEach(({ account, s }) => {
      const accTrades = (trades || []).filter((t) => t.account_id === account.id && t.status === 'closed' && typeof t.pnl === 'number').slice(0, 10);
      let streak = 0;
      for (const t of accTrades) { if (t.pnl < 0) streak++; else break; }
      if (streak >= 3) out.push({ level: 'warning', text: `${streak} pertes consécutives sur ${account.name} — réduis la taille ou fais une pause.` });
      if (account.daily_drawdown_limit > 0 && s.dailyUsedPct >= 85) out.push({ level: 'danger', text: `${account.name}: ${s.dailyUsedPct.toFixed(0)}% du DD journalier utilisé — arrête le trading sur ce compte aujourd'hui.` });
      else if (account.daily_drawdown_limit > 0 && s.dailyUsedPct >= 60) out.push({ level: 'warning', text: `${account.name}: ${s.dailyUsedPct.toFixed(0)}% du DD journalier — réduis la taille des positions.` });
      if (account.max_drawdown_limit > 0 && s.ddUsedPct >= 60) out.push({ level: 'warning', text: `${account.name}: ${s.ddUsedPct.toFixed(0)}% du DD max consommé — vigilance sur la survie du compte.` });
      if (s.consistencyStatus === 'violation') out.push({ level: 'danger', text: `Consistance: ce jour représente ${s.consistencyPct.toFixed(0)}% du total sur ${account.name} — risque de refus de payout, lisse tes gains.` });
      else if (s.consistencyStatus === 'attention') out.push({ level: 'info', text: `Consistance en zone d'attention sur ${account.name} (${s.consistencyPct.toFixed(1)}%) — évite un trop gros gain isolé.` });
      if (s.targetPct >= 100) out.push({ level: 'success', text: `Objectif atteint sur ${account.name} — demande ton payout.` });
      else if (s.targetPct >= 90) out.push({ level: 'info', text: `${account.name} approche de son objectif (${s.targetPct.toFixed(0)}%) — sécurise les gains, ne force pas.` });
      if (account.max_trades_per_day > 0 && s.dailyTradesCount > account.max_trades_per_day) out.push({ level: 'warning', text: `Sur-trading sur ${account.name}: ${s.dailyTradesCount} trades vs max ${account.max_trades_per_day} du plan.` });
    });
    const sorted = [...stats].sort((a, b) => b.s.totalPnl - a.s.totalPnl);
    if (sorted.length >= 2) {
      const best = sorted[0], worst = sorted[sorted.length - 1];
      if (best.s.totalPnl > 0) out.push({ level: 'info', text: `Meilleur contributeur: ${best.account.name} (+${Math.round(best.s.totalPnl)}€) — reproduis ce plan.` });
      if (worst.s.totalPnl < 0) out.push({ level: 'warning', text: `${worst.account.name} tire le portefeuille vers le bas (${Math.round(worst.s.totalPnl)}€) — revois le plan ou réduis le risque.` });
    }
    if (out.length === 0) out.push({ level: 'success', text: 'Portefeuille sain: aucune limite menacée, consistance OK. Continue sur ta lancée.' });
    return out.slice(0, 12);
  }, [stats, trades]);

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm font-bold mb-2">
          <Lightbulb className="w-4 h-4 text-primary" />Suggestions & Améliorations
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">{suggestions.length} point(s)</span>
        </div>
        <div className="space-y-1.5">
          {suggestions.map((sug, i) => {
            const L = LEVELS[sug.level];
            const Icon = L.icon;
            return (
              <div key={i} className={`text-xs flex items-start gap-2 rounded px-2.5 py-1.5 ${L.bg} ${L.cls}`}>
                <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{sug.text}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}