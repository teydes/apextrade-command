import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Dices } from 'lucide-react';

export default function BootstrapAnalysis() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 10) return [{ label: 'Bootstrap', value: 'N/A' }];
    const originalMean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    const iterations = 1000;
    const bootMeans = [];
    for (let i = 0; i < iterations; i++) {
      let sum = 0;
      for (let j = 0; j < pnls.length; j++) {
        sum += pnls[Math.floor(Math.random() * pnls.length)];
      }
      bootMeans.push(sum / pnls.length);
    }
    bootMeans.sort((a, b) => a - b);
    const ciLow = bootMeans[Math.floor(iterations * 0.025)];
    const ciHigh = bootMeans[Math.floor(iterations * 0.975)];
    const median = bootMeans[Math.floor(iterations * 0.5)];
    const pctPositive = bootMeans.filter(m => m > 0).length / iterations * 100;
    return [
      { label: 'Moyenne estimée', value: originalMean.toFixed(2), color: originalMean >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'CI 95% Low', value: ciLow.toFixed(2), color: ciLow >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'CI 95% High', value: ciHigh.toFixed(2), color: ciHigh >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'P(>0)', value: pctPositive.toFixed(0) + '%', color: pctPositive > 90 ? 'text-primary' : pctPositive > 75 ? 'text-yellow-400' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 10) return [];
    const iterations = 200;
    const bootMeans = [];
    for (let i = 0; i < iterations; i++) {
      let sum = 0;
      for (let j = 0; j < pnls.length; j++) sum += pnls[Math.floor(Math.random() * pnls.length)];
      bootMeans.push(sum / pnls.length);
    }
    bootMeans.sort((a, b) => a - b);
    const min = Math.min(...bootMeans), max = Math.max(...bootMeans);
    const range = max - min;
    const bins = 15;
    const counts = new Array(bins).fill(0);
    for (const m of bootMeans) {
      const idx = Math.min(Math.floor(((m - min) / range) * bins), bins - 1);
      counts[idx]++;
    }
    return counts.map((c, i) => ({ name: (min + (range / bins) * i).toFixed(1), value: c }));
  };

  return (
    <QuantPage
      title="Bootstrap Analysis"
      subtitle="Intervalles de confiance par rééchantillonnage (1000 itérations)"
      icon={Dices}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Distribution bootstrap du rendement moyen', refLine: 0 }}
      aiPrompt="Analyse le Bootstrap. L'intervalle de confiance à 95% indique la plage probable du rendement moyen réel. Si le CI bas est > 0, la stratégie est statistiquement profitable. P(>0) > 90% = confiance élevée."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Bootstrap</strong>: 1000 rééchantillonnages avec remise</p>
        <p>Le CI 95% est l'intervalle dans lequel le vrai rendement moyen se trouve avec 95% de confiance.</p>
      </div>
    </QuantPage>
  );
}