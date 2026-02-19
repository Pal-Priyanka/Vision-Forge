import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, Cell
} from "recharts";
import { Activity, TrendingUp, Zap, Target, AlertCircle, Loader2, BarChart3, ShieldCheck, ShieldAlert } from "lucide-react";
import { useInference } from "../context/InferenceContext";
import { useQuery } from "@tanstack/react-query";
import { getMetrics, getIntegrityCheck } from "../utils/api";

const IntegrityBadge = () => {
  const { inferenceCount } = useInference();
  const { data: report, isLoading } = useQuery({
    queryKey: ["integrity-check", inferenceCount],
    queryFn: getIntegrityCheck,
    enabled: inferenceCount >= 3,
    refetchInterval: 10000,
  });

  if (inferenceCount < 3) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border text-muted-foreground text-[9px] font-black uppercase tracking-widest">
        <ShieldAlert size={12} /> Verification Pending (Need 3 runs)
      </div>
    );
  }

  if (isLoading) return <div className="w-24 h-6 bg-secondary animate-pulse rounded-full" />;

  const isVerified = report?.integrity_status === "VERIFIED";

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all duration-500 ${isVerified
      ? "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-glow-emerald"
      : "bg-red-50 border-red-200 text-red-600 shadow-glow-red"
      }`}>
      {isVerified ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
      {isVerified ? "Metrics Verified: Real-Time" : "Verification Flagged: Possible Dummy"}
    </div>
  );
};

const MetricsDashboard = () => {
  const {
    inferenceCount,
    analyticsData,
    analyticsLoading,
    inferenceHistory,
    latestResult,
    filteredResult,
    confidence,
    setConfidence
  } = useInference();

  const { data: metrics } = useQuery({
    queryKey: ["metrics", inferenceCount],
    queryFn: getMetrics,
    enabled: inferenceCount > 0,
    refetchOnWindowFocus: false,
  });

  // Check if we have real data
  const hasData = inferenceCount > 0;

  // Sync radar data with filtered results for live feedback
  const radarData = useMemo(() => {
    if (!metrics?.yolov5 || !metrics?.detr) return [];

    // Use filtered results for real-time count updates
    const yCount = filteredResult?.yolov5?.num_objects ?? 0;
    const dCount = filteredResult?.detr?.num_objects ?? 0;

    const y = metrics.yolov5;
    const d = metrics.detr;

    return [
      { metric: "mAP@50", yolov5: ((y.map_50 ?? 0) * 100), detr: ((d.map_50 ?? 0) * 100) },
      { metric: "Current Detections", yolov5: Math.min(yCount * 10, 100), detr: Math.min(dCount * 10, 100) },
      { metric: "Speed", yolov5: Math.min((y.fps ?? 0) / 2, 100), detr: Math.min((d.fps ?? 0) / 2, 100) },
      { metric: "Precision", yolov5: ((y.precision ?? 0) * 100), detr: ((d.precision ?? 0) * 100) },
      { metric: "Recall", yolov5: ((y.recall ?? 0) * 100), detr: ((d.recall ?? 0) * 100) },
    ];
  }, [metrics, filteredResult]);

  // Merge FPS histories for chart with data safety
  const fpsChartData = useMemo(() => {
    const yolo = analyticsData?.fpsHistoryYolo || [];
    const detr = analyticsData?.fpsHistoryDetr || [];
    if (!Array.isArray(yolo) && !Array.isArray(detr)) return [];

    const maxLen = Math.max(Array.isArray(yolo) ? yolo.length : 0, Array.isArray(detr) ? detr.length : 0);
    const merged = [];
    for (let i = 0; i < maxLen; i++) {
      merged.push({
        run: i + 1,
        yolov5: (Array.isArray(yolo) && yolo[i]) ? yolo[i].fps : null,
        detr: (Array.isArray(detr) && detr[i]) ? detr[i].fps : null,
      });
    }
    return merged;
  }, [analyticsData]);

  // mAP comparison bars
  const mapCompareData = useMemo(() => {
    if (!metrics?.yolov5 || !metrics?.detr) return [];

    // Defensive extraction
    const yoloMap = metrics.yolov5.map_50 ?? 0;
    const detrMap = metrics.detr.map_50 ?? 0;
    const yoloFps = metrics.yolov5.fps ?? 0;
    const detrFps = metrics.detr.fps ?? 0;

    return [
      { name: "mAP@50", yolov5: +(yoloMap * 100).toFixed(1), detr: +(detrMap * 100).toFixed(1) },
      { name: "Active Boxes", yolov5: filteredResult?.yolov5?.num_objects ?? 0, detr: filteredResult?.detr?.num_objects ?? 0 },
      { name: "FPS", yolov5: +yoloFps.toFixed(0), detr: +detrFps.toFixed(0) },
    ];
  }, [metrics, filteredResult]);

  // Latency histogram data with safety
  const latencyChartData = useMemo(() => {
    const yolo = Array.isArray(analyticsData?.latencyDistYolo) ? analyticsData.latencyDistYolo : [];
    const detr = Array.isArray(analyticsData?.latencyDistDetr) ? analyticsData.latencyDistDetr : [];

    // Merge by bin index
    const merged = [];
    const maxLen = Math.max(yolo.length, detr.length);
    for (let i = 0; i < maxLen; i++) {
      merged.push({
        bin: yolo[i]?.bin || detr[i]?.bin || `bin${i}`,
        yolov5: yolo[i]?.count ?? 0,
        detr: detr[i]?.count ?? 0,
        y_ms: yolo[i]?.ms || null,
        d_ms: detr[i]?.ms || null,
      });
    }
    return merged;
  }, [analyticsData]);

  // Statistics
  const stats = useMemo(() => {
    const yArr = inferenceHistory.filter(h => h.model === 'yolov5').map(h => h.latency_ms);
    const dArr = inferenceHistory.filter(h => h.model === 'detr').map(h => h.latency_ms);

    const mean = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const std = (arr: number[]) => {
      const m = mean(arr);
      return arr.length ? Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length) : 0;
    };

    return {
      yolov5: { mean: mean(yArr), max: Math.max(...yArr, 0), min: Math.min(...yArr, 0), std: std(yArr) },
      detr: { mean: mean(dArr), max: Math.max(...dArr, 0), min: Math.min(...dArr, 0), std: std(dArr) }
    };
  }, [inferenceHistory]);

  if (!hasData) {
    return (
      <section id="metrics" className="py-20 bg-background relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-border text-accent text-[10px] font-mono-premium uppercase tracking-[0.3em] mb-6 shadow-premium">
              <Activity size={14} />
              Analytics Engine
            </div>
            <h2 className="text-5xl sm:text-7xl font-black mb-6 tracking-tighter">
              Performance <span className="text-brand-gradient">Analytics</span>
            </h2>
          </motion.div>
          <div className="glass-card p-16 rounded-[3.5rem] bg-white/40 border-white/50 shadow-premium text-center">
            <AlertCircle size={48} className="text-muted-foreground/30 mx-auto mb-6" />
            <h3 className="text-2xl font-black tracking-tight mb-3 text-foreground/60">Awaiting Inference Data</h3>
            <p className="text-muted-foreground max-w-lg mx-auto text-lg">
              Run inference above to generate real-time analytics. All charts are computed dynamically from actual model outputs — <strong>zero synthetic data</strong>.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 text-[10px] font-mono-premium uppercase tracking-widest text-muted-foreground/50">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Analytics engine standing by
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="metrics" className="py-20 bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-accent/5 blur-[120px] rounded-full -ml-64 -mt-64 animate-float" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-8"
        >
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-border text-accent text-[10px] font-mono-premium uppercase tracking-[0.3em] mb-6 shadow-premium">
              <Activity size={14} className="animate-pulse" />
              Live Analytics Engine
            </div>
            <h2 className="text-5xl sm:text-7xl font-black mb-4 tracking-tighter leading-tight">
              Performance <span className="text-brand-gradient">Analytics</span>
            </h2>
            <p className="text-muted-foreground text-xl font-medium tracking-tight">
              All metrics below are <span className="text-foreground font-bold">dynamically computed</span> from your {inferenceCount} inference run{inferenceCount > 1 ? 's' : ''}.
            </p>
          </div>

          <div className="flex flex-col items-end gap-6">
            <div className="glass-card px-6 py-4 rounded-3xl border border-white/60 shadow- premium flex items-center gap-6">
              <div className="flex flex-col gap-1 min-w-[120px]">
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  <span>Sensitivity</span>
                  <span className="text-primary font-mono">{(confidence * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={confidence}
                  onChange={(e) => setConfidence(parseFloat(e.target.value))}
                  className="w-full h-1 bg-secondary rounded-full appearance-none cursor-pointer accent-primary"
                />
              </div>
              <div className="h-8 w-[1px] bg-border/50" />
              <IntegrityBadge />
            </div>

            <button
              onClick={() => window.open('/api/health/integrity', '_blank')}
              className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all duration-300"
            >
              <ShieldCheck size={14} className="group-hover:scale-110 transition-transform" />
              Download System Health Report
            </button>
          </div>
        </motion.div>

        {analyticsLoading && (
          <div className="flex items-center justify-center gap-3 mb-8 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Updating analytics...
          </div>
        )}

        {/* Row 1: mAP Comparison + Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* mAP Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="glass-card p-8 rounded-[2.5rem] bg-white/40 border-white/50 shadow-premium"
          >
            <h4 className="text-[10px] font-mono-premium font-black uppercase tracking-[0.3em] text-muted-foreground mb-8 flex items-center gap-2">
              <TrendingUp size={14} /> Model Comparison
            </h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={mapCompareData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="yolov5" name="YOLOv5" fill="#22c55e" radius={[8, 8, 0, 0]} />
                <Bar dataKey="detr" name="DETR" fill="#a855f7" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Radar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-8 rounded-[2.5rem] bg-white/40 border-white/50 shadow-premium"
          >
            <h4 className="text-[10px] font-mono-premium font-black uppercase tracking-[0.3em] text-muted-foreground mb-8 flex items-center gap-2">
              <Target size={14} /> Architecture Comparison Radar
            </h4>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(0,0,0,0.08)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fontWeight: 700 }} />
                  <PolarRadiusAxis tick={{ fontSize: 8 }} domain={[0, 100]} />
                  <Radar name="YOLOv5" dataKey="yolov5" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} strokeWidth={2} />
                  <Radar name="DETR" dataKey="detr" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #e5e7eb', fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">Run both models to see comparison</div>
            )}
          </motion.div>
        </div>

        {/* Row 2: PR Curve + Per-Class AP */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* PR Curve */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="glass-card p-8 rounded-[2.5rem] bg-white/40 border-white/50 shadow-premium"
          >
            <h4 className="text-[10px] font-mono-premium font-black uppercase tracking-[0.3em] text-muted-foreground mb-8 flex items-center gap-2">
              <BarChart3 size={14} /> Precision-Recall Curve
            </h4>
            {(analyticsData.prCurveYolo.length > 0 || analyticsData.prCurveDetr.length > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="recall" type="number" domain={[0, 1]} tick={{ fontSize: 10 }} label={{ value: "Recall", position: "insideBottom", offset: -5, fontSize: 10 }} />
                  <YAxis type="number" domain={[0, 1]} tick={{ fontSize: 10 }} label={{ value: "Precision", angle: -90, position: "insideLeft", fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  {analyticsData.prCurveYolo.length > 0 && (
                    <Line data={analyticsData.prCurveYolo} dataKey="precision" name="YOLOv5" stroke="#22c55e" strokeWidth={2} dot={false} />
                  )}
                  {analyticsData.prCurveDetr.length > 0 && (
                    <Line data={analyticsData.prCurveDetr} dataKey="precision" name="DETR" stroke="#a855f7" strokeWidth={2} dot={false} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                PR curves computed after VOC ground truth evaluation
              </div>
            )}
          </motion.div>

          {/* Per-Class AP */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-8 rounded-[2.5rem] bg-white/40 border-white/50 shadow-premium"
          >
            <h4 className="text-[10px] font-mono-premium font-black uppercase tracking-[0.3em] text-muted-foreground mb-8 flex items-center gap-2">
              <Target size={14} /> Per-Class Average Precision
            </h4>
            {analyticsData.perClassData.filter(d => d.yolov5_ap > 0 || d.detr_ap > 0).length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analyticsData.perClassData.filter(d => d.yolov5_ap > 0 || d.detr_ap > 0)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} domain={[0, 1]} />
                  <YAxis dataKey="class" type="category" tick={{ fontSize: 9 }} width={80} />
                  <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Bar dataKey="yolov5_ap" name="YOLOv5" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="detr_ap" name="DETR" fill="#a855f7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                <ShieldAlert size={24} className="opacity-20" />
                <span>No detections for these classes in VOC ground truth</span>
                <p className="text-[10px] text-center max-w-[200px]">Perform inference on VOC-sourced images to see Average Precision scoring.</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Row 3: Latency Distribution + FPS Over Time */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Latency Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="glass-card p-8 rounded-[2.5rem] bg-white/40 border-white/50 shadow-premium"
          >
            <div className="flex justify-between items-start mb-8">
              <h4 className="text-[10px] font-mono-premium font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                <Activity size={14} /> Latency Distribution (Real-Time Profile)
              </h4>
              <div className="flex gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-bold text-emerald-600 uppercase">YOLOv5 σ</span>
                  <span className="text-xs font-mono font-black">{stats.yolov5.std.toFixed(2)}ms</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-bold text-purple-600 uppercase">DETR σ</span>
                  <span className="text-xs font-mono font-black">{stats.detr.std.toFixed(2)}ms</span>
                </div>
              </div>
            </div>
            {latencyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={latencyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="bin" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Bar dataKey="yolov5" name="YOLOv5" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="detr" name="DETR" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                Run multiple inferences for latency distribution
              </div>
            )}
          </motion.div>

          {/* FPS Over Time */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-8 rounded-[2.5rem] bg-white/40 border-white/50 shadow-premium"
          >
            <h4 className="text-[10px] font-mono-premium font-black uppercase tracking-[0.3em] text-muted-foreground mb-8 flex items-center gap-2">
              <Zap size={14} /> FPS Over Time — Real Measurements
            </h4>
            {fpsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={fpsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="run" tick={{ fontSize: 10 }} label={{ value: "Run #", position: "insideBottom", offset: -5, fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} label={{ value: "FPS", angle: -90, position: "insideLeft", fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Area type="monotone" dataKey="yolov5" name="YOLOv5" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={2} connectNulls />
                  <Area type="monotone" dataKey="detr" name="DETR" stroke="#a855f7" fill="#a855f7" fillOpacity={0.1} strokeWidth={2} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                Run multiple inferences for FPS over time
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default MetricsDashboard;
