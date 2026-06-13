import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Calculator, Shield, TrendingUp, AlertTriangle, Target, Zap, CheckCircle2, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const INSTRUMENTS = [
  { symbol: 'NQ1!', name: 'Nasdaq Futures', tickSize: 0.25, tickValue: 5, pointValue: 20, currency: 'USD' },
  { symbol: 'ES1!', name: 'S&P 500 Futures', tickSize: 0.25, tickValue: 12.5, pointValue: 50, currency: 'USD' },
  { symbol: 'MNQ1!', name: 'Micro NQ Futures', tickSize: 0.25, tickValue: 0.5, pointValue: 2, currency: 'USD' },
  { symbol: 'MES1!', name: 'Micro ES Futures', tickSize: 0.25, tickValue: 1.25, pointValue: 5, currency: 'USD' },
  { symbol: 'EURUSD', name: 'EUR/USD Forex', tickSize: 0.00001, tickValue: 1, pointValue: 10, currency: 'USD' },
  { symbol: 'GC1!', name: 'Gold Futures', tickSize: 0.1, tickValue: 10, pointValue: 100, currency: 'USD' },
  { symbol: 'CL1!', name: 'Crude Oil Futures', tickSize: 0.01, tickValue: 10, pointValue: 1000, currency: 'USD' },
];

export default function RiskCalculator() {
  const [instrument, setInstrument] = useState('NQ1!');
  const [accountSize, setAccountSize] = useState(50000);
  const [riskPct, setRiskPct] = useState(1);
  const [entry, setEntry] = useState(19820);
  const [stopLoss, setStopLoss] = useState(19795);
  const [direction, setDirection] = useState('LONG');
  const [rr, setRr] = useState(2);
  const [aiTip, setAiTip] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const { data: accounts = [] } = useQuery({ queryKey: ['calc-accounts'], queryFn: () => base44.entities.TradingAccount.list() });
  const liveAccount = accounts.find(a => a.phase === 'live' && a.status === 'active') || accounts[0];
  const effectiveAccountSize = liveAccount?.current_balance || liveAccount?.account_size || accountSize;

  const instr = INSTRUMENTS.find(i => i.symbol === instrument) || INSTRUMENTS[0];

  const calc = useMemo(() => {
    const slPts = Math.abs(entry - stopLoss);
    const maxRiskEur = effectiveAccountSize * (riskPct / 100);
    const lotSize = slPts > 0 ? Math.floor(maxRiskEur / (slPts * instr.pointValue)) : 0;
    const actualRisk = lotSize * slPts * instr.pointValue;
    const tp1 = direction === 'LONG' ? entry + slPts * rr : entry - slPts * rr;
    const tp2 = direction === 'LONG' ? entry + slPts * (rr * 1.5) : entry - slPts * (rr * 1.5);
    const potentialPnl = lotSize * slPts * rr * instr.pointValue;
    const profitFactor = actualRisk > 0 ? (potentialPnl / actualRisk).toFixed(2) : 0;
    const ddImpact = effectiveAccountSize > 0 ? ((actualRisk / effectiveAccountSize) * 100).toFixed(2) : 0;
    return { slPts, maxRiskEur, lotSize, actualRisk, tp1: tp1.toFixed(2), tp2: tp2.toFixed(2), potentialPnl, profitFactor, ddImpact };
  }, [entry, stopLoss, riskPct, effectiveAccountSize, direction, rr, instr]);

  const getAITip = async () => {
    setLoadingAI(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Coach risque trading expert. Analyse ce calcul de position et donne un conseil.
Instrument: ${instrument} | Account: ${effectiveAccountSize}€ | Risque: ${riskPct}%
Entry: ${entry} | SL: ${stopLoss} (${calc.slPts}pts) | Lots: ${calc.lotSize} | R:R cible: ${rr}
Risque réel: ${calc.actualRisk}€ (${calc.ddImpact}% du DD) | TP1: ${calc.tp1} | Gain potentiel: ${calc.potentialPnl}€

Retourne UNIQUEMENT JSON: {"verdict":"<1 phrase>","risk_level":"faible"|"modéré"|"élevé","tip":"<conseil actionnable>","warning":"<point de vigilance ou null>"}`,
      response_json_schema: { type: "object", properties: { verdict: { type: "string" }, risk_level: { type: "string" }, tip: { type: "string" }, warning: { type: "string" } } }
    });
    setAiTip(res);
    setLoadingAI(false);
  };

  const riskLevelColor = {
    faible: 'text-primary border-primary/30 bg-primary/5',
    modéré: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5',
    élevé: 'text-destructive border-destructive/30 bg-destructive/5',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-yellow-400" />
            Calculateur de Risque
          </h1>
          <p className="text-xs text-muted-foreground">Position sizing · R:R · Niveaux TP/SL · PropFirm safe</p>
        </div>
        <Button size="sm" onClick={getAITip} disabled={loadingAI} className="gap-1 text-xs">
          <Zap className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />
          {loadingAI ? 'IA...' : 'Conseil IA'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Inputs */}
        <div className="card-trading space-y-4">
          <div className="text-sm font-semibold">Paramètres du Trade</div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Instrument</Label>
              <Select value={instrument} onValueChange={setInstrument}>
                <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{INSTRUMENTS.map(i => <SelectItem key={i.symbol} value={i.symbol}>{i.symbol} — {i.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Direction</Label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LONG">🟢 LONG</SelectItem>
                  <SelectItem value="SHORT">🔴 SHORT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Taille Compte (€)</Label>
              <Input type="number" value={effectiveAccountSize} onChange={e => setAccountSize(+e.target.value)} className="bg-secondary border-border h-8 text-xs mt-1" />
              {liveAccount && <div className="text-[10px] text-primary mt-0.5">● Compte live: {liveAccount.name}</div>}
            </div>
            <div>
              <Label className="text-xs">Risque par trade (%)</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="range" min={0.1} max={5} step={0.1} value={riskPct} onChange={e => setRiskPct(+e.target.value)} className="flex-1 accent-primary" />
                <span className="font-mono font-bold text-sm w-10 text-right text-primary">{riskPct}%</span>
              </div>
            </div>
            <div>
              <Label className="text-xs">Prix d'entrée</Label>
              <Input type="number" value={entry} onChange={e => setEntry(+e.target.value)} className="bg-secondary border-border h-8 text-xs mt-1" step="0.25" />
            </div>
            <div>
              <Label className="text-xs">Stop Loss</Label>
              <Input type="number" value={stopLoss} onChange={e => setStopLoss(+e.target.value)} className="bg-secondary border-border h-8 text-xs mt-1" step="0.25" />
            </div>
            <div>
              <Label className="text-xs">R:R Cible</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="range" min={0.5} max={10} step={0.5} value={rr} onChange={e => setRr(+e.target.value)} className="flex-1 accent-primary" />
                <span className="font-mono font-bold text-sm w-10 text-right text-blue-400">{rr}:1</span>
              </div>
            </div>
            <div>
              <Label className="text-xs">Point Value ({instr.symbol})</Label>
              <div className="h-8 mt-1 flex items-center px-3 bg-secondary/50 rounded border border-border text-xs font-mono text-muted-foreground">${instr.pointValue}/pt</div>
            </div>
          </div>
        </div>

        {/* Résultats */}
        <div className="space-y-3">
          <div className="card-trading border border-primary/20 bg-primary/5">
            <div className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />Résultats du Calcul
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { l: '📏 Distance SL', v: `${calc.slPts} pts`, color: 'text-foreground' },
                { l: '🎯 Lots recommandés', v: `${calc.lotSize} lot(s)`, color: 'text-primary text-base font-bold' },
                { l: '💰 Risque réel (€)', v: `${calc.actualRisk.toLocaleString()}€`, color: 'text-destructive' },
                { l: '📈 Gain potentiel', v: `${calc.potentialPnl.toLocaleString()}€`, color: 'text-primary' },
                { l: '⚖️ Profit Factor', v: `${calc.profitFactor}:1`, color: parseFloat(calc.profitFactor) >= 2 ? 'text-primary' : 'text-yellow-400' },
                { l: '🛡️ Impact DD', v: `${calc.ddImpact}%`, color: parseFloat(calc.ddImpact) < 30 ? 'text-primary' : 'text-yellow-400' },
              ].map(r => (
                <div key={r.l} className="p-2 rounded bg-background/50 border border-border">
                  <div className="text-muted-foreground text-[10px] mb-0.5">{r.l}</div>
                  <div className={`font-mono font-bold ${r.color}`}>{r.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-trading">
            <div className="text-xs font-semibold mb-2">Niveaux de Prix</div>
            <div className="space-y-1.5 text-xs">
              {[
                { l: 'Entry', v: entry, color: 'text-blue-400 bg-blue-400/10' },
                { l: 'Stop Loss', v: stopLoss, color: 'text-destructive bg-destructive/10' },
                { l: `TP1 (${rr}:1)`, v: calc.tp1, color: 'text-green-400 bg-green-400/10' },
                { l: `TP2 (${rr * 1.5}:1)`, v: calc.tp2, color: 'text-primary bg-primary/10' },
              ].map(row => (
                <div key={row.l} className={`flex justify-between items-center p-2 rounded ${row.color}`}>
                  <span className="text-muted-foreground">{row.l}</span>
                  <span className="font-mono font-bold">{row.v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-trading border border-border">
            <div className="text-xs font-semibold mb-2 flex items-center gap-1"><Shield className="w-3 h-3 text-yellow-400" />PropFirm Safety Check</div>
            {[
              { l: 'Risque ≤ 1% du compte', ok: parseFloat(calc.ddImpact) <= 30 },
              { l: 'R:R ≥ 2:1', ok: rr >= 2 },
              { l: 'SL défini', ok: stopLoss !== entry },
              { l: 'Lots ≥ 1', ok: calc.lotSize >= 1 },
            ].map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-xs mb-1">
                {c.ok ? <CheckCircle2 className="w-3 h-3 text-primary" /> : <XCircle className="w-3 h-3 text-destructive" />}
                <span className={c.ok ? 'text-muted-foreground' : 'text-destructive'}>{c.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {aiTip && (
        <div className={`card-trading border ${riskLevelColor[aiTip.risk_level] || 'border-border'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-blue-400" />Conseil IA</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded capitalize ${riskLevelColor[aiTip.risk_level]}`}>Risque {aiTip.risk_level}</span>
          </div>
          <p className="text-xs text-foreground mb-1">{aiTip.verdict}</p>
          <p className="text-xs text-muted-foreground">{aiTip.tip}</p>
          {aiTip.warning && (
            <div className="mt-2 flex gap-2 p-2 bg-yellow-400/5 rounded border border-yellow-400/20">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
              <span className="text-xs text-muted-foreground">{aiTip.warning}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}