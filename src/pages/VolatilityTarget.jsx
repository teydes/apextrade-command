import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Thermometer } from 'lucide-react';

export default function VolatilityTarget() {
  const metrics = (trades) => {
    const pnls = trades.filter(t => t.pnl != null).map(t => t.pnl);
    if (!pnls.length) return [];
    const mean = pnls.reduce((a,b)=>a+b,0) / pnls.length;
    const std = Math.sqrt(pnls.reduce((a,b)=>a+(b-mean)**2,0) / pnls.length);
    const annualVol = std * Math.sqrt(252);
    const targetVol = 15;
    const currentVol = annualVol;
    const scale = currentVol ? targetVol / currentVol : 0;
    const targetRisk = scale * 1;
    const volAdjReturn = mean * scale;
    return [
      { label: 'Current Vol', value: `${currentVol.toFixed(1)}%`, color: currentVol > 30 ? 'text-destructive' : 'text-yellow-400' },
      { label: 'Target Vol', value: `${targetVol}%`, color: 'text-primary' },
      { label: 'Scale Factor', value: scale.toFixed(2), color: 'text-blue-400' },
      { label: 'Adj. Risk/Trade', value: `${targetRisk.toFixed(2)}%`, color: 'text-muted-foreground' },
    ];
  };

  const chartData = (trades) => {
    const windows = [];
    const pnls = trades.filter(t => t.pnl != null).map(t => t.pnl);
    for (let i = 0; i < pnls.length - 10; i += 10) {
      const window = pnls.slice(i, i + 10);
      const mean = window.reduce((a,b)=>a+b,0) / window.length;
      const vol = Math.sqrt(window.reduce((a,b)=>a+(b-mean)**2,0) / window.length);
      windows.push({ name: `W${windows.length+1}`, value: vol * Math.sqrt(252) });
    }
    return windows;
  };

  const aiPrompt = "Analyse le ciblage de volatilité (volatility targeting). Évalue si la volatilité actuelle est compatible avec la cible de 15%. Recommande un facteur d'échelle pour ajuster la taille des positions afin de maintenir une volatilité constante.";

  return (
    <QuantPage
      title="Volatility Target"
      subtitle="Ciblage de volatilité, sizing ajusté au risque"
      icon={Thermometer}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Volatilité par fenêtre', refLine: 15 }}
      aiPrompt={aiPrompt}
      aiContext={(trades) => JSON.stringify({ pnls: trades.filter(t=>t.pnl!=null).map(t=>t.pnl).slice(-50) })}
    />
  );
}