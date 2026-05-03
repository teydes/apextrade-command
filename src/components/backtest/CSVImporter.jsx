import { useState, useRef } from 'react';
import { Upload, CheckCircle2, AlertTriangle, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Parseur CSV TradingView (colonnes: Date, Time, Symbol, Direction, Price, Qty, Status, etc.)
function parseTVCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());

  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i] || ''; });

    // Mapping TradingView → notre format
    return {
      date: row['date/time'] || row['date'] || row['time'] || '',
      time: row['time'] || '',
      setup: row['signal'] || row['strategy'] || row['comment'] || 'Import TV',
      direction: (row['type'] || row['direction'] || '').toUpperCase().includes('BUY') || (row['type'] || '').toUpperCase().includes('LONG') ? 'LONG' : 'SHORT',
      entry: parseFloat(row['price'] || row['entry'] || 0) || 0,
      exit_price: parseFloat(row['exit'] || row['close price'] || 0) || 0,
      pnl: parseFloat(row['profit'] || row['net profit'] || row['pnl'] || 0) || 0,
      rr: parseFloat(row['rr'] || row['r:r'] || 0) || 0,
      result: (() => {
        const p = parseFloat(row['profit'] || row['net profit'] || 0);
        return p > 0 ? 'win' : p < 0 ? 'loss' : 'breakeven';
      })(),
      symbol: row['symbol'] || row['ticker'] || 'NQ1!',
      mistakes: '',
    };
  }).filter(r => r.entry > 0 || r.pnl !== 0);
}

export default function CSVImporter({ onImport }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      setError('Fichier .csv requis');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const trades = parseTVCSV(text);
      if (trades.length === 0) {
        setError('Aucune donnée trouvée. Vérifiez le format TradingView.');
        return;
      }
      setError(null);
      setPreview(trades);
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!preview) return;
    onImport(preview);
    toast.success(`${preview.length} trades importés depuis TradingView`);
    setPreview(null);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${dragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 bg-secondary/20'}`}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-xs font-semibold text-foreground">Glissez votre export TradingView (.csv)</p>
        <p className="text-[10px] text-muted-foreground mt-1">ou cliquez pour sélectionner — Format: List of Trades / Strategy Tester</p>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive p-2 bg-destructive/10 rounded border border-destructive/20">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary font-semibold">{preview.length} trades détectés</span>
              <span className="text-muted-foreground">— PnL total: <span className={preview.reduce((s,t)=>s+t.pnl,0)>=0?'text-primary':'text-destructive'}>{preview.reduce((s,t)=>s+t.pnl,0).toFixed(0)}€</span></span>
            </div>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setPreview(null)}><X className="w-3 h-3" /></Button>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {preview.slice(0, 10).map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] p-1.5 bg-secondary/30 rounded">
                <span className={`px-1 rounded text-[10px] font-bold ${t.direction === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{t.direction}</span>
                <span className="text-muted-foreground flex-1">{t.date} — {t.setup}</span>
                <span className={`font-mono font-bold ${t.pnl > 0 ? 'text-green-400' : t.pnl < 0 ? 'text-red-400' : 'text-yellow-400'}`}>{t.pnl > 0 ? '+' : ''}{t.pnl.toFixed(0)}€</span>
              </div>
            ))}
            {preview.length > 10 && <div className="text-[10px] text-muted-foreground text-center">+{preview.length - 10} autres...</div>}
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 gap-1 text-xs" onClick={confirmImport}>
              <CheckCircle2 className="w-3 h-3" /> Importer {preview.length} trades
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => setPreview(null)}>Annuler</Button>
          </div>
        </div>
      )}

      <div className="text-[10px] text-muted-foreground p-2 bg-secondary/30 rounded space-y-0.5">
        <p className="font-semibold text-foreground">Export TradingView → Strategy Tester → "List of Trades" → Export</p>
        <p>Colonnes reconnues: Date/Time, Type (Buy/Sell), Price, Profit, Signal</p>
      </div>
    </div>
  );
}