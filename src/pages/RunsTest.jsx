import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Shuffle } from 'lucide-react';
import { sortByTime, normalCdf } from '@/lib/stats';

const runStats = (trades) => {
  const seq = sortByTime(trades).filter((t) => t.result === 'win' || t.result === 'loss').map((t) => (t.result === 'win' ? 'W' : 'L'));
  const n = seq.length;
  const n1 = seq.filter((s) => s === 'W').length;
  const n2 = n - n1;
  let runs = n > 0 ? 1 : 0;
  for (let i = 1; i < n; i++) if (seq[i] !== seq[i - 1]) runs++;
  const muR = n > 1 && n1 > 0 && n2 > 0 ? (2 * n1 * n2) / n + 1 : 0;
  const varR = n > 1 && n1 > 0 && n2 > 0 ? (2 * n1 * n2 * (2 * n1 * n2 - n)) / (n * n * (n - 1)) : 0;
  const z = varR > 0 ? (runs - muR) / Math.sqrt(varR) : 0;
  const p = z !== 0 ? 2 * (1 - normalCdf(Math.abs(z))) : 1;
  // Distribution des séquences
  const streaks = {};
  let cur = 1;
  for (let i = 1; i <= n; i++) {
    if (i < n && seq[i] === seq[i - 1]) cur++;
    else {
      if (n > 0) streaks[cur] = (streaks[cur] || 0) + 1;
      cur = 1;
    }
  }
  return { n, n1, n2, runs, muR, z, p, streaks };
};

export default function RunsTest() {
  return (
    <QuantPage
      title="Test du Runs (Wald–Wolfowitz)"
      subtitle="Vos séries W/L sont-elles aléatoires ou y a-t-il du clustering (tilt/momentum)?"
      icon={Shuffle}
      metrics={(trades) => {
        const s = runStats(trades);
        return [
          { label: 'Runs observés', value: s.runs, sub: `attendus: ${s.muR.toFixed(1)}` },
          { label: 'Statistique Z', value: s.z.toFixed(2), color: Math.abs(s.z) < 1.96 ? 'text-green-400' : 'text-yellow-400' },
          { label: 'P-value', value: s.p.toFixed(3), color: s.p < 0.05 ? 'text-red-400' : 'text-green-400' },
          { label: 'Verdict', value: s.p < 0.05 ? 'Séquences non aléatoires' : 'Séquences aléatoires', sub: s.p < 0.05 ? 'Clustering détecté (tilt?)' : 'Pas de dépendance' },
        ];
      }}
      chartData={(trades) => {
        const { streaks } = runStats(trades);
        return Object.entries(streaks)
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .slice(0, 10)
          .map(([len, count]) => ({ name: `${len}`, value: count }));
      }}
      chartType="bar"
      chartConfig={{ title: 'Longueur des séquences (W/L confondues)' }}
      extraStats={(trades) => {
        const s = runStats(trades);
        return (
          <div className="text-xs text-muted-foreground space-y-2">
            <p><strong className="text-foreground">Hypothèse</strong>: si les trades sont indépendants, le nombre de séries observées doit être proche de {(2 * s.n1 * s.n2) / Math.max(s.n, 1) + 1}.</p>
            <p>Trop peu de séries = clustering (tilt, revenge trading après perte). Trop de séries = alternance suspecte (sur-interprétation du dernier résultat).</p>
            <p>Un test non significatif (p &gt; 0.05) est une bonne nouvelle: votre exécution est indépendante du résultat précédent.</p>
          </div>
        );
      }}
      aiPrompt="Analyse le résultat du test de Wald-Wolfowitz sur mes séquences de trades. Que révèle la structure de mes séries sur ma discipline et mon état psychologique?"
      aiContext={(trades) => {
        const s = runStats(trades);
        return `N=${s.n} (${s.n1}W/${s.n2}L), runs=${s.runs} vs attendus=${s.muR.toFixed(1)}, Z=${s.z.toFixed(2)}, p=${s.p.toFixed(3)}`;
      }}
    />
  );
}