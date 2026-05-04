import { useState } from 'react';
import { ShieldOff, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function KillSwitchBanner({ ddPct = 0, consecutiveLosses = 0 }) {
  const [manualKill, setManualKill] = useState(false);

  const autoKill = ddPct >= 70 || consecutiveLosses >= 2;
  const killed = manualKill || autoKill;
  const warning = ddPct >= 50 || consecutiveLosses >= 1;

  if (!killed && !warning) return null;

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-xs font-medium ${
      killed ? 'bg-destructive/10 border-destructive/50 text-destructive' :
      'bg-yellow-400/10 border-yellow-400/30 text-yellow-400'
    }`}>
      {killed
        ? <ShieldOff className="w-4 h-4 flex-shrink-0" />
        : <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      }
      <div className="flex-1">
        {killed
          ? autoKill
            ? `🛑 KILL SWITCH AUTO — ${ddPct >= 70 ? `DD journalier ${ddPct}% > 70%` : `${consecutiveLosses} pertes consécutives`} — STOP trading`
            : '🛑 KILL SWITCH MANUEL activé — Aucun nouveau trade autorisé'
          : `⚠️ ATTENTION — ${ddPct >= 50 ? `DD à ${ddPct}%` : ''} ${consecutiveLosses >= 1 ? `${consecutiveLosses} perte(s) de suite` : ''} — Reduire la taille`
        }
      </div>
      <button onClick={() => setManualKill(p => !p)}
        className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold transition-all ${
          manualKill ? 'border-primary/40 text-primary hover:bg-primary/10' : 'border-destructive/40 hover:bg-destructive/10'
        }`}>
        {manualKill ? <><ShieldCheck className="w-3 h-3" />Réactiver</> : <><ShieldOff className="w-3 h-3" />Kill manuel</>}
      </button>
    </div>
  );
}