import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { AlarmClock } from 'lucide-react';

const streakRisk = (trades) => {
  const cl = (trades || []).filter((t) => t.result === 'win' || t.result === 'loss');
  const wr = cl.length ? cl.filter((t) => t.result === 'win').length / cl.length : 0.5;
  const N = 100, SIMS = 4000;
  const probs = {};
  [3, 5, 8, 10].forEach((k) => {
    let hits = 0;
    for (let s = 0; s < SIMS; s++) {
      let streak = 0, maxS = 0;
      for (let i = 0; i < N; i++) {
        if (Math.random() > wr) { streak++; if (streak > maxS) maxS = streak; } else streak = 0;
      }
      if (maxS >= k) hits++;
    }
    probs[k] = (hits / SIMS) * 100;
  });
  return { wr: wr * 100, probs, n: cl.length };
};

export default function ConsecutiveLossRisk() {
  return (
    <QuantPage
      title="Risque de Séries de Pertes"
      subtitle="Probabilité d'encaisser k pertes consécutives sur 100 trades (Monte Carlo)"
      icon={AlarmClock}
      metrics={(trades) => {
        const s = streakRisk(trades);
        return [
          { label: 'WR utilisé', value: `${s.wr.toFixed(1)}%`, sub: `${s.n} trades` },
          { label: 'P(série ≥ 3)', value: `${s.probs[3].toFixed(1)}%`, color: 'text-green-400' },
          { label: 'P(série ≥ 5)', value: `${s.probs[5].toFixed(1)}%`, color: 'text-yellow-400' },
          { label: 'P(série ≥ 8)', value: `${s.probs[8].toFixed(1)}%`, color: 'text-red-400' },
        ];
      }}
      chartData={(trades) => {
        const s = streakRisk(trades);
        return [3, 5, 8, 10].map((k) => ({ name: `≥ ${k} pertes`, value: +s.probs[k].toFixed(1) }));
      }}
      chartType="bar"
      chartConfig={{ title: 'Probabilité d\'une série de pertes (%)' }}
      aiPrompt="Analyse le risque de séries de pertes consécutives pour mon profil. Mon risk par trade est-il dimensionné pour survivre à la pire série probable? Quelle taille de compte et quel risk recommander?"
      aiContext={(trades) => {
        const s = streakRisk(trades);
        return `WR=${s.wr.toFixed(1)}%. Probabilités sur 100 trades: ≥3: ${s.probs[3].toFixed(1)}%, ≥5: ${s.probs[5].toFixed(1)}%, ≥8: ${s.probs[8].toFixed(1)}%, ≥10: ${s.probs[10].toFixed(1)}%`;
      }}
    />
  );
}