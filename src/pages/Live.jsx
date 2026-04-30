import { useState } from 'react';
import { Radio, ShieldAlert, Play, Square, TrendingUp, Lock, Zap, BookOpen, BarChart3, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PreFlightChecklist from '@/components/shared/PreFlightChecklist';
import PnLGauge from '@/components/shared/PnLGauge';
import StatCard from '@/components/shared/StatCard';
import { toast } from 'sonner';

// Signaux optimisés (score multi-confluence)
const SIGNALS = [
  { id: 1, time: '09:42', dir: 'LONG', symbol: 'NQ1!', setup: 'OB H1 + FVG 5m + Delta+', session: 'NY Open', score: 92, action: 'Exécuté', result: '+320€' },
  { id: 2, time: '10:15', dir: 'SHORT', symbol: 'NQ1!', setup: 'BOS + CHoCH sans volume', session: 'NY Open', score: 51, action: 'Filtré', result: '—' },
  { id: 3, time: '11:03', dir: 'LONG', symbol: 'NQ1!', setup: 'IFVG + AMD + POC retest', session: 'NY', score: 88, action: 'Exécuté', result: '+210€' },
  { id: 4, time: '13:30', dir: 'LONG', symbol: 'NQ1!', setup: 'OB Retest faible volume', session: 'NY Aft.', score: 44, action: 'Rejeté', result: '—' },
];

// Journal automatique
const JOURNAL = [
  { time: '09:38', type: 'info', msg: 'Session NY Open — Kill Zone active' },
  { time: '09:42', type: 'trade', msg: 'LONG NQ @ 19820 — Setup: OB H1 + FVG — Score: 92/100' },
  { time: '09:55', type: 'risk', msg: 'SL déplacé à Breakeven (19820) — Profit sécurisé' },
  { time: '10:08', type: 'trade', msg: 'TP1 touché @ 19843 — +115€ — Position réduite 50%' },
  { time: '10:15', type: 'filter', msg: 'Signal SHORT rejeté — Score 51/100 < seuil 70' },
  { time: '10:32', type: 'trade', msg: 'TP2 @ 19855 — +205€ — Position clôturée' },
  { time: '11:03', type: 'trade', msg: 'LONG NQ @ 19870 — Setup: IFVG+AMD+POC — Score: 88/100' },
  { time: '11:45', type: 'risk', msg: 'Objectif 500€ atteint — Mode prudent activé' },
  { time: '13:30', type: 'filter', msg: 'Signal LONG rejeté — Volume faible (score 44) + hors Kill Zone' },
];

const journalTypeStyle = {
  info:   { icon: Clock,          cls: 'text-muted-foreground', bg: 'bg-secondary/30' },
  trade:  { icon: TrendingUp,     cls: 'text-primary',          bg: 'bg-primary/5'    },
  risk:   { icon: AlertCircle,    cls: 'text-yellow-400',       bg: 'bg-yellow-400/5' },
  filter: { icon: XCircle,        cls: 'text-blue-400',         bg: 'bg-blue-400/5'   },
};

const openPositions = [
  { id: 1, symbol: 'NQ1!', dir: 'LONG', qty: 1, entry: 19820, current: 19843, sl: 19800, tp1: 19855, tp2: 19880, pnl: 115, be: false },
];

export default function Live() {
  const [tradingActive, setTradingActive] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [activeTab, setActiveTab] = useState('live'); // live | signals | journal | risk
  const todayPnL = 435;
  const dailyTarget = 500;
  const maxPnL = 1500;

  // Risque dynamique
  const usedDD = 320;
  const maxDD = 2000;
  const ddPct = Math.round((usedDD / maxDD) * 100);
  const riskColor = ddPct < 30 ? 'text-primary' : ddPct < 60 ? 'text-yellow-400' : 'text-destructive';
  const riskLevel = ddPct < 30 ? 'FAIBLE' : ddPct < 60 ? 'MODÉRÉ' : 'CRITIQUE';
  const tradesLeft = ddPct < 60 ? 4 : 1; // trades autorisés selon DD utilisé

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

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'live', label: '📡 Live', icon: Radio },
          { id: 'signals', label: '⚡ Signaux', icon: Zap },
          { id: 'journal', label: '📖 Journal', icon: BookOpen },
          { id: 'risk', label: '🛡️ Risque', icon: BarChart3 },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-xs font-medium transition-all ${activeTab === t.id ? 'tab-active' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
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

      {/* TAB SIGNAUX OPTIMISÉS */}
      {activeTab === 'signals' && (
        <div className="space-y-3">
          <div className="p-3 bg-primary/5 border border-primary/20 rounded text-xs text-primary">
            ⚡ Filtre multi-confluence actif — Seuil minimum : <strong>70/100</strong>. Les signaux sous ce score sont automatiquement rejetés.
          </div>
          <div className="space-y-2">
            {SIGNALS.map(s => (
              <div key={s.id} className={`card-trading flex items-center gap-3 flex-wrap ${s.score >= 70 ? 'border-primary/20' : 'border-border opacity-60'}`}>
                <span className="font-mono text-xs text-muted-foreground w-10">{s.time}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${s.dir === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{s.dir}</span>
                <span className="text-xs flex-1 text-foreground">{s.setup}</span>
                <span className="text-[10px] text-muted-foreground">{s.session}</span>
                {/* Score visuel */}
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className={`h-full rounded-full ${s.score >= 70 ? 'bg-primary' : 'bg-muted-foreground'}`} style={{ width: `${s.score}%` }} />
                  </div>
                  <span className={`font-mono text-xs font-bold ${s.score >= 70 ? 'text-primary' : 'text-muted-foreground'}`}>{s.score}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${s.action === 'Exécuté' ? 'bg-primary/20 text-primary' : s.action === 'Filtré' ? 'bg-blue-400/20 text-blue-400' : 'bg-destructive/20 text-destructive'}`}>{s.action}</span>
                <span className={`font-mono text-xs font-bold w-12 text-right ${s.result.startsWith('+') ? 'text-primary' : 'text-muted-foreground'}`}>{s.result}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Signaux reçus', value: SIGNALS.length },
              { label: 'Exécutés (≥70)', value: SIGNALS.filter(s => s.score >= 70).length },
              { label: 'Filtrés / Rejetés', value: SIGNALS.filter(s => s.score < 70).length },
            ].map(m => (
              <div key={m.label} className="card-trading text-center">
                <div className="text-xl font-bold font-mono text-foreground">{m.value}</div>
                <div className="text-[10px] text-muted-foreground">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB JOURNAL AUTOMATIQUE */}
      {activeTab === 'journal' && (
        <div className="space-y-2">
          <div className="p-2 bg-secondary/30 rounded text-xs text-muted-foreground flex items-center justify-between">
            <span>📖 Journal automatique — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <span className="text-primary">{JOURNAL.length} entrées</span>
          </div>
          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {JOURNAL.map((entry, i) => {
              const { icon: Icon, cls, bg } = journalTypeStyle[entry.type];
              return (
                <div key={i} className={`flex items-start gap-2 p-2 rounded ${bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${cls} flex-shrink-0 mt-0.5`} />
                  <span className="font-mono text-[10px] text-muted-foreground w-10 flex-shrink-0">{entry.time}</span>
                  <span className={`text-xs ${entry.type === 'trade' ? 'text-foreground' : 'text-muted-foreground'}`}>{entry.msg}</span>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: 'Trades exécutés', value: JOURNAL.filter(e => e.type === 'trade' && e.msg.includes('LONG') || e.msg.includes('SHORT')).length, color: 'text-primary' },
              { label: 'Signaux filtrés', value: JOURNAL.filter(e => e.type === 'filter').length, color: 'text-blue-400' },
              { label: 'Alertes risque', value: JOURNAL.filter(e => e.type === 'risk').length, color: 'text-yellow-400' },
              { label: 'P&L journée', value: '+435€', color: 'text-primary' },
            ].map(m => (
              <div key={m.label} className="card-trading text-center">
                <div className={`text-lg font-bold font-mono ${m.color}`}>{m.value}</div>
                <div className="text-[10px] text-muted-foreground">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB TABLEAU DE BORD RISQUE */}
      {activeTab === 'risk' && (
        <div className="space-y-4">
          {/* Niveau de risque global */}
          <div className={`p-4 rounded-lg border ${ddPct < 30 ? 'border-primary/30 bg-primary/5' : ddPct < 60 ? 'border-yellow-400/30 bg-yellow-400/5' : 'border-destructive/30 bg-destructive/5'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Niveau de Risque Global</div>
                <div className={`text-2xl font-bold font-mono ${riskColor}`}>{riskLevel}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Trades autorisés</div>
                <div className={`text-3xl font-bold font-mono ${riskColor}`}>{tradesLeft}</div>
              </div>
            </div>
            <div className="mt-3">
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${ddPct}%`, background: ddPct < 30 ? '#00FF88' : ddPct < 60 ? '#F59E0B' : '#EF4444' }} />
              </div>
              <div className="flex justify-between text-xs mt-1 font-mono">
                <span className="text-muted-foreground">DD: {usedDD}€</span>
                <span className={riskColor}>{ddPct}%</span>
                <span className="text-muted-foreground">Max: {maxDD}€</span>
              </div>
            </div>
          </div>

          {/* Métriques risque détaillées */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Exposition actuelle', value: '1 contrat NQ', note: 'Standard — 20$/pt', ok: true },
              { label: 'Risque par trade', value: '200€ (SL 10pts)', note: '10% du DD quotidien', ok: true },
              { label: 'P&L / DD ratio', value: `${(todayPnL / usedDD).toFixed(1)}:1`, note: 'Cible > 2:1', ok: todayPnL / usedDD > 2 },
              { label: 'Trades ouverts', value: openPositions.length, note: 'Max 1 simultané', ok: openPositions.length <= 1 },
              { label: 'Temps en position', value: '23 min moy.', note: 'Cible < 60 min', ok: true },
              { label: 'Max trade du jour', value: '320€', note: `< ${Math.round(3000 * 0.30)}€ (30% règle)`, ok: 320 < 3000 * 0.30 },
            ].map((m, i) => (
              <div key={i} className={`card-trading border ${m.ok ? 'border-primary/20' : 'border-destructive/20'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  {m.ok ? <CheckCircle2 className="w-3 h-3 text-primary" /> : <XCircle className="w-3 h-3 text-destructive" />}
                </div>
                <div className={`font-bold font-mono text-sm ${m.ok ? 'text-foreground' : 'text-destructive'}`}>{m.value}</div>
                <div className="text-[10px] text-muted-foreground">{m.note}</div>
              </div>
            ))}
          </div>

          {/* Règles automatiques */}
          <div className="card-trading">
            <div className="text-xs font-semibold mb-3 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-yellow-400" /> Règles Automatiques Actives
            </div>
            <div className="space-y-2">
              {[
                { rule: 'Stop automatique après 2 pertes consécutives', active: true },
                { rule: 'Kill switch si DD journalier > 70%', active: true },
                { rule: 'Pause ±15 min autour des news haute impact', active: true },
                { rule: 'Réduction lot (0.5x) après 1 perte', active: true },
                { rule: 'Arrêt trading après 12h NY (hors contexte fort)', active: true },
                { rule: 'Mode maintenance si drawdown hebdo > 3%', active: false },
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {r.active ? <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                  <span className={r.active ? 'text-foreground' : 'text-muted-foreground'}>{r.rule}</span>
                  <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${r.active ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>{r.active ? 'ON' : 'OFF'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'live' && <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
      </div>}
    </div>
  );
}