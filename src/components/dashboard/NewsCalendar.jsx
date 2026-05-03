import { useState } from 'react';
import { Newspaper, AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react';

const EVENTS = [
  { time: '14:30', title: 'ISM Manufacturing PMI', impact: 'high', actual: '', forecast: '48.5', prev: '47.8', currency: 'USD', blocked: true },
  { time: '14:30', title: 'Initial Jobless Claims', impact: 'medium', actual: '', forecast: '215K', prev: '212K', currency: 'USD', blocked: false },
  { time: '16:00', title: 'Fed Chair Powell Speech', impact: 'critical', actual: '', forecast: '', prev: '', currency: 'USD', blocked: true },
  { time: '20:00', title: 'FOMC Meeting Minutes', impact: 'critical', actual: '', forecast: '', prev: '', currency: 'USD', blocked: true },
];

const IMPACT_CONFIG = {
  low: { color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20', dot: 'bg-green-400', label: 'Faible' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', dot: 'bg-yellow-400', label: 'Moyen' },
  high: { color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20', dot: 'bg-orange-400', label: 'Élevé' },
  critical: { color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20', dot: 'bg-destructive animate-pulse', label: 'CRITIQUE' },
};

function getMinutesUntil(timeStr) {
  const now = new Date();
  const [h, m] = timeStr.split(':').map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  return Math.round((target - now) / 60000);
}

export default function NewsCalendar({ compact = false }) {
  const [expanded, setExpanded] = useState(!compact);

  const nextCritical = EVENTS.find(e => e.impact === 'critical' || e.impact === 'high');
  const minsUntil = nextCritical ? getMinutesUntil(nextCritical.time) : null;
  const isBlocking = minsUntil !== null && minsUntil >= -10 && minsUntil <= 5;

  return (
    <div className="card-trading">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-semibold">Calendrier News — {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
          {isBlocking && <span className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded animate-pulse font-bold">⚠ TRADING BLOQUÉ</span>}
        </div>
        <div className="flex items-center gap-2">
          {nextCritical && minsUntil !== null && minsUntil > 0 && (
            <span className="text-[10px] text-muted-foreground font-mono">
              Prochain: <span className="text-yellow-400">{nextCritical.title.split(' ').slice(0, 2).join(' ')} dans {minsUntil}min</span>
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-1.5">
          {EVENTS.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">Aucun événement majeur aujourd'hui</div>
          ) : EVENTS.map((ev, i) => {
            const cfg = IMPACT_CONFIG[ev.impact];
            const mins = getMinutesUntil(ev.time);
            const isPast = mins < -15;
            const isNear = mins >= -5 && mins <= 10;
            return (
              <div key={i} className={`flex items-center gap-3 p-2.5 rounded border text-xs transition-all ${isNear ? cfg.bg + ' ring-1 ring-current' : isPast ? 'border-border/30 bg-secondary/10 opacity-50' : `border-border bg-secondary/20`}`}>
                <div className="flex items-center gap-1.5 w-14 flex-shrink-0">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  <span className="font-mono text-muted-foreground">{ev.time}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`font-medium truncate block ${isPast ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{ev.title}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {ev.forecast && <span className="text-[10px] text-muted-foreground">prév: <span className="text-foreground">{ev.forecast}</span></span>}
                  {ev.prev && <span className="text-[10px] text-muted-foreground">préc: {ev.prev}</span>}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${cfg.color} bg-current/10`} style={{backgroundColor: 'transparent'}}>{cfg.label}</span>
                  {ev.blocked && !isPast && <AlertTriangle className="w-3 h-3 text-yellow-400" />}
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-3 pt-1 text-[10px] text-muted-foreground">
            {Object.entries(IMPACT_CONFIG).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${v.dot.replace(' animate-pulse','')}`} />
                {v.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}