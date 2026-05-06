import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Play, Pause, Settings2, AlertTriangle, CheckCircle2, Zap, Building2, TrendingUp, Users, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

// Comptes maître / esclaves simulés avec données réelles si disponibles
const MASTER_ACCOUNTS = [
  { id: 'mff_50k_main', name: 'MFF 50K — Maître', firm: 'MyFundedFutures', size: 50000, status: 'active', ismaster: true },
];

const SLAVE_ACCOUNTS_DEFAULT = [
  { id: 'tradefy_25k_1', name: 'Tradefy 25K #1', firm: 'Tradefy', size: 25000, status: 'active', enabled: true, ratio: 0.5, delay_ms: 0 },
  { id: 'tradefy_25k_2', name: 'Tradefy 25K #2', firm: 'Tradefy', size: 25000, status: 'active', enabled: true, ratio: 0.5, delay_ms: 50 },
  { id: 'lucid_25k_1', name: 'Lucid 25K #1', firm: 'Lucid Trading', size: 25000, status: 'active', enabled: false, ratio: 0.4, delay_ms: 100 },
  { id: 'ufunded_50k', name: 'UFunded 50K', firm: 'UFunded', size: 50000, status: 'testing', enabled: false, ratio: 1.0, delay_ms: 0 },
];

const COPY_LOG_DEFAULT = [
  { id: 1, time: '09:42:15', master_trade: 'LONG NQ +2c', slave: 'Tradefy 25K #1', status: 'copied', pnl: 160, latency_ms: 12 },
  { id: 2, time: '09:42:15', master_trade: 'LONG NQ +2c', slave: 'Tradefy 25K #2', status: 'copied', pnl: 160, latency_ms: 63 },
  { id: 3, time: '10:15:32', master_trade: 'SHORT NQ -1c', slave: 'Tradefy 25K #1', status: 'copied', pnl: -47, latency_ms: 9 },
  { id: 4, time: '10:15:33', master_trade: 'SHORT NQ -1c', slave: 'Tradefy 25K #2', status: 'copied', pnl: -47, latency_ms: 58 },
  { id: 5, time: '11:03:01', master_trade: 'LONG NQ +2c', slave: 'Lucid 25K #1', status: 'skipped', pnl: 0, latency_ms: 0 },
];

export default function CopyTrading() {
  const [running, setRunning] = useState(false);
  const [slaves, setSlaves] = useState(SLAVE_ACCOUNTS_DEFAULT);
  const [copyLog, setCopyLog] = useState(COPY_LOG_DEFAULT);
  const [settings, setSettings] = useState({ maxRisk: 1.5, consistencyFilter: true, newsBlock: true, autoScaleRatio: false });
  const [editingSlaveId, setEditingSlaveId] = useState(null);

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts-copy'],
    queryFn: () => base44.entities.TradingAccount.list(),
  });

  const { data: recentTrades = [] } = useQuery({
    queryKey: ['recent-trades-copy'],
    queryFn: () => base44.entities.Trade.list('-entry_time', 20),
    refetchInterval: running ? 5000 : false,
  });

  // Simuler copy en temps réel quand running
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const enabledSlaves = slaves.filter(s => s.enabled);
      if (enabledSlaves.length === 0) return;
      const directions = ['LONG', 'SHORT'];
      const dir = directions[Math.floor(Math.random() * 2)];
      const pnlBase = dir === 'LONG' ? Math.random() * 400 - 100 : Math.random() * 400 - 100;
      const now = new Date();
      const timeStr = now.toLocaleTimeString('fr-FR');

      const newEntries = enabledSlaves.map(s => ({
        id: Date.now() + Math.random(),
        time: timeStr,
        master_trade: `${dir} NQ +2c`,
        slave: s.name,
        status: Math.random() > 0.05 ? 'copied' : 'failed',
        pnl: Math.round(pnlBase * s.ratio),
        latency_ms: Math.round(s.delay_ms + Math.random() * 20),
      }));

      setCopyLog(prev => [...newEntries, ...prev].slice(0, 50));
      toast.success(`📡 Signal copié → ${enabledSlaves.length} compte(s)`, { duration: 2000 });
    }, 8000);
    return () => clearInterval(interval);
  }, [running, slaves]);

  const toggleSlave = (id, field, value) => {
    setSlaves(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const enabledCount = slaves.filter(s => s.enabled).length;
  const totalCapital = slaves.filter(s => s.enabled).reduce((sum, s) => sum + s.size, 0);
  const totalPnlLog = copyLog.reduce((sum, l) => sum + (l.pnl || 0), 0);
  const successRate = copyLog.length > 0 ? Math.round((copyLog.filter(l => l.status === 'copied').length / copyLog.length) * 100) : 0;

  // Comptes réels si disponibles
  const realSlaves = accounts.filter(a => !a.notes?.includes('maître'));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Copy className="w-5 h-5 text-cyan-400" />
            Copy Trading — Multi-Comptes
          </h1>
          <p className="text-xs text-muted-foreground">Réplication automatique · 1 compte maître → {slaves.length} comptes esclaves · {totalCapital.toLocaleString()}€ géré</p>
        </div>
        <Button
          size="sm"
          onClick={() => { setRunning(p => !p); toast(running ? '⏸ Copy trading pausé' : '🚀 Copy trading ACTIF — Réplication en cours'); }}
          className={`gap-2 ${running ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'}`}
        >
          {running ? <><Pause className="w-4 h-4" />STOP Copy</> : <><Play className="w-4 h-4" />START Copy</>}
        </Button>
      </div>

      {/* Status banner */}
      <div className={`p-3 rounded-lg border flex items-center gap-4 flex-wrap ${running ? 'border-primary/40 bg-primary/5' : 'border-border bg-secondary/20'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${running ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
          <span className={`text-sm font-bold ${running ? 'text-primary' : 'text-muted-foreground'}`}>
            {running ? '🟢 COPY TRADING ACTIF' : '⚫ INACTIF'}
          </span>
        </div>
        <div className="flex gap-4 text-xs flex-wrap">
          <span className="text-muted-foreground">Comptes actifs: <span className="text-foreground font-bold">{enabledCount}</span></span>
          <span className="text-muted-foreground">Capital géré: <span className="text-primary font-mono font-bold">{totalCapital.toLocaleString()}€</span></span>
          <span className="text-muted-foreground">Taux succès: <span className="text-primary font-mono font-bold">{successRate}%</span></span>
          <span className="text-muted-foreground">P&L copié: <span className={`font-mono font-bold ${totalPnlLog >= 0 ? 'text-primary' : 'text-destructive'}`}>{totalPnlLog >= 0 ? '+' : ''}{totalPnlLog.toLocaleString()}€</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Compte Maître */}
        <div className="space-y-3">
          <div className="card-trading border border-primary/30">
            <div className="flex items-center gap-2 mb-3">
              <Radio className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Compte Maître</span>
            </div>
            {(accounts.find(a => a.phase === 'live') ? [accounts.find(a => a.phase === 'live')] : MASTER_ACCOUNTS).map(acc => (
              <div key={acc.id || acc.name} className="space-y-2 text-xs">
                <div className="font-bold text-foreground">{acc.name}</div>
                <div className="text-muted-foreground">{acc.propfirm || acc.firm}</div>
                <div className="text-primary font-mono font-bold text-lg">{(acc.current_balance || acc.account_size || acc.size).toLocaleString()}€</div>
                <div className="flex items-center gap-2">
                  <span className="status-dot active" />
                  <span className="text-primary">Source des signaux</span>
                </div>
              </div>
            ))}
          </div>

          {/* Settings */}
          <div className="card-trading space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold">Règles Copy</span>
            </div>
            {[
              { key: 'consistencyFilter', label: 'Filtre consistance PropFirm' },
              { key: 'newsBlock', label: 'Bloquer sur news à fort impact' },
              { key: 'autoScaleRatio', label: 'Ratio auto selon taille compte' },
            ].map(sw => (
              <div key={sw.key} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{sw.label}</span>
                <Switch checked={settings[sw.key]} onCheckedChange={v => setSettings(p => ({...p, [sw.key]: v}))} />
              </div>
            ))}
            <div>
              <Label className="text-xs text-muted-foreground">Risque max / trade (%)</Label>
              <Input type="number" step="0.1" value={settings.maxRisk}
                onChange={e => setSettings(p => ({...p, maxRisk: parseFloat(e.target.value)}))}
                className="bg-secondary border-border h-7 text-xs font-mono mt-1 w-24" />
            </div>
          </div>
        </div>

        {/* Comptes Esclaves */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center justify-between">
            <span>Comptes Esclaves ({enabledCount}/{slaves.length} actifs)</span>
          </div>
          {slaves.map(s => (
            <div key={s.id} className={`card-trading transition-all ${s.enabled ? 'border-primary/20' : 'opacity-60'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.enabled ? 'bg-primary' : 'bg-muted-foreground'}`} />
                    <span className="text-xs font-semibold truncate">{s.name}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">{s.firm} · {s.size.toLocaleString()}€</div>
                  <div className="flex items-center gap-3 mt-2 text-[10px]">
                    <span className="text-muted-foreground">Ratio: <span className="text-foreground font-mono font-bold">{(s.ratio * 100).toFixed(0)}%</span></span>
                    <span className="text-muted-foreground">Délai: <span className="font-mono">{s.delay_ms}ms</span></span>
                  </div>
                </div>
                <Switch checked={s.enabled} onCheckedChange={v => toggleSlave(s.id, 'enabled', v)} />
              </div>
              {s.enabled && (
                <div className="mt-2 pt-2 border-t border-border flex gap-2">
                  <div className="flex-1">
                    <div className="text-[10px] text-muted-foreground mb-0.5">Ratio (%)</div>
                    <input type="range" min="10" max="200" step="10" value={s.ratio * 100}
                      onChange={e => toggleSlave(s.id, 'ratio', parseFloat(e.target.value) / 100)}
                      className="w-full accent-primary" />
                  </div>
                  <div className="text-xs font-mono font-bold text-primary self-end pb-1">{(s.ratio * 100).toFixed(0)}%</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Log des copies */}
        <div className="card-trading">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold">Journal Copy</span>
            {running && <span className="ml-auto text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded animate-pulse">LIVE</span>}
          </div>
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {copyLog.map((entry, i) => (
              <div key={entry.id || i} className={`p-2 rounded text-[10px] border ${entry.status === 'copied' ? 'border-primary/20 bg-primary/5' : entry.status === 'failed' ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-secondary/30'}`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono text-muted-foreground">{entry.time}</span>
                  <div className="flex items-center gap-1">
                    {entry.latency_ms > 0 && <span className="text-muted-foreground">{entry.latency_ms}ms</span>}
                    <span className={entry.status === 'copied' ? 'text-primary' : entry.status === 'failed' ? 'text-destructive' : 'text-yellow-400'}>
                      {entry.status === 'copied' ? '✓' : entry.status === 'failed' ? '✗' : '—'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground truncate">{entry.slave}</span>
                  <span className={`font-mono font-bold ml-2 flex-shrink-0 ${(entry.pnl || 0) > 0 ? 'text-primary' : (entry.pnl || 0) < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {(entry.pnl || 0) > 0 ? '+' : ''}{entry.pnl || 0}€
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}