import { motion } from "framer-motion";
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Radio, Wifi, WifiOff, Cpu, Gauge, Clock, RefreshCw, Activity } from "lucide-react";
import { useTelemetryStream } from "../hooks/useTelemetryStream";

const TrainingLiveView = () => {
    const {
        events,
        inferenceEvents,
        latestEvent,
        isConnected,
        error,
        reconnect,
        rollingFPS,
        latencyVariance,
    } = useTelemetryStream();

    // Prepare chart data from inference events
    const fpsChartData = inferenceEvents.slice(-30).map((e, i) => ({
        idx: i + 1,
        fps: e.fps ?? 0,
        latency: e.latency_ms ?? 0,
    }));

    const latencyChartData = inferenceEvents.slice(-30).map((e, i) => ({
        idx: i + 1,
        latency: e.latency_ms ?? 0,
    }));

    return (
        <section id="telemetry" className="py-20 relative overflow-hidden bg-background">
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-accent/5 blur-[120px] rounded-full -ml-64 -mt-64 animate-float" />
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
                            <Radio size={14} className={isConnected ? "animate-pulse text-emerald-400" : "text-red-400"} />
                            Neural Telemetry Stream
                        </div>
                        <h2 className="text-5xl sm:text-7xl font-black mb-4 tracking-tighter leading-tight">
                            Live <span className="text-brand-gradient">Telemetry</span>
                        </h2>
                        <p className="text-muted-foreground text-xl font-medium tracking-tight">
                            Real-time inference monitoring via Server-Sent Events. Rolling FPS, latency variance, and packet-level event stream.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs font-bold shadow-sm ${isConnected
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                            : "bg-red-50 border border-red-200 text-red-700"
                            }`}>
                            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                            {isConnected ? "SSE Connected" : "Disconnected"}
                        </div>
                        {!isConnected && (
                            <button
                                onClick={reconnect}
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-foreground text-background text-xs font-bold shadow-premium hover:bg-primary transition-all"
                            >
                                <RefreshCw size={14} /> Reconnect
                            </button>
                        )}
                    </div>
                </motion.div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="glass-card p-8 rounded-[2.5rem] bg-white/40 border-white/50 shadow-premium"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-600">
                                <Gauge size={20} />
                            </div>
                            <div className={`w-2.5 h-2.5 rounded-full ${inferenceEvents.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                        </div>
                        <p className="text-[10px] font-mono-premium font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">Rolling FPS</p>
                        <h3 className="text-4xl font-black tracking-tighter">{rollingFPS > 0 ? rollingFPS.toFixed(1) : "—"}</h3>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="glass-card p-8 rounded-[2.5rem] bg-white/40 border-white/50 shadow-premium"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-2xl bg-purple-100 text-purple-600">
                                <Clock size={20} />
                            </div>
                            <div className={`w-2.5 h-2.5 rounded-full ${inferenceEvents.length > 0 ? 'bg-purple-500 animate-pulse' : 'bg-gray-300'}`} />
                        </div>
                        <p className="text-[10px] font-mono-premium font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">Latency Variance</p>
                        <h3 className="text-4xl font-black tracking-tighter">{latencyVariance > 0 ? `${latencyVariance.toFixed(1)}ms²` : "—"}</h3>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass-card p-8 rounded-[2.5rem] bg-white/40 border-white/50 shadow-premium"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-2xl bg-blue-100 text-blue-600">
                                <Cpu size={20} />
                            </div>
                            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`} />
                        </div>
                        <p className="text-[10px] font-mono-premium font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">Inference Events</p>
                        <h3 className="text-4xl font-black tracking-tighter">{inferenceEvents.length}</h3>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* FPS Chart */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="glass-card p-8 rounded-[2.5rem] bg-white/40 border-white/50 shadow-premium"
                    >
                        <h4 className="text-[10px] font-mono-premium font-black uppercase tracking-[0.3em] text-muted-foreground mb-8 flex items-center gap-2">
                            <Activity size={14} /> Rolling FPS — Live
                        </h4>
                        {fpsChartData.length > 1 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={fpsChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                    <XAxis dataKey="idx" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #e5e7eb', fontSize: 12 }} />
                                    <Line type="monotone" dataKey="fps" stroke="#22c55e" strokeWidth={2} dot={false} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                                Run inference to see live FPS stream
                            </div>
                        )}
                    </motion.div>

                    {/* Matrix Logs */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="glass-card p-8 rounded-[2.5rem] bg-[#050505] border-white/10 shadow-matrix overflow-hidden relative"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
                            <Activity size={40} className="text-emerald-500" />
                        </div>
                        <h4 className="text-[10px] font-mono-premium font-black uppercase tracking-[0.3em] text-emerald-500/50 mb-6 flex items-center gap-2">
                            <Cpu size={14} /> Neural Processing Logs
                        </h4>
                        <div className="h-[180px] overflow-y-auto space-y-1 font-mono text-[10px] custom-scrollbar-dark pr-4">
                            {events.slice(-50).reverse().map((event, i) => (
                                <div key={i} className="flex gap-2 leading-relaxed">
                                    <span className="text-emerald-500/30 whitespace-nowrap">[{new Date(event.timestamp! * 1000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                                    <span className={event.type === 'profiling_update' ? 'text-blue-400' : 'text-emerald-400'}>
                                        {event.log || `${event.type.toUpperCase()}: ${event.model || 'SYSTEM'}`}
                                    </span>
                                </div>
                            ))}
                            {events.length === 0 && (
                                <div className="text-emerald-900/50 animate-pulse">SYSTEM_IDLE: Awaiting input stream...</div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Event Stream */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    className="glass-card p-8 rounded-[2.5rem] bg-white/40 border-white/50 shadow-premium"
                >
                    <h4 className="text-[10px] font-mono-premium font-black uppercase tracking-[0.3em] text-muted-foreground mb-8 flex items-center gap-2">
                        <Radio size={14} className={isConnected ? "animate-pulse" : ""} /> Packet Event Stream
                    </h4>
                    <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                        {inferenceEvents.length > 0 ? (
                            [...inferenceEvents].reverse().slice(0, 20).map((event, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-4 py-2 px-4 rounded-xl bg-white/50 border border-white/60 text-xs font-mono"
                                >
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${event.model === 'yolov5' ? 'bg-emerald-500' : 'bg-purple-500'}`} />
                                    <span className="font-bold uppercase text-[10px] w-12 flex-shrink-0">{event.model}</span>
                                    <span className="text-muted-foreground flex-1">{event.num_detections} detections</span>
                                    <span className="text-muted-foreground">{event.latency_ms?.toFixed(0)}ms</span>
                                    <span className="text-muted-foreground">{event.fps?.toFixed(0)} FPS</span>
                                </motion.div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                {isConnected ? "Waiting for inference events..." : "Connect to see live events"}
                            </div>
                        )}
                    </div>
                </motion.div>

                {error && (
                    <div className="mt-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
                        {error}
                    </div>
                )}
            </div>
        </section>
    );
};

export default TrainingLiveView;
