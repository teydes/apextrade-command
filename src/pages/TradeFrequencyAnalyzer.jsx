import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Activity } from 'lucide-react';

export default function TradeFrequencyAnalyzer() {
  const metrics = (trades) => {
    if (!trades.length) return [];
    const byDay = {};
    trades.forEach(t => {
      try {
        const day = new Date(t.entry_time || t.created_date).toDateString();
        byDay[day] = (byDay[day] || 0) + 1;
      } catch {}
    });
    const days = Object.values(byDay);
    const avgPerDay = days.length ? days.reduce((a,b)=>a+b,0)/days.length : 0;
    const maxPerDay = Math.max(...days, 0);
    const overtradeDays = days.filter(d => d > 5).length;
    const consistency = days.length ? (1 - days.filter(d => Math.abs(d - avgPerDay) > avgPerDay).length / days.length) : 0;
    return [
      { label: 'Avg Trades/Day', value: avgPerDay.toFixed(1), color: avgPerDay > 5 ? 'text-destructive' : 'text-primary' },
      { label: 'Max Trades/Day', value: maxPerDay, color: maxPerDay > 8 ? 'text-destructive' : 'text-yellow-400' },
      { label: 'Overtrade Days', value: overtradeDays, color: overtradeDays > 3 ? 'text-destructive' : 'text-primary' },
      { label: 'Consistency', value: `${(consistency*100).toFixed(0)}%`, color: consistency > 0.7 ? 'text-primary' : 'text-yellow-400' },
    ];
  };

  const chartData = (trades) => {
    const byDay = {};
    trades.forEach(t => {
      try {
        const day = new Date(t.entry_time || t.created_date).toLocaleDateString('en', { month: 'short', day: 'numeric' });
        byDay[day] = (byDay[day] || 0) + 1;
      } catch {}
    });
    return Object.entries(byDay).slice(-20).map(([name, value]) => ({ name, value }));
  };

  const aiPrompt = "Analyse la fréquence de trading et détecte l'overtrading. Évalue la régularité du nombre de trades par jour. Identifie les jours d'overtrading et leur corrélation avec la performance. Recommande un nombre optimal de trades par jour.";

  return (
    <QuantPage
      title="Trade Frequency Analyzer"
      subtitle="Fréquence de trading, détection d'overtrading"
      icon={Activity}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Trades par Jour', refLine: 5 }}
      aiPrompt={aiPrompt}
      aiContext={(trades) => JSON.stringify({ totalTrades: trades.length, days: [...new Set(trades.map(t=>t.entry_time?.split('T')[0]))].length })}
    />
  );
}