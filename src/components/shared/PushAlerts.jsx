import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Bell, BellOff, X, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const ALERT_TYPES = {
  signal: { icon: Zap, color: 'text-primary border-primary/30 bg-primary/5', label: 'Signal' },
  kill_switch: { icon: Shield, color: 'text-destructive border-destructive/30 bg-destructive/5', label: 'Kill Switch' },
  target_hit: { icon: CheckCircle2, color: 'text-primary border-primary/30 bg-primary/5', label: 'Objectif' },
  drawdown: { icon: AlertTriangle, color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5', label: 'DD Alerte' },
  news: { icon: AlertTriangle, color: 'text-orange-400 border-orange-400/30 bg-orange-400/5', label: 'News' },
  copy: { icon: TrendingUp, color: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/5', label: 'Copy' },
};

export default function PushAlerts() {
  const [enabled, setEnabled] = useState(true);
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState([
    { id: 1, type: 'signal', message: 'LONG NQ1! @ 19847 — OB + FVG confirmé', time: '09:42', read: false },
    { id: 2, type: 'target_hit', message: 'Objectif journalier atteint: +520€ / 500€', time: '11:30', read: false },
    { id: 3, type: 'news', message: 'CPI release dans 5min — Trading bloqué', time: '13:25', read: true },
    { id: 4, type: 'drawdown', message: 'DD journalier à 65% — Vigilance requise', time: '14:10', read: true },
  ]);
  const prevSignalCount = useRef(0);

  const { data: signals = [] } = useQuery({
    queryKey: ['signals-alerts'],
    queryFn: () => base44.entities.Signal.list('-created_date', 10),
    refetchInterval: enabled ? 10000 : false,
  });

  // Détecter nouveaux signaux
  useEffect(() => {
    if (signals.length > prevSignalCount.current && prevSignalCount.current > 0) {
      const newSig = signals[0];
      const alert = {
        id: Date.now(),
        type: 'signal',
        message: `${newSig.direction} ${newSig.symbol} — Signal reçu (${newSig.status})`,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        read: false,
      };
      setAlerts(prev => [alert, ...prev]);
      if (enabled) {
        toast.custom(() => (
          <AlertToast alert={alert} />
        ), { duration: 5000 });
      }
    }
    prevSignalCount.current = signals.length;
  }, [signals, enabled]);

  const unreadCount = alerts.filter(a => !a.read).length;
  const markAllRead = () => setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  const dismissAlert = (id) => setAlerts(prev => prev.filter(a => a.id !== id));

  // Simuler alertes périodiques
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      const types = ['drawdown', 'copy', 'news'];
      const messages = {
        drawdown: 'DD journalier mis à jour — Surveillance active',
        copy: 'Trade copié sur 2 comptes avec succès',
        news: 'ISM PMI dans 15min — Préparez-vous',
      };
      const type = types[Math.floor(Math.random() * types.length)];
      const alert = {
        id: Date.now(),
        type,
        message: messages[type],
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        read: false,
      };
      setAlerts(prev => [alert, ...prev].slice(0, 30));
    }, 45000);
    return () => clearInterval(interval);
  }, [enabled]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="relative p-2 rounded-lg hover:bg-secondary/50 transition-colors"
      >
        {enabled ? <Bell className="w-4 h-4 text-muted-foreground" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 z-50 card-trading shadow-2xl border border-border animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Alertes Push</span>
              {unreadCount > 0 && <span className="text-xs bg-destructive/20 text-destructive px-1.5 py-0.5 rounded font-bold">{unreadCount} nouvelles</span>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setEnabled(p => !p)} className={`text-xs px-2 py-0.5 rounded border ${enabled ? 'border-primary/30 text-primary' : 'border-border text-muted-foreground'}`}>
                {enabled ? 'ON' : 'OFF'}
              </button>
              <button onClick={markAllRead} className="text-xs text-muted-foreground hover:text-foreground">Lu tout</button>
              <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
          </div>

          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-6">Aucune alerte</div>
            ) : alerts.map(alert => {
              const cfg = ALERT_TYPES[alert.type] || ALERT_TYPES.signal;
              const Icon = cfg.icon;
              return (
                <div key={alert.id} className={`p-2.5 rounded border text-xs flex gap-2 ${cfg.color} ${!alert.read ? 'opacity-100' : 'opacity-60'}`}>
                  <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-semibold text-[10px] uppercase tracking-wide">{cfg.label}</span>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">{alert.time}</span>
                    </div>
                    <p className="text-muted-foreground leading-tight">{alert.message}</p>
                  </div>
                  <button onClick={() => dismissAlert(alert.id)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AlertToast({ alert }) {
  const cfg = ALERT_TYPES[alert.type] || ALERT_TYPES.signal;
  const Icon = cfg.icon;
  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${cfg.color} bg-card shadow-lg`}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div>
        <div className="font-semibold uppercase tracking-wide text-[10px] mb-0.5">{cfg.label}</div>
        <p>{alert.message}</p>
      </div>
    </div>
  );
}