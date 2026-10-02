import { useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { computeAlerts } from '@/lib/portfolio';

// Surveille en temps réel l'approche des limites (DD jour, DD max, objectif, consistance)
// et déclenche une alerte toast à 80% (warning) puis 95% (critical) — une seule fois par niveau.
export default function RiskMonitor({ accounts, trades }) {
  const { toast } = useToast();
  const seen = useRef({});

  useEffect(() => {
    computeAlerts(accounts, trades).forEach((a) => {
      if (seen.current[a.id]) return;
      seen.current[a.id] = true;
      if (a.level === 'success') {
        toast({ title: `Objectif atteint — ${a.account}`, description: 'Pensez à sécuriser et planifier le payout.' });
      } else {
        toast({
          variant: a.level === 'critical' ? 'destructive' : 'default',
          title: `${a.level === 'critical' ? 'LIMITE CRITIQUE' : 'Alerte risque'} — ${a.account}`,
          description: `${a.label}: ${a.pct.toFixed(0)}% de la limite utilisée. Réduisez l'exposition immédiatement.`,
        });
      }
    });
  }, [accounts, trades, toast]);

  return null;
}