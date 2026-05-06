import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Scale, Zap, RefreshCw, TrendingUp, AlertTriangle, CheckCircle2, Calculator, Download, Building2, PieChart as PieIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, AreaChart, Area } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const STATUTS = [
  { id: 'micro', label: 'Micro-Entreprise', is_rate: 0.066, ss_rate: 0.247, threshold: 77700, pros: ['Simple', 'Pas de comptabilité'], cons: ['Plafond 77 700€', 'Charges sur CA brut'] },
  { id: 'ei', label: 'Entrepreneur Individuel', is_rate: 0.30, ss_rate: 0.40, threshold: null, pros: ['Flexibilité', 'Moins de charges si petit CA'], cons: ['IR progressif', 'Moins optimal > 50K'] },
  { id: 'sasu', label: 'SASU', is_rate: 0.15, ss_rate: 0.45, threshold: 38120, pros: ['IS 15% jusqu\'à 38 120€', 'Optimisation dividendes', 'Image pro'], cons: ['Comptabilité obligatoire', 'Coût création ~1500€'] },
  { id: 'eurl', label: 'EURL', is_rate: 0.15, ss_rate: 0.42, threshold: 38120, pros: ['IS', 'Conjoint gérant possible'], cons: ['Cotisations TNS', 'Plus de formalités'] },
];

const PROPFIRM_COUNTRIES = [
  { country: 'USA', firms: ['TopStep', 'TradeDay', 'Apex'], tax_treaty: true, withholding: 0, note: 'Convention Franco-Américaine — pas de double imposition' },
  { country: 'UK', firms: ['Tradefy', 'Lucid Trading'], tax_treaty: true, withholding: 0, note: 'Post-Brexit — convention fiscale maintenue' },
  { country: 'EU', firms: ['FTMO'], tax_treaty: true, withholding: 0, note: 'Directive épargne UE' },
  { country: 'Autres', firms: ['UFunded', 'MFF'], tax_treaty: false, withholding: 15, note: 'Vérifier convention bilatérale' },
];

const TVA_RATES = { micro: 0, ei: 0.20, sasu: 0.20, eurl: 0.20 };

export default function FiscalAuto() {
  const [statut, setStatut] = useState('sasu');
  const [annualGain, setAnnualGain] = useState(120000);
  const [hasSalary, setHasSalary] = useState(false);
  const [salaryPct, setSalaryPct] = useState(30);
  const [dividendPct, setDividendPct] = useState(40);
  const [charges, setCharges] = useState({ loyer: 0, materiel: 500, logiciels: 285, formation: 200, divers: 100 });
  const [advice, setAdvice] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [activeTab, setActiveTab] = useState('simulator');

  const { data: reports = [] } = useQuery({
    queryKey: ['reports-fiscal'],
    queryFn: () => base44.entities.DailyReport.list('-date', 365),
  });

  const selectedStatut = STATUTS.find(s => s.id === statut);
  const totalCharges = Object.values(charges).reduce((s, v) => s + (parseFloat(v) || 0), 0) * 12;
  const imposableBase = Math.max(0, annualGain - totalCharges);

  // Calcul IS progressif
  const calcIS = (base) => {
    if (statut === 'micro') return base * selectedStatut.is_rate;
    const tranche1 = Math.min(base, 38120);
    const tranche2 = Math.max(0, base - 38120);
    return tranche1 * 0.15 + tranche2 * 0.25;
  };
  const is = Math.round(calcIS(imposableBase));

  // Salaire + dividendes SASU
  const salary = hasSalary ? Math.round(imposableBase * (salaryPct / 100)) : 0;
  const netAfterIS = imposableBase - is;
  const dividends = Math.round(netAfterIS * (dividendPct / 100));
  const socialChargesSalary = Math.round(salary * 0.45);
  const flatTaxDividends = Math.round(dividends * 0.30); // PFU 30%
  const totalTax = is + socialChargesSalary + flatTaxDividends;
  const netFinal = imposableBase - totalTax;
  const effectiveRate = imposableBase > 0 ? ((totalTax / imposableBase) * 100).toFixed(1) : 0;

  // Comparatif tous statuts
  const comparatif = STATUTS.map(s => {
    const base = imposableBase;
    const tax = Math.round(base * (s.is_rate + s.ss_rate * 0.3));
    return { label: s.label, net: base - tax, tax, rate: Math.round((tax / base) * 100) };
  });

  // Gains depuis reports
  const realAnnualGain = reports.reduce((s, r) => s + (r.net_pnl || 0), 0);

  const getAIAdvice = async () => {
    setLoadingAI(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un expert-comptable français spécialisé dans la fiscalité des traders de cryptos et futures. Fais une analyse fiscale optimisée.

PROFIL TRADER:
- Activité: Trading NQ Futures via PropFirms (MFF, Tradefy, Lucid, UFunded)
- Revenu trading annuel estimé: ${annualGain}€ (réel: ${realAnnualGain}€)
- Statut envisagé: ${selectedStatut?.label}
- Charges déductibles/an: ${totalCharges}€
- Base imposable nette: ${imposableBase}€
- IS calculé: ${is}€
- Taux effectif: ${effectiveRate}%
- Revenus PropFirms étrangers: US/UK/EU principalement

QUESTIONS CLÉS:
1. Qualification fiscale des revenus PropFirm (BNC, BIC, salaires ?)
2. Déductibilité des frais PropFirm (abonnements, évaluations ?)
3. Optimisation SASU vs micro pour ce profil
4. Convention fiscale USA-France et impact sur les payouts
5. TVA applicable ou non sur les paiements PropFirm étrangers
6. Stratégies légales d'optimisation pour 2026
7. Seuils de déclenchement pour chaque statut

Retourne UNIQUEMENT JSON:
{
  "meilleur_statut": "<statut recommandé>",
  "meilleur_statut_raison": "<explication>",
  "economie_potentielle": <montant en €>,
  "qualification_revenus": "<BNC|BIC|autre>",
  "deductibilites": [{"charge": "<nom>", "deductible": true|false, "pct": <0-100>, "note": "<explication>"}],
  "optimisations": [{"titre": "<titre>", "detail": "<action>", "gain_estime": <€>}],
  "risques_fiscaux": ["<risque 1>", "<risque 2>"],
  "checklist_declaration": ["<étape 1>", "<étape 2>", "<étape 3>"],
  "conseil_structure": "<conseil création société si pertinent>"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          meilleur_statut: { type: "string" },
          meilleur_statut_raison: { type: "string" },
          economie_potentielle: { type: "number" },
          qualification_revenus: { type: "string" },
          deductibilites: { type: "array", items: { type: "object", properties: { charge: { type: "string" }, deductible: { type: "boolean" }, pct: { type: "number" }, note: { type: "string" } } } },
          optimisations: { type: "array", items: { type: "object", properties: { titre: { type: "string" }, detail: { type: "string" }, gain_estime: { type: "number" } } } },
          risques_fiscaux: { type: "array", items: { type: "string" } },
          checklist_declaration: { type: "array", items: { type: "string" } },
          conseil_structure: { type: "string" }
        }
      }
    });
    setAdvice(res);
    setLoadingAI(false);
  };

  const exportFiscal = () => {
    const content = [
      '=== RAPPORT FISCAL GHOST TRADER ===',
      `Généré le: ${new Date().toLocaleDateString('fr-FR')}`,
      '',
      '--- SITUATION ---',
      `Statut: ${selectedStatut?.label}`,
      `Revenus bruts: ${annualGain.toLocaleString()}€`,
      `Charges déductibles: ${totalCharges.toLocaleString()}€`,
      `Base imposable: ${imposableBase.toLocaleString()}€`,
      '',
      '--- CALCUL FISCAL ---',
      `IS estimé: ${is.toLocaleString()}€`,
      `Cotisations sociales: ${socialChargesSalary.toLocaleString()}€`,
      `Flat tax dividendes (30%): ${flatTaxDividends.toLocaleString()}€`,
      `Total charges fiscales: ${totalTax.toLocaleString()}€`,
      `Revenu net final: ${netFinal.toLocaleString()}€`,
      `Taux effectif: ${effectiveRate}%`,
      '',
      '--- ANALYSE IA ---',
      advice ? `Meilleur statut: ${advice.meilleur_statut}` : 'Non générée',
      advice ? `Économie potentielle: ${advice.economie_potentielle?.toLocaleString()}€` : '',
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `rapport_fiscal_${new Date().getFullYear()}.txt`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Rapport fiscal exporté');
  };

  const COLORS = ['#EF4444', '#00FF88', '#0088FF', '#F59E0B'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Scale className="w-5 h-5 text-yellow-400" />
            Optimisation Fiscale Automatisée
          </h1>
          <p className="text-xs text-muted-foreground">Calcul IS automatique · Comparatif statuts · PropFirm étrangers · Conseil IA</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportFiscal} className="gap-1 text-xs h-8">
            <Download className="w-3 h-3" />Export
          </Button>
          <Button size="sm" onClick={getAIAdvice} disabled={loadingAI} className="gap-1 text-xs">
            <Zap className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />
            {loadingAI ? 'Analyse...' : 'Optimiser IA'}
          </Button>
        </div>
      </div>

      <div className="p-3 bg-yellow-400/10 border border-yellow-400/20 rounded flex items-start gap-2 text-xs">
        <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
        <span className="text-yellow-300">Outil d'aide à la décision. Consultez un expert-comptable pour des décisions fiscales importantes.</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'IS estimé', value: `${is.toLocaleString()}€`, color: 'text-destructive' },
          { label: 'Revenu net final', value: `${netFinal.toLocaleString()}€`, color: 'text-primary' },
          { label: 'Taux effectif', value: `${effectiveRate}%`, color: parseFloat(effectiveRate) < 25 ? 'text-primary' : 'text-yellow-400' },
          { label: 'Économie potentielle IA', value: advice ? `${advice.economie_potentielle?.toLocaleString()}€` : '—', color: 'text-primary' },
        ].map(k => (
          <div key={k.label} className="card-trading text-center">
            <div className="text-[10px] text-muted-foreground mb-1">{k.label}</div>
            <div className={`text-xl font-bold font-mono ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border flex-wrap">
        {[
          { id: 'simulator', label: '🧮 Simulateur' },
          { id: 'comparatif', label: '⚖️ Comparatif Statuts' },
          { id: 'propfirm', label: '🌍 PropFirm Étrangers' },
          { id: 'ai', label: '🧠 Conseil IA' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-xs font-medium transition-all ${activeTab === t.id ? 'tab-active' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card-trading space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase">Paramètres</div>
            <div>
              <Label className="text-xs">Statut juridique</Label>
              <Select value={statut} onValueChange={setStatut}>
                <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUTS.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Revenus trading annuels (€)</Label>
              <Input type="number" value={annualGain} onChange={e => setAnnualGain(parseInt(e.target.value) || 0)} className="bg-secondary border-border h-8 text-xs mt-1 font-mono" />
              {realAnnualGain > 0 && <div className="text-[10px] text-primary mt-0.5">Réel (derniers rapports): {realAnnualGain.toLocaleString()}€</div>}
            </div>
            <div className="border-t border-border pt-2">
              <div className="text-xs font-semibold text-muted-foreground mb-2">Charges mensuelles déductibles</div>
              {Object.entries(charges).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 mb-1.5">
                  <Label className="text-xs text-muted-foreground capitalize w-20 flex-shrink-0">{k}</Label>
                  <Input type="number" value={v} onChange={e => setCharges(p => ({...p, [k]: parseInt(e.target.value) || 0}))} className="bg-secondary border-border h-7 text-xs font-mono" />
                  <span className="text-[10px] text-muted-foreground">€/mois</span>
                </div>
              ))}
              <div className="text-xs text-primary font-mono mt-1">Total: {totalCharges.toLocaleString()}€/an</div>
            </div>
            {statut === 'sasu' && (
              <div className="border-t border-border pt-2 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Salaire dirigeant</span>
                  <Switch checked={hasSalary} onCheckedChange={setHasSalary} />
                </div>
                {hasSalary && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">% en salaire</span>
                      <span className="font-mono font-bold">{salaryPct}%</span>
                    </div>
                    <input type="range" min={10} max={60} step={5} value={salaryPct} onChange={e => setSalaryPct(parseInt(e.target.value))} className="w-full accent-primary" />
                  </div>
                )}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">% en dividendes</span>
                    <span className="font-mono font-bold">{dividendPct}%</span>
                  </div>
                  <input type="range" min={0} max={80} step={5} value={dividendPct} onChange={e => setDividendPct(parseInt(e.target.value))} className="w-full accent-primary" />
                </div>
              </div>
            )}
          </div>

          <div className="card-trading">
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-3">Détail du calcul fiscal</div>
            <div className="space-y-2 text-xs">
              {[
                { label: 'Revenus bruts', value: `${annualGain.toLocaleString()}€`, color: '' },
                { label: 'Charges déductibles', value: `-${totalCharges.toLocaleString()}€`, color: 'text-blue-400' },
                { label: 'Base imposable', value: `${imposableBase.toLocaleString()}€`, color: 'text-foreground font-bold', divider: true },
                { label: `IS (${statut === 'micro' ? selectedStatut?.is_rate * 100 + '%' : '15%/25%'})`, value: `-${is.toLocaleString()}€`, color: 'text-destructive' },
                ...(hasSalary ? [{ label: `Cotisations soc. salaire (45%)`, value: `-${socialChargesSalary.toLocaleString()}€`, color: 'text-orange-400' }] : []),
                ...(dividendPct > 0 ? [{ label: `PFU dividendes (30%)`, value: `-${flatTaxDividends.toLocaleString()}€`, color: 'text-orange-400' }] : []),
                { label: 'Total impôts & charges', value: `-${totalTax.toLocaleString()}€`, color: 'text-destructive font-bold', divider: true },
                { label: '💰 Revenu NET final', value: `${netFinal.toLocaleString()}€`, color: 'text-primary font-bold text-sm', divider: true },
                { label: 'Taux effectif', value: `${effectiveRate}%`, color: parseFloat(effectiveRate) < 25 ? 'text-primary' : 'text-yellow-400' },
              ].map((r, i) => (
                <div key={i}>
                  {r.divider && <div className="h-px bg-border my-1" />}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className={`font-mono ${r.color}`}>{r.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-trading">
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-3">Répartition</div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={[
                  { name: 'Net gardé', value: netFinal },
                  { name: 'Impôts', value: totalTax },
                  { name: 'Charges', value: totalCharges },
                ]} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                  {[0,1,2].map(i => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={v => [`${v.toLocaleString()}€`, '']} contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', fontSize: 10, borderRadius: 6 }} />
              </PieChart>
            </ResponsiveContainer>
            {[
              { name: 'Net gardé', color: COLORS[0] },
              { name: 'Impôts & charges sociales', color: COLORS[1] },
              { name: 'Charges déductibles', color: COLORS[2] },
            ].map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs mb-1">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                <span className="text-muted-foreground flex-1">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'comparatif' && (
        <div className="space-y-3">
          <div className="card-trading">
            <div className="text-sm font-semibold mb-3">Comparatif des Statuts — Pour {annualGain.toLocaleString()}€ de revenus</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={comparatif}>
                <XAxis dataKey="label" tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={v => [`${v.toLocaleString()}€`, '']} contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', fontSize: 10, borderRadius: 6 }} />
                <Bar dataKey="net" name="Net" fill="#00FF88" radius={[3,3,0,0]} />
                <Bar dataKey="tax" name="Impôts" fill="#EF4444" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {STATUTS.map(s => {
              const tax = Math.round(imposableBase * (s.is_rate + s.ss_rate * 0.3));
              const net = imposableBase - tax;
              return (
                <div key={s.id} className={`card-trading border transition-all ${statut === s.id ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-semibold text-sm">{s.label}</span>
                    <div className="text-right">
                      <div className="font-mono font-bold text-primary text-lg">{net.toLocaleString()}€</div>
                      <div className="text-[10px] text-muted-foreground">net / an</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">Taux ~{Math.round((tax / imposableBase) * 100)}% · Impôts: {tax.toLocaleString()}€</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      {s.pros.map((p, i) => <div key={i} className="flex gap-1 text-primary"><CheckCircle2 className="w-3 h-3 flex-shrink-0 mt-0.5" />{p}</div>)}
                    </div>
                    <div>
                      {s.cons.map((c, i) => <div key={i} className="flex gap-1 text-destructive"><AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />{c}</div>)}
                    </div>
                  </div>
                  <button onClick={() => setStatut(s.id)} className={`mt-2 w-full text-xs py-1 rounded border transition-all ${statut === s.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}>
                    {statut === s.id ? '✓ Sélectionné' : 'Sélectionner'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'propfirm' && (
        <div className="space-y-3">
          <div className="card-trading">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold">Fiscalité des PropFirms par Pays</span>
            </div>
            <div className="space-y-3">
              {PROPFIRM_COUNTRIES.map(c => (
                <div key={c.country} className={`p-3 rounded border text-xs ${c.tax_treaty ? 'border-primary/20 bg-primary/5' : 'border-yellow-400/20 bg-yellow-400/5'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">{c.country} — {c.firms.join(', ')}</span>
                    <div className="flex items-center gap-2">
                      {c.withholding > 0 && <span className="text-yellow-400 font-mono font-bold">{c.withholding}% retenue</span>}
                      {c.tax_treaty ? <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> : <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />}
                    </div>
                  </div>
                  <p className="text-muted-foreground">{c.note}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="card-trading">
            <div className="text-sm font-semibold mb-2">Points Clés — Déclaration PropFirm France</div>
            <div className="space-y-2 text-xs">
              {[
                '📋 Les revenus PropFirm sont généralement classés BNC (Bénéfices Non Commerciaux) en France',
                '📋 Formulaire 2042-C-PRO + 2035 pour déclarer les revenus de source étrangère',
                '📋 Case 5HQ (revenus non commerciaux professionnels) ou 5KO (non-pro)',
                '📋 Conserver tous les justificatifs de paiement PropFirm pendant 5 ans',
                '📋 TVA non applicable si activité < 34 400€ (micro) ou franchise de base',
                '📋 Possible requalification en BIC si activité habituelle et spéculative répétée',
              ].map((p, i) => (
                <div key={i} className="p-2 rounded bg-secondary/30 border border-border">{p}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="space-y-3">
          {!advice ? (
            <div className="card-trading text-center py-12">
              <Scale className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
              <p className="text-sm text-muted-foreground mb-3">Analyse fiscale IA personnalisée pour votre profil de trader PropFirm</p>
              <Button onClick={getAIAdvice} disabled={loadingAI} className="gap-2">
                <Zap className={`w-4 h-4 ${loadingAI ? 'animate-spin' : ''}`} />
                {loadingAI ? 'Analyse en cours...' : 'Lancer l\'optimisation fiscale IA'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="card-trading border border-yellow-400/30 bg-yellow-400/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-semibold text-yellow-400">Recommandation IA</span>
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded font-bold">{advice.meilleur_statut}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold font-mono text-primary">{advice.economie_potentielle?.toLocaleString()}€</div>
                    <div className="text-[10px] text-muted-foreground">Économie potentielle/an</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{advice.meilleur_statut_raison}</p>
                {advice.conseil_structure && (
                  <div className="p-2 bg-blue-400/5 border border-blue-400/20 rounded text-xs text-blue-400">{advice.conseil_structure}</div>
                )}
              </div>

              {advice.optimisations?.length > 0 && (
                <div className="card-trading">
                  <div className="text-sm font-semibold mb-2">Optimisations recommandées</div>
                  <div className="space-y-2">
                    {advice.optimisations.map((o, i) => (
                      <div key={i} className="flex gap-3 p-2 rounded bg-primary/5 border border-primary/20 text-xs">
                        <TrendingUp className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-semibold mb-0.5">{o.titre}</div>
                          <div className="text-muted-foreground">{o.detail}</div>
                        </div>
                        <span className="text-primary font-mono font-bold flex-shrink-0">+{o.gain_estime?.toLocaleString()}€</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {advice.checklist_declaration?.length > 0 && (
                <div className="card-trading">
                  <div className="text-sm font-semibold mb-2">Checklist Déclaration Fiscale</div>
                  <div className="space-y-1.5">
                    {advice.checklist_declaration.map((step, i) => (
                      <div key={i} className="flex gap-2 text-xs p-2 rounded border border-border bg-secondary/20">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                        <span className="text-foreground">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {advice.risques_fiscaux?.length > 0 && (
                <div className="card-trading border border-destructive/20">
                  <div className="text-sm font-semibold text-destructive mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Risques fiscaux à surveiller</div>
                  {advice.risques_fiscaux.map((r, i) => (
                    <div key={i} className="flex gap-2 text-xs p-2 rounded bg-destructive/5 border border-destructive/20 mb-1">
                      <AlertTriangle className="w-3 h-3 text-destructive flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{r}</span>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => setAdvice(null)} className="text-xs">Réinitialiser</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}