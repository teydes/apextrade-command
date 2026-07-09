import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Layers3 } from 'lucide-react';

export default function RiskLadder() {
  const metrics = (trades) => {
    const pnls = trades.filter(t => t.pnl != null).map(t => t.pnl);
    if (!pnls.length) return [];
    const totalReturn = pnls.reduce((a,b)=>a+b,0);
    const tiers = [
      { name: 'Tier 1 (1%)', risk: 0.01, return: totalReturn * 0.3 },
      { name: 'Tier 2 (2%)', risk: 0.02, return: totalReturn * 0.5 },
      { name: 'Tier 3 (3%)', risk: 0.03, return: totalReturn * 0.2 },
    ];
    const optimalTier = totalReturn > 0 ? tiers[1] : tiers[0];
    const riskAdjReturn = totalReturn / (tiers[1].risk * 100);
    return [
      { label: 'Total Return', value: `${totalReturn.toFixed(0)}€`, color: totalReturn >= 0 ? 'text-primary' : 'text-destructive' },
      { label: 'Optimal Tier', value: '2%', color: 'text-blue-400' },
      { label: 'Risk-Adj Return', value: riskAdjReturn.toFixed(1), color: 'text-yellow-400' },
      { label: 'Ladder Efficiency', value: `${(riskAdjReturn * 10).toFixed(0)}%`, color: 'text-muted-foreground' },
    ];
  };

  const chartData = (trades) => {
    const riskLevels = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];
    const pnls = trades.filter(t => t.pnl != null).map(t => t.pnl);
    const totalPnL = pnls.reduce((a,b)=>a+b,0);
    return riskLevels.map(r => ({
      name: `${r}%`,
      value: totalPnL * (r / 2),
    }));
  };

  const aiPrompt = "Analyse l'échelle de risque progressive (risk ladder). Évalue l'allocation optimale du risque entre les différents niveaux. Recommande une stratégie de progression du risque qui maximise le rendement tout en protégeant le capital.";

  return (
    <QuantPage
      title="Risk Ladder"
      subtitle="Allocation progressive du risque, tiers de sizing"
      icon={Layers3}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Return par Niveau de Risque' }}
      aiPrompt={aiPrompt}
      aiContext={(trades) => JSON.stringify({ totalTrades: trades.length, pnls: trades.filter(t=>t.pnl!=null).map(t=>t.pnl).slice(-30) })}
    />
  );
}