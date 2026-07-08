import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Flame, Thermometer, Brain, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function PortfolioHeat() {
  const [positions, setPositions] = useState([
    { symbol: 'NQ1!', direction: 'LONG', entry: 18500, stop: 18450, risk: 1, units: 1 },
    { symbol: 'ES1!', direction: 'SHORT', entry: 5200, stop: 5220, risk: 0.5, units: 1 },
  ]);
  const [accountSize, setAccountSize] = useState(100000);
  const [maxHeat, setMaxHeat] = useState(3);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const portfolio = useMemo(() => {
    const totalRisk = positions.reduce((sum, p) => {
      const riskAmount = p.direction === 'LONG'
        ? Math.abs(p.entry - p.stop) * p.units
        : Math.abs(p.entry - p.stop) * p.units;
      return sum + (riskAmount > 0 ? p.risk : 0);
    }, 0);

    const totalRiskPct = (totalRisk / accountSize) * 100;
    const longRisk = positions.filter(p => p.direction === 'LONG').reduce((s, p) => s + p.risk, 0);
    const shortRisk = positions.filter(p => p.direction === 'SHORT').reduce((s, p) => s + p.risk, 0);
    const directionalBias = longRisk - shortRisk;
    const netExposure = ((longRisk - shortRisk) / Math.max(totalRisk, 0.01) * 100);
    const heatLevel = totalRiskPct / maxHeat * 100;
    const status = heatLevel > 100 ? 'CRITICAL' : heatLevel > 75 ? 'WARNING' : 'SAFE';
    const remainingRisk = Math.max(0, maxHeat - totalRiskPct);

    const symbolRisk = {};
    positions.forEach(p => {
      symbolRisk[p.symbol] = (symbolRisk[p.symbol] || 0) + p.risk;
    });
    const concentrationRisk = Object.entries(symbolRisk).map(([sym, risk]) => ({ symbol: sym, risk, pct: totalRisk > 0 ? (risk / totalRisk) * 100 : 0 }));

    return { totalRisk, totalRiskPct, longRisk, shortRisk, directionalBias, netExposure, heatLevel, status, remainingRisk, concentrationRisk };
  }, [positions, accountSize, maxHeat]);

  const addPosition = () => setPositions([...positions, { symbol: 'NEW', direction: 'LONG', entry: 100, stop: 98, risk: 0.5, units: 1 }]);
  const removePosition = (i) => setPositions(positions.filter((_, idx) => idx !== i));
  const updatePosition = (i, field, value) => setPositions(positions.map((p, idx) => idx === i ? { ...p, [field]: value } : p));

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse Portfolio Heat: Risk total=${portfolio.totalRiskPct.toFixed(2)}% sur ${accountSize}, Max autorisé=${maxHeat}%, Status=${portfolio.status}. Positions: ${positions.map(p => `${p.symbol} ${p.direction} risk=${p.risk}%`).join(', ')}. Bias directionnel=${portfolio.netExposure.toFixed(0)}%. Concentration: ${portfolio.concentrationRisk.map(c => `${c.symbol}=${c.pct.toFixed(0)}%`).join(', ')}. Donne: 1) Évaluation du risque global, 2) Déséquilibres, 3) Recommandations de hedging/réduction. Court.`,
        response_json_schema: { type: 'object', properties: { risk_assessment: { type: 'string' }, imbalances: { type: 'string' }, recommendations: { type: 'string' } } }
      });
      setAiAnalysis(res);
    } catch (e) { setAiAnalysis({ risk_assessment: 'Erreur', imbalances: '', recommendations: '' }); }
    setAiLoading(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Flame className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Portfolio Heat</h1>
          <p className="text-sm text-muted-foreground">Exposition au risque multi-positions en temps réel</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={`card-trading ${portfolio.status === 'CRITICAL' ? 'glow-red' : portfolio.status === 'WARNING' ? 'glow-blue' : 'glow-green'}`}>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-1">Heat Total</div>
            <div className={`text-3xl font-mono font-bold ${portfolio.heatLevel > 100 ? 'text-danger-red' : portfolio.heatLevel > 75 ? 'text-warning-yellow' : 'text-primary'}`}>{portfolio.totalRiskPct.toFixed(2)}%</div>
            <div className="text-xs text-muted-foreground mt-1">/ {maxHeat}% max</div>
          </CardContent>
        </Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Long Risk</div><div className="text-2xl font-mono font-bold text-primary">{portfolio.longRisk.toFixed(2)}%</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Short Risk</div><div className="text-2xl font-mono font-bold text-danger-red">{portfolio.shortRisk.toFixed(2)}%</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Net Exposure</div><div className={`text-2xl font-mono font-bold ${portfolio.netExposure > 50 ? 'text-primary' : portfolio.netExposure < -50 ? 'text-danger-red' : 'text-warning-yellow'}`}>{portfolio.netExposure.toFixed(0)}%</div></CardContent></Card>
      </div>

      <Card className="card-trading">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3 mb-2">
            <Thermometer className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold">Heat Level: {portfolio.heatLevel.toFixed(0)}%</span>
            <span className={`text-xs px-2 py-1 rounded ${portfolio.status === 'CRITICAL' ? 'bg-danger-red/20 text-danger-red' : portfolio.status === 'WARNING' ? 'bg-warning-yellow/20 text-warning-yellow' : 'bg-primary/20 text-primary'}`}>{portfolio.status}</span>
          </div>
          <div className="progress-bar" style={{ height: '12px' }}>
            <div className="progress-bar-fill" style={{ width: `${Math.min(portfolio.heatLevel, 100)}%`, background: portfolio.heatLevel > 100 ? '#EF4444' : portfolio.heatLevel > 75 ? '#F59E0B' : '#00FF88' }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>0%</span><span>Max: {maxHeat}%</span></div>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Positions ouvertes</CardTitle>
            <Button size="sm" variant="outline" onClick={addPosition}><Plus className="w-4 h-4" /> Ajouter</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {positions.map((p, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap bg-secondary/50 p-3 rounded-md">
                <Input className="w-24" placeholder="Symbol" value={p.symbol} onChange={e => updatePosition(i, 'symbol', e.target.value)} />
                <select className="h-9 bg-secondary border border-border rounded-md px-2 text-sm" value={p.direction} onChange={e => updatePosition(i, 'direction', e.target.value)}>
                  <option value="LONG">LONG</option>
                  <option value="SHORT">SHORT</option>
                </select>
                <div className="flex-1 min-w-[80px]"><Input type="number" placeholder="Entry" value={p.entry} onChange={e => updatePosition(i, 'entry', +e.target.value)} /></div>
                <div className="flex-1 min-w-[80px]"><Input type="number" placeholder="Stop" value={p.stop} onChange={e => updatePosition(i, 'stop', +e.target.value)} /></div>
                <div className="flex-1 min-w-[60px]"><Input type="number" step="0.1" placeholder="Risk %" value={p.risk} onChange={e => updatePosition(i, 'risk', +e.target.value)} /></div>
                <Button size="icon" variant="ghost" onClick={() => removePosition(i)}><Trash2 className="w-4 h-4 text-danger-red" /></Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Concentration Risk</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {portfolio.concentrationRisk.map(c => (
              <div key={c.symbol} className="flex items-center gap-3">
                <span className="font-mono text-sm w-20">{c.symbol}</span>
                <div className="flex-1 progress-bar"><div className="progress-bar-fill" style={{ width: `${c.pct}%`, background: c.pct > 50 ? '#EF4444' : '#00FF88' }} /></div>
                <span className="font-mono text-sm w-12 text-right">{c.pct.toFixed(0)}%</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 items-center">
              <Label className="whitespace-nowrap">Capital</Label>
              <Input type="number" value={accountSize} onChange={e => setAccountSize(+e.target.value)} />
              <Label className="whitespace-nowrap">Max %</Label>
              <Input type="number" step="0.1" value={maxHeat} onChange={e => setMaxHeat(+e.target.value)} />
            </div>
            <Button onClick={runAI} disabled={aiLoading} className="w-full">
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              Analyser le risque
            </Button>
            {aiAnalysis && (
              <div className="space-y-2 text-xs">
                <div><span className="text-primary font-bold">Évaluation:</span> {aiAnalysis.risk_assessment}</div>
                <div><span className="text-primary font-bold">Déséquilibres:</span> {aiAnalysis.imbalances}</div>
                <div><span className="text-primary font-bold">Recommandations:</span> {aiAnalysis.recommendations}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}