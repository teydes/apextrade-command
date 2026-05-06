import { useState, useEffect } from 'react';
import { Clock, TrendingUp, TrendingDown, Activity, Wifi } from 'lucide-react';
import NotificationCenter from '@/components/shared/NotificationCenter';
import PushAlerts from '@/components/shared/PushAlerts';

const INSTRUMENTS = [
  { sym: 'NQ1!', base: 19847.25, vol: 15 },
  { sym: 'ES1!', base: 5321.50, vol: 5 },
  { sym: 'VIX', base: 18.42, vol: 0.3 },
];

export default function TopBar() {
  const [time, setTime] = useState(new Date());
  const [prices, setPrices] = useState(INSTRUMENTS.map(i => ({ ...i, price: i.base, change: 0, pct: 0 })));

  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date());
      setPrices(prev => prev.map(p => {
        const delta = (Math.random() - 0.48) * p.vol;
        const newPrice = parseFloat((p.price + delta).toFixed(2));
        const change = parseFloat((newPrice - p.base).toFixed(2));
        const pct = parseFloat(((change / p.base) * 100).toFixed(3));
        return { ...p, price: newPrice, change, pct };
      }));
    }, 2000);
    return () => clearInterval(t);
  }, []);

  const nyTime = new Date().toLocaleTimeString('fr-FR', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const londonTime = new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' });

  const isNYOpen = () => {
    const ny = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
    const nyDate = new Date(ny);
    const h = nyDate.getHours(); const d = nyDate.getDay();
    return d >= 1 && d <= 5 && h >= 9 && h < 16;
  };

  const nq = prices[0];

  return (
    <div className="h-12 border-b border-border bg-card flex items-center px-4 gap-3 text-xs overflow-hidden">
      {/* Market clocks */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <ClockWidget label="NY" time={nyTime} active={isNYOpen()} />
        <ClockWidget label="LON" time={londonTime} active={false} />
      </div>

      <div className="w-px h-6 bg-border flex-shrink-0" />

      {/* Live prices */}
      <div className="flex items-center gap-4 overflow-hidden">
        {prices.map(p => (
          <div key={p.sym} className="flex items-center gap-1.5 flex-shrink-0">
            <span className="font-mono text-muted-foreground">{p.sym}</span>
            <span className="font-mono font-bold text-foreground">{p.price.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
            <span className={`flex items-center gap-0.5 font-mono ${p.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {p.change >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {p.pct >= 0 ? '+' : ''}{p.pct}%
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1 text-[10px] text-primary/60 flex-shrink-0">
          <Wifi className="w-2.5 h-2.5 animate-pulse" />sim
        </div>
      </div>

      <div className="flex-1" />

      {/* Session indicator */}
      <SessionBadge />

      {/* Local time */}
      <div className="flex items-center gap-1 text-muted-foreground font-mono flex-shrink-0">
        <Clock className="w-3 h-3" />
        <span>{time.toLocaleTimeString('fr-FR')}</span>
      </div>

      <NotificationCenter />
      <PushAlerts />
    </div>
  );
}

function ClockWidget({ label, time, active }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`status-dot ${active ? 'active' : 'inactive'}`} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{time}</span>
    </div>
  );
}

function SessionBadge() {
  const nyHour = parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }));
  let session = 'Closed', color = 'text-muted-foreground bg-muted';
  if (nyHour >= 9 && nyHour < 16) { session = '🔥 NY Open'; color = 'text-primary bg-primary/10 border border-primary/30'; }
  else if (nyHour >= 4 && nyHour < 9) { session = '⚡ Pre-Market'; color = 'text-yellow-400 bg-yellow-400/10'; }
  else if (nyHour >= 2 && nyHour < 9) { session = '🌍 London'; color = 'text-blue-400 bg-blue-400/10'; }
  return <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${color}`}>{session}</span>;
}