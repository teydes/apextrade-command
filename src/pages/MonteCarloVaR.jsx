import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Dices } from 'lucide-react';

export default function MonteCarloVaR() {
  const SIMULATIONS = 2000;
  const HORIZON = 20;

  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 10) return [{ label: 'MC-VaR', value: 'N/A' }];
    const means = [];
    for (let s = 0; s < SIMULATIONS; s++) {
      let sum = 0;
      for (let d = 0; d < HORIZON; d++) {
        sum += pnls[Math.floor(Math.random() * pnls.length)];
      }
      means.push(sum);
    }
    means.sort((a, b) => a - b);
    const var95 = means[Math.floor(SIMULATIONS * 0.05)];
    const var99 = means[Math.floor(SIMULATIONS * 0.01)];
    const cvar95 = means.slice(0, Math.floor(SIMULATIONS * 0.05)).reduce((a, b) => a + b, 0) / (SIMULATIONS * 0.05);
    const median = means[Math.floor(SIMULATIONS / 2)];
    return [
      { label: `VaR 95% (${HORIZON}t)`, value: var95.toFixed(2), color: 'text-red-400' },
      { label: 'VaR 99%', value: var99.toFixed(2), color: 'text-red-400' },
      { label: 'CVaR 95%', value: cvar95.toFixed(2), color: 'text-red-400' },
      { label: 'Médiane', value: median.toFixed(2), color: median >= 0 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 10) return [];
    const bins = 24;
    const counts = new Array(bins).fill(0);
    let min = Infinity, max = -Infinity;
    const finals = [];
    for (let s = 0; s < 500; s++) {
      let sum = 0;
      for (let d = 0; d < HORIZON; d++) sum += pnls[Math.floor(Math.random() * pnls.length)];
      finals.push(sum);
      if (sum < min) min = sum;
      if (sum > max) max = sum;
    }
    const range = max - min || 1;
    for (const f of finals) {
      const idx = Math.min(Math.floor(((f - min) / range) * bins), bins - 1);
      counts[idx]++;
    }
    return counts.map((c, i) => ({ name: (min + (range / bins) * i).toFixed(0), value: c }));
  };

  return (
    <QuantPage
      title="Monte Carlo VaR (Bootstrap)"
      subtitle="VaR non-paramétrique par ré-échantillonnage bootstrap des PnL réels"
      icon={Dices}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: `Distribution des PnL simulés sur ${HORIZON} trades (500 runs)` }}
      aiPrompt="Analyse le Monte Carlo VaR bootstrap. Contrairement au VaR paramétrique (qui suppose la normalité), le bootstrap ré-échantillonne les PnL réels: il capture les queues épaisses et l'asymétrie. Le VaR 95% sur 20 trades = perte maximale attendue dans 95% des scénarios. Le CVaR (moyenne des 5% pires scénarios) est plus prudent et devrait guider le sizing du buffer de sécurité."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-60).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Bootstrap</strong>: 2000 simulations de 20 trades tirés avec remise</p>
        <p>Le VaR bootstrap capture les queues épaisses ignorées par le VaR gaussien.</p>
      </div>
    </QuantPage>
  );
}