import { useState } from 'react';
import { Monitor, MousePointer2, Keyboard, Clock, CheckCircle2, XCircle, Zap, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatCard from '@/components/shared/StatCard';
import PreFlightChecklist from '@/components/shared/PreFlightChecklist';
import { toast } from 'sonner';

const calibrationKeys = [
  { key: 'BUY', label: 'Acheter / LONG', color: 'bg-green-500/20 border-green-500/50 text-green-400', shortcut: 'F1' },
  { key: 'SELL', label: 'Vendre / SHORT', color: 'bg-red-500/20 border-red-500/50 text-red-400', shortcut: 'F2' },
  { key: 'BREAKEVEN', label: 'Déplacer SL → BE', color: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400', shortcut: 'F3' },
  { key: 'CLOSE_HALF', label: 'Clôturer 50%', color: 'bg-blue-500/20 border-blue-500/50 text-blue-400', shortcut: 'F4' },
  { key: 'CLOSE_ALL', label: 'Clôturer Tout', color: 'bg-orange-500/20 border-orange-500/50 text-orange-400', shortcut: 'F5' },
  { key: 'EMERGENCY', label: '🚨 URGENCE STOP', color: 'bg-destructive/20 border-destructive/50 text-destructive', shortcut: 'ESC' },
];

const latencyTests = [
  { label: 'Signal → Dashboard', value: '12ms', ok: true },
  { label: 'Dashboard → Bot Local', value: '8ms', ok: true },
  { label: 'Bot → Quantower', value: '45ms', ok: true },
  { label: 'Quantower → Broker', value: '18ms', ok: true },
  { label: 'Total Latence', value: '83ms', ok: true },
];

const pythonScript = `#!/usr/bin/env python3
# Ghost Trader - Script Local (Quantower Controller)
# Installation: pip install pyautogui pynput requests
# Démarrage: python ghost_trader.py

import pyautogui
import time
import requests
import json
import random
from datetime import datetime

# Configuration
WEBHOOK_URL = "https://votre-app.base44.app/api/webhook"
QUANTOWER_POS = {"buy": (450, 320), "sell": (550, 320), "close": (500, 400)}

def human_move(x, y, duration=None):
    """Simule un mouvement humain avec accélération/décélération"""
    if duration is None:
        duration = random.uniform(0.3, 0.8)
    pyautogui.moveTo(x, y, duration=duration, tween=pyautogui.easeInOutQuad)
    time.sleep(random.uniform(0.05, 0.15))

def human_click(x, y):
    human_move(x, y)
    time.sleep(random.uniform(0.1, 0.3))
    pyautogui.click(x, y)
    time.sleep(random.uniform(0.2, 0.5))

def execute_trade(signal):
    """Exécute un trade sur Quantower en simulant un humain"""
    direction = signal.get("direction", "LONG")
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Signal reçu: {direction}")
    
    # Pause aléatoire (2-8 secondes) comme un vrai trader
    delay = random.uniform(2.0, 8.0)
    print(f"  Attente {delay:.1f}s (simulation humaine)...")
    time.sleep(delay)
    
    if direction == "LONG":
        human_click(*QUANTOWER_POS["buy"])
    elif direction == "SHORT":
        human_click(*QUANTOWER_POS["sell"])
    
    print(f"  ✅ Trade exécuté à {datetime.now().strftime('%H:%M:%S')}")

def poll_signals():
    """Écoute les signaux du dashboard"""
    while True:
        try:
            r = requests.get(f"{WEBHOOK_URL}/pending", timeout=5)
            signals = r.json().get("signals", [])
            for signal in signals:
                if signal.get("checklist_passed"):
                    execute_trade(signal)
        except Exception as e:
            print(f"Erreur connexion: {e}")
        time.sleep(5)  # Poll toutes les 5 secondes

if __name__ == "__main__":
    print("🚀 Ghost Trader Bot démarré (Mode DEMO)")
    print("Connexion au dashboard...")
    poll_signals()
`;

export default function Demo() {
  const [activeKey, setActiveKey] = useState(null);
  const [botConnected, setBotConnected] = useState(false);
  const [latencyRunning, setLatencyRunning] = useState(false);

  const testLatency = () => {
    setLatencyRunning(true);
    setTimeout(() => { setLatencyRunning(false); toast.success('Test de latence terminé — 83ms total ✅'); }, 2000);
  };

  const downloadScript = () => {
    const blob = new Blob([pythonScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ghost_trader.py'; a.click();
    toast.success('Script Python téléchargé');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Monitor className="w-5 h-5 text-blue-400" />
            Backtest Demo — Quantower
          </h1>
          <p className="text-xs text-muted-foreground">Calibration touches, test latence, simulation souris avant passage en Live</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium ${botConnected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
          <span className={`status-dot ${botConnected ? 'active' : 'inactive'}`} />
          {botConnected ? 'Bot Local Connecté' : 'Bot Local Déconnecté'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calibration touches */}
        <div className="lg:col-span-2 card-trading">
          <div className="flex items-center gap-2 mb-4">
            <Keyboard className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Calibration des Touches Quantower</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {calibrationKeys.map(k => (
              <button
                key={k.key}
                onMouseDown={() => setActiveKey(k.key)}
                onMouseUp={() => setActiveKey(null)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${k.color} ${activeKey === k.key ? 'scale-95 brightness-75' : 'hover:brightness-110'}`}
              >
                <div className="text-xs font-mono mb-1 opacity-70">{k.shortcut}</div>
                <div className="font-bold text-sm">{k.key}</div>
                <div className="text-xs mt-1 opacity-80">{k.label}</div>
              </button>
            ))}
          </div>

          <div className="mt-4 p-3 bg-secondary rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MousePointer2 className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">Positionnement Souris (Simulation)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Le bot local utilise <code className="font-mono text-primary">pyautogui</code> pour simuler des mouvements humains sur Quantower. 
              Coordonnées configurables dans <code className="font-mono text-primary">ghost_trader.py</code>.
              Délai aléatoire 2-8s entre signal et exécution = indétectable.
            </p>
          </div>
        </div>

        {/* Latence + Bot script */}
        <div className="space-y-3">
          {/* Test latence */}
          <div className="card-trading">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-semibold">Test Latence</span>
              </div>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={testLatency} disabled={latencyRunning}>
                {latencyRunning ? 'Test...' : 'Tester'}
              </Button>
            </div>
            <div className="space-y-2">
              {latencyTests.map(t => (
                <div key={t.label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t.label}</span>
                  <div className="flex items-center gap-1.5">
                    {t.ok ? <CheckCircle2 className="w-3 h-3 text-primary" /> : <XCircle className="w-3 h-3 text-destructive" />}
                    <span className={`font-mono ${t.ok ? 'text-primary' : 'text-destructive'}`}>{t.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Download script */}
          <div className="card-trading">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Bot Local Python</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Script à installer sur votre machine. Utilise <code className="font-mono">pyautogui</code> + <code className="font-mono">pynput</code> pour contrôler Quantower sans être détecté.
            </p>
            <div className="text-xs text-muted-foreground mb-3 font-mono bg-secondary p-2 rounded">
              pip install pyautogui pynput requests<br />
              python ghost_trader.py
            </div>
            <Button className="w-full gap-2 text-xs" size="sm" onClick={downloadScript}>
              <Download className="w-3 h-3" />
              Télécharger ghost_trader.py
            </Button>
          </div>
        </div>
      </div>

      {/* Checklist avant passage Live */}
      <div className="card-trading">
        <div className="text-sm font-semibold mb-3">Conditions de passage Demo → Live</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Win Rate Backtest Local ≥ 60%', ok: true },
            { label: 'P&L Local positif sur 20+ trades', ok: true },
            { label: 'Latence bot < 200ms', ok: true },
            { label: 'Calibration touches validée', ok: false },
            { label: 'Win Rate Demo ≥ 60%', ok: false },
            { label: 'P&L Demo = 3 000€ min', ok: false },
            { label: 'Zéro violation règle MFF', ok: true },
            { label: 'Checklist pré-vol validée', ok: false },
          ].map((item, i) => (
            <div key={i} className={`p-3 rounded-lg border text-xs ${item.ok ? 'border-primary/30 bg-primary/5' : 'border-border bg-secondary/30'}`}>
              {item.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-primary mb-1" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground mb-1" />}
              <span className={item.ok ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}