import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, Sparkles, GitBranch } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const FIB_LEVELS = [
  { label: '0%', mult: 0 },
  { label: '23.6%', mult: 0.236 },
  { label: '38.2%', mult: 0.382 },
  { label: '50%', mult: 0.5 },
  { label: '61.8%', mult: 0.618 },
  { label: '78.6%', mult: 0.786 },
  { label: '88.6%', mult: 0.886 },
  { label: '100%', mult: 1 },
  { label: '127.2%', mult: 1.272 },
  { label: '141.4%', mult: 1.414 },
  { label: '161.8%', mult: 1.618 },
  { label: '200%', mult: 2 },
  { label: '261.8%', mult: 2.618 },
  { label: '361.8%', mult: 3.618 },
];

const EXT_LEVELS = [
  { label: 'Ext 127.2%', mult: 1.272 },
  { label: 'Ext 161.8%', mult: 1.618 },
  { label: 'Ext 200%', mult: 2 },
  { label: 'Ext 261.8%', mult: 2.618 },
];

export default function FibCalculator() {
  const [swingHigh, setSwingHigh] = useState(18600);
  const [swingLow, setSwingLow] = useState(18400);
  const [direction, setDirection] = useState('down');
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const levels = useMemo(() => {
    const range = swingHigh - swingLow;
    if (range === 0) return [];
    return FIB_LEVELS.map(f => {
      const price = direction === 'down'
        ? swingHigh - range * f.mult
        : swingLow + range * f.mult;
      return { ...f, price, isKey: ['38.2%', '50%', '61.8%', '78.6%'].includes(f.label) };
    });
  }, [swingHigh, swingLow, direction]);

  const extensions = useMemo(() => {
    const range = swingHigh - swingLow;
    if (range === 0) return [];
    return EXT_LEVELS.map(e => {
      const price = direction === 'down'
        ? swingLow - range * (e.mult - 1)
        : swingHigh + range * (e.mult - 1);
      return { ...e, price };
    });
  }, [swingHigh, swingLow, direction]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const keyLevels = levels.filter(l => l.isKey).map(l => `${l.label}=${l.price.toFixed(1)}`).join(', ');
      const extLevels = extensions.map(e => `${e.label}=${e.price.toFixed(1)}`).join(', ');
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse Fibonacci: Swing High=${swingHigh}, Swing Low=${swingLow}, Direction=${direction === 'down' ? 'Retracement baissier' : 'Retracement haussier'}. Niveaux clés: ${keyLevels}. Extensions: ${extLevels}. Analyse: 1) Zone de confluence fibonacci clé, 2) Niveau de reversal probable, 3) Stratégie d'entrée (pullback vs breakout). Court.`,
        response_json_schema: { type: 'object', properties: { confluence_zone: { type: 'string' }, reversal_level: { type: 'string' }, entry_strategy: { type: 'string' } } }
      });
      setAiAnalysis(res);
    } catch (e) { setAiAnalysis({ confluence_zone: 'Erreur', reversal_level: '', entry_strategy: '' }); }
    setAiLoading(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <GitBranch className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Fibonacci Calculator</h1>
          <p className="text-sm text-muted-foreground">Retracements et extensions Fibonacci avec confluence detection</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Setup</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Swing High</Label><Input type="number" value={swingHigh} onChange={e => setSwingHigh(+e.target.value)} /></div>
            <div><Label>Swing Low</Label><Input type="number" value={swingLow} onChange={e => setSwingLow(+e.target.value)} /></div>
            <div>
              <Label>Direction du retracement</Label>
              <select className="w-full h-9 bg-secondary border border-border rounded-md px-2 text-sm" value={direction} onChange={e => setDirection(e.target.value)}>
                <option value="down">Baissier (de High vers Low)</option>
                <option value="up">Haussier (de Low vers High)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="card-trading md:col-span-2">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Niveaux de Retracement</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {levels.map(l => (
                <div key={l.label} className={`flex items-center justify-between p-2 rounded ${l.isKey ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/50'}`}>
                  <span className={`font-mono text-sm ${l.isKey ? 'text-primary font-bold' : 'text-muted-foreground'}`}>{l.label}</span>
                  <span className="font-mono text-sm">{l.price.toFixed(1)}</span>
                  {l.label === '61.8%' && <span className="text-xs text-warning-yellow">Golden</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Extensions Fibonacci (Targets)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {extensions.map(e => (
              <div key={e.label} className="flex items-center justify-between p-2 rounded bg-accent/10 border border-accent/30">
                <span className="font-mono text-sm text-accent">{e.label}</span>
                <span className="font-mono text-sm">{e.price.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA Fibonacci</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            Détecter les confluences
          </Button>
          {aiAnalysis && (
            <div className="space-y-2 text-sm">
              <div><span className="text-primary font-bold">Zone de confluence:</span> {aiAnalysis.confluence_zone}</div>
              <div><span className="text-primary font-bold">Reversal probable:</span> {aiAnalysis.reversal_level}</div>
              <div><span className="text-primary font-bold">Stratégie:</span> {aiAnalysis.entry_strategy}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}