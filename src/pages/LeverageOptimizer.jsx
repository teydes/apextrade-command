import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Layers } from 'lucide-react';

export default function LeverageOptimizer() {
  const metrics = (trades) => {
    const pnls = trades.filter(t => t.pnl != null).map(t => t.pnl);
    if (!pnls.length) return [];
    const mean = pnls.reduce((a,b)=>a+b,0) / pnls.length;
    const std = Math.sqrt(pnls.reduce((a,b)=>a+(b-mean)**2,0) / pnls.length);
    const winRate = pnls.filter(p=>p>0).length / pnls.length;
    const kelly = winRate > 0 && std ? (winRate * mean - (1-winRate) * std) / (std*std) * 100 : 0;
    const optimalLev = kelly > 0 ? Math.min(kelly / 10, 10) : 0;
    const conservative = optimalLev * 0.5;
    const aggressive = optimalLev * 1.5;
    return [
      { label: 'Kelly %', value: `${kelly.toFixed(1)}%`, color: kelly > 0 ? 'text-primary' : 'text-destructive' },
      { label: 'Lev. Optimale', value: `${optimalLev.toFixed(1)}x`, color: 'text-blue-400' },
      { label: 'Conservateur', value: `${conservative.toFixed(1)}x`, color: 'text-yellow-400' },
      { label: 'Agressif', value: `${aggressive.toFixed(1)}x`, color: 'text-destructive' },
    ];
  };

  const chartData = (trades) => {
    const pnls = trades.filter(t => t.pnl != null).map(t => t.pnl);
    if (!pnls.length) return [];
    const mean = pnls.reduce((a,b)=>a+b,0) / pnls.length;
    const std = Math.sqrt(pnls.reduce((a,b)=>a+(b-mean)**2,0) / pnls.length);
    const leverages = [1, 2, 3, 5, 7, 10, 15, 20];
    return leverages.map(lev => {
      const expReturn = mean * lev;
      const expRisk = std * lev;
      const riskAdj = expRisk ? expReturn / expRisk : 0;
      return { name: `${lev}x`, value: riskAdj };
    });
  };

  const aiPrompt = "Analyse le levier optimal basé sur le critère de Kelly et le ratio rendement/risque. Évalue le risque de ruine à différents niveaux de levier. Recommande un levier optimal qui maximise la croissance tout en limitant le risque de blown account.";

  return (
    <QuantPage
      title="Leverage Optimizer"
      subtitle="Levier optimal basé sur Kelly et rendement ajusté au risque"
      icon={Layers}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Rendement Ajusté par Levier' }}
      aiPrompt={aiPrompt}
      aiContext={(trades) => JSON.stringify({ pnls: trades.filter(t=>t.pnl!=null).map(t=>t.pnl).slice(-50) })}
    />
  );
}