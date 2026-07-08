import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Brain, Loader2, Check, X, Layers, GitMerge } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'];
const SYMBOLS = ['NQ1!', 'ES1!', 'EURUSD', 'GBPUSD', 'XAUUSD', 'BTCUSD', 'CL1!'];

export default function MFConfluence() {
  const [symbol, setSymbol] = useState('NQ1!');
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const confluenceData = useMemo(() => {
    return TIMEFRAMES.map(tf => {
      const bias = Math.random() > 0.5 ? 'bullish' : 'bearish';
      const strength = Math.floor(Math.random() * 40 + 50);
      const trend = Math.random() > 0.3 ? bias : (bias === 'bullish' ? 'bearish' : 'bullish');
      const momentum = Math.random() > 0.4 ? bias : 'neutral';
      const keyLevel = Math.random() > 0.5;
      const volume = Math.random() > 0.5 ? 'high' : 'normal';
      return { tf, bias, strength, trend, momentum, keyLevel, volume, confluence: strength > 70 ? 'high' : strength > 55 ? 'medium' : 'low' };
    });
  }, [symbol]);

  const bullishCount = confluenceData.filter(d => d.bias === 'bullish').length;
  const bearishCount = confluenceData.filter(d => d.bias === 'bearish').length;
  const overallBias = bullishCount > bearishCount ? 'BULLISH' : bearishCount > bullishCount ? 'BEARISH' : 'NEUTRAL';
  const confluenceScore = Math.round((Math.max(bullishCount, bearishCount) / TIMEFRAMES.length) * 100);

  const runAI = async () => {
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse Multi-Timeframe Confluence pour ${symbol}. Biais par TF: ${confluenceData.map(d => `${d.tf}=${d.bias}(${d.strength}%)`).join(', ')}. Overall: ${overallBias} (${confluenceScore}%). Donne: 1) Niveau de confluence, 2) Setup recommandé (direction, entry TF, confirmation), 3) Risques de fakeout. Sois précis et technique.`,
        response_json_schema: { type: 'object', properties: { confluence_level: { type: 'string' }, recommended_setup: { type: 'string' }, fakeout_risks: { type: 'string' } } }
      });
      setAiResult(res);
    } catch (e) { setAiResult({ confluence_level: 'Erreur', recommended_setup: '', fakeout_risks: '' }); }
    setLoading(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Layers className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Multi-Timeframe Confluence</h1>
          <p className="text-sm text-muted-foreground">Alignement des biais sur tous les timeframes</p>
        </div>
      </div>

      <Card className="card-trading">
        <CardContent className="py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{SYMBOLS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Biais global:</span>
              <span className={`text-xl font-mono font-bold ${overallBias === 'BULLISH' ? 'text-primary' : overallBias === 'BEARISH' ? 'text-danger-red' : 'text-warning-yellow'}`}>{overallBias}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Score confluence:</span>
              <span className="text-xl font-mono font-bold text-accent">{confluenceScore}%</span>
            </div>
            <Button onClick={runAI} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              Analyse IA
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {confluenceData.map(d => (
          <Card key={d.tf} className="card-trading">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-mono font-bold text-accent">{d.tf}</span>
                <span className={`text-xs px-2 py-1 rounded ${d.bias === 'bullish' ? 'bg-primary/20 text-primary' : 'bg-danger-red/20 text-danger-red'}`}>{d.bias.toUpperCase()}</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Trend</span><span className={d.trend === 'bullish' ? 'text-primary' : d.trend === 'bearish' ? 'text-danger-red' : 'text-warning-yellow'}>{d.trend}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Momentum</span><span className={d.momentum === 'bullish' ? 'text-primary' : d.momentum === 'bearish' ? 'text-danger-red' : 'text-warning-yellow'}>{d.momentum}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Key Level</span>{d.keyLevel ? <Check className="w-3 h-3 text-primary" /> : <X className="w-3 h-3 text-muted-foreground" />}</div>
                <div className="flex justify-between"><span className="text-muted-foreground">Volume</span><span className={d.volume === 'high' ? 'text-primary' : 'text-muted-foreground'}>{d.volume}</span></div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1"><span>Force</span><span className="font-mono">{d.strength}%</span></div>
                <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${d.strength}%`, background: d.bias === 'bullish' ? '#00FF88' : '#EF4444' }} /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {aiResult && (
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><GitMerge className="w-4 h-4 text-primary" /> Analyse Confluence IA</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><span className="text-primary font-bold">Niveau de confluence:</span> {aiResult.confluence_level}</div>
            <div><span className="text-primary font-bold">Setup recommandé:</span> {aiResult.recommended_setup}</div>
            <div><span className="text-primary font-bold">Risques fakeout:</span> {aiResult.fakeout_risks}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}