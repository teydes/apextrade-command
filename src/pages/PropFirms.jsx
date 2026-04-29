import { useState } from 'react';
import { Building2, AlertTriangle, CheckCircle2, XCircle, ExternalLink, Copy, Star } from 'lucide-react';
import { toast } from 'sonner';

// ✅ Propfirms sélectionnées : sérieuses, règles simples, payout fiable
// ❌ Exclues : Apex (règles complexes), FTMO (phase 1+2 trop contraignante)
const defaultPropFirms = [
  {
    id: 'mff', name: 'MyFundedFutures', website: 'myfundedfutures.com',
    account_sizes: [10000, 25000, 50000, 150000],
    daily_drawdown_pct: 4, max_drawdown_pct: 6,
    profit_target_pct: 8, consistency_rule_pct: 30,
    allows_bots: false, news_trading: false, trailing_drawdown: true,
    payout_frequency: 'weekly', payout_split: 90, evaluation: false,
    validation_score: 85,
    traps: ['Drawdown suiveur (trailing)', 'News trading interdit', 'Règle consistance 30%', 'Pas de bots IA détectés'],
    status: 'active',
    priority: 1,
    note: '🥇 Compte principal — 50K sans évaluation, objectif 3000€'
  },
  {
    id: 'tradefy', name: 'Tradefy', website: 'tradefy.com',
    account_sizes: [10000, 25000, 50000, 100000],
    daily_drawdown_pct: 3, max_drawdown_pct: 6,
    profit_target_pct: 8, consistency_rule_pct: 0,
    allows_bots: true, news_trading: true, trailing_drawdown: false,
    payout_frequency: 'weekly', payout_split: 90, evaluation: true,
    validation_score: 88,
    traps: ['Vérifier règles actives au moment de l\'achat'],
    status: 'testing',
    priority: 2,
    note: '✅ Bots autorisés · News OK · Payout hebdo · Règles simples'
  },
  {
    id: 'lucid', name: 'Lucid Trading', website: 'lucidtrading.com',
    account_sizes: [25000, 50000, 100000],
    daily_drawdown_pct: 4, max_drawdown_pct: 8,
    profit_target_pct: 8, consistency_rule_pct: 0,
    allows_bots: true, news_trading: true, trailing_drawdown: false,
    payout_frequency: 'biweekly', payout_split: 85, evaluation: true,
    validation_score: 82,
    traps: ['Délai payout 14 jours', 'Volume minimum requis'],
    status: 'testing',
    priority: 3,
    note: '✅ Règles flexibles · Bots OK · Bon payout split'
  },
  {
    id: 'ufunded', name: 'UFunded', website: 'ufunded.com',
    account_sizes: [10000, 25000, 50000, 100000, 200000],
    daily_drawdown_pct: 5, max_drawdown_pct: 10,
    profit_target_pct: 8, consistency_rule_pct: 0,
    allows_bots: true, news_trading: true, trailing_drawdown: false,
    payout_frequency: 'weekly', payout_split: 80, evaluation: true,
    validation_score: 80,
    traps: ['Grands comptes = plus de scrutin', 'Vérifier activité minimale'],
    status: 'testing',
    priority: 4,
    note: '✅ Grandes tailles de compte · DD généreux · Weekly payout'
  },
  {
    id: 'tradeday', name: 'TradeDay', website: 'tradeday.com',
    account_sizes: [10000, 25000, 50000, 100000],
    daily_drawdown_pct: 0, max_drawdown_pct: 4,
    profit_target_pct: 8, consistency_rule_pct: 0,
    allows_bots: true, news_trading: true, trailing_drawdown: false,
    payout_frequency: 'biweekly', payout_split: 80, evaluation: true,
    validation_score: 75,
    traps: ['Max 5 contrats NQ', 'Positions limitées en simultané'],
    status: 'testing',
    priority: 5,
    note: '⚠️ Bots OK mais limite contrats NQ — idéal petits comptes'
  },
  {
    id: 'topstep', name: 'TopStep', website: 'topstep.com',
    account_sizes: [50000, 100000, 150000],
    daily_drawdown_pct: 3, max_drawdown_pct: 5,
    profit_target_pct: 6, consistency_rule_pct: 0,
    allows_bots: false, news_trading: false, trailing_drawdown: false,
    payout_frequency: 'weekly', payout_split: 90, evaluation: true,
    validation_score: 62,
    traps: ['Pas de bots', 'News trading interdit', 'Reset immédiat si violation', 'Surveillance stricte'],
    status: 'avoided',
    priority: 6,
    note: '⛔ Surveillance bots trop stricte — éviter pour trading automatisé'
  },
];

// Plan copy trading : 10-15 comptes répartis
const copyPlan = [
  { month: 1, accounts: 1, firms: ['MFF 50K'], capital: '50K', monthly: '~3000€' },
  { month: 2, accounts: 3, firms: ['MFF 50K', 'Tradefy 25K', 'Tradefy 25K'], capital: '100K', monthly: '~5000€' },
  { month: 3, accounts: 5, firms: ['MFF 50K ×2', 'Tradefy 50K', 'Lucid 25K', 'UFunded 25K'], capital: '200K', monthly: '~8000€' },
  { month: 5, accounts: 8, firms: ['MFF ×3', 'Tradefy ×2', 'Lucid ×2', 'UFunded ×1'], capital: '350K', monthly: '~15000€' },
  { month: 8, accounts: 12, firms: ['MFF ×3', 'Tradefy ×3', 'Lucid ×3', 'UFunded ×3'], capital: '600K', monthly: '~25000€' },
  { month: 12, accounts: 15, firms: ['MFF ×4', 'Tradefy ×4', 'Lucid ×4', 'UFunded ×3'], capital: '900K+', monthly: '~35000€+' },
];

const statusColors = {
  active: 'text-primary bg-primary/10',
  testing: 'text-yellow-400 bg-yellow-400/10',
  validated: 'text-blue-400 bg-blue-400/10',
  avoided: 'text-red-400 bg-red-400/10',
};

export default function PropFirms() {
  const [selected, setSelected] = useState(null);
  const [showCopyPlan, setShowCopyPlan] = useState(false);

  const active = defaultPropFirms.filter(p => p.status !== 'avoided');
  const totalPlannedAccounts = 15;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" /> PropFirms
          </h1>
          <p className="text-xs text-muted-foreground">Sélection sérieuse · Règles simples · Payout fiable · Objectif 10–15 comptes en copy</p>
        </div>
        <div className="flex gap-3 text-xs items-center">
          <div className="card-trading p-2 text-center">
            <div className="font-bold text-lg">{active.length}</div>
            <div className="text-muted-foreground">PF retenues</div>
          </div>
          <div className="card-trading p-2 text-center">
            <div className="font-bold text-lg text-primary">{totalPlannedAccounts}</div>
            <div className="text-muted-foreground">Comptes cible</div>
          </div>
          <button onClick={() => setShowCopyPlan(p => !p)}
            className="px-3 py-1.5 rounded bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/20">
            {showCopyPlan ? 'Masquer' : '📋 Plan Copy'}
          </button>
        </div>
      </div>

      {/* Plan Copy Trading */}
      {showCopyPlan && (
        <div className="card-trading">
          <div className="flex items-center gap-2 mb-3">
            <Copy className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold">Plan de Scaling — 10 à 15 Comptes en Copy Trading</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium">Mois</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Comptes</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">PropFirms</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Capital géré</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Revenus/mois</th>
                </tr>
              </thead>
              <tbody>
                {copyPlan.map((row, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-2 font-mono text-muted-foreground">M{row.month}</td>
                    <td className="py-2 font-bold text-primary">{row.accounts}</td>
                    <td className="py-2 text-muted-foreground">{row.firms.join(', ')}</td>
                    <td className="py-2 text-right font-mono text-foreground">{row.capital}</td>
                    <td className="py-2 text-right font-mono text-green-400 font-bold">{row.monthly}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 p-2 bg-blue-400/5 border border-blue-400/20 rounded text-xs text-blue-400">
            💡 Le copy trading permet de répliquer les trades du compte MFF maître sur tous les comptes en temps réel — <strong>un seul setup, 15 payouts.</strong>
          </div>
        </div>
      )}

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
  const avoided = pf.status === 'avoided';

  return (
    <div className={`card-trading cursor-pointer transition-all ${avoided ? 'opacity-60' : ''} ${selected ? 'border-primary/50 glow-green' : 'hover:border-border'}`} onClick={onClick}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold">{pf.name}</span>
            {pf.priority === 1 && <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />}
            {pf.evaluation === false && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">SANS ÉVAL</span>}
          </div>
          <a href={`https://${pf.website}`} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}
            className="text-xs text-blue-400 hover:underline flex items-center gap-1">
            {pf.website} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColors[pf.status]}`}>{pf.status}</span>
      </div>

      {pf.note && <div className="text-[11px] text-muted-foreground mb-2 italic">{pf.note}</div>}

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Compatibilité Ghost Trader</span>
          <span className="font-mono font-bold" style={{ color: scoreColor }}>{pf.validation_score}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${pf.validation_score}%`, background: scoreColor }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-xs mb-3">
        {[
          ['DD/Jour', pf.daily_drawdown_pct ? `${pf.daily_drawdown_pct}%` : 'Aucun'],
          ['DD Max', `${pf.max_drawdown_pct}%`],
          ['Objectif', `${pf.profit_target_pct}%`],
          ['Consistance', pf.consistency_rule_pct ? `≤${pf.consistency_rule_pct}%` : 'Libre'],
          ['Payout', `${pf.payout_split}%`],
          ['Fréquence', pf.payout_frequency],
        ].map(([l, v]) => (
          <div key={l} className="p-1.5 rounded bg-secondary/50 text-center">
            <div className="text-muted-foreground text-[10px]">{l}</div>
            <div className="font-mono font-bold text-foreground">{v}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 flex-wrap mb-2">
        {[
          { label: 'Bots IA', ok: pf.allows_bots },
          { label: 'News Trading', ok: pf.news_trading },
          { label: 'Sans trailing DD', ok: !pf.trailing_drawdown },
        ].map(f => (
          <span key={f.label} className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${f.ok ? 'border-primary/30 text-primary' : 'border-muted text-muted-foreground'}`}>
            {f.ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {f.label}
          </span>
        ))}
      </div>

      {selected && pf.traps.length > 0 && (
        <div className="mt-2 p-2 bg-destructive/5 rounded border border-destructive/20">
          <div className="flex items-center gap-1 text-xs text-destructive font-semibold mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Points de vigilance
          </div>
          {pf.traps.map((t, i) => (
            <div key={i} className="text-xs text-muted-foreground flex items-start gap-1.5 mb-0.5">
              <XCircle className="w-3 h-3 text-destructive mt-0.5 flex-shrink-0" /> {t}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}