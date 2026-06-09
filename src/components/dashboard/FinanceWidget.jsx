import { Link } from 'react-router-dom';
import { PiggyBank, ArrowUpRight, Shield, AlertTriangle, TrendingUp } from 'lucide-react';

// Widget compact Finance Personnelle pour le Dashboard
// Props: debts, safeWithdrawal, healthScore
export default function FinanceWidget({ debts = [], safeWithdrawal = 0, healthScore = 75, totalPayouts = 0 }) {
  const urgentDebts = debts.filter(d => d.priority === 1 && d.remaining > 0);
  const totalDebts = debts.reduce((s, d) => s + (d.remaining || 0), 0);

  return (
    <div className="card-trading">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PiggyBank className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-semibold">Finance Perso</span>
        </div>
        <Link to="/finance-perso" className="text-xs text-primary hover:underline flex items-center gap-1">
          Gérer <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <div className={`text-lg font-bold font-mono ${healthScore >= 70 ? 'text-primary' : healthScore >= 50 ? 'text-yellow-400' : 'text-destructive'}`}>{healthScore}</div>
          <div className="text-[10px] text-muted-foreground">Santé /100</div>
        </div>
        <div className="text-center">
          <div className={`text-lg font-bold font-mono ${totalDebts === 0 ? 'text-primary' : 'text-destructive'}`}>{totalDebts.toLocaleString()}€</div>
          <div className="text-[10px] text-muted-foreground">Dettes</div>
        </div>
        <div className="text-center">
          <div className={`text-lg font-bold font-mono ${safeWithdrawal > 0 ? 'text-primary' : 'text-yellow-400'}`}>{safeWithdrawal.toLocaleString()}€</div>
          <div className="text-[10px] text-muted-foreground">Retrait OK</div>
        </div>
      </div>

      {urgentDebts.length > 0 && (
        <div className="flex items-center gap-2 p-2 rounded border border-destructive/30 bg-destructive/5 text-xs mb-2">
          <AlertTriangle className="w-3 h-3 text-destructive flex-shrink-0" />
          <span className="text-muted-foreground">{urgentDebts.length} dette{urgentDebts.length > 1 ? 's' : ''} urgente{urgentDebts.length > 1 ? 's' : ''} à rembourser</span>
        </div>
      )}

      {safeWithdrawal > 0 && urgentDebts.length === 0 && (
        <div className="flex items-center gap-2 p-2 rounded border border-primary/30 bg-primary/5 text-xs">
          <Shield className="w-3 h-3 text-primary flex-shrink-0" />
          <span className="text-muted-foreground">Retrait sécurisé de {safeWithdrawal}€ possible</span>
        </div>
      )}
    </div>
  );
}