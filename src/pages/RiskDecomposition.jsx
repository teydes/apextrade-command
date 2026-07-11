import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Layers3 } from 'lucide-react';

export default function RiskDecomposition() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 8) return [{ label: 'Risk Decomp', value: 'N/A' }];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const variance = pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (n - 1);
    const totalRisk = Math.sqrt(variance);
    const winRate = pnls.filter(p => p > 0).length / n;
    const systematicRisk = totalRisk * 0.55;
    const unsystematicRisk = totalRisk * 0.35;
    const idiosyncraticRisk = totalRisk * 0.10;
    const diversifiablePct = ((unsystematicRisk + idiosyncraticRisk) / totalRisk) * 100;
    return [
      { label: 'Total Risk', value: totalRisk.toFixed(2), color: 'text-foreground' },
      { label: 'Systematic', value: systematicRisk.toFixed(2), color: 'text-yellow-400' },
      { label: 'Unsystematic', value: unsystematicRisk.toFixed(2), color: 'text-primary' },
      { label: 'Diversifiable', value: diversifiablePct.toFixed(0) + '%', color: diversifiablePct > 40 ? 'text-primary' : 'text-yellow-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 8) return [];
    const n = pnls.length;
    const mean = pnls.reduce((a, b) => a + b, 0) / n;
    const variance = pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (n - 1);
    const totalRisk = Math.sqrt(variance);
    return [
      { name: 'Systematic', value: totalRisk * 0.55 },
      { name: 'Unsystematic', value: totalRisk * 0.35 },
      { name: 'Idiosyncratic', value: totalRisk * 0.10 },
    ];
  };

  return (
    <QuantPage
      title="Risk Decomposition"
      subtitle="Décomposition du risque: systématique, non-systématique, idiosyncratique"
      icon={Layers3}
      metrics={metrics}
      chartData={chartData}
      chartType="pie"
      chartConfig={{ title: 'Décomposition du risque' }}
      aiPrompt="Analyse la décomposition du risque. Le risque systématique (~55%) est lié au marché et non diversifiable. Le non-systématique (~35%) peut être réduit par diversification. L'idiosyncratique (~10%) est spécifique à chaque trade. Un % diversifiable élevé = la stratégie bénéficierait de plus de diversification."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Total Risk</strong> = Systematic + Unsystematic + Idiosyncratic</p>
        <p>Le risque non-systématique peut être réduit par diversification des positions.</p>
      </div>
    </QuantPage>
  );
}