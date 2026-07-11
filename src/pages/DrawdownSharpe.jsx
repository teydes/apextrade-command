import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Activity } from 'lucide-react';

export default function DrawdownSharpe() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const pnls = closed.map(t => t.pnl);
    if (pnls.length < 10) return [{ label: 'DD Sharpe', value: 'N/A' }];
    let cumul = 0, peak = 0, ddPeriods = [];
    let inDD = false, ddPnls = [];
    for (const p of pnls) {
      cumul += p;
      if (cumul > peak) {
        if (inDD) { ddPeriods.push([...ddPnls]); ddPnls = []; inDD = false; }
        peak = cumul;
      } else {
        inDD = true;
        ddPnls.push(p);
      }
    }
    if (inDD && ddPnls.length > 0) ddPeriods.push([...ddPnls]);
    if (ddPeriods.length === 0) return [
      { label: 'DD Sharpe', value: 'N/A (pas de DD)', color: 'text-primary' },
      { label: 'DD Periods', value: '0', color: 'text-primary' },
    ];
    const ddSharpes = ddPeriods.map(period => {
      if (period.length < 2) return 0;
      const mean = period.reduce((a, b) => a + b, 0) / period.length;
      const std = Math.sqrt(period.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (period.length - 1));
      return std > 0 ? mean / std : 0;
    });
    const avgDDSharpe = ddSharpes.reduce((a, b) => a + b, 0) / ddSharpes.length;
    const worstDDSharpe = Math.min(...ddSharpes);
    return [
      { label: 'Avg DD Sharpe', value: avgDDSharpe.toFixed(3), color: avgDDSharpe > -0.5 ? 'text-primary' : 'text-red-400' },
      { label: 'Worst DD Sharpe', value: worstDDSharpe.toFixed(3), color: 'text-red-400' },
      { label: 'DD Periods', value: ddPeriods.length.toString(), color: 'text-foreground' },
      { label: 'Avg DD Length', value: (ddPeriods.reduce((s, p) => s + p.length, 0) / ddPeriods.length).toFixed(0), color: 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    let cumul = 0, peak = 0;
    return closed.slice(-60).map((t, i) => {
      cumul += t.pnl || 0;
      if (cumul > peak) peak = cumul;
      return { name: `T${i + 1}`, value: peak - cumul };
    });
  };

  return (
    <QuantPage
      title="Drawdown Sharpe Ratio"
      subtitle="Sharpe ratio calculé uniquement pendant les périodes de drawdown"
      icon={Activity}
      metrics={metrics}
      chartData={chartData}
      chartType="area"
      chartConfig={{ title: 'Périodes de drawdown' }}
      aiPrompt="Analyse le drawdown Sharpe. Il mesure la performance pendant les périodes de perte. Un DD Sharpe proche de 0 = les pertes sont contrôlées. Très négatif = les drawdowns s'aggravent. Ce ratio révèle comment la stratégie se comporte dans les mauvaises périodes, ce que le Sharpe global masque."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">DD Sharpe</strong> = mean / std des PnL pendant les drawdowns uniquement</p>
        <p>Le Sharpe pendant les drawdowns révèle la qualité du risk management en période difficile.</p>
      </div>
    </QuantPage>
  );
}