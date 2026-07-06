import { useState, useEffect } from 'react';
import { Clock, Globe, Zap } from 'lucide-react';

const SESSIONS = [
  { name: 'Sydney', city: 'Sydney', openUTC: 21, closeUTC: 6, color: '#8B5CF6', flag: '🇦🇺' },
  { name: 'Tokyo', city: 'Tokyo', openUTC: 0, closeUTC: 9, color: '#F59E0B', flag: '🇯🇵' },
  { name: 'London', city: 'London', openUTC: 7, closeUTC: 16, color: '#0088FF', flag: '🇬🇧' },
  { name: 'New York', city: 'New York', openUTC: 12, closeUTC: 21, color: '#00FF88', flag: '🇺🇸' },
];

const ASSET_SESSIONS = [
  { asset: 'EUR/USD', best: ['London', 'New York'], liquidity: 'High' },
  { asset: 'GBP/USD', best: ['London'], liquidity: 'High' },
  { asset: 'USD/JPY', best: ['Tokyo', 'New York'], liquidity: 'Medium' },
  { asset: 'NQ Futures', best: ['New York', 'Overlap London-NY'], liquidity: 'Very High' },
  { asset: 'ES Futures', best: ['New York'], liquidity: 'Very High' },
  { asset: 'Gold (XAU)', best: ['London', 'New York'], liquidity: 'High' },
  { asset: 'BTC/USD', best: ['New York', 'Overlap London-NY'], liquidity: 'Medium' },
  { asset: 'Crude Oil', best: ['New York'], liquidity: 'Medium' },
];

export default function SessionClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const utcSec = now.getUTCSeconds();
  const currentMin = utcHour * 60 + utcMin;

  const isSessionOpen = (s) => {
    if (s.openUTC < s.closeUTC) return utcHour >= s.openUTC && utcHour < s.closeUTC;
    return utcHour >= s.openUTC || utcHour < s.closeUTC;
  };

  const getSessionProgress = (s) => {
    const open = s.openUTC * 60;
    const close = s.closeUTC * 60;
    let progress;
    if (open < close) {
      progress = ((currentMin - open) / (close - open)) * 100;
    } else {
      const total = (24 * 60 - open) + close;
      const elapsed = currentMin >= open ? currentMin - open : (24 * 60 - open) + currentMin;
      progress = (elapsed / total) * 100;
    }
    return Math.max(0, Math.min(100, progress));
  };

  const getTimeUntilOpen = (s) => {
    if (isSessionOpen(s)) return null;
    const open = s.openUTC * 60;
    let diff = open - currentMin;
    if (diff < 0) diff += 24 * 60;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}h ${m}m`;
  };

  const getTimeUntilClose = (s) => {
    if (!isSessionOpen(s)) return null;
    const close = s.closeUTC * 60;
    let diff = close - currentMin;
    if (diff < 0) diff += 24 * 60;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}h ${m}m`;
  };

  // Overlap detection
  const openSessions = SESSIONS.filter(isSessionOpen);
  const hasLondonNYOverlap = isSessionOpen(SESSIONS[2]) && isSessionOpen(SESSIONS[3]);

  // Current best assets
  const activeAssetSessions = ASSET_SESSIONS.filter(a => a.best.some(b => openSessions.some(s => s.name === b) || (b === 'Overlap London-NY' && hasLondonNYOverlap)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Globe className="w-5 h-5 text-blue-400" />Market Session Clock</h1>
          <p className="text-xs text-muted-foreground">Sessions globales en temps réel · Overlaps · Liquidité par actif</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold font-mono text-primary">{String(utcHour).padStart(2, '0')}:{String(utcMin).padStart(2, '0')}:{String(utcSec).padStart(2, '0')}</div>
          <div className="text-[10px] text-muted-foreground">UTC · {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</div>
        </div>
      </div>

      {/* Overlap alert */}
      {hasLondonNYOverlap && (
        <div className="card-trading border border-primary/30 bg-primary/5 flex items-center gap-3 animate-pulse-neon">
          <Zap className="w-5 h-5 text-primary" />
          <div className="text-xs">
            <span className="text-primary font-bold">OVERLAP LONDON-NY ACTIF</span>
            <span className="text-muted-foreground"> — Liquidité maximale · Idéal pour NQ, EUR/USD, Gold</span>
          </div>
        </div>
      )}

      {/* Session cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {SESSIONS.map(s => {
          const open = isSessionOpen(s);
          const progress = getSessionProgress(s);
          const untilOpen = getTimeUntilOpen(s);
          const untilClose = getTimeUntilClose(s);
          return (
            <div key={s.name} className={`card-trading border ${open ? 'border-primary/30 bg-primary/5' : 'border-border opacity-70'} transition-all`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{s.flag}</span>
                  <span className="font-semibold text-sm">{s.name}</span>
                </div>
                <span className={`status-dot ${open ? 'active' : 'inactive'}`} />
              </div>
              <div className={`text-xs font-mono ${open ? 'text-primary' : 'text-muted-foreground'}`}>
                {open ? `OUVERT · ${s.openUTC}h-${s.closeUTC}h UTC` : `FERMÉ · Ouvre dans ${untilOpen}`}
              </div>
              {open && <div className="text-[10px] text-muted-foreground mt-1">⏱ Clôture dans {untilClose}</div>}
              <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%`, background: s.color }} />
              </div>
              <div className="text-[9px] text-muted-foreground mt-1 text-right">{Math.round(progress)}%</div>
            </div>
          );
        })}
      </div>

      {/* 24h Timeline */}
      <div className="card-trading">
        <div className="text-sm font-semibold mb-3">Timeline 24h — Liquidité globale</div>
        <div className="relative h-20">
          {/* Hour markers */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="flex-1 border-l border-border/30 relative">
                {h % 3 === 0 && <span className="absolute -bottom-4 left-0 text-[8px] text-muted-foreground">{h}h</span>}
              </div>
            ))}
          </div>
          {/* Session bars */}
          <div className="absolute inset-0 flex flex-col justify-center gap-1 py-2">
            {SESSIONS.map((s, idx) => {
              const open = s.openUTC;
              const close = s.closeUTC;
              const width = close > open ? (close - open) / 24 * 100 : (24 - open + close) / 24 * 100;
              const left = open / 24 * 100;
              return (
                <div key={s.name} className="relative h-3">
                  {open < close ? (
                    <div className="absolute h-3 rounded-sm flex items-center px-1" style={{ left: `${left}%`, width: `${width}%`, background: `${s.color}33`, borderLeft: `2px solid ${s.color}` }}>
                      <span className="text-[8px] text-muted-foreground truncate">{s.name}</span>
                    </div>
                  ) : (
                    <>
                      <div className="absolute h-3 rounded-sm flex items-center px-1" style={{ left: `${left}%`, width: `${(24 - open) / 24 * 100}%`, background: `${s.color}33`, borderLeft: `2px solid ${s.color}` }}>
                        <span className="text-[8px] text-muted-foreground truncate">{s.name}</span>
                      </div>
                      <div className="absolute h-3 rounded-sm" style={{ left: 0, width: `${close / 24 * 100}%`, background: `${s.color}33`, borderLeft: `2px solid ${s.color}` }} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {/* Current time indicator */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-primary z-10" style={{ left: `${(utcHour + utcMin / 60) / 24 * 100}%` }}>
            <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 bg-primary rounded-full glow-green" />
          </div>
        </div>
      </div>

      {/* Best assets for current sessions */}
      <div className="card-trading">
        <div className="text-sm font-semibold mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-yellow-400" />Actifs optimaux — Sessions actuelles</div>
        {activeAssetSessions.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">Aucune session active — Marchés fermés</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {activeAssetSessions.map(a => (
              <div key={a.asset} className="p-2 rounded bg-secondary/50 border border-border text-center">
                <div className="text-xs font-bold">{a.asset}</div>
                <div className="text-[10px] text-primary">{a.best.join(', ')}</div>
                <div className={`text-[9px] ${a.liquidity === 'Very High' ? 'text-primary' : a.liquidity === 'High' ? 'text-green-400' : 'text-yellow-400'}`}>💧 {a.liquidity}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trading recommendation */}
      <div className="card-trading border border-blue-400/20 bg-blue-400/5">
        <div className="text-sm font-semibold mb-1 text-blue-400">💡 Recommandation</div>
        <p className="text-xs text-muted-foreground">
          {hasLondonNYOverlap ? '🔥 Overlap London-NY actif — Meilleure fenêtre de la journée. Liquidité maximale sur indices US et Forex majeurs. Idéal pour NQ Futures et EUR/USD.' :
           openSessions.length > 0 ? `${openSessions.map(s => s.name).join(' + ')} ouvert(s). Surveillez les actifs associés.` :
           'Aucune session majeure active. Idéal pour backtests, analyse et préparation du plan de trading.'}
        </p>
      </div>
    </div>
  );
}