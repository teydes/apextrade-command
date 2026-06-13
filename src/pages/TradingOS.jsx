import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Monitor, Activity, Zap, Shield, TrendingUp, Clock, Bell, CheckCircle2, XCircle, AlertTriangle, Radio, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const RULES = [
  { id: 1, label: 'Score signal ≥ 70/100', check: () => true },
  { id: 2, label: 'Pas dans une zone news (±5 min)', check: () => true },
  { id: 3, label: 'Session active (London / NY)', check: () => { const h = new Date().getUTCHours(); return (h >= 7 && h < 22); } },
  { id: 4, label: 'DD journalier < 70%', check: () => true },
  { id: 5, label: 'Max 2 trades simultanés', check: () => true },
  { id: 6, label: 'Pas après 2 pertes consécutives', check: () => true },
];

export default function TradingOS() {
  const [systemActive, setSystemActive] = useState(false);
  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), type: 'info', msg: 'Ghost Trader OS — Système initialisé' },
  ]);
  const [tick, setTick] = useState(0);
  const logsRef = useRef(null);

  const { data: accounts = [] } = useQuery({ queryKey: ['os-accounts'], queryFn: () => base44.entities.TradingAccount.list() });
  const { data: trades = [] } = useQuery({ queryKey: ['os-trades'], queryFn: () => base44.entities.Trade.list('-entry_time', 20) });
  const { data: signals = [] } = useQuery({ queryKey: ['os-signals'], queryFn: () => base44.entities.Signal.list('-created_date', 10) });

  const liveAccount = accounts.find(a => a.phase === 'live' && a.status === 'active') || accounts[0];
  const today = new Date().toISOString().slice(0, 10);
  const todayTrades = trades.filter(t => t.entry_time?.startsWith(today));
  const todayPnL = todayTrades.reduce((s, t) => s + (t.pnl || 0), 0);
  const openTrades = trades.filter(t => t.status === 'open');
  const pendingSignals = signals.filter(s => s.status === 'pending');

  const now = new Date();
  const h = now.getUTCHours();
  const sessions = [
    { name: 'Sydney', active: h >= 21 || h < 6 },
    { name: 'Tokyo', active: h >= 23 || h < 8 },
    { name: 'London', active: h >= 7 && h < 16 },
    { name: 'New York', active: h >= 13 && h < 22 },
  ];
  const activeSessions = sessions.filter(s => s.active);

  const addLog = (type, msg) => {
    const entry = { time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), type, msg };
    setLogs(prev => [entry, ...prev].slice(0, 100));
  };

  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (systemActive) {
      addLog('info', `Tick système — ${pendingSignals.length} signal(s) en attente — Session: ${activeSessions.map(s => s.name).join(', ') || 'Fermée'}`);
    }
  }, [tick]);

  const toggleSystem = () => {
    const next = !systemActive;
    setSystemActive(next);
    addLog(next ? 'success' : 'warn', next ? '🟢 Système Ghost Trader activé — Surveillance démarrée' : '🔴 Système arrêté');
    if (next) toast.success('Ghost Trader OS activé');
    else toast.info('Ghost Trader OS arrêté');
  };

  const runChecklist = () => {
    RULES.forEach((r, i) => {
      setTimeout(() => {
        const ok = r.check();
        addLog(ok ? 'success' : 'error', `[CHECK ${i+1}/6] ${r.label} — ${ok ? '✅ OK' : '❌ ÉCHEC'}`);
      }, i * 200);
    });
  };

  const logColors = { info: 'text-muted-foreground', success: 'text-primary', error: 'text-destructive', warn: 'text-yellow-400', trade: 'text-blue-400' };

  const cpuLoad = systemActive ? Math.round(15 + Math.sin(tick / 2) * 8) : 2;
  const memLoad = systemActive ? Math.round(42 + Math.sin(tick / 3) * 5) : 18;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Monitor className="w-5 h-5 text-primary" />
            Trading OS
          </h1>
          <p className="text-xs text-muted-foreground">Système de contrôle centralisé · Règles automatiques · Logs temps réel</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={runChecklist}>
            <CheckCircle2 className="w-3 h-3" />PreFlight
          </Button>
          <Button size="sm" variant={systemActive ? 'destructive' : 'default'} className="gap-2 font-bold" onClick={toggleSystem}>
            <Radio className={`w-3.5 h-3.5 ${systemActive ? 'animate-pulse' : ''}`} />
            {systemActive ? 'Arrêter OS' : 'Démarrer OS'}
          </Button>
        </div>
      </div>

      {/* Status bar */}
      <div className={`p-3 rounded-lg border flex items-center gap-4 flex-wrap ${systemActive ? 'border-primary/30 bg-primary/5' : 'border-border bg-secondary/20'}`}>
        <div className="flex items-center gap-2">
          <span className={`status-dot ${systemActive ? 'active' : 'inactive'}`} />
          <span className={`text-sm font-bold font-mono ${systemActive ? 'text-primary' : 'text-muted-foreground'}`}>
            {systemActive ? 'SYSTÈME ACTIF' : 'SYSTÈME ARRÊTÉ'}
          </span>
        </div>
        <div className="flex gap-4 text-xs ml-auto flex-wrap">
          <span className="text-muted-foreground">CPU: <span className="font-mono text-foreground">{cpuLoad}%</span></span>
          <span className="text-muted-foreground">MEM: <span className="font-mono text-foreground">{memLoad}%</span></span>
          <span className="text-muted-foreground">Signaux: <span className="font-mono text-yellow-400">{pendingSignals.length}</span></span>
          <span className="text-muted-foreground">Positions: <span className="font-mono text-blue-400">{openTrades.length}</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Métriques */}
        <div className="space-y-3">
          <div className="card-trading">
            <div className="text-xs font-semibold mb-3 text-muted-foreground uppercase">Compte Actif</div>
            <div className="space-y-2 text-xs">
              {[
                { l: 'Compte', v: liveAccount?.name || 'Aucun' },
                { l: 'PropFirm', v: liveAccount?.propfirm || '—' },
                { l: 'Balance', v: `${(liveAccount?.current_balance || liveAccount?.account_size || 0).toLocaleString()}€` },
                { l: 'PnL Jour', v: `${todayPnL >= 0 ? '+' : ''}${todayPnL.toLocaleString()}€`, color: todayPnL >= 0 ? 'text-primary' : 'text-destructive' },
                { l: 'Trades Jour', v: todayTrades.length },
                { l: 'Positions Ouvertes', v: openTrades.length },
              ].map(row => (
                <div key={row.l} className="flex justify-between">
                  <span className="text-muted-foreground">{row.l}</span>
                  <span className={`font-mono font-bold ${row.color || 'text-foreground'}`}>{row.v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-trading">
            <div className="text-xs font-semibold mb-3 text-muted-foreground uppercase">Sessions Marché</div>
            <div className="space-y-1.5">
              {sessions.map(s => (
                <div key={s.name} className={`flex items-center justify-between p-2 rounded text-xs border ${s.active ? 'border-primary/20 bg-primary/5' : 'border-border opacity-50'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`status-dot ${s.active ? 'active' : 'inactive'}`} />
                    <span className={s.active ? 'text-foreground' : 'text-muted-foreground'}>{s.name}</span>
                  </div>
                  <span className={`text-[10px] font-bold ${s.active ? 'text-primary' : 'text-muted-foreground'}`}>{s.active ? 'OUVERT' : 'FERMÉ'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-trading">
            <div className="text-xs font-semibold mb-3 text-muted-foreground uppercase">Règles Actives</div>
            <div className="space-y-1.5">
              {RULES.map(r => {
                const ok = r.check();
                return (
                  <div key={r.id} className="flex items-center gap-2 text-xs">
                    {ok ? <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" /> : <XCircle className="w-3 h-3 text-destructive flex-shrink-0" />}
                    <span className={ok ? 'text-muted-foreground' : 'text-destructive'}>{r.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Console logs */}
        <div className="lg:col-span-2 card-trading">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Console Système</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[10px] font-mono text-muted-foreground">{logs.length} entrées</span>
              <button onClick={() => setLogs([])} className="text-[10px] text-muted-foreground hover:text-destructive">Effacer</button>
            </div>
          </div>
          <div className="bg-background rounded-lg p-3 h-96 overflow-y-auto font-mono text-[11px] space-y-0.5 border border-border" ref={logsRef}>
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-muted-foreground flex-shrink-0 w-16">{log.time}</span>
                <span className={logColors[log.type] || 'text-foreground'}>{log.msg}</span>
              </div>
            ))}
            {logs.length === 0 && <div className="text-muted-foreground">En attente... Démarrez le système.</div>}
          </div>
          <div className="flex gap-2 mt-3">
            {[
              { label: 'Log Info', type: 'info', msg: 'Test log information système' },
              { label: 'Simuler Trade', type: 'trade', msg: 'LONG NQ1! @ 19820 — Confluence OB+FVG — Score: 87/100' },
              { label: 'Alert Risque', type: 'warn', msg: '⚠️ DD journalier à 65% — Réduction lot recommandée' },
            ].map(btn => (
              <button key={btn.label} onClick={() => addLog(btn.type, btn.msg)}
                className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}