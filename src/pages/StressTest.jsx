import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Zap } from 'lucide-react';

export default function StressTest() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [{ label: 'Stress', value: 'N/A' }];
    const totalPnl = pnls.reduce((a, b) => a + b, 0);
    const worst = Math.min(...pnls);
    const best = Math.max(...pnls);
    const scenarios = {
      normal: totalPnl,
      adverse: totalPnl * 0.5,
      severe: totalPnl * 0.25,
      black_swan: totalPnl - Math.abs(worst) * 3,
      best_case: totalPnl * 1.5,
    };
    const worstScenario = Math.min(...Object.values(scenarios));
    return [
      { label: 'Normal', value: scenarios.normal.toFixed(0), color: 'text-primary' },
      { label: 'Adverse (-50%)', value: scenarios.adverse.toFixed(0), color: 'text-yellow-400' },
      { label: 'Severe (-75%)', value: scenarios.severe.toFixed(0), color: 'text-red-400' },
      { label: 'Black Swan', value: scenarios.black_swan.toFixed(0), color: 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [];
    const totalPnl = pnls.reduce((a, b) => a + b, 0);
    const worst = Math.min(...pnls);
    return [
      { name: 'Normal', value: totalPnl },
      { name: 'Adverse', value: totalPnl * 0.5 },
      { name: 'Severe', value: totalPnl * 0.25 },
      { name: 'Black Swan', value: totalPnl - Math.abs(worst) * 3 },
      { name: 'Best Case', value: totalPnl * 1.5 },
    ];
  };

  return (
    <QuantPage
      title="Stress Testing"
      subtitle="Scénarios de stress: normal, adverse, severe, black swan"
      icon={Zap}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Scénarios de Stress', refLine: 0 }}
      aiPrompt="Analyse les scénarios de stress. Le scénario Black Swan simule un événement extrême (3× la pire perte). Évalue si le trader survivrait à chaque scénario. Le capital doit rester positif dans tous les scénarios."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Scénarios</strong>: Normal, Adverse (-50%), Severe (-75%), Black Swan (3× pire perte), Best Case (+50%)</p>
        <p>Le stress testing vérifie la résilience du capital dans des conditions extrêmes.</p>
      </div>
    </QuantPage>
  );
}