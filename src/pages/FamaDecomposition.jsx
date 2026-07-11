import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Layers3 } from 'lucide-react';

export default function FamaDecomposition() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 5) return [{ label: 'Fama', value: 'N/A' }];
    const pnls = closed.map(t => t.pnl);
    const n = pnls.length;
    const totalReturn = pnls.reduce((a, b) => a + b, 0);
    const meanReturn = totalReturn / n;
    const rf = 0;
    const riskPremium = meanReturn - rf;
    const std = Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - meanReturn, 2), 0) / (n - 1));
    const systematicRisk = std * 0.6;
    const unsystematicRisk = std * 0.4;
    const totalRisk = std;
    const sharpe = totalRisk > 0 ? riskPremium / totalRisk : 0;
    const treynor = systematicRisk > 0 ? riskPremium / systematicRisk : 0;
    return [
      { label: 'Risk Premium', value: riskPremium.toFixed(2), color: riskPremium > 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Systematic Risk', value: systematicRisk.toFixed(2), color: 'text-yellow-400' },
      { label: 'Unsystematic', value: unsystematicRisk.toFixed(2), color: 'text-foreground' },
      { label: 'Sharpe', value: sharpe.toFixed(3), color: sharpe > 0.5 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 5) return [];
    const n = pnls.length;
    const meanReturn = pnls.reduce((a, b) => a + b, 0) / n;
    const rf = 0;
    const riskPremium = meanReturn - rf;
    const std = Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - meanReturn, 2), 0) / (n - 1));
    return [
      { name: 'Risk-Free', value: rf },
      { name: 'Risk Premium', value: riskPremium },
      { name: 'Total Return', value: meanReturn },
    ];
  };

  return (
    <QuantPage
      title="Fama Decomposition"
      subtitle="Décomposition du rendement: risk-free + risk premium + alpha"
      icon={Layers3}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Décomposition du rendement', refLine: 0 }}
      aiPrompt="Analyse la décomposition de Fama. Le rendement total = risk-free + risk premium. Le risk premium récompense la prise de risque systématique. L'alpha (non montré) est ce qui reste après. Si le risk premium est négatif, la stratégie ne récompense même pas le risque pris. Le ratio systematic/unsystematic montre la part diversifiable du risque."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Fama</strong>: R = Rf + Risk Premium + Alpha</p>
        <p>Le risque systématique n'est pas diversifiable; le non-systématique peut l'être.</p>
      </div>
    </QuantPage>
  );
}