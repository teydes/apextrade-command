import { CheckCircle2, XCircle, AlertCircle, Plane } from 'lucide-react';

const checks = [
  { id: 'news', label: 'Pas de news haute impact dans 30 min', category: 'risk' },
  { id: 'session', label: 'Session active (NY / London)', category: 'market' },
  { id: 'drawdown', label: 'Drawdown journalier < 50%', category: 'risk' },
  { id: 'target', label: 'Objectif journalier non atteint', category: 'performance' },
  { id: 'webhook', label: 'Webhook TradingView connecté', category: 'system' },
  { id: 'consistency', label: 'Règle de cohérence MFF OK', category: 'propfirm' },
  { id: 'bias', label: 'Biais de marché identifié', category: 'analysis' },
  { id: 'ob_identified', label: 'Order Block / FVG repéré', category: 'analysis' },
];

export default function PreFlightChecklist({ compact = false }) {
  // Simulated real-time checks (in real use, these come from system state)
  const checkStatus = {
    news: true,
    session: true,
    drawdown: true,
    target: true,
    webhook: true,
    consistency: true,
    bias: false,
    ob_identified: false,
  };

  const allGreen = Object.values(checkStatus).every(Boolean);
  const failCount = Object.values(checkStatus).filter(v => !v).length;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${allGreen ? 'bg-primary/10 border border-primary/30' : 'bg-destructive/10 border border-destructive/30'}`}>
        <Plane className={`w-4 h-4 ${allGreen ? 'text-primary' : 'text-destructive'}`} />
        <span className={allGreen ? 'text-primary' : 'text-destructive'}>
          {allGreen ? 'Autorisé au décollage' : `${failCount} point(s) bloquant(s)`}
        </span>
      </div>
    );
  }

  return (
    <div className="card-trading">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Plane className={`w-4 h-4 ${allGreen ? 'text-primary' : 'text-destructive'}`} />
          <span className="text-sm font-semibold">Checklist Pré-Vol</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${allGreen ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
          {allGreen ? '✈️ GO' : `⛔ NO-GO (${failCount} points)`}
        </span>
      </div>

      <div className="space-y-1.5">
        {checks.map(check => {
          const ok = checkStatus[check.id];
          return (
            <div key={check.id} className="flex items-center gap-2 text-xs">
              {ok
                ? <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                : <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
              }
              <span className={ok ? 'text-foreground' : 'text-destructive'}>{check.label}</span>
              <span className="ml-auto text-muted-foreground uppercase text-[10px]">{check.category}</span>
            </div>
          );
        })}
      </div>

      {!allGreen && (
        <div className="mt-3 p-2 bg-destructive/10 rounded text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          Trade bloqué jusqu'à validation de tous les points
        </div>
      )}
    </div>
  );
}