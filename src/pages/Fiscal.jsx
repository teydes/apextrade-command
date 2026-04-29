import { useState } from 'react';
import { Scale, RefreshCw, Calculator, BookOpen, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const statuts = [
  { id: 'micro', label: 'Micro-Entreprise', rate: 0.066, desc: 'Plafond 77 700€/an. Charges: 6.6%. Simple.' },
  { id: 'ei', label: 'Entrepreneur Individuel', rate: 0.28, desc: 'IR + cotisations sociales. Adapté petits gains.' },
  { id: 'sasu', label: 'SASU', rate: 0.15, desc: 'IS 15% jusqu\'à 38 120€, 25% au-delà. Optimal > 50K€/an.' },
  { id: 'eurl', label: 'EURL', rate: 0.30, desc: 'IS + cotisations TNS. Bonne protection sociale.' },
];

export default function Fiscal() {
  const [annualGain, setAnnualGain] = useState(120000);
  const [statut, setStatut] = useState('sasu');
  const [advice, setAdvice] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  const selectedStatut = statuts.find(s => s.id === statut);
  const tax = Math.round(annualGain * (selectedStatut?.rate || 0));
  const net = annualGain - tax;

  const getAdvice = async () => {
    setLoadingAI(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un conseiller fiscal français spécialisé dans les traders indépendants et les revenus de trading en ligne.
      
      Profil:
      - Activité: Trading futures NQ, revenus via PropFirms (MFF, Apex, etc.)
      - Gains annuels estimés: ${annualGain}€
      - Statut envisagé: ${selectedStatut?.label}
      - Pays: France
      
      Donne un conseil fiscal complet incluant:
      1. Meilleur statut juridique pour optimiser la fiscalité
      2. Déclaration des gains PropFirm (pays d'origine, fiscalité spécifique)
      3. Charges sociales à prévoir
      4. Stratégies légales d'optimisation (PEE, PERCO, SCI...)
      5. À partir de quel montant envisager une structure société
      6. Les pièges à éviter (redressement fiscal)
      
      Sois précis et pratique. Rappelle que ce n'est pas un conseil fiscal officiel.`,
    });
    setAdvice(res);
    setLoadingAI(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Scale className="w-5 h-5 text-yellow-400" />
        <div>
          <h1 className="text-xl font-bold">Conseiller Fiscal France</h1>
          <p className="text-xs text-muted-foreground">Optimisation fiscale · Statuts juridiques · Propfirms</p>
        </div>
      </div>

      <div className="p-3 bg-yellow-400/10 border border-yellow-400/20 rounded flex items-start gap-2 text-xs">
        <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
        <span className="text-yellow-300">Ceci est une aide à la décision générée par IA. Consultez un expert-comptable pour des décisions fiscales importantes.</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Simulator */}
        <div className="card-trading space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Calculator className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Simulateur Fiscal</span>
          </div>

          <div>
            <Label className="text-xs">Gains annuels estimés (€)</Label>
            <Input type="number" value={annualGain} onChange={e => setAnnualGain(parseInt(e.target.value) || 0)} className="bg-secondary border-border mt-1 h-8 font-mono" />
          </div>

          <div>
            <Label className="text-xs">Statut juridique</Label>
            <Select value={statut} onValueChange={setStatut}>
              <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {statuts.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedStatut && <p className="text-xs text-muted-foreground mt-1">{selectedStatut.desc}</p>}
          </div>

          <div className="space-y-2 p-3 bg-secondary/50 rounded text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Revenus bruts</span>
              <span className="font-mono">{annualGain.toLocaleString()}€</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Charges + impôts (~{Math.round((selectedStatut?.rate || 0) * 100)}%)</span>
              <span className="font-mono text-red-400">-{tax.toLocaleString()}€</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-between font-bold">
              <span>Revenu net estimé</span>
              <span className="font-mono text-primary">{net.toLocaleString()}€</span>
            </div>
          </div>
        </div>

        {/* Statuts comparison */}
        <div className="card-trading">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold">Comparatif Statuts</span>
          </div>
          <div className="space-y-3">
            {statuts.map(s => {
              const t = Math.round(annualGain * s.rate);
              const n = annualGain - t;
              return (
                <div key={s.id} className={`p-3 rounded border text-xs ${statut === s.id ? 'border-primary/50 bg-primary/5' : 'border-border bg-secondary/30'}`}>
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold">{s.label}</span>
                    <span className="font-mono text-primary">{n.toLocaleString()}€ net</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taux effectif ~{Math.round(s.rate * 100)}%</span>
                    <span>-{t.toLocaleString()}€</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Advice */}
        <div className="card-trading">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">Conseil IA Personnalisé</span>
            <Button size="sm" onClick={getAdvice} disabled={loadingAI} className="text-xs h-7 gap-1">
              <RefreshCw className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />
              {loadingAI ? '...' : 'Analyser'}
            </Button>
          </div>
          {advice ? (
            <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{advice}</div>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-8">
              Cliquez sur "Analyser" pour obtenir des conseils fiscaux personnalisés pour votre profil de trader PropFirm en France.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}