import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Brain } from 'lucide-react';
import { normalCdf } from '@/lib/stats';

const posterior = (trades) => {
  const cl = (trades || []).filter((t) => t.result === 'win' || t.result === 'loss');
  const w = cl.filter((t) => t.result === 'win').length;
  const l = cl.length - w;
  const a = w + 1, b = l + 1;
  const m = a / (a + b);
  const sd = Math.sqrt((a * b) / (Math.pow(a + b, 2) * (a + b + 1)));
  return { w, l, n: cl.length, m, sd };
};

export default function BayesianWinRate() {
  return (
    <QuantPage
      title="Win Rate Bayésien"
      subtitle="Distribution postérieure Beta du taux de réussite — mieux qu'une simple moyenne"
      icon={Brain}
      metrics={(trades) => {
        const { w, l, n, m, sd } = posterior(trades);
        const lo = Math.max(0, m - 1.96 * sd), hi = Math.min(1, m + 1.96 * sd);
        const pAbove = 1 - normalCdf((0.5 - m) / (sd || 1e-9));
        return [
          { label: 'WR estimé', value: `${(m * 100).toFixed(1)}%`, color: 'text-primary' },
          { label: 'Intervalle 95%', value: `${(lo * 100).toFixed(1)}% – ${(hi * 100).toFixed(1)}%` },
          { label: 'P(WR > 50%)', value: `${(pAbove * 100).toFixed(1)}%`, color: pAbove > 0.5 ? 'text-green-400' : 'text-red-400' },
          { label: 'Échantillon', value: `${n} trades`, sub: `${w}W / ${l}L` },
        ];
      }}
      chartData={(trades) => {
        const { m, sd } = posterior(trades);
        const a = m * (m * (1 - m) / Math.pow(sd || 1e-9, 2) - 1);
        const b = a * (1 - m) / (m || 1e-9);
        const pts = [];
        for (let p = 0.02; p <= 0.99; p += 0.02) {
          pts.push({ name: `${Math.round(p * 100)}%`, value: Math.pow(p, a - 1) * Math.pow(1 - p, b - 1) * 1e6 });
        }
        const mx = Math.max(...pts.map((x) => x.value), 1);
        return pts.map((x) => ({ ...x, value: +((x.value / mx) * 100).toFixed(1) }));
      }}
      chartType="line"
      chartConfig={{ title: 'Densité postérieure du Win Rate (normalisée)' }}
      aiPrompt="Analyse la fiabilité statistique du win rate avec l'approche bayésienne. L'intervalle de crédibilité est-il assez étroit? Combien de trades supplémentaires faut-il pour confirmer un edge réel au-delà du hasard?"
      aiContext={(trades) => {
        const { w, l, n, m, sd } = posterior(trades);
        return `Échantillon: ${n} trades (${w}W/${l}L). WR postérieur: ${(m * 100).toFixed(1)}% ± ${(1.96 * sd * 100).toFixed(1)}%`;
      }}
    />
  );
}