import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Crosshair, Zap, CheckCircle2, Save, RotateCcw, Brain, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const SETUPS = ['ICT/SMC', 'AMD/IFVG', 'Footprint', 'Order Book', 'Pullback', 'Breakout', 'Range', 'Scalping'];
const SESSIONS = ['London', 'New York', 'Asian', 'Pre-Market', 'Overlap London-NY'];
const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'];
const PATTERNS = ['OB', 'FVG', 'IFVG', 'BOS', 'CHoCH', 'EQH', 'EQL', 'Liquidity Sweep', 'AMD', 'POC Retest', 'Delta+', 'Delta-'];

const CHECKLIST_ITEMS = [
  { id: 'bias', label: 'Biais de marché aligné (HTF → LTF)' },
  { id: 'session', label: 'Dans une Kill Zone (London / NY Open)' },
  { id: 'liquidity', label: 'Zone de liquidité identifiée' },
  { id: 'confluence', label: '≥ 2 confluences techniques' },
  { id: 'rr', label: 'R:R ≥ 2:1 calculé' },
  { id: 'news', label: 'Aucune news haute impact dans les 5 min' },
  { id: 'sl', label: 'Stop Loss structurel placé' },
  { id: 'dd', label: 'DD journalier < 60%' },
];

const empty = {
  symbol: 'NQ1!', direction: 'LONG', phase: 'live',
  entry_price: '', exit_price: '', stop_loss: '', take_profit_1: '', take_profit_2: '',
  lot_size: 1, strategy: 'ICT/SMC', pattern: '', session: 'New York',
  timeframe: 'M5', setup: '', risk_reward: 2, news_impact: 'none',
  signal_source: 'manual', commission: 0, swap: 0, notes: '', pnl: '', result: 'win',
};

export default function TradeBuilder() {
  const [trade, setTrade] = useState(empty);
  const [checklist, setChecklist] = useState({});
  const [aiSetup, setAiSetup] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [selectedPatterns, setSelectedPatterns] = useState([]);
  const qc = useQueryClient();

  const { data: accounts = [] } = useQuery({ queryKey: ['builder-accounts'], queryFn: () => base44.entities.TradingAccount.list() });
  const liveAccount = accounts.find(a => a.phase === 'live' && a.status === 'active') || accounts[0];

  const saveTrade = useMutation({
    mutationFn: (d) => base44.entities.Trade.create({ ...d, account_id: liveAccount?.id, pattern: selectedPatterns.join(', ') }),
    onSuccess: () => {
      qc.invalidateQueries(['live-trades']);
      qc.invalidateQueries(['recent-trades-dash']);
      toast.success('Trade enregistré ✅');
      setTrade(empty);
      setChecklist({});
      setSelectedPatterns([]);
      setAiSetup(null);
    }
  });

  const checklistScore = Object.values(checklist).filter(Boolean).length;
  const checklistTotal = CHECKLIST_ITEMS.length;
  const readyToTrade = checklistScore >= 6;

  const analyzeSetup = async () => {
    if (!trade.entry_price || !trade.stop_loss) { toast.error('Renseignez entry + SL'); return; }
    setLoadingAI(true);
    const slPts = Math.abs(trade.entry_price - trade.stop_loss);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Coach ICT/SMC NQ Futures. Analyse ce setup pré-trade et valide ou invalide l'entrée.

Setup: ${trade.direction} ${trade.symbol} | Timeframe: ${trade.timeframe} | Session: ${trade.session}
Entry: ${trade.entry_price} | SL: ${trade.stop_loss} (${slPts}pts) | TP1: ${trade.take_profit_1 || '?'}
Stratégie: ${trade.strategy} | Patterns: ${selectedPatterns.join(', ') || 'non spécifiés'}
Checklist: ${checklistScore}/${checklistTotal} items validés
News Impact: ${trade.news_impact}

Retourne UNIQUEMENT JSON:
{
  "verdict": "EXECUTE"|"WAIT"|"SKIP",
  "confidence": <0-100>,
  "reason": "<raison principale>",
  "entry_quality": "optimal"|"acceptable"|"poor",
  "risk_note": "<note de risque>",
  "improvement": "<amélioration suggérée>"
}`,
      response_json_schema: {
        type: "object", properties: {
          verdict: { type: "string" }, confidence: { type: "number" }, reason: { type: "string" },
          entry_quality: { type: "string" }, risk_note: { type: "string" }, improvement: { type: "string" }
        }
      }
    });
    setAiSetup(res);
    setLoadingAI(false);
  };

  const set = (k, v) => setTrade(p => ({ ...p, [k]: v }));
  const verdictColors = { EXECUTE: 'text-primary border-primary/40 bg-primary/5', WAIT: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/5', SKIP: 'text-destructive border-destructive/40 bg-destructive/5' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-blue-400" />
            Trade Builder
          </h1>
          <p className="text-xs text-muted-foreground">Construction de setup · Checklist pré-trade · Validation IA · Enregistrement direct</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => { setTrade(empty); setChecklist({}); setSelectedPatterns([]); setAiSetup(null); }}>
            <RotateCcw className="w-3 h-3" />Reset
          </Button>
          <Button size="sm" variant="outline" onClick={analyzeSetup} disabled={loadingAI} className="gap-1 text-xs">
            <Brain className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />
            {loadingAI ? 'Analyse...' : 'Valider IA'}
          </Button>
          <Button size="sm" disabled={!readyToTrade || saveTrade.isPending} onClick={() => saveTrade.mutate(trade)} className="gap-1">
            <Save className="w-3 h-3" />Enregistrer
          </Button>
        </div>
      </div>

      {/* Checklist Score */}
      <div className={`p-3 rounded-lg border flex items-center gap-4 ${readyToTrade ? 'border-primary/30 bg-primary/5' : 'border-yellow-400/30 bg-yellow-400/5'}`}>
        <div className="text-center">
          <div className={`text-2xl font-bold font-mono ${readyToTrade ? 'text-primary' : 'text-yellow-400'}`}>{checklistScore}/{checklistTotal}</div>
          <div className="text-[10px] text-muted-foreground">Checklist</div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold ${readyToTrade ? 'text-primary' : 'text-yellow-400'}`}>
              {readyToTrade ? '✅ PRÊT À TRADER' : `⏳ ${checklistTotal - checklistScore} conditions manquantes`}
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${(checklistScore / checklistTotal) * 100}%`, background: readyToTrade ? '#00FF88' : '#F59E0B' }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Formulaire */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card-trading">
            <div className="text-sm font-semibold mb-3">Paramètres du Trade</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><Label className="text-xs">Symbole</Label><Input value={trade.symbol} onChange={e => set('symbol', e.target.value)} className="bg-secondary border-border h-8 text-xs mt-1" /></div>
              <div>
                <Label className="text-xs">Direction</Label>
                <Select value={trade.direction} onValueChange={v => set('direction', v)}>
                  <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="LONG">🟢 LONG</SelectItem><SelectItem value="SHORT">🔴 SHORT</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Phase</Label>
                <Select value={trade.phase} onValueChange={v => set('phase', v)}>
                  <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="demo">Demo</SelectItem>
                    <SelectItem value="backtest_local">Backtest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Entry</Label><Input type="number" value={trade.entry_price} onChange={e => set('entry_price', +e.target.value)} className="bg-secondary border-border h-8 text-xs mt-1" step="0.25" /></div>
              <div><Label className="text-xs">Stop Loss</Label><Input type="number" value={trade.stop_loss} onChange={e => set('stop_loss', +e.target.value)} className="bg-secondary border-border h-8 text-xs mt-1 border-destructive/30" step="0.25" /></div>
              <div><Label className="text-xs">TP1</Label><Input type="number" value={trade.take_profit_1} onChange={e => set('take_profit_1', +e.target.value)} className="bg-secondary border-border h-8 text-xs mt-1 border-primary/30" step="0.25" /></div>
              <div><Label className="text-xs">TP2</Label><Input type="number" value={trade.take_profit_2} onChange={e => set('take_profit_2', +e.target.value)} className="bg-secondary border-border h-8 text-xs mt-1" step="0.25" /></div>
              <div><Label className="text-xs">Lots</Label><Input type="number" value={trade.lot_size} onChange={e => set('lot_size', +e.target.value)} className="bg-secondary border-border h-8 text-xs mt-1" step="0.5" /></div>
              <div><Label className="text-xs">R:R</Label><Input type="number" value={trade.risk_reward} onChange={e => set('risk_reward', +e.target.value)} className="bg-secondary border-border h-8 text-xs mt-1" step="0.1" /></div>
              <div>
                <Label className="text-xs">Stratégie</Label>
                <Select value={trade.strategy} onValueChange={v => set('strategy', v)}>
                  <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{SETUPS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Session</Label>
                <Select value={trade.session} onValueChange={v => set('session', v)}>
                  <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{SESSIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Timeframe</Label>
                <Select value={trade.timeframe} onValueChange={v => set('timeframe', v)}>
                  <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{TIMEFRAMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3">
              <Label className="text-xs">Patterns détectés</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {PATTERNS.map(p => (
                  <button key={p} onClick={() => setSelectedPatterns(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                    className={`text-[10px] px-2 py-1 rounded border transition-all ${selectedPatterns.includes(p) ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <Label className="text-xs">Notes / Contexte</Label>
              <Textarea value={trade.setup} onChange={e => set('setup', e.target.value)} placeholder="Contexte de marché, confluences, raison de l'entrée..." className="bg-secondary border-border text-xs h-16 mt-1 resize-none" />
            </div>
          </div>

          {aiSetup && (
            <div className={`card-trading border ${verdictColors[aiSetup.verdict] || 'border-border'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold flex items-center gap-2"><Brain className="w-4 h-4 text-blue-400" />Analyse IA du Setup</span>
                <div className="flex items-center gap-2">
                  <span className={`text-base font-bold font-mono ${verdictColors[aiSetup.verdict]?.split(' ')[0]}`}>{aiSetup.confidence}%</span>
                  <span className={`px-2 py-0.5 rounded font-bold text-xs border ${verdictColors[aiSetup.verdict]}`}>{aiSetup.verdict}</span>
                </div>
              </div>
              <p className="text-xs text-foreground mb-1">{aiSetup.reason}</p>
              <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                <div className="p-1.5 rounded bg-secondary/50"><span className="text-muted-foreground">Qualité entry: </span><span className="font-bold">{aiSetup.entry_quality}</span></div>
                <div className="p-1.5 rounded bg-secondary/50"><span className="text-muted-foreground">Risque: </span><span className="font-bold text-yellow-400">{aiSetup.risk_note}</span></div>
              </div>
              <p className="text-xs text-blue-400 mt-2">💡 {aiSetup.improvement}</p>
            </div>
          )}
        </div>

        {/* Checklist */}
        <div className="card-trading">
          <div className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Checklist Pré-Trade
          </div>
          <div className="space-y-2">
            {CHECKLIST_ITEMS.map(item => (
              <label key={item.id} className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-all ${checklist[item.id] ? 'border-primary/30 bg-primary/5' : 'border-border hover:border-border/80'}`}>
                <input type="checkbox" checked={!!checklist[item.id]} onChange={e => setChecklist(p => ({ ...p, [item.id]: e.target.checked }))}
                  className="mt-0.5 accent-primary" />
                <span className={`text-xs ${checklist[item.id] ? 'text-foreground' : 'text-muted-foreground'}`}>{item.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
            <div className="flex justify-between mb-1">
              <span>Score checklist</span>
              <span className={`font-bold font-mono ${readyToTrade ? 'text-primary' : 'text-yellow-400'}`}>{checklistScore}/{checklistTotal}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${(checklistScore / checklistTotal) * 100}%`, background: readyToTrade ? '#00FF88' : '#F59E0B' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}