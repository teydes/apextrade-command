import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Waves } from 'lucide-react';

export default function VolatilitySurface() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.pnl != null);
    if (!closed.length) return [];
    const byAsset = {};
    closed.forEach(t => {
      const key = t.asset_class || 'unknown';
      if (!byAsset[key]) byAsset[key] = [];
      byAsset[key].push(t.pnl);
    });
    const vols = Object.entries(byAsset).map(([k, v]) => {
      const mean = v.reduce((a,b)=>a+b,0)/v.length;
      const std = Math.sqrt(v.reduce((a,b)=>a+(b-mean)**2,0)/v.length);
      return { asset: k, vol: std, count: v.length };
    });
    const avgVol = vols.reduce((a,v)=>a+v.vol,0)/vols.length;
    const maxVol = Math.max(...vols.map(v=>v.vol));
    const minVol = Math.min(...vols.map(v=>v.vol));
    const volDispersion = avgVol ? (maxVol - minVol) / avgVol : 0;
    return [
      { label: 'Avg Volatility', value: avgVol.toFixed(1), color: 'text-blue-400' },
      { label: 'Max Vol Asset', value: vols.find(v=>v.vol===maxVol)?.asset || '-', color: 'text-destructive' },
      { label: 'Min Vol Asset', value: vols.find(v=>v.vol===minVol)?.asset || '-', color: 'text-primary' },
      { label: 'Dispersion', value: volDispersion.toFixed(2), color: volDispersion > 1 ? 'text-yellow-400' : 'text-muted-foreground' },
    ];
  };

  const chartData = (trades) => {
    const byAsset = {};
    trades.filter(t => t.pnl != null).forEach(t => {
      const key = t.asset_class || 'unknown';
      if (!byAsset[key]) byAsset[key] = [];
      byAsset[key].push(t.pnl);
    });
    return Object.entries(byAsset).map(([name, v]) => {
      const mean = v.reduce((a,b)=>a+b,0)/v.length;
      const std = Math.sqrt(v.reduce((a,b)=>a+(b-mean)**2,0)/v.length);
      return { name, value: std };
    });
  };

  const aiPrompt = "Analyse la surface de volatilité par classe d'actifs. Identifie les actifs les plus/moins volatils. Évalue la dispersion de volatilité et recommande une allocation optimale pour exploiter les différences de volatilité entre actifs.";

  return (
    <QuantPage
      title="Volatility Surface"
      subtitle="Volatilité par classe d'actifs, surface de risque"
      icon={Waves}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Volatilité par Asset Class' }}
      aiPrompt={aiPrompt}
      aiContext={(trades) => JSON.stringify(trades.filter(t=>t.pnl!=null).map(t=>({asset:t.asset_class,pnl:t.pnl})).slice(0,50))}
    />
  );
}