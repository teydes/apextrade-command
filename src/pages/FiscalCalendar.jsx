import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays, Euro, AlertTriangle, CheckCircle2, Clock, Zap,
  Download, RefreshCw, TrendingUp, Calculator, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const FISCAL_EVENTS_2026 = [
  { id: 1, date: '2026-01-31', label: 'Déclaration revenus 2025 — Acompte IS', type: 'deadline', impact: 'high', country: 'FR', description: 'Premier acompte IS pour sociétés (SASU/EURL)' },
  { id: 2, date: '2026-02-15', label: 'Déclaration TVA mensuelle', type: 'recurring', impact: 'medium', country: 'FR', description: 'Si régime TVA mensuel' },
  { id: 3, date: '2026-03-31', label: 'Clôture exercice fiscal Q1', type: 'reminder', impact: 'low', country: 'FR', description: 'Préparation bilan trimestriel' },
  { id: 4, date: '2026-04-30', label: 'Déclaration PLF Micro-Entreprise', type: 'deadline', impact: 'high', country: 'FR', description: 'Déclaration revenus micro-entrepreneur + cotisations' },
  { id: 5, date: '2026-05-15', label: 'Prélèvements sociaux sur revenus de capitaux', type: 'deadline', impact: 'high', country: 'FR', description: '17.2% sur PV trading compte perso' },
  { id: 6, date: '2026-05-31', label: 'Déclaration impôts en ligne (date limite)', type: 'deadline', impact: 'critical', country: 'FR', description: 'Déclaration revenus 2025 en ligne — CRITIQUE' },
  { id: 7, date: '2026-06-30', label: 'Acompte IRPP (si > 1000€)', type: 'deadline', impact: 'high', country: 'FR', description: 'Acompte IR si revenus trading dépassent 1000€' },
  { id: 8, date: '2026-09-15', label: 'Déclaration IS sociétés (clôture 31/12)', type: 'deadline', impact: 'high', country: 'FR', description: 'IS si SASU/EURL clôture 31 décembre' },
  { id: 9, date: '2026-10-31', label: 'TVA annuelle (régime réel simplifié)', type: 'deadline', impact: 'medium', country: 'FR', description: 'Régularisation TVA annuelle' },
  { id: 10, date: '2026-12-15', label: 'Dernier acompte IS', type: 'deadline', impact: 'high', country: 'FR', description: 'Quatrième acompte IS' },
  { id: 11, date: '2026-12-31', label: 'Clôture exercice fiscal annuel', type: 'reminder', impact: 'medium', country: 'FR', description: 'Préparer documents pour expert-comptable' },
];

const TAX_REGIMES = [
  { id: 'micro', name: 'Micro-Entreprise', rate: 0.226, flatTax: false, social: 0.128, desc: 'Simple, adapté revenus < 77k€' },
  { id: 'flat_tax', name: 'Flat Tax (PFU)', rate: 0.30, flatTax: true, social: 0.172, desc: '30% forfait sur PV (IR+CS)' },
  { id: 'sasu_is', name: 'SASU + IS', rate: 0.15, flatTax: false, social: 0.45, desc: 'IS 15% jusqu\'à 42.5K, optimisation salaire/dividendes' },
  { id: 'eurl_ir', name: 'EURL à l\'IR', rate: 0.30, flatTax: false, social: 0.40, desc: 'Imposition revenu personnel' },
  { id: 'lux', name: 'Luxembourg (résidence)', rate: 0.15, flatTax: false, social: 0.12, desc: 'Pour non-résidents FR, optimisation légale' },
];

export default function FiscalCalendar() {
  const [annualGains, setAnnualGains] = useState(24000);
  const [selectedRegime, setSelectedRegime] = useState('flat_tax');
  const [country, setCountry] = useState('FR');
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiAdvice, setAiAdvice] = useState(null);
  const [activeTab, setActiveTab] = useState('calendar');
  const [customEvents, setCustomEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({ date: '', label: '', type: 'deadline', description: '' });

  const { data: trades = [] } = useQuery({
    queryKey: ['trades-fiscal'],
    queryFn: () => base44.entities.Trade.filter({ status: 'closed' }, '-created_date', 200),
  });

  const realPnl = trades.reduce((s, t) => s + (t.pnl || 0), 0);
  const realCommissions = trades.reduce((s, t) => s + (t.commission || 0), 0);
  const netPnl = realPnl - Math.abs(realCommissions);

  const regime = TAX_REGIMES.find(r => r.id === selectedRegime);
  const gains = netPnl > 0 ? netPnl : annualGains;
  const taxAmount = Math.round(gains * regime.rate);
  const socialAmount = regime.flatTax ? 0 : Math.round(gains * regime.social);
  const totalTax = taxAmount + socialAmount;
  const netAfterTax = gains - totalTax;

  const today = new Date();
  const allEvents = [...FISCAL_EVENTS_2026, ...customEvents].sort((a, b) => new Date(a.date) - new Date(b.date));
  const upcoming = allEvents.filter(e => new Date(e.date) >= today);
  const past = allEvents.filter(e => new Date(e.date) < today);

  const daysUntil = (dateStr) => Math.ceil((new Date(dateStr) - today) / (1000 * 60 * 60 * 24));

  const getAIFiscalAdvice = async () => {
    setLoadingAI(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Expert fiscaliste trading France. Conseil personnalisé pour optimiser la fiscalité de ce trader.

Gains annuels: ${gains}€ | Commissions: ${Math.abs(realCommissions)}€ | Gains nets: ${netPnl > 0 ? netPnl : gains}€
Régime actuel: ${regime?.name} | Pays: ${country}
Taux imposition estimé: ${(regime.rate * 100).toFixed(0)}% + CS ${(regime.social * 100).toFixed(0)}%
Impôt estimé: ${totalTax}€ | Net après impôts: ${netAfterTax}€
Nombre de trades: ${trades.length}

Analyse tous les régimes possibles et donne la meilleure stratégie d'optimisation LÉGALE.
Retourne UNIQUEMENT JSON:
{
  "regime_optimal": "<régime recommandé>",
  "economies_estimees": <€ économisés vs régime actuel>,
  "taux_effectif_optimal": <pct>,
  "verdict": "<analyse 2 phrases>",
  "comparaison_regimes": [{"nom": "<régime>", "impot": <€>, "taux_effectif": <pct>, "avantages": ["<av>"], "inconvenients": ["<inc>"]}],
  "actions_immediates": ["<action concrète 1>", "<action 2>", "<action 3>"],
  "deductions_possibles": ["<déduction 1>", "<déduction 2>"],
  "alerte_risques": ["<risque légal à éviter>"],
  "conseil_structure": "<conseil structure juridique optimal>"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          regime_optimal: { type: "string" }, economies_estimees: { type: "number" },
          taux_effectif_optimal: { type: "number" }, verdict: { type: "string" },
          comparaison_regimes: { type: "array", items: { type: "object", properties: { nom: { type: "string" }, impot: { type: "number" }, taux_effectif: { type: "number" }, avantages: { type: "array", items: { type: "string" } }, inconvenients: { type: "array", items: { type: "string" } } } } },
          actions_immediates: { type: "array", items: { type: "string" } },
          deductions_possibles: { type: "array", items: { type: "string" } },
          alerte_risques: { type: "array", items: { type: "string" } },
          conseil_structure: { type: "string" }
        }
      }
    });
    setAiAdvice(res);
    setLoadingAI(false);
  };

  const exportCalendar = () => {
    const rows = [['Date', 'Événement', 'Type', 'Impact', 'Description'], ...allEvents.map(e => [e.date, e.label, e.type, e.impact, e.description])];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'calendrier_fiscal_trading.csv'; a.click();
    toast.success('Calendrier exporté');
  };

  const impactColor = (impact) => ({
    critical: 'text-red-400 border-red-400/30 bg-red-400/5',
    high: 'text-orange-400 border-orange-400/30 bg-orange-400/5',
    medium: 'text-yellow-400 border-yellow-400/20 bg-yellow-400/5',
    low: 'text-muted-foreground border-border bg-secondary/20',
  }[impact] || 'text-muted-foreground border-border');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-green-400" />
            Calendrier Fiscal Trading
          </h1>
          <p className="text-xs text-muted-foreground">Deadlines fiscales · Simulation impôts · Optimisation régimes · Conseil IA</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCalendar} className="gap-1 text-xs h-8">
            <Download className="w-3 h-3" />Export
          </Button>
          <Button size="sm" onClick={getAIFiscalAdvice} disabled={loadingAI} className="gap-1 text-xs">
            <Zap className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />
            {loadingAI ? 'Analyse...' : 'Optimiser IA'}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Gains Nets', value: `${gains > 0 ? '+' : ''}${gains.toLocaleString()}€`, color: gains > 0 ? 'text-primary' : 'text-muted-foreground' },
          { label: 'Impôts Estimés', value: `${totalTax.toLocaleString()}€`, color: 'text-destructive' },
          { label: 'Net Après Impôts', value: `${netAfterTax.toLocaleString()}€`, color: 'text-primary' },
          { label: 'Taux Effectif', value: `${gains > 0 ? ((totalTax / gains) * 100).toFixed(1) : 0}%`, color: 'text-yellow-400' },
        ].map(k => (
          <div key={k.label} className="card-trading text-center">
            <div className="text-[10px] text-muted-foreground mb-1">{k.label}</div>
            <div className={`text-lg font-bold font-mono ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* AI Advice */}
      {aiAdvice && (
        <div className="card-trading border border-green-400/30 bg-green-400/5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-green-400">Optimisation Fiscale IA</span>
              <span className="ml-2 text-xs text-primary">Économies potentielles: +{aiAdvice.economies_estimees?.toLocaleString()}€</span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setAiAdvice(null)} className="h-6 text-xs">✕</Button>
          </div>
          <p className="text-xs text-muted-foreground">{aiAdvice.verdict}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-primary/5 border border-primary/20">
              <div className="text-[10px] text-muted-foreground">Régime optimal</div>
              <div className="font-bold text-primary">{aiAdvice.regime_optimal}</div>
              <div className="text-muted-foreground">Taux: {aiAdvice.taux_effectif_optimal}%</div>
            </div>
            {aiAdvice.actions_immediates?.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-primary uppercase mb-1">Actions immédiates</div>
                {aiAdvice.actions_immediates.slice(0, 3).map((a, i) => (
                  <div key={i} className="flex gap-1 text-[11px] text-muted-foreground mb-0.5">
                    <span className="text-primary">{i+1}.</span>{a}
                  </div>
                ))}
              </div>
            )}
          </div>
          {aiAdvice.deductions_possibles?.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase text-yellow-400 mb-1">Déductions possibles</div>
              <div className="flex flex-wrap gap-1">
                {aiAdvice.deductions_possibles.map((d, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded border border-yellow-400/20 text-yellow-400 bg-yellow-400/5">{d}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'calendar', label: 'Calendrier' },
          { id: 'simulator', label: 'Simulateur' },
          { id: 'regimes', label: 'Régimes' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-xs font-medium transition-all ${activeTab === t.id ? 'tab-active' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'calendar' && (
        <div className="space-y-3">
          {upcoming.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">À venir ({upcoming.length})</div>
              {upcoming.map(e => {
                const days = daysUntil(e.date);
                return (
                  <div key={e.id} className={`flex items-start gap-3 p-3 rounded border mb-2 ${impactColor(e.impact)}`}>
                    <div className="text-center flex-shrink-0 w-12">
                      <div className="text-sm font-bold font-mono">{days}</div>
                      <div className="text-[9px] text-muted-foreground">jours</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold">{e.label}</div>
                      <div className="text-[10px] text-muted-foreground">{e.date} · {e.country}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{e.description}</div>
                    </div>
                    {days <= 30 && <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />}
                  </div>
                );
              })}
            </div>
          )}
          {past.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-4 opacity-50">Passés ({past.length})</div>
              {past.slice(-3).map(e => (
                <div key={e.id} className="flex items-center gap-3 p-2 rounded border border-border opacity-40 mb-1 text-xs">
                  <CheckCircle2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">{e.date}</span>
                  <span>{e.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-trading space-y-4">
            <div className="text-sm font-semibold">Simulation Fiscale</div>
            {netPnl > 0 && (
              <div className="flex items-center gap-2 p-2 rounded bg-primary/5 border border-primary/20 text-xs">
                <CheckCircle2 className="w-3 h-3 text-primary" />
                <span className="text-muted-foreground">Gains réels détectés: <strong className="text-primary">+{netPnl.toLocaleString()}€</strong> ({trades.length} trades)</span>
              </div>
            )}
            <div>
              <Label className="text-xs">Gains annuels estimés (€)</Label>
              <Input type="number" value={annualGains} onChange={e => setAnnualGains(parseFloat(e.target.value) || 0)} className="bg-secondary border-border h-8 text-xs mt-1 font-mono" />
            </div>
            <div>
              <Label className="text-xs">Régime fiscal</Label>
              <Select value={selectedRegime} onValueChange={setSelectedRegime}>
                <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{TAX_REGIMES.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">{regime?.desc}</p>
            </div>
            <div>
              <Label className="text-xs">Pays de résidence</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FR">France</SelectItem>
                  <SelectItem value="LU">Luxembourg</SelectItem>
                  <SelectItem value="PT">Portugal</SelectItem>
                  <SelectItem value="BE">Belgique</SelectItem>
                  <SelectItem value="CH">Suisse</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="card-trading space-y-3">
            <div className="text-sm font-semibold">Résultat Simulation</div>
            <div className="space-y-2 text-xs">
              {[
                { label: 'Gains bruts', value: `${gains.toLocaleString()}€`, color: 'text-primary' },
                { label: `Impôts (${(regime.rate * 100).toFixed(0)}%)`, value: `-${taxAmount.toLocaleString()}€`, color: 'text-destructive' },
                { label: `Charges sociales (${(regime.social * 100).toFixed(0)}%)`, value: regime.flatTax ? 'Inclus' : `-${socialAmount.toLocaleString()}€`, color: 'text-orange-400' },
                { label: 'Total prélèvements', value: `-${totalTax.toLocaleString()}€`, color: 'text-destructive' },
                { label: 'Net après impôts', value: `${netAfterTax.toLocaleString()}€`, color: 'text-primary' },
                { label: 'Taux effectif', value: `${gains > 0 ? ((totalTax / gains) * 100).toFixed(1) : 0}%`, color: 'text-yellow-400' },
              ].map(r => (
                <div key={r.label} className="flex justify-between p-2 rounded bg-secondary/30 border border-border">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className={`font-mono font-bold ${r.color}`}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'regimes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {TAX_REGIMES.map(r => {
            const tax = Math.round(gains * r.rate);
            const social = r.flatTax ? 0 : Math.round(gains * r.social);
            const total = tax + social;
            const net = gains - total;
            return (
              <div key={r.id}
                className={`card-trading border cursor-pointer transition-all ${selectedRegime === r.id ? 'border-primary/40 bg-primary/5' : 'border-border'}`}
                onClick={() => { setSelectedRegime(r.id); setActiveTab('simulator'); }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">{r.name}</span>
                  {selectedRegime === r.id && <CheckCircle2 className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-[10px] text-muted-foreground mb-2">{r.desc}</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Impôts</span><span className="font-mono text-destructive">-{tax.toLocaleString()}€</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Charges</span><span className="font-mono text-orange-400">{r.flatTax ? 'inclus' : `-${social.toLocaleString()}€`}</span></div>
                  <div className="flex justify-between border-t border-border pt-1 mt-1"><span className="font-semibold">Net</span><span className="font-mono font-bold text-primary">{net.toLocaleString()}€</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}