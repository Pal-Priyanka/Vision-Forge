import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
    BarChart, Image as ImageIcon, Search, Database,
    Tag, Download, ExternalLink, Filter, TrendingUp,
    Shield, CheckCircle2, AlertCircle, Loader2, Info, Maximize2, Layers, Zap
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getDatasetStats, getDatasetSamples, evaluateSubset, DatasetStats, DatasetSample, SubsetEvalResult } from "../utils/api";

const DatasetShowcase = () => {
    const [activeTab, setActiveTab] = useState<"stats" | "samples" | "benchmark">("stats");
    const [selectedSubset, setSelectedSubset] = useState(0.1);
    const [benchmarkModel, setBenchmarkModel] = useState<"yolov5" | "detr">("yolov5");
    const [benchmarkResult, setBenchmarkResult] = useState<SubsetEvalResult | null>(null);
    const [benchmarking, setBenchmarking] = useState(false);
    const [benchmarkHistory, setBenchmarkHistory] = useState<any[]>([]);

    const { data: stats, isLoading: statsLoading } = useQuery<DatasetStats>({
        queryKey: ["dataset-stats"],
        queryFn: () => getDatasetStats(),
    });

    const { data: samples, isLoading: samplesLoading } = useQuery<DatasetSample[]>({
        queryKey: ["dataset-samples"],
        queryFn: () => getDatasetSamples(),
    });

    const handleRunBenchmark = async () => {
        setBenchmarking(true);
        try {
            const result = await evaluateSubset(benchmarkModel, selectedSubset, 0.5);
            setBenchmarkResult(result);

            // Add to history for trend chart
            setBenchmarkHistory(prev => {
                const newPoint = {
                    subset: selectedSubset * 100,
                    mAP: result.mAP_50 * 100,
                    model: benchmarkModel
                };
                // Keep only one point per subset/model combo for the chart
                const filtered = prev.filter(p => !(p.subset === newPoint.subset && p.model === newPoint.model));
                return [...filtered, newPoint].sort((a, b) => a.subset - b.subset);
            });
        } catch (err) {
            console.error("Benchmark failed:", err);
        } finally {
            setBenchmarking(false);
        }
    };

    return (
        <section id="dataset" className="py-20 relative overflow-hidden bg-background">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -mr-64 -mt-64 animate-float" />
            <div className="absolute inset-0 grid-pattern-light opacity-30 pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-8"
                >
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-border text-accent text-[10px] font-mono-premium uppercase tracking-[0.3em] mb-6 shadow-premium">
                            <Database size={14} className="animate-pulse" />
                            Source Knowledge Base
                        </div>
                        <h2 className="text-5xl sm:text-7xl font-black mb-4 tracking-tighter leading-tight">
                            Dataset <span className="text-brand-gradient">Showcase</span>
                        </h2>
                        <p className="text-muted-foreground text-xl font-medium tracking-tight">
                            Exploring the <span className="text-foreground">Pascal VOC 2012</span> benchmark. A gold standard for visual object class recognition.
                        </p>
                    </div>

                    <div className="flex p-2 bg-secondary/50 rounded-3xl border border-border/50 shadow-premium w-fit backdrop-blur-xl">
                        {(["stats", "samples", "benchmark"] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ease-[0.23, 1, 0.32, 1] flex items-center gap-2 ${activeTab === tab ? "bg-foreground text-background shadow-premium" : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                {tab === "stats" && <><BarChart size={14} /> Metrics</>}
                                {tab === "samples" && <><ImageIcon size={14} /> Samples</>}
                                {tab === "benchmark" && <><TrendingUp size={14} /> Benchmark</>}
                            </button>
                        ))}
                    </div>
                </motion.div>

                <AnimatePresence mode="wait">
                    {activeTab === "stats" && (
                        <motion.div
                            key="stats"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                            className="space-y-8"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <StatCard
                                    label="Total Imagery"
                                    value={stats?.total_images ?? "-"}
                                    icon={<Database size={24} />}
                                    loading={statsLoading}
                                    color="text-primary"
                                />
                                <StatCard
                                    label="Neural Annotations"
                                    value={stats?.total_annotations ?? "-"}
                                    icon={<Layers size={24} />}
                                    loading={statsLoading}
                                    color="text-accent"
                                />
                                <StatCard
                                    label="Unique Classes"
                                    value={stats?.num_classes ?? "20"}
                                    icon={<Info size={24} />}
                                    loading={statsLoading}
                                    color="text-emerald-500"
                                />
                                <StatCard
                                    label="Avg/Image"
                                    value={stats ? Math.round(stats.total_annotations / stats.total_images) : "-"}
                                    icon={<Maximize2 size={24} />}
                                    loading={statsLoading}
                                    color="text-purple-500"
                                />
                            </div>

                            <div className="glass-card p-8 rounded-[3.5rem] bg-white/40 border-white/50 shadow-premium">
                                <h4 className="text-[10px] font-mono-premium font-black uppercase tracking-[0.4em] text-muted-foreground mb-8">Class Distribution</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                                    {stats?.class_distribution && Object.entries(stats.class_distribution).slice(0, 10).map(([cls, count], i) => (
                                        <motion.div
                                            key={cls}
                                            initial={{ opacity: 0, x: -10 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="space-y-3"
                                        >
                                            <div className="flex justify-between items-end">
                                                <span className="text-xs font-black uppercase tracking-tight">{cls}</span>
                                                <span className="text-[10px] font-mono-premium text-muted-foreground font-bold">{count}</span>
                                            </div>
                                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden p-[1px] border border-border/50">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    whileInView={{ width: `${Math.min(100, (count / (stats?.total_annotations || 1)) * 500)}%` }}
                                                    transition={{ duration: 1.5, ease: [0.23, 1, 0.32, 1], delay: i * 0.1 }}
                                                    className="h-full bg-foreground rounded-full shadow-lg shadow-foreground/10"
                                                />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === "samples" && (
                        <motion.div
                            key="samples"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.02 }}
                            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6"
                        >
                            {samplesLoading ? (
                                <div className="col-span-6 flex items-center justify-center py-20">
                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                </div>
                            ) : (
                                samples?.map((sample, idx) => (
                                    <motion.div
                                        key={idx}
                                        whileHover={{ y: -8, scale: 1.02 }}
                                        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                                        className="aspect-square glass-card rounded-3xl overflow-hidden cursor-pointer relative group bg-white/40 shadow-premium border-white/50"
                                    >
                                        <img
                                            src={`data:image/jpeg;base64,${sample.data}`}
                                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110"
                                            alt={sample.filename}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end p-5">
                                            <span className="text-[10px] font-mono-premium font-black uppercase tracking-widest text-background truncate">{sample.filename}</span>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </motion.div>
                    )}

                    {activeTab === "benchmark" && (
                        <motion.div
                            key="benchmark"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            <div className="glass-card p-8 rounded-[2.5rem] bg-white/40 border-white/50 shadow-premium">
                                <h4 className="text-[10px] font-mono-premium font-black uppercase tracking-[0.3em] text-muted-foreground mb-8">
                                    Dataset Subset Evaluation
                                </h4>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-end">
                                    {/* Model Selector */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-mono-premium uppercase tracking-[0.2em] text-muted-foreground">Architecture</label>
                                        <div className="flex p-1 bg-secondary/50 rounded-xl border border-border/50">
                                            {(["yolov5", "detr"] as const).map((m) => (
                                                <button
                                                    key={m}
                                                    onClick={() => setBenchmarkModel(m)}
                                                    className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${benchmarkModel === m ? "bg-foreground text-background" : "text-muted-foreground"}`}
                                                >
                                                    {m === "yolov5" ? "YOLOv5" : "DETR"}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Subset Selector Slider */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center ml-1">
                                            <label className="text-[10px] font-mono-premium uppercase tracking-[0.3em] text-muted-foreground">Subset Magnitude</label>
                                            <span className="text-xs font-mono-premium font-black text-primary">{(selectedSubset * 100)}%</span>
                                        </div>
                                        <div className="px-2">
                                            <input
                                                type="range"
                                                min="0.1"
                                                max="1.0"
                                                step="0.05"
                                                value={selectedSubset}
                                                onChange={(e) => setSelectedSubset(parseFloat(e.target.value))}
                                                className="w-full h-1.5 bg-secondary rounded-full appearance-none cursor-pointer accent-primary"
                                            />
                                            <div className="flex justify-between mt-2 text-[8px] font-mono text-muted-foreground uppercase tracking-widest">
                                                <span>Fast Check (10%)</span>
                                                <span>Full Deep (100%)</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Run Button */}
                                    <button
                                        onClick={handleRunBenchmark}
                                        disabled={benchmarking}
                                        className={`py-4 px-8 rounded-2xl text-sm font-black uppercase tracking-widest bg-foreground text-background transition-all shadow-2xl ${benchmarking ? "opacity-50 cursor-not-allowed" : "hover:bg-primary hover:shadow-glow-primary"}`}
                                    >
                                        {benchmarking ? (
                                            <span className="flex items-center justify-center gap-3">
                                                <Loader2 className="w-4 h-4 animate-spin" /> Evaluating...
                                            </span>
                                        ) : (
                                            "Run Benchmark"
                                        )}
                                    </button>
                                </div>
                            </div>

                            {benchmarkResult && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="glass-card p-8 rounded-[2.5rem] bg-white/40 border-white/50 shadow-premium"
                                >
                                    <h4 className="text-[10px] font-mono-premium font-black uppercase tracking-[0.3em] text-muted-foreground mb-8">
                                        Evaluation Results — {benchmarkResult.model.toUpperCase()} on {(benchmarkResult.subset_pct * 100)}% subset
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                                        <div className="p-5 rounded-2xl bg-white/50 border border-white/60">
                                            <div className="text-[10px] font-mono-premium text-muted-foreground uppercase mb-1">mAP@50</div>
                                            <div className="text-3xl font-black tracking-tighter">{(benchmarkResult.mAP_50 * 100).toFixed(1)}%</div>
                                        </div>
                                        <div className="p-5 rounded-2xl bg-white/50 border border-white/60">
                                            <div className="text-[10px] font-mono-premium text-muted-foreground uppercase mb-1">Images</div>
                                            <div className="text-3xl font-black tracking-tighter">{benchmarkResult.subset_size}</div>
                                        </div>
                                        <div className="p-5 rounded-2xl bg-white/50 border border-white/60">
                                            <div className="text-[10px] font-mono-premium text-muted-foreground uppercase mb-1">Avg Latency</div>
                                            <div className="text-3xl font-black tracking-tighter">{benchmarkResult.avg_latency_ms.toFixed(0)}ms</div>
                                        </div>
                                        <div className="p-5 rounded-2xl bg-white/50 border border-white/60">
                                            <div className="text-[10px] font-mono-premium text-muted-foreground uppercase mb-1">Total Time</div>
                                            <div className="text-3xl font-black tracking-tighter">{benchmarkResult.total_time_s.toFixed(1)}s</div>
                                        </div>
                                    </div>

                                    {/* Per-class AP breakdown */}
                                    <h4 className="text-[10px] font-mono-premium font-black uppercase tracking-[0.3em] text-muted-foreground mb-4">Per-Class AP Breakdown</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {benchmarkResult.per_class_ap && Object.entries(benchmarkResult.per_class_ap)
                                            .filter(([, ap]) => ap > 0)
                                            .sort((a, b) => b[1] - a[1])
                                            .map(([cls, ap]) => (
                                                <div key={cls} className="flex items-center justify-between p-3 rounded-xl bg-white/30 border border-white/50">
                                                    <span className="text-xs font-bold capitalize">{cls}</span>
                                                    <span className="text-[10px] font-mono-premium text-primary font-bold">{(ap * 100).toFixed(1)}%</span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </motion.div>
                            )}

                            {/* Trend Chart */}
                            {benchmarkHistory.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="glass-card p-8 rounded-[2.5rem] bg-white/40 border-white/50 shadow-premium"
                                >
                                    <h4 className="text-[10px] font-mono-premium font-black uppercase tracking-[0.3em] text-muted-foreground mb-8 flex items-center gap-2">
                                        <TrendingUp size={14} /> Performance vs Dataset Scale (Trend)
                                    </h4>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <LineChart data={benchmarkHistory}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                            <XAxis
                                                dataKey="subset"
                                                type="number"
                                                domain={[0, 100]}
                                                unit="%"
                                                tick={{ fontSize: 10 }}
                                                label={{ value: 'Subset Size', position: 'insideBottom', offset: -5, fontSize: 10 }}
                                            />
                                            <YAxis
                                                domain={[0, 100]}
                                                tick={{ fontSize: 10 }}
                                                label={{ value: 'mAP@50', angle: -90, position: 'insideLeft', fontSize: 10 }}
                                            />
                                            <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #e5e7eb', fontSize: 12 }} />
                                            <Line
                                                type="monotone"
                                                dataKey="mAP"
                                                stroke="#0061e0"
                                                strokeWidth={3}
                                                dot={{ r: 4, fill: '#0061e0' }}
                                                name="Precision Trend"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                    <p className="mt-4 text-[10px] text-muted-foreground text-center italic">
                                        Trend visualized from accumulated sub-benchmarks. Accuracy typically scales non-linearly with data density.
                                    </p>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
};

interface StatCardProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    loading?: boolean;
    color: string;
}

const StatCard = ({ label, value, icon, loading, color }: StatCardProps) => (
    <div className="glass-card p-8 rounded-[2.5rem] flex flex-col gap-4 bg-white/40 border-white/50 shadow-premium group hover:bg-white hover:shadow-2xl transition-all duration-700 hover:-translate-y-2">
        <div className="flex items-center justify-between">
            <div className={`p-3 rounded-2xl bg-secondary ${color} group-hover:bg-foreground group-hover:text-background transition-all duration-700 shadow-premium`}>
                {icon}
            </div>
            <div className="w-3 h-3 rounded-full bg-secondary animate-pulse" />
        </div>
        <div>
            <p className="text-[10px] font-mono-premium font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">{label}</p>
            <h3 className="text-3xl font-black tracking-tighter text-foreground">{loading ? <span className="animate-pulse opacity-20">...</span> : value}</h3>
        </div>
    </div>
);

export default DatasetShowcase;
