import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { SlidersHorizontal } from 'lucide-react';

export default function SensitivityAnalysis() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 5) return [{ label: 'Sensitivity', value: 'N/A' }];
    const totalPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0);
    const variations = {
      '+10% Win Rate': totalPnl * 1.1,
      '-10% Win Rate': totalPnl * 0.9,
      '+20% Avg Win': totalPnl * 1.2,
      '-20% Avg Win': totalPnl * 0.8,
      '+1 Trade/Day': totalPnl * 1.15,
      '-1 Trade/Day': totalPnl * 0.85,
      'Double Risk': totalPnl * 2,
      'Half Risk': totalPnl * 0.5,
    };
    return Object.entries(variations).map(([label, value]) => ({
      label: label.length > 12 ? label.slice(0, 12) : label,
      value: value.toFixed(0),
      color: value > totalPnl ? 'text-primary' : 'text-red-400',
    }));
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 5) return [];
    const totalPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0);
    return [
      { name: 'Base', value: totalPnl },
      { name: '+10% WR', value: totalPnl * 1.1 },
      { name: '-10% WR', value: totalPnl * 0.9 },
      { name: '+20% Win', value: totalPnl * 1.2 },
      { name: '-20% Win', value: totalPnl * 0.8 },
      { name: '2× Risk', value: totalPnl * 2 },
      { name: '0.5× Risk', value: totalPnl * 0.5 },
    ];
  };

  return (
    <QuantPage
      title="Sensitivity Analysis"
      subtitle="Impact des variations de paramètres sur le PnL"
      icon={SlidersHorizontal}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Impact des scénarios', refLine: 0 }}
      aiPrompt="Analyse la Sensitivity Analysis. Montre comment le PnL change quand on modifie le win rate, la taille moyenne des gains, la fréquence ou le risque. Identifie le levier le plus impactant. Un petit changement qui double le PnL = point de levier critique."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Sensitivity</strong>: variation du PnL pour différents scénarios de paramètres</p>
        <p>Identifie quels paramètres ont le plus d'impact sur la performance globale.</p>
      </div>
    </QuantPage>
  );
}