import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, AlertTriangle, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const defaultPropFirms = [
  {
    id: 'mff', name: 'MyFundedFutures', website: 'myfundedfutures.com',
    account_sizes: [10000, 25000, 50000, 150000],
    daily_drawdown_pct: 4, max_drawdown_pct: 6,
    profit_target_pct: 8, consistency_rule_pct: 30,
    allows_bots: false, news_trading: false, trailing_drawdown: true,
    payout_frequency: 'weekly', payout_split: 90,
    validation_score: 78,
    traps: ['Drawdown suiveur', 'News trading interdit', 'Consistance 30%', 'Pas de bots IA'],
    status: 'active'
  },
  {
    id: 'topstep', name: 'TopStep', website: 'topstep.com',
    account_sizes: [50000, 100000, 150000],
    daily_drawdown_pct: 3, max_drawdown_pct: 5,
    profit_target_pct: 6, consistency_rule_pct: 0,
    allows_bots: false, news_trading: false, trailing_drawdown: false,
    payout_frequency: 'weekly', payout_split: 90,
    validation_score: 65,
    traps: ['Pas de bots', 'Pas news trading', 'Reset si violation'],
    status: 'testing'
  },
  {
    id: 'apex', name: 'Apex Trader Funding', website: 'apextraderfunding.com',
    account_sizes: [25000, 50000, 100000, 300000],
    daily_drawdown_pct: 0, max_drawdown_pct: 6,
    profit_target_pct: 9, consistency_rule_pct: 0,
    allows_bots: true, news_trading: true, trailing_drawdown: false,
    payout_frequency: 'monthly', payout_split: 90,
    validation_score: 88,
    traps: ['Règles payout strictes', 'Scaling plan'],
    status: 'testing'
  },
  {
    id: 'tradeday', name: 'TradeDay', website: 'tradeday.com',
    account_sizes: [10000, 25000, 50000, 100000],
    daily_drawdown_pct: 0, max_drawdown_pct: 4,
    profit_target_pct: 8, consistency_rule_pct: 0,
    allows_bots: true, news_trading: true, trailing_drawdown: false,
    payout_frequency: 'biweekly', payout_split: 80,
    validation_score: 72,
    traps: ['Nombre limité de positions', 'Pas plus de 5 contrats NQ'],
    status: 'testing'
  },
  {
    id: 'ftmo', name: 'FTMO', website: 'ftmo.com',
    account_sizes: [10000, 25000, 50000, 100000, 200000],
    daily_drawdown_pct: 5, max_drawdown_pct: 10,
    profit_target_pct: 10, consistency_rule_pct: 0,
    allows_bots: true, news_trading: false, trailing_drawdown: false,
    payout_frequency: 'monthly', payout_split: 90,
    validation_score: 70,
    traps: ['Phase 1 + Phase 2', 'News trading interdit', 'Période minimale 4 jours de trading'],
    status: 'testing'
  },
];

const statusColors = {
  active: 'text-primary bg-primary/10',
  testing: 'text-yellow-400 bg-yellow-400/10',
  validated: 'text-blue-400 bg-blue-400/10',
  avoided: 'text-red-400 bg-red-400/10',
};

export default function PropFirms() {
  const [selected, setSelected] = useState(null);

  const totalAccounts = 10; // 5 PF × 2 comptes
  const validated = defaultPropFirms.filter(p => p.validation_score >= 80).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            PropFirms
          </h1>
          <p className="text-xs text-muted-foreground">Analyse, compatibilité et jauges de validation</p>
        </div>
        <div className="flex gap-3 text-xs">
          <div className="card-trading p-2 text-center">
            <div className="font-bold text-lg text-foreground">{defaultPropFirms.length}</div>
            <div className="text-muted-foreground">PF sélectionnées</div>
          </div>
          <div className="card-trading p-2 text-center">
            <div className="font-bold text-lg text-primary">{totalAccounts}</div>
            <div className="text-muted-foreground">Comptes planifiés</div>
          </div>
          <div className="card-trading p-2 text-center">
            <div className="font-bold text-lg text-yellow-400">{validated}</div>
            <div className="text-muted-foreground">Validées ≥80%</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {defaultPropFirms.map(pf => (
          <PropFirmCard key={pf.id} pf={pf} selected={selected === pf.id} onClick={() => setSelected(selected === pf.id ? null : pf.id)} />
        ))}
      </div>
    </div>
  );
}

function PropFirmCard({ pf, selected, onClick }) {
  const scoreColor = pf.validation_score >= 80 ? '#00FF88' : pf.validation_score >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div className={`card-trading cursor-pointer transition-all ${selected ? 'border-primary/50 glow-green' : 'hover:border-border'}`} onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-bold text-foreground">{pf.name}</div>
          <a href={`https://${pf.website}`} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-xs text-blue-400 hover:underline flex items-center gap-1">
            {pf.website} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColors[pf.status]}`}>{pf.status}</span>
      </div>

      {/* Validation score */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Score de Compatibilité</span>
          <span className="font-mono font-bold" style={{ color: scoreColor }}>{pf.validation_score}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${pf.validation_score}%`, background: scoreColor }} />
        </div>
      </div>

      {/* Key rules */}
      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
        <RuleBadge label="DD Journalier" value={pf.daily_drawdown_pct ? `${pf.daily_drawdown_pct}%` : 'Aucun'} />
        <RuleBadge label="DD Max" value={`${pf.max_drawdown_pct}%`} />
        <RuleBadge label="Objectif" value={`${pf.profit_target_pct}%`} />
        <RuleBadge label="Consistance" value={pf.consistency_rule_pct ? `≤${pf.consistency_rule_pct}%` : 'Aucune'} />
        <RuleBadge label="Payout" value={`${pf.payout_split}%`} />
        <RuleBadge label="Fréquence" value={pf.payout_frequency} />
      </div>

      {/* Flags */}
      <div className="flex gap-2 flex-wrap mb-3">
        <FlagBadge label="Bots IA" allowed={pf.allows_bots} />
        <FlagBadge label="News Trading" allowed={pf.news_trading} />
        <FlagBadge label="Trailing DD" allowed={!pf.trailing_drawdown} danger={pf.trailing_drawdown} />
      </div>

      {/* Traps */}
      {selected && (
        <div className="mt-3 p-3 bg-destructive/5 rounded border border-destructive/20">
          <div className="flex items-center gap-1 text-xs text-destructive font-semibold mb-2">
            <AlertTriangle className="w-3.5 h-3.5" /> Pièges identifiés (99% des traders échouent à cause de :)
          </div>
          <ul className="space-y-1">
            {pf.traps.map((trap, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <XCircle className="w-3 h-3 text-destructive mt-0.5 flex-shrink-0" />
                {trap}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RuleBadge({ label, value }) {
  return (
    <div className="p-1.5 rounded bg-secondary/50 text-center">
      <div className="text-muted-foreground text-[10px]">{label}</div>
      <div className="font-mono font-bold text-xs text-foreground">{value}</div>
    </div>
  );
}

function FlagBadge({ label, allowed, danger }) {
  return (
    <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${danger ? 'border-destructive/30 text-destructive' : allowed ? 'border-primary/30 text-primary' : 'border-muted text-muted-foreground'}`}>
      {allowed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label}
    </span>
  );
}