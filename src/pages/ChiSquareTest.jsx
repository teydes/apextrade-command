import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { FlaskConical } from 'lucide-react';
import { chi2Surv } from '@/lib/stats';

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const dayStats = (trades) => {
  const counts = Array(7).fill(0);
  (trades || []).forEach((t) => {
    if (!t.entry_time) return;
    counts[new Date(t.entry_time).getDay()]++;
  });
  const total = counts.reduce((a, b) => a + b, 0);
  const expected = total / 7;
  const chi2 = total > 0 ? counts.reduce((s, o) => s + (o - expected) ** 2 / (expected || 1), 0) : 0;
  const p = chi2Surv(chi2, 6);
  return { counts, total, expected, chi2, p };
};

export default function ChiSquareTest() {
  return (
    <QuantPage
      title="Test du Chi²"
      subtitle="Répartition des trades par jour de semaine — uniforme ou biaisée?"
      icon={FlaskConical}
      metrics={(trades) => {
        const s = dayStats(trades);
        const busiest = s.counts.indexOf(Math.max(...s.counts));
        return [
          { label: 'Chi² (ddl=6)', value: s.chi2.toFixed(2) },
          { label: 'P-value', value: s.p.toFixed(3), color: s.p < 0.05 ? 'text-yellow-400' : 'text-green-400' },
          { label: 'Trades/jour attendus', value: s.expected.toFixed(1), sub: `total: ${s.total}` },
          { label: 'Jour le plus actif', value: DAYS[busiest] || '—' },
        ];
      }}
      chartData={(trades) => {
        const { counts } = dayStats(trades);
        return DAYS.map((d, i) => ({ name: d, value: counts[i] }));
      }}
      chartType="bar"
      chartConfig={{ title: 'Trades par jour de semaine' }}
      extraStats={(trades) => {
        const s = dayStats(trades);
        return (
          <div className="text-xs text-muted-foreground space-y-2">
            <p><strong className="text-foreground">Principe</strong>: chi² = Σ(Observé − Attendu)² / Attendu avec 6 degrés de liberté.</p>
            <p>p &lt; 0.05 = votre activité est significativement concentrée sur certains jours (sessions préférées, news, ou manque d'opportunités).</p>
            <p>Chi² actuel: {s.chi2.toFixed(2)} — {s.p >= 0.05 ? 'répartition compatible avec un hasard uniforme' : 'biais jour détecté'}.</p>
          </div>
        );
      }}
      aiPrompt="Analyse la répartition de mon activité de trading par jour de semaine. Ce biais est-il structurel (sessions/stratégie) ou comportemental? Recommandations."
      aiContext={(trades) => {
        const s = dayStats(trades);
        return `Répartition: ${s.counts.join(', ')} (attendu ${s.expected.toFixed(1)}), chi²=${s.chi2.toFixed(2)}, p=${s.p.toFixed(3)}`;
      }}
    />
  );
}