import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Compass, Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TIMEFRAMES = ['Daily', 'H4', 'H1', 'M15'];
const INSTRUMENTS = ['NQ1!', 'ES1!', 'DXY', 'VIX'];

const BIAS_OPTIONS = [
  { val: 'bullish', label: '↑ Bullish', color: 'border-primary/50 bg-primary/10 text-primary' },
  { val: 'bearish', label: '↓ Bearish', color: 'border-destructive/50 bg-destructive/10 text-destructive' },
  { val: 'neutral', label: '→ Neutre', color: 'border-yellow-400/50 bg-yellow-400/10 text-yellow-400' },
];

export default function MarketBias() {
  const [biases, setBiases] = useState({ 'NQ1!': { Daily: 'bullish', H4: 'bullish', H1: 'neutral', M15: '' } });
  const [aiSummary, setAiSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeInstr, setActiveInstr] = useState('NQ1!');

  const setBias = (tf, val) => setBiases(p => ({ ...p, [activeInstr]: { ...p[activeInstr], [tf]: val } }));
  const getBias = (tf) => biases[activeInstr]?.[tf] || '';

  const analyzeWithAI = async () => {
    setLoading(true);
    const allBiases = Object.entries(biases).map(([instr, tfs]) =>
      `${instr}: ${Object.entries(tfs).map(([tf, b]) => `${tf}=${b||'N/A'}`).join(', ')}`
    ).join(' | ');

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un analyste ICT/SMC sur NQ Futures. Analyse ces biais multi-timeframe et donne une recommandation de trade pour aujourd'hui.

Biais identifiés: ${allBiases}

Heure actuelle: ${new Date().toLocaleTimeString('fr-FR')} (Paris)

Retourne UNIQUEMENT JSON sans markdown:
{
  "overall_bias": "bullish"|"bearish"|"neutral",
  "conviction": <0-100>,
  "direction": "LONG"|"SHORT"|"WAIT",
  "reasoning": "<explication 2 phrases>",
  "key_levels": "<niveaux clés à surveiller>",
  "session_advice": "<conseil pour la prochaine session>"
}`,
      response_json_schema: {
        type: "object", properties: {
          overall_bias: { type: "string" }, conviction: { type: "number" },
          direction: { type: "string" }, reasoning: { type: "string" },
          key_levels: { type: "string" }, session_advice: { type: "string" }
        }
      }
    });
    setAiSummary(res);
    setLoading(false);
  };

  const biasIcon = (b) => b === 'bullish' ? TrendingUp : b === 'bearish' ? TrendingDown : Minus;
  const biasColor = (b) => b === 'bullish' ? 'text-primary' : b === 'bearish' ? 'text-destructive' : 'text-yellow-400';

  return (
    <div className="card-trading">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold">Biais de Marché</span>
        </div>
        <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={analyzeWithAI} disabled={loading}>
          <Zap className={`w-3 h-3 ${loading ? 'animate-spin text-primary' : ''}`} />
          IA
        </Button>
      </div>

      {/* Instrument tabs */}
      <div className="flex gap-1 mb-3">
        {INSTRUMENTS.map(i => (
          <button key={i} onClick={() => setActiveInstr(i)}
            className={`text-[10px] px-2 py-1 rounded transition-all ${activeInstr === i ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {i}
          </button>
        ))}
      </div>

      {/* TF grid */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {TIMEFRAMES.map(tf => {
          const b = getBias(tf);
          const BIcon = biasIcon(b);
          return (
            <div key={tf} className="text-center">
              <div className="text-[10px] text-muted-foreground mb-1">{tf}</div>
              <div className="flex flex-col gap-1">
                {BIAS_OPTIONS.map(opt => (
                  <button key={opt.val} onClick={() => setBias(tf, opt.val)}
                    className={`text-[9px] px-1 py-0.5 rounded border transition-all ${b === opt.val ? opt.color : 'border-border text-muted-foreground hover:text-foreground'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <div className={`p-2.5 rounded-lg border text-xs space-y-1.5 ${aiSummary.direction === 'LONG' ? 'border-primary/30 bg-primary/5' : aiSummary.direction === 'SHORT' ? 'border-destructive/30 bg-destructive/5' : 'border-yellow-400/30 bg-yellow-400/5'}`}>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-sm ${aiSummary.direction === 'LONG' ? 'text-primary' : aiSummary.direction === 'SHORT' ? 'text-destructive' : 'text-yellow-400'}`}>
              {aiSummary.direction}
            </span>
            <span className="text-muted-foreground">{aiSummary.conviction}% conviction</span>
          </div>
          <p className="text-muted-foreground">{aiSummary.reasoning}</p>
          <p className="text-[10px] text-muted-foreground/70">{aiSummary.session_advice}</p>
        </div>
      )}
    </div>
  );
}