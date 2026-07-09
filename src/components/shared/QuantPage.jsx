import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { Loader2, Sparkles, TrendingUp, TrendingDown, Activity } from 'lucide-react';

const COLORS = ['#00FF88', '#0088FF', '#F59E0B', '#EF4444', '#A855F7', '#06B6D4', '#EC4899', '#84CC16'];

export default function QuantPage({ title, subtitle, icon: Icon = Activity, children, metrics, chartData, chartType = 'bar', chartConfig = {}, aiPrompt, aiContext, dataKey = 'value', extraStats }) {
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ['trades-quant', title],
    queryFn: () => base44.entities.Trade.list('-entry_time', 500),
  });

  const computedMetrics = useMemo(() => {
    if (metrics && typeof metrics === 'function') return metrics(trades);
    return metrics || [];
  }, [trades, metrics]);

  const computedChart = useMemo(() => {
    if (chartData && typeof chartData === 'function') return chartData(trades);
    return chartData || [];
  }, [trades, chartData]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const prompt = typeof aiPrompt === 'function' ? aiPrompt(trades) : aiPrompt;
      const context = typeof aiContext === 'function' ? aiContext(trades) : (aiContext || '');
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `${prompt}\n\nDonnées contextuelles:\n${context}\n\nRéponds en français, format markdown structuré avec sections claires.`,
        response_json_schema: { type: 'object', properties: { analysis: { type: 'string' }, score: { type: 'number' }, recommendations: { type: 'array', items: { type: 'string' } }, risk_level: { type: 'string' } } }
      });
      setAiAnalysis(res);
    } catch (e) { setAiAnalysis({ analysis: 'Erreur analyse IA' }); }
    setAiLoading(false);
  };

  if (isLoading) return (
    <div className="p-6 flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <Button onClick={runAI} disabled={aiLoading} size="sm" variant="default">
          {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          Analyse IA
        </Button>
      </div>

      {computedMetrics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {computedMetrics.map((m, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{m.label}</div>
                <div className={`text-lg font-bold font-mono ${m.color || 'text-foreground'}`}>{m.value}</div>
                {m.sub && <div className="text-[10px] text-muted-foreground">{m.sub}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {computedChart.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm">{chartConfig.title || 'Visualisation'}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                {chartType === 'bar' ? (
                  <BarChart data={computedChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '12px' }} />
                    {chartConfig.refLine && <ReferenceLine y={chartConfig.refLine} stroke="#F59E0B" strokeDasharray="5 5" />}
                    <Bar dataKey={dataKey} radius={[4,4,0,0]}>
                      {computedChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                ) : chartType === 'line' ? (
                  <LineChart data={computedChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '12px' }} />
                    <Line dataKey={dataKey} stroke="#00FF88" strokeWidth={2} dot={false} />
                  </LineChart>
                ) : chartType === 'area' ? (
                  <AreaChart data={computedChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '12px' }} />
                    <Area dataKey={dataKey} stroke="#0088FF" fill="#0088FF33" strokeWidth={2} />
                  </AreaChart>
                ) : chartType === 'pie' ? (
                  <PieChart>
                    <Pie data={computedChart} dataKey={dataKey} nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {computedChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '12px' }} />
                  </PieChart>
                ) : chartType === 'radar' ? (
                  <RadarChart data={computedChart}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Radar dataKey={dataKey} stroke="#00FF88" fill="#00FF8833" strokeWidth={2} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '12px' }} />
                  </RadarChart>
                ) : null}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {extraStats && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Détails</CardTitle></CardHeader>
            <CardContent>
              {typeof extraStats === 'function' ? extraStats(trades) : extraStats}
            </CardContent>
          </Card>
        )}

        {children && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Analyse</CardTitle></CardHeader>
            <CardContent>{children}</CardContent>
          </Card>
        )}

        {aiAnalysis && (
          <Card className="bg-card border-border border-primary/30">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm">Analyse IA Avancée</CardTitle>
                {aiAnalysis.score != null && (
                  <span className="ml-auto text-xs font-mono text-primary">Score: {aiAnalysis.score}/100</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">{aiAnalysis.analysis}</div>
              {aiAnalysis.risk_level && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Niveau de risque:</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${aiAnalysis.risk_level === 'low' ? 'bg-green-500/20 text-green-400' : aiAnalysis.risk_level === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>{aiAnalysis.risk_level.toUpperCase()}</span>
                </div>
              )}
              {aiAnalysis.recommendations?.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-bold text-foreground">Recommandations:</div>
                  {aiAnalysis.recommendations.map((r, i) => (
                    <div key={i} className="text-xs text-muted-foreground flex gap-2"><span className="text-primary">→</span>{r}</div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}