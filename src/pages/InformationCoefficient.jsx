import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { GitCompare } from 'lucide-react';

export default function InformationCoefficient() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null && t.risk_reward != null);
    if (closed.length < 5) return [{ label: 'IC', value: 'N/A' }];
    const rr = closed.map(t => t.risk_reward || 0);
    const pnls = closed.map(t => t.pnl || 0);
    const n = closed.length;
    const meanRR = rr.reduce((a, b) => a + b, 0) / n;
    const meanPnl = pnls.reduce((a, b) => a + b, 0) / n;
    let num = 0, denRR = 0, denPnl = 0;
    for (let i = 0; i < n; i++) {
      num += (rr[i] - meanRR) * (pnls[i] - meanPnl);
      denRR += Math.pow(rr[i] - meanRR, 2);
      denPnl += Math.pow(pnls[i] - meanPnl, 2);
    }
    const ic = denRR > 0 && denPnl > 0 ? num / Math.sqrt(denRR * denPnl) : 0;
    const breadth = Math.sqrt(n);
    const ir = ic * breadth;
    return [
      { label: 'IC', value: ic.toFixed(3), color: Math.abs(ic) > 0.1 ? 'text-primary' : 'text-yellow-400' },
      { label: 'IR (IC×√B)', value: ir.toFixed(3), color: Math.abs(ir) > 0.5 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Breadth', value: breadth.toFixed(1), color: 'text-foreground' },
      { label: 'Correlation', value: ic > 0 ? 'Positive' : 'Négative', color: ic > 0 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null && t.risk_reward != null);
    return closed.slice(-30).map((t, i) => ({
      name: `T${i + 1}`,
      R: t.risk_reward || 0,
      PnL: t.pnl || 0,
    }));
  };

  return (
    <QuantPage
      title="Information Coefficient (IC)"
      subtitle="Corrélation entre prévision (R:R) et résultat réel (PnL)"
      icon={GitCompare}
      metrics={metrics}
      chartData={chartData}
      chartType="line"
      chartConfig={{ title: 'R:R prévu vs PnL réel' }}
      dataKey="R"
      aiPrompt="Analyse l'Information Coefficient. L'IC mesure la qualité prédictive: corrélation entre le R:R planifié et le PnL réalisé. IC > 0.1 = bonne prévision. > 0.3 = excellente. < 0 = les prévisions sont inversées (anti-skill). L'IR = IC × √(breadth) suit la loi fondamentale de Grinold: plus de trades + meilleur IC = meilleur alpha."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed' && t.risk_reward != null).slice(-30).map(t => ({ pnl: t.pnl, risk_reward: t.risk_reward, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">IC</strong> = corr(R:R prévu, PnL réel) — qualité prédictive</p>
        <p><strong className="text-foreground">Loi de Grinold</strong>: IR = IC × √(Breadth) — plus de prévisions + meilleur IC = meilleur alpha</p>
      </div>
    </QuantPage>
  );
}