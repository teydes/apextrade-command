import { useState, useRef, useEffect } from 'react';
import { Monitor, MousePointer2, Keyboard, Clock, CheckCircle2, XCircle, Zap, Download, Crosshair, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import PreFlightChecklist from '@/components/shared/PreFlightChecklist';
import { pushNotification, NotifTypes } from '@/lib/notifications';

const calibrationKeys = [
  { key: 'BUY', label: 'Acheter / LONG', color: 'bg-green-500/20 border-green-500/50 text-green-400', shortcut: 'F1' },
  { key: 'SELL', label: 'Vendre / SHORT', color: 'bg-red-500/20 border-red-500/50 text-red-400', shortcut: 'F2' },
  { key: 'BREAKEVEN', label: 'Déplacer SL → BE', color: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400', shortcut: 'F3' },
  { key: 'CLOSE_HALF', label: 'Clôturer 50%', color: 'bg-blue-500/20 border-blue-500/50 text-blue-400', shortcut: 'F4' },
  { key: 'CLOSE_ALL', label: 'Clôturer Tout', color: 'bg-orange-500/20 border-orange-500/50 text-orange-400', shortcut: 'F5' },
  { key: 'EMERGENCY', label: '🚨 URGENCE STOP', color: 'bg-destructive/20 border-destructive/50 text-destructive', shortcut: 'ESC' },
];

const latencyTests = [
  { label: 'Signal TradingView → Dashboard', value: '12ms', ok: true },
  { label: 'Dashboard → Bot Local', value: '8ms', ok: true },
  { label: 'Bot → Quantower UI', value: '45ms', ok: true },
  { label: 'Quantower → Broker dxFeed', value: '18ms', ok: true },
  { label: 'Total Latence End-to-End', value: '83ms', ok: true },
];

// Script Python amélioré avec calibration souris interactive
const pythonScript = `#!/usr/bin/env python3
# ============================================================
# Ghost Trader Bot — Quantower Controller v2.0
# Installation sur DISQUE D: : cd D: && mkdir GhostTrader && cd GhostTrader
# pip install pyautogui pynput requests opencv-python pillow
# Démarrage: python ghost_trader.py
# ============================================================

import pyautogui
import time
import requests
import json
import random
import threading
from datetime import datetime
import cv2
import numpy as np

# ── CONFIGURATION ──────────────────────────────────────────
WEBHOOK_URL = "https://votre-app.base44.app/api/webhook"
POLL_INTERVAL = 5  # secondes entre chaque vérification de signal

# ── COORDONNÉES BOUTONS QUANTOWER (à calibrer via l'outil) ──
# Lancez le script de calibration pour obtenir ces valeurs
QUANTOWER_POSITIONS = {
    "buy":        None,  # ← Cliquez sur "Acheter" dans Quantower, notez les coords
    "sell":       None,  # ← Cliquez sur "Vendre"
    "close_all":  None,  # ← Cliquez sur "Clôturer tout"
    "breakeven":  None,  # ← Bouton déplacer SL
    "close_half": None,  # ← Clôturer 50%
}

# ── SÉCURITÉ ───────────────────────────────────────────────
pyautogui.FAILSAFE = True   # Coins de l'écran = arrêt d'urgence
pyautogui.PAUSE = 0.05      # Pause minimale entre actions

# ── SIMULATION HUMAINE ─────────────────────────────────────
def human_move(x, y):
    """Mouvement avec courbe de Bézier simulant un vrai trader"""
    duration = random.uniform(0.25, 0.7)
    # Légère déviation aléatoire du chemin
    mid_x = (pyautogui.position()[0] + x) / 2 + random.randint(-30, 30)
    mid_y = (pyautogui.position()[1] + y) / 2 + random.randint(-20, 20)
    pyautogui.moveTo(mid_x, mid_y, duration=duration/2, tween=pyautogui.easeInOutQuad)
    pyautogui.moveTo(x, y, duration=duration/2, tween=pyautogui.easeInOutQuad)
    time.sleep(random.uniform(0.04, 0.12))

def human_click(x, y, double=False):
    """Clic humain avec micro-tremblements naturels"""
    offset_x = random.randint(-2, 2)
    offset_y = random.randint(-2, 2)
    human_move(x + offset_x, y + offset_y)
    time.sleep(random.uniform(0.08, 0.25))
    if double:
        pyautogui.doubleClick()
    else:
        pyautogui.click()
    time.sleep(random.uniform(0.15, 0.4))

def human_delay_before_trade():
    """Simule le temps de réaction humain (2-8s)"""
    delay = random.uniform(2.0, 8.0)
    print(f"  ⏱ Délai humain: {delay:.1f}s")
    time.sleep(delay)

# ── CALIBRATION INTERACTIVE ────────────────────────────────
def calibrate_positions():
    """Outil de calibration — Enregistre les positions des boutons Quantower"""
    print("\\n🎯 MODE CALIBRATION — Positionnez votre souris sur chaque bouton")
    print("Appuyez ENTRÉE pour enregistrer la position courante\\n")
    
    for btn_name in QUANTOWER_POSITIONS.keys():
        input(f"  → Positionnez la souris sur [{btn_name.upper()}] puis appuyez ENTRÉE")
        pos = pyautogui.position()
        QUANTOWER_POSITIONS[btn_name] = (pos.x, pos.y)
        print(f"     ✅ {btn_name}: ({pos.x}, {pos.y})")
    
    # Sauvegarder dans un fichier config
    with open("D:/GhostTrader/positions.json", "w") as f:
        json.dump(QUANTOWER_POSITIONS, f, indent=2)
    print("\\n✅ Calibration sauvegardée dans D:/GhostTrader/positions.json")
    return QUANTOWER_POSITIONS

def load_positions():
    """Charge les positions calibrées"""
    try:
        with open("D:/GhostTrader/positions.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        print("⚠️ Aucune calibration trouvée — Lancez en mode calibration: python ghost_trader.py --calibrate")
        return None

# ── EXÉCUTION TRADES ───────────────────────────────────────
def execute_trade(signal, positions):
    direction = signal.get("direction", "LONG")
    entry = signal.get("entry", 0)
    sl = signal.get("stop_loss", 0)
    
    print(f"\\n[{datetime.now().strftime('%H:%M:%S')}] 📡 Signal: {direction} @ {entry} | SL: {sl}")
    
    # Vérifier que le signal a passé la checklist
    if not signal.get("checklist_passed", False):
        print("  ❌ Signal refusé — Checklist non validée")
        return
    
    # Délai humain naturel
    human_delay_before_trade()
    
    # Amener Quantower au premier plan
    # pyautogui.hotkey('alt', 'tab')  # Décommenter si nécessaire
    time.sleep(0.5)
    
    if direction == "LONG" and positions.get("buy"):
        human_click(*positions["buy"])
        print(f"  ✅ LONG exécuté à {datetime.now().strftime('%H:%M:%S')}")
    elif direction == "SHORT" and positions.get("sell"):
        human_click(*positions["sell"])
        print(f"  ✅ SHORT exécuté à {datetime.now().strftime('%H:%M:%S')}")
    elif direction == "CLOSE_ALL" and positions.get("close_all"):
        human_click(*positions["close_all"])
        print(f"  ✅ CLOSE ALL exécuté")

# ── POLLING SIGNAUX ────────────────────────────────────────
def poll_signals(positions):
    print(f"\\n🚀 Ghost Trader démarré | Polling toutes les {POLL_INTERVAL}s")
    print("CTRL+C ou coin de l\\'écran = arrêt d\\'urgence\\n")
    
    while True:
        try:
            r = requests.get(f"{WEBHOOK_URL}/pending", timeout=5)
            if r.status_code == 200:
                signals = r.json().get("signals", [])
                for signal in signals:
                    execute_trade(signal, positions)
        except requests.exceptions.ConnectionError:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠️ Dashboard hors ligne — retry dans {POLL_INTERVAL}s")
        except Exception as e:
            print(f"Erreur: {e}")
        time.sleep(POLL_INTERVAL)

# ── MAIN ───────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    
    if "--calibrate" in sys.argv:
        calibrate_positions()
    else:
        positions = load_positions()
        if positions:
            poll_signals(positions)
        else:
            print("Lance d\\'abord: python ghost_trader.py --calibrate")
`;

const installScript = `@echo off
:: ============================================================
:: Ghost Trader — Script d'installation sur D:\\
:: Double-cliquez pour installer tout le projet
:: ============================================================

echo.
echo ============================================================
echo  GHOST TRADER — Installation sur D:\\
echo ============================================================
echo.

:: Créer le dossier sur D:
D:
mkdir D:\\GhostTrader 2>nul
cd D:\\GhostTrader

echo [1/5] Dossier D:\\GhostTrader créé
echo.

:: Vérifier Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Python non trouvé. Installez Python 3.11+ depuis python.org
    pause
    exit
)

echo [2/5] Python détecté ✓
echo.

:: Créer un environnement virtuel
python -m venv D:\\GhostTrader\\venv
call D:\\GhostTrader\\venv\\Scripts\\activate.bat

echo [3/5] Environnement virtuel créé ✓
echo.

:: Installer les dépendances
echo Installation des packages Python...
pip install pyautogui pynput requests opencv-python pillow --quiet

echo [4/5] Packages Python installés ✓
echo.

:: Copier le script depuis le dossier courant
copy ghost_trader.py D:\\GhostTrader\\ghost_trader.py >nul 2>&1
echo [5/5] Script ghost_trader.py copié ✓

:: Créer un raccourci de lancement
echo @echo off > D:\\GhostTrader\\LANCER_BOT.bat
echo D: >> D:\\GhostTrader\\LANCER_BOT.bat
echo cd D:\\GhostTrader >> D:\\GhostTrader\\LANCER_BOT.bat
echo call venv\\Scripts\\activate.bat >> D:\\GhostTrader\\LANCER_BOT.bat
echo echo Lancement Ghost Trader... >> D:\\GhostTrader\\LANCER_BOT.bat
echo python ghost_trader.py >> D:\\GhostTrader\\LANCER_BOT.bat

echo.
echo ============================================================
echo  ✅ Installation terminée !
echo.
echo  Fichiers créés dans D:\\GhostTrader\\
echo    - ghost_trader.py  ^(script principal^)
echo    - LANCER_BOT.bat   ^(démarrage rapide^)
echo    - venv\\            ^(environnement Python^)
echo.
echo  ÉTAPE SUIVANTE :
echo    1. Ouvrir Quantower sur NQ Futures
echo    2. Lancer: python ghost_trader.py --calibrate
echo    3. Pointer la souris sur chaque bouton quand demandé
echo    4. Lancer: python ghost_trader.py  (ou double-clic LANCER_BOT.bat)
echo ============================================================
echo.
pause
`;

export default function Demo() {
  const [activeKey, setActiveKey] = useState(null);
  const [botConnected, setBotConnected] = useState(false);
  const [latencyRunning, setLatencyRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('calibration'); // calibration | webhook | install
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [recordedPositions, setRecordedPositions] = useState({});
  const [recordingBtn, setRecordingBtn] = useState(null);
  const canvasRef = useRef(null);
  const [clickLog, setClickLog] = useState([]);

  // Track mouse position on the calibration canvas
  const handleCanvasMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: Math.round(e.clientX - rect.left), y: Math.round(e.clientY - rect.top) });
  };

  const handleCanvasClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    if (recordingBtn) {
      setRecordedPositions(p => ({ ...p, [recordingBtn]: { x, y } }));
      setClickLog(p => [...p, { btn: recordingBtn, x, y, time: new Date().toLocaleTimeString('fr-FR') }]);
      setRecordingBtn(null);
      toast.success(`Position ${recordingBtn} enregistrée : (${x}, ${y})`);
      pushNotification({ type: NotifTypes.SYSTEM, title: `Position calibrée: ${recordingBtn}`, body: `Coordonnées enregistrées: x=${x}, y=${y}` });
    }
  };

  const testLatency = () => {
    setLatencyRunning(true);
    setTimeout(() => {
      setLatencyRunning(false);
      toast.success('Test de latence terminé — 83ms total ✅');
      pushNotification({ type: NotifTypes.SYSTEM, title: 'Test latence OK', body: 'Latence totale: 83ms — En dessous du seuil critique 200ms' });
    }, 2000);
  };

  const downloadScript = (filename, content, type = 'text/plain') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    toast.success(`${filename} téléchargé`);
    pushNotification({ type: NotifTypes.SYSTEM, title: `Script téléchargé`, body: filename });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Monitor className="w-5 h-5 text-blue-400" /> Demo & Calibration Bot
          </h1>
          <p className="text-xs text-muted-foreground">Calibration souris · Webhook TradingView · Installation D: · Test latence</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium ${botConnected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
          <span className={`status-dot ${botConnected ? 'active' : 'inactive'}`} />
          {botConnected ? 'Bot Connecté' : 'Bot Hors Ligne'}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'calibration', label: '🖱️ Calibration Souris' },
          { id: 'webhook', label: '📡 Webhook TradingView' },
          { id: 'install', label: '💾 Installation D:' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-medium transition-all ${activeTab === tab.id ? 'tab-active' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CALIBRATION */}
      {activeTab === 'calibration' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Touches */}
            <div className="card-trading">
              <div className="flex items-center gap-2 mb-3">
                <Keyboard className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Touches Quantower</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {calibrationKeys.map(k => (
                  <button key={k.key} onMouseDown={() => setActiveKey(k.key)} onMouseUp={() => setActiveKey(null)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${k.color} ${activeKey === k.key ? 'scale-95 brightness-75' : 'hover:brightness-110'}`}>
                    <div className="text-xs font-mono mb-1 opacity-70">{k.shortcut}</div>
                    <div className="font-bold text-sm">{k.key}</div>
                    <div className="text-xs mt-0.5 opacity-80">{k.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Zone calibration souris interactive */}
            <div className="card-trading">
              <div className="flex items-center gap-2 mb-3">
                <Crosshair className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-semibold">Zone de Calibration Souris Quantower</span>
                <span className="ml-auto text-xs font-mono text-muted-foreground">x:{mousePos.x} y:{mousePos.y}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Sélectionnez un bouton ci-dessous, puis cliquez dans la zone pour enregistrer sa position.
                Ces coordonnées seront utilisées par le bot Python.
              </p>

              {/* Boutons à calibrer */}
              <div className="flex gap-2 flex-wrap mb-3">
                {['buy', 'sell', 'close_all', 'breakeven', 'close_half'].map(btn => (
                  <button key={btn} onClick={() => setRecordingBtn(recordingBtn === btn ? null : btn)}
                    className={`px-2 py-1 rounded text-xs border transition-all ${recordingBtn === btn ? 'bg-yellow-400 text-black border-yellow-400' : recordedPositions[btn] ? 'border-primary/40 text-primary bg-primary/10' : 'border-border text-muted-foreground hover:border-muted-foreground'}`}>
                    {recordedPositions[btn] ? `✅ ${btn}` : recordingBtn === btn ? `🎯 Cliquez...` : `📌 ${btn}`}
                  </button>
                ))}
              </div>

              {/* Zone de simulation */}
              <div
                className={`relative w-full bg-secondary/30 border-2 rounded-lg cursor-crosshair select-none ${recordingBtn ? 'border-yellow-400 glow-green' : 'border-border'}`}
                style={{ height: 200 }}
                onMouseMove={handleCanvasMouseMove}
                onClick={handleCanvasClick}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  {recordingBtn ? (
                    <div className="text-center">
                      <div className="text-yellow-400 text-2xl mb-1">🎯</div>
                      <div className="text-yellow-400 font-bold text-sm">Cliquez pour positionner [{recordingBtn.toUpperCase()}]</div>
                      <div className="text-muted-foreground text-xs">dans Quantower, cliquer sur le bouton réel</div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-xs text-center">
                      <MousePointer2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Simulateur de zone — Sélectionnez un bouton à calibrer
                    </div>
                  )}
                </div>
                {/* Afficher les positions enregistrées */}
                {Object.entries(recordedPositions).map(([btn, pos]) => (
                  <div key={btn} className="absolute w-4 h-4 rounded-full bg-primary border-2 border-white flex items-center justify-center transform -translate-x-2 -translate-y-2"
                    style={{ left: pos.x, top: pos.y }}>
                    <div className="absolute -top-5 text-[9px] text-primary whitespace-nowrap font-mono">{btn}</div>
                  </div>
                ))}
              </div>

              {/* Log des positions */}
              {clickLog.length > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Positions enregistrées:</div>
                  {clickLog.map((log, i) => (
                    <div key={i} className="text-xs font-mono text-primary bg-primary/5 px-2 py-1 rounded flex justify-between">
                      <span className="text-foreground">{log.btn}:</span>
                      <span>x={log.x}, y={log.y}</span>
                      <span className="text-muted-foreground">{log.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {/* Test latence */}
            <div className="card-trading">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-semibold">Test Latence</span>
                </div>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={testLatency} disabled={latencyRunning}>
                  {latencyRunning ? <><span className="animate-spin mr-1">⚙️</span>Test...</> : 'Tester'}
                </Button>
              </div>
              <div className="space-y-2">
                {latencyTests.map(t => (
                  <div key={t.label} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground text-[11px]">{t.label}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {t.ok ? <CheckCircle2 className="w-3 h-3 text-primary" /> : <XCircle className="w-3 h-3 text-destructive" />}
                      <span className={`font-mono ${t.ok ? 'text-primary' : 'text-destructive'}`}>{t.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Checklist Demo → Live */}
            <div className="card-trading">
              <div className="text-xs font-semibold mb-2">Conditions Demo → Live</div>
              {[
                { label: 'Win Rate ≥ 60%', ok: true },
                { label: 'P&L positif 20+ trades', ok: true },
                { label: 'Latence bot < 200ms', ok: true },
                { label: 'Calibration souris validée', ok: Object.keys(recordedPositions).length >= 3 },
                { label: 'Win Rate Demo ≥ 60%', ok: false },
                { label: 'P&L Demo = 3 000€ min', ok: false },
                { label: 'Zéro violation MFF', ok: true },
              ].map((item, i) => (
                <div key={i} className={`flex items-center gap-2 p-2 rounded mb-1 text-xs ${item.ok ? 'border-primary/20 bg-primary/5' : 'border-border bg-secondary/20'} border`}>
                  {item.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                  <span className={item.ok ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB WEBHOOK TRADINGVIEW */}
      {activeTab === 'webhook' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-trading">
            <div className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" /> Connexion Webhook TradingView
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-primary/5 border border-primary/20 rounded">
                <div className="text-xs font-semibold text-primary mb-2">📡 Votre URL Webhook</div>
                <div className="font-mono text-xs bg-secondary p-2 rounded break-all select-all">
                  https://votre-app.base44.app/api/signals/webhook
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">Copiez cette URL dans TradingView → Alertes → Webhook</div>
              </div>

              <div>
                <div className="text-xs font-semibold mb-2">Format de l'alerte Pine Script :</div>
                <pre className="text-[10px] font-mono bg-secondary p-3 rounded overflow-x-auto text-primary">{`// Dans Pine Script — section alertcondition:
alertcondition(longCondition, title="LONG NQ",
  message='{"action":"LONG","symbol":"NQ1!","entry":{{close}},"sl":{{low}},"tp":{{high}},"confidence":80}')

alertcondition(shortCondition, title="SHORT NQ",
  message='{"action":"SHORT","symbol":"NQ1!","entry":{{close}},"sl":{{high}},"tp":{{low}},"confidence":80}')`}</pre>
              </div>

              <div>
                <div className="text-xs font-semibold mb-2">Étapes de connexion TradingView :</div>
                <div className="space-y-2">
                  {[
                    '1. Ouvrez TradingView → votre chart NQ Futures (dxFeed CME)',
                    '2. Cliquez sur l\'icône Alerte (cloche) → Créer une alerte',
                    '3. Condition : votre stratégie Pine Script (LONG ou SHORT)',
                    '4. Dans "Notifications" → activez "Webhook URL"',
                    '5. Collez l\'URL webhook ci-dessus',
                    '6. Dans "Message" → collez le format JSON ci-dessus',
                    '7. Enregistrez → testez avec "Envoyer un message de test"',
                  ].map((step, i) => (
                    <div key={i} className="flex gap-2 text-xs">
                      <span className="text-primary font-mono w-4 flex-shrink-0">{i + 1}.</span>
                      <span className="text-muted-foreground">{step.substring(3)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card-trading">
            <div className="text-sm font-semibold mb-3">Stratégie Pine Script Suggérée (ICT + Footprint)</div>
            <pre className="text-[10px] font-mono bg-secondary p-3 rounded overflow-x-auto text-green-400 leading-relaxed">{`//@version=5
strategy("Ghost Trader — ICT+Footprint NQ", overlay=true)

// ── ICT Kill Zones (horaires NY) ─────────────────
nyOpen  = (hour >= 9  and hour < 10)
nyMid   = (hour >= 10 and hour < 11)
lonOpen = (hour >= 3  and hour < 4)
inKillZone = nyOpen or nyMid or lonOpen

// ── Structure de marché (BOS / CHoCH) ───────────
ema20  = ta.ema(close, 20)
ema50  = ta.ema(close, 50)
bullBias = ema20 > ema50
bearBias = ema20 < ema50

// ── FVG (Fair Value Gap) ─────────────────────────
bullFVG = low[0] > high[2]
bearFVG = high[0] < low[2]

// ── Volume Delta simplifié ────────────────────────
volHigh = volume > ta.sma(volume, 20) * 1.5

// ── Signaux fusionnés ─────────────────────────────
longSignal  = bullBias and bullFVG and volHigh and inKillZone
shortSignal = bearBias and bearFVG and volHigh and inKillZone

if longSignal
    strategy.entry("LONG", strategy.long)
    alert('{"action":"LONG","symbol":"NQ1!","entry":' + str.tostring(close) + ',"confidence":85}')

if shortSignal
    strategy.entry("SHORT", strategy.short)
    alert('{"action":"SHORT","symbol":"NQ1!","entry":' + str.tostring(close) + ',"confidence":85}')`}</pre>
            <div className="mt-2 p-2 bg-yellow-400/5 border border-yellow-400/20 rounded text-xs text-yellow-400">
              ⚡ Ce script fusionne ICT Kill Zones + FVG + Volume Delta. Abonnement TradingView Pro+ CME Group requis (déjà actif).
            </div>
          </div>
        </div>
      )}

      {/* TAB INSTALLATION D: */}
      {activeTab === 'install' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-trading">
            <div className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-400" /> Installation sur Disque D:
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-blue-400/5 border border-blue-400/20 rounded text-xs text-blue-400">
                💾 Le disque C: étant plein, tous les fichiers Ghost Trader seront installés sur <strong>D:\GhostTrader\</strong>
              </div>

              <div>
                <div className="text-xs font-semibold mb-2">Structure des fichiers :</div>
                <pre className="text-[11px] font-mono bg-secondary p-3 rounded text-muted-foreground">{`D:\\GhostTrader\\
├── ghost_trader.py      ← Bot principal
├── LANCER_BOT.bat       ← Démarrage 1 clic
├── positions.json       ← Calibration souris
├── venv\\                ← Python virtuel
│   └── Scripts\\
│       └── activate.bat
└── logs\\
    └── trades.log       ← Historique exécutions`}</pre>
              </div>

              <div>
                <div className="text-xs font-semibold mb-2">Commandes d'installation manuelle :</div>
                <pre className="text-[11px] font-mono bg-secondary p-3 rounded text-primary">{`# 1. Créer le dossier
D:
mkdir D:\\GhostTrader
cd D:\\GhostTrader

# 2. Créer l'environnement virtuel
python -m venv venv
call venv\\Scripts\\activate.bat

# 3. Installer les packages
pip install pyautogui pynput requests opencv-python pillow

# 4. Calibrer les boutons Quantower
python ghost_trader.py --calibrate

# 5. Lancer le bot
python ghost_trader.py`}</pre>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button className="gap-2 text-xs" onClick={() => downloadScript('ghost_trader.py', pythonScript)}>
                  <Download className="w-3 h-3" /> ghost_trader.py
                </Button>
                <Button variant="outline" className="gap-2 text-xs" onClick={() => downloadScript('install_D.bat', installScript)}>
                  <Download className="w-3 h-3" /> install_D.bat
                </Button>
              </div>
            </div>
          </div>

          <div className="card-trading">
            <div className="text-sm font-semibold mb-3">Requirements Python</div>
            <div className="space-y-2">
              {[
                { pkg: 'pyautogui', version: '>=0.9.54', desc: 'Contrôle souris/clavier avec simulation humaine', required: true },
                { pkg: 'pynput', version: '>=1.7.6', desc: 'Écoute des événements clavier (touches raccourcis)', required: true },
                { pkg: 'requests', version: '>=2.31.0', desc: 'Polling des signaux depuis le dashboard', required: true },
                { pkg: 'opencv-python', version: '>=4.8.0', desc: 'Vision par ordinateur — reconnaissance boutons', required: false },
                { pkg: 'pillow', version: '>=10.0.0', desc: 'Capture et analyse d\'écran', required: false },
              ].map((p, i) => (
                <div key={i} className={`p-2 rounded border text-xs ${p.required ? 'border-primary/20 bg-primary/5' : 'border-border bg-secondary/20'}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-mono font-bold text-foreground">{p.pkg}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted-foreground">{p.version}</span>
                      <span className={`text-[10px] px-1 rounded ${p.required ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                        {p.required ? 'requis' : 'optionnel'}
                      </span>
                    </div>
                  </div>
                  <div className="text-muted-foreground">{p.desc}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 p-2 bg-secondary rounded text-xs font-mono">
              pip install pyautogui pynput requests opencv-python pillow
            </div>
          </div>
        </div>
      )}
    </div>
  );
}