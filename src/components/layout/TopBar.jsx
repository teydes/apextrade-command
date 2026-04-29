import { useState, useEffect } from 'react';
import { Clock, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import NotificationCenter from '@/components/shared/NotificationCenter';

export default function TopBar() {
  const [time, setTime] = useState(new Date());
  const [nqPrice] = useState({ price: 19847.25, change: +23.5, pct: +0.12 });

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const nyTime = new Date().toLocaleTimeString('fr-FR', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const londonTime = new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' });
  const parisTime = new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });

  const isNYOpen = () => {
    const ny = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
    const nyDate = new Date(ny);
    const h = nyDate.getHours(); const d = nyDate.getDay();
    return d >= 1 && d <= 5 && h >= 9 && h < 16;
  };

  return (
    <div className="h-12 border-b border-border bg-card flex items-center px-4 gap-4 text-xs">
      {/* Market clocks */}
      <div className="flex items-center gap-3">
        <ClockWidget label="NY" time={nyTime} active={isNYOpen()} />
        <ClockWidget label="LON" time={londonTime} active={false} />
        <ClockWidget label="PAR" time={parisTime} active={false} />
      </div>

      <div className="w-px h-6 bg-border" />

      {/* NQ Price */}
      <div className="flex items-center gap-2">
        <Activity className="w-3 h-3 text-primary" />
        <span className="font-mono text-foreground font-medium">NQ1!</span>
        <span className="font-mono font-bold text-foreground">{nqPrice.price.toLocaleString()}</span>
        <span className={`flex items-center gap-0.5 font-mono ${nqPrice.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {nqPrice.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {nqPrice.change >= 0 ? '+' : ''}{nqPrice.change} ({nqPrice.pct >= 0 ? '+' : ''}{nqPrice.pct}%)
        </span>
      </div>

      <div className="flex-1" />

      {/* Session indicator */}
      <SessionBadge />

      {/* Local time */}
      <div className="flex items-center gap-1 text-muted-foreground font-mono">
        <Clock className="w-3 h-3" />
        <span>{time.toLocaleTimeString('fr-FR')}</span>
      </div>

      <NotificationCenter />
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
  const now = new Date();
  const nyHour = parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }));

  let session = 'Closed';
  let color = 'text-muted-foreground bg-muted';

  if (nyHour >= 9 && nyHour < 16) { session = 'NY Open'; color = 'text-primary bg-primary/10'; }
  else if (nyHour >= 4 && nyHour < 9) { session = 'Pre-Market'; color = 'text-yellow-400 bg-yellow-400/10'; }
  else if (nyHour >= 2 && nyHour < 8) { session = 'London'; color = 'text-blue-400 bg-blue-400/10'; }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{session}</span>
  );
}