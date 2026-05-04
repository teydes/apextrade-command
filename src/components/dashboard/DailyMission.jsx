import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Flame, Trophy } from 'lucide-react';

const DAILY_CHECKS = [
  { id: 'bias', label: 'Biais HTF identifié (H1/H4)', group: 'Préparation' },
  { id: 'levels', label: 'Niveaux clés marqués (OB, FVG, Liquidités)', group: 'Préparation' },
  { id: 'news', label: 'Calendrier news vérifié (FOMC/CPI/NFP)', group: 'Préparation' },
  { id: 'session', label: 'Session Kill Zone active', group: 'Exécution' },
  { id: 'setup', label: 'Setup confluence ≥ 3 éléments', group: 'Exécution' },
  { id: 'sl', label: 'SL défini AVANT l\'entrée', group: 'Exécution' },
  { id: 'be', label: 'TP1 → Breakeven déclenché', group: 'Gestion' },
  { id: 'journal', label: 'Trade journalisé avec screenshot', group: 'Gestion' },
  { id: 'review', label: 'Revue fin de session effectuée', group: 'Gestion' },
];

export default function DailyMission() {
  const today = new Date().toDateString();
  const [checks, setChecks] = useState(() => {
    const saved = localStorage.getItem(`daily_mission_${today}`);
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem(`daily_mission_${today}`, JSON.stringify(checks));
  }, [checks, today]);

  const toggle = (id) => setChecks(p => ({ ...p, [id]: !p[id] }));
  const done = Object.values(checks).filter(Boolean).length;
  const total = DAILY_CHECKS.length;
  const pct = Math.round((done / total) * 100);

  const groups = [...new Set(DAILY_CHECKS.map(c => c.group))];

  return (
    <div className="card-trading">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className={`w-4 h-4 ${pct === 100 ? 'text-primary' : 'text-orange-400'}`} />
          <span className="text-sm font-semibold">Mission Journalière</span>
        </div>
        <div className="flex items-center gap-2">
          {pct === 100 && <Trophy className="w-4 h-4 text-yellow-400" />}
          <span className={`text-sm font-bold font-mono ${pct === 100 ? 'text-primary' : pct >= 60 ? 'text-yellow-400' : 'text-muted-foreground'}`}>{done}/{total}</span>
        </div>
      </div>

      <div className="progress-bar mb-3">
        <div className="progress-bar-fill transition-all duration-500"
          style={{ width: `${pct}%`, background: pct === 100 ? '#00FF88' : pct >= 60 ? '#F59E0B' : '#3b82f6' }} />
      </div>

      {groups.map(group => (
        <div key={group} className="mb-3">
          <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1.5">{group}</div>
          {DAILY_CHECKS.filter(c => c.group === group).map(c => (
            <button key={c.id} onClick={() => toggle(c.id)}
              className="flex items-center gap-2 w-full text-left py-1 hover:text-foreground transition-colors group">
              {checks[c.id]
                ? <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                : <Circle className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground flex-shrink-0" />}
              <span className={`text-xs ${checks[c.id] ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{c.label}</span>
            </button>
          ))}
        </div>
      ))}

      {pct === 100 && (
        <div className="text-center text-xs text-primary bg-primary/10 rounded p-2 mt-1 font-semibold">
          🏆 Mission complète — Tu es prêt à trader !
        </div>
      )}
    </div>
  );
}