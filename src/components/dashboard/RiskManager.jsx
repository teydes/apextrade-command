import { useState } from 'react';
import { Shield, AlertTriangle, TrendingDown, Zap, CheckCircle2, XCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const DEFAULT_RULES = {
  dailyTarget: 500,
  hardStopLoss: 2000,
  maxTrades: 5,
  consistencyPct: 30,
  beAfterTp1: true,
  killOnDD: true,
  blockNews: true,
  maxLosesRow: 2,
};

const RISK_STATUS = [
  { label: 'Drawdown Journalier', value: 320, max: 2000, unit: '€', warn: 60, danger: 85 },
  { label: 'Trades Aujourd\'hui', value: 4, max: 5, unit: '', warn: 80, danger: 100 },
  { label: 'Pertes Consécutives', value: 1, max: 2, unit: '', warn: 50, danger: 100 },
  { label: 'Consistance', value: 22, max: 30, unit: '%', warn: 70, danger: 90 },
];

export default function RiskManager({ compact = false }) {
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [killActive, setKillActive] = useState(false);
  const [edit, setEdit] = useState(false);

  const setRule = (k, v) => setRules(p => ({ ...p, [k]: v }));

  const overallRisk = RISK_STATUS.reduce((worst, s) => {
    const pct = (s.value / s.max) * 100;
    if (pct >= s.danger) return 'danger';
    if (pct >= s.warn && worst !== 'danger') return 'warn';
    return worst;
  }, 'ok');

  const killSwitch = () => {
    setKillActive(true);
    toast.error('⚡ KILL SWITCH ACTIVÉ — Tous les trades bloqués');
  };

  if (compact) {
    const statusColor = overallRisk === 'danger' ? 'text-destructive' : overallRisk === 'warn' ? 'text-yellow-400' : 'text-primary';
    const statusLabel = overallRisk === 'danger' ? 'RISQUE CRITIQUE' : overallRisk === 'warn' ? 'ATTENTION' : 'OK';
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium border ${overallRisk === 'danger' ? 'border-destructive/40 bg-destructive/5' : overallRisk === 'warn' ? 'border-yellow-400/30 bg-yellow-400/5' : 'border-primary/30 bg-primary/5'}`}>
        <Shield className={`w-3.5 h-3.5 ${statusColor}`} />
        <span className={statusColor}>RISQUE {statusLabel}</span>
      </div>
    );
  }

  return (
    <div className="card-trading space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-400" />
          <span className="text-sm font-semibold">Gestion du Risque MFF</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEdit(!edit)}>
            {edit ? '✓ Sauver' : '⚙ Modifier'}
          </Button>
          <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={killSwitch} disabled={killActive}>
            <Zap className="w-3 h-3" />
            {killActive ? 'ACTIF' : 'Kill Switch'}
          </Button>
        </div>
      </div>

      {killActive && (
        <div className="p-3 rounded border border-destructive bg-destructive/10 text-xs text-destructive font-semibold text-center animate-pulse">
          ⚡ KILL SWITCH ACTIF — Trading suspendu jusqu'à réinitialisation manuelle
        </div>
      )}

      {/* Live risk meters */}
      <div className="grid grid-cols-2 gap-3">
        {RISK_STATUS.map(s => {
          const pct = (s.value / s.max) * 100;
          const color = pct >= s.danger ? '#EF4444' : pct >= s.warn ? '#F59E0B' : '#00FF88';
          const textColor = pct >= s.danger ? 'text-destructive' : pct >= s.warn ? 'text-yellow-400' : 'text-primary';
          return (
            <div key={s.label} className="p-2.5 rounded border border-border bg-secondary/20">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] text-muted-foreground">{s.label}</span>
                {pct >= s.danger ? <AlertTriangle className="w-3 h-3 text-destructive" /> : pct >= s.warn ? <AlertTriangle className="w-3 h-3 text-yellow-400" /> : <CheckCircle2 className="w-3 h-3 text-primary" />}
              </div>
              <div className="text-sm font-bold font-mono mb-1.5">
                <span className={textColor}>{s.value}{s.unit}</span>
                <span className="text-muted-foreground text-xs"> / {s.max}{s.unit}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Rules */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Règles de Protection</div>
        {[
          { key: 'beAfterTp1', label: 'TP1 atteint → SL au Breakeven' },
          { key: 'killOnDD', label: 'Kill switch auto si DD journalier > 80%' },
          { key: 'blockNews', label: 'Bloquer trading 5min avant/après news haute' },
        ].map(sw => (
          <div key={sw.key} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Lock className="w-3 h-3 text-muted-foreground" />
              <span>{sw.label}</span>
            </div>
            <Switch checked={rules[sw.key]} onCheckedChange={v => setRule(sw.key, v)} />
          </div>
        ))}
      </div>

      {/* Editable params */}
      {edit && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
          {[
            { key: 'dailyTarget', label: 'Objectif/jour (€)' },
            { key: 'hardStopLoss', label: 'DD max/jour (€)' },
            { key: 'maxTrades', label: 'Max trades/jour' },
            { key: 'consistencyPct', label: 'Consistance max (%)' },
            { key: 'maxLosesRow', label: 'Pertes consécutives max' },
          ].map(f => (
            <div key={f.key}>
              <div className="text-[10px] text-muted-foreground mb-0.5">{f.label}</div>
              <Input type="number" value={rules[f.key]} onChange={e => setRule(f.key, parseFloat(e.target.value))} className="bg-secondary border-border h-7 text-xs font-mono" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}