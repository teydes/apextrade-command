import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Line, ComposedChart } from 'recharts';
import { Activity, Gauge } from 'lucide-react';

export default function MarketInternals() {
  const data = useMemo(() => {
    const ticks = [];
    let cumTick = 0;
    for (let i = 0; i < 50; i++) {
      const tick = Math.floor((Math.random() - 0.45) * 2000);
      cumTick += tick;
      const advancing = Math.floor(Math.random() * 2000 + 1000);
      const declining = Math.floor(Math.random() * 2000 + 1000);
      const upVolume = Math.floor(Math.random() * 1000000 + 500000);
      const downVolume = Math.floor(Math.random() * 1000000 + 500000);
      const trin = (advancing / declining) > 0 ? (downVolume / upVolume) / (declining / advancing) : 1;
      const breadth = advancing - declining;
      ticks.push({ time: i, tick, cumTick, advancing, declining, upVolume, downVolume, trin, breadth });
    }
    const lastTick = ticks[ticks.length - 1];
    const tickMax = Math.max(...ticks.map(t => t.tick));
    const tickMin = Math.min(...ticks.map(t => t.tick));
    const avgTRIN = ticks.reduce((a, t) => a + t.trin, 0) / ticks.length;
    const breadthTrend = lastTick.breadth > 0 ? 'BULLISH' : 'BEARISH';
    const tickSignal = lastTick.cumTick > 500 ? 'EXTREME BULLISH' : lastTick.cumTick < -500 ? 'EXTREME BEARISH' : lastTick.cumTick > 0 ? 'BULLISH' : 'BEARISH';
    const trinSignal = lastTick.trin < 0.8 ? 'BULLISH' : lastTick.trin > 1.2 ? 'BEARISH' : 'NEUTRAL';
    return { ticks, lastTick, tickMax, tickMin, avgTRIN, breadthTrend, tickSignal, trinSignal };
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Activity className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Market Internals</h1><p className="text-sm text-muted-foreground">TICK, TRIN, Advance/Decline, Breadth</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={`card-trading ${data.tickSignal.includes('BULLISH') ? 'glow-green' : 'glow-red'}`}>
          <CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Cumulative TICK</div><div className={`text-2xl font-mono font-bold ${data.lastTick.cumTick > 0 ? 'text-primary' : 'text-danger-red'}`}>{data.lastTick.cumTick > 0 ? '+' : ''}{data.lastTick.cumTick}</div><div className="text-xs text-muted-foreground">{data.tickSignal}</div></CardContent>
        </Card>
        <Card className={`card-trading ${data.trinSignal === 'BULLISH' ? 'glow-green' : data.trinSignal === 'BEARISH' ? 'glow-red' : ''}`}>
          <CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">TRIN</div><div className={`text-2xl font-mono font-bold ${data.lastTick.trin < 0.8 ? 'text-primary' : data.lastTick.trin > 1.2 ? 'text-danger-red' : 'text-warning-yellow'}`}>{data.lastTick.trin.toFixed(2)}</div><div className="text-xs text-muted-foreground">{data.trinSignal}</div></CardContent>
        </Card>
        <Card className="card-trading">
          <CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Breadth (A-D)</div><div className={`text-2xl font-mono font-bold ${data.lastTick.breadth > 0 ? 'text-primary' : 'text-danger-red'}`}>{data.lastTick.breadth > 0 ? '+' : ''}{data.lastTick.breadth}</div><div className="text-xs text-muted-foreground">{data.breadthTrend}</div></CardContent>
        </Card>
        <Card className="card-trading">
          <CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Up/Down Volume</div><div className="text-2xl font-mono font-bold text-accent">{((data.lastTick.upVolume / (data.lastTick.upVolume + data.lastTick.downVolume)) * 100).toFixed(0)}%</div><div className="text-xs text-muted-foreground">Up volume ratio</div></CardContent>
        </Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">TICK & Cumulative TICK</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data.ticks}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="time" stroke="hsl(215 20% 55%)" />
              <YAxis stroke="hsl(215 20% 55%)" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="tick" name="TICK">{data.ticks.map((e, i) => <Cell key={i} fill={e.tick > 0 ? '#00FF8866' : '#EF444466'} />)}</Bar>
              <Line type="monotone" dataKey="cumTick" name="Cum TICK" stroke="#0088FF" strokeWidth={2} dot={false} />
              <ReferenceLine y={0} stroke="#F59E0B" strokeDasharray="5 5" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Advance/Decline</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.ticks}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="time" stroke="hsl(215 20% 55%)" />
              <YAxis stroke="hsl(215 20% 55%)" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="advancing" name="Advancing" stackId="a" fill="#00FF88" />
              <Bar dataKey="declining" name="Declining" stackId="a" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-muted-foreground">TICK Max:</span> <span className="font-mono text-primary">{data.tickMax}</span></div>
            <div><span className="text-muted-foreground">TICK Min:</span> <span className="font-mono text-danger-red">{data.tickMin}</span></div>
            <div><span className="text-muted-foreground">Avg TRIN:</span> <span className="font-mono text-accent">{data.avgTRIN.toFixed(2)}</span></div>
            <div><span className="text-muted-foreground">Up Vol Ratio:</span> <span className="font-mono text-primary">{((data.lastTick.upVolume / (data.lastTick.upVolume + data.lastTick.downVolume)) * 100).toFixed(0)}%</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}