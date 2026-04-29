import { useState } from 'react';
import { Radio, ShieldAlert, Play, Square, AlertTriangle, TrendingUp, TrendingDown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PreFlightChecklist from '@/components/shared/PreFlightChecklist';
import PnLGauge from '@/components/shared/PnLGauge';
import StatCard from '@/components/shared/StatCard';
import { toast } from 'sonner';

const openPositions = [
  { id: 1, symbol: 'NQ1!', dir: 'LONG', qty: 1, entry: 19820, current: 19843, sl: 19800, tp1: 19855, tp2: 19880, pnl: 115, be: false },
];

export default function Live() {
  const [tradingActive, setTradingActive] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const todayPnL = 435;
  const dailyTarget = 500;
  const maxPnL = 1500;

  const emergency = () => {
    setEmergencyMode(true);
    setTradingActive(false);
    toast.error('🚨 URGENCE — Toutes les positions clôturées');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-400 animate-pulse" />
            Trading Live
          </h1>
          <p className="text-xs text-muted-foreground">MFF · 50K · NQ1! · Scalping Day Trading</p>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" size="sm" className="gap-2 font-bold" onClick={emergency}>
            <ShieldAlert className="w-4 h-4" />
            URGENCE
          </Button>
          <Button
            size="sm"
            variant={tradingActive ? 'outline' : 'default'}
            className="gap-2"
            onClick={() => setTradingActive(!tradingActive)}
          >
            {tradingActive ? <><Square className="w-3.5 h-3.5" />Arrêter</> : <><Play className="w-3.5 h-3.5" />Activer</>}
          </Button>
        </div>
      </div>

      {emergencyMode && (
        <div className="p-4 bg-destructive/20 border border-destructive rounded-lg flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-destructive" />
          <div>
            <div className="font-bold text-destructive">MODE URGENCE ACTIVÉ</div>
            <div className="text-xs text-muted-foreground">Toutes les positions ont été clôturées. Trading suspendu.</div>
          </div>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => setEmergencyMode(false)}>Réinitialiser</Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: positions + stats */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="P&L Jour" value={`+${todayPnL}€`} color="text-green-400" icon={TrendingUp} />
            <StatCard label="Positions Ouvertes" value={openPositions.length} />
            <StatCard label="Drawdown Utilisé" value="320€" sub="Max 2 000€" color="text-yellow-400" />
          </div>

          {/* Règles de cohérence MFF */}
          <div className="card-trading">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-semibold">Règles de Cohérence MFF</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: 'Objectif qualif.', val: '3 000€', ok: false },
                { label: 'P&L actuel', val: '+1 580€', ok: null },
                { label: 'Drawdown max', val: '2 000€', ok: true },
                { label: 'DD utilisé', val: '320€ (16%)', ok: true },
                { label: 'Meilleur jour', val: '620€', ok: true },
                { label: 'Règle consistance', val: '≤ 30% du total', ok: true },
                { label: 'Trading > news', val: 'Bloqué ±5min', ok: true },
                { label: 'Max par jour', val: '< 1 500€', ok: true },
              ].map((item, i) => (
                <div key={i} className="flex justify-between p-2 rounded bg-secondary/50">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className={`font-mono font-medium ${item.ok === true ? 'text-green-400' : item.ok === false ? 'text-yellow-400' : 'text-foreground'}`}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Open positions */}
          <div className="card-trading">
            <span className="text-sm font-semibold block mb-3">Positions Ouvertes</span>
            {openPositions.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-6">Aucune position ouverte</div>
            ) : (
              openPositions.map(p => (
                <div key={p.id} className="p-3 rounded-lg border border-border bg-secondary/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${p.dir === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{p.dir}</span>
                      <span className="font-mono text-sm font-bold">{p.symbol}</span>
                      <span className="text-xs text-muted-foreground">x{p.qty}</span>
                    </div>
                    <span className={`font-mono font-bold text-lg ${p.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {p.pnl >= 0 ? '+' : ''}{p.pnl}€
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                    <div><div className="text-muted-foreground">Entry</div><div>{p.entry}</div></div>
                    <div><div className="text-muted-foreground">Current</div><div className="text-yellow-400">{p.current}</div></div>
                    <div><div className="text-muted-foreground">SL</div><div className="text-red-400">{p.sl}</div></div>
                    <div><div className="text-muted-foreground">TP1</div><div className="text-green-400">{p.tp1}</div></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs h-7 flex-1">Breakeven</Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 flex-1 text-yellow-400">Clôt. 50%</Button>
                    <Button size="sm" variant="destructive" className="text-xs h-7 flex-1">Clôturer</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: gauge + checklist */}
        <div className="space-y-3">
          <PnLGauge current={todayPnL} target={dailyTarget} label="Objectif 500€" />
          <div className="card-trading">
            <div className="text-xs text-muted-foreground mb-2">Progression → 1 500€ max</div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${(todayPnL / maxPnL) * 100}%`, background: '#00FF88' }} />
            </div>
            <div className="flex justify-between text-xs mt-1 font-mono">
              <span className="text-muted-foreground">0€</span>
              <span className="text-primary">{todayPnL}€</span>
              <span className="text-muted-foreground">1500€</span>
            </div>
          </div>
          <PreFlightChecklist />
        </div>
      </div>
    </div>
  );
}