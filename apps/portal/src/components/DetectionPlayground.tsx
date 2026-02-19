import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Image as ImageIcon, SplitSquareHorizontal, Crosshair, Clock, BarChart3, Tag,
  Target, Loader2, Zap
} from "lucide-react";
import { useInference } from "../context/InferenceContext";
import { DetectionResponse, ModelResult } from "../types/detection.types";
import { toast } from "sonner";

type Model = "yolov5" | "detr";

const MODEL_LABELS: Record<string, string> = {
  yolov5: "CNN (YOLOv5)",
  detr: "Transformer (DETR)",
};

const MODEL_COLORS: Record<string, string> = {
  yolov5: "text-emerald-400",
  detr: "text-purple-400",
};

const qualityColor = (conf: number) => {
  if (conf >= 0.8) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (conf >= 0.5) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-red-500 bg-red-50 border-red-200";
};

const DetectionPlayground = () => {
  const { runInference, isRunning, latestResult, filteredResult, confidence, setConfidence, inferenceCount, modelStatus } = useInference();
  const [selectedModel, setSelectedModel] = useState<Model>("yolov5");
  const [compareModel, setCompareModel] = useState<Model>("detr");
  const [dualMode, setDualMode] = useState(false);
  const [iouThreshold, setIouThreshold] = useState(0.45);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRunDetection = async () => {
    if (!selectedImage) {
      toast.error("Please upload an image first.");
      return;
    }

    const mode = dualMode ? "both" : selectedModel;
    const base64Image = selectedImage.includes(',') ? selectedImage.split(',')[1] : selectedImage;

    const result = await runInference(base64Image, mode as any, confidence, iouThreshold);
    if (result) {
      toast.success(`Inference #${inferenceCount + 1} complete — metrics updated!`);
    } else {
      toast.error("Detection failed. Is the backend running?");
    }
  };

  const renderDetectionView = (model: Model) => {
    const data = filteredResult?.[model];
    const isModelReady = model === 'yolov5' || (model === 'detr' && modelStatus?.detr?.status === 'Ready');

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className={`font-semibold ${MODEL_COLORS[model]}`}>{MODEL_LABELS[model]}</span>
          {data && <span className="font-mono text-xs text-muted-foreground">{data.inference_time_ms ? `${data.inference_time_ms.toFixed(1)}ms` : '—'}</span>}
        </div>

        <div className="relative aspect-video rounded-xl bg-black/40 border border-border/50 overflow-hidden group">
          {selectedImage ? (
            <img
              src={data?.image_with_boxes ? data.image_with_boxes : selectedImage}
              className="w-full h-full object-contain"
              alt="Source"
              onError={(e) => {
                (e.target as HTMLImageElement).src = selectedImage;
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 flex-col gap-2">
              <ImageIcon size={48} />
              <span className="text-xs uppercase tracking-widest font-bold">No Image Source</span>
            </div>
          )}

          {isRunning && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <span className="text-sm font-bold tracking-widest uppercase animate-pulse">Processing...</span>
              </div>
            </div>
          )}

          {!isModelReady && !isRunning && selectedImage && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] flex items-center justify-center">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-200 text-[10px] font-black uppercase tracking-widest">
                <Loader2 size={12} className="animate-spin" /> Engine Warming...
              </div>
            </div>
          )}
        </div>

        {data && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-4 grid grid-cols-2 gap-3 text-sm font-mono"
          >
            <div className="flex items-center gap-2">
              <Crosshair size={14} className="text-emerald-400" />
              <span className="text-muted-foreground text-[10px] uppercase">Objects:</span>
              <span className="text-foreground font-bold">{data.num_objects ?? 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-primary" />
              <span className="text-muted-foreground text-[10px] uppercase">Latency:</span>
              <span className="text-foreground font-bold">{data.inference_time_ms ? data.inference_time_ms.toFixed(0) : 0}ms</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 size={14} className="text-purple-400" />
              <span className="text-muted-foreground text-[10px] uppercase">Avg Conf:</span>
              <span className="text-foreground font-bold">{((data.avg_confidence || 0) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2 overflow-hidden">
              <Tag size={14} className="text-accent" />
              <span className="text-muted-foreground text-[10px] uppercase truncate">Classes:</span>
              <span className="text-foreground font-bold text-[10px] truncate">
                {Array.isArray(data.detections) ? [...new Set(data.detections.map(d => d.class))].slice(0, 2).join(", ") : "—"}
                {Array.isArray(data.detections) && new Set(data.detections.map(d => d.class)).size > 2 ? "..." : ""}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  const renderInsightsPanel = (model: Model) => {
    const data = filteredResult?.[model];
    if (!data) return null;

    const filteredDetections = data.detections;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <div className="glass rounded-xl p-5">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-text-secondary flex items-center gap-2 mb-4">
            <Target size={14} className="text-primary" />
            Detection Breakdown
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
            {filteredDetections.length > 0 ? (
              filteredDetections.map((det, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${MODEL_COLORS[model].replace('text-', 'bg-')}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold capitalize">{det.class}</span>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${qualityColor(det.confidence)}`}>
                        {(det.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">No objects detected.</p>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <section id="playground" className="py-20 relative overflow-hidden bg-background">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full -mr-64 -mt-64 animate-float" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/5 blur-[120px] rounded-full -ml-64 -mb-64 animate-float" style={{ animationDelay: "2s" }} />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-border text-accent text-[10px] font-mono-premium uppercase tracking-[0.3em] mb-6 shadow-premium">
            <Zap size={14} className="animate-pulse" />
            Live Inference Arena
          </div>
          <h2 className="text-5xl sm:text-7xl font-black mb-6 tracking-tighter">
            Vision <span className="text-brand-gradient">Forge</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-xl font-medium tracking-tight">
            Upload an image and run real-time inference to generate dynamic analytics below.
          </p>
          {inferenceCount > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {inferenceCount} inference{inferenceCount > 1 ? 's' : ''} completed — analytics live
            </div>
          )}
        </motion.div>

        {/* Control Center */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-[2.5rem] p-8 mb-12 border border-white/40 shadow-premium bg-white/40"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-end">
            {/* Architecture Selector */}
            <div className="space-y-4">
              <label className="text-[10px] font-mono-premium uppercase tracking-[0.3em] text-muted-foreground ml-1">Architecture Toggle</label>
              <div className="flex p-2 bg-secondary/50 rounded-2xl border border-border/50">
                {(Object.keys(MODEL_LABELS) as Model[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedModel(m)}
                    className={`flex-1 py-4 rounded-xl text-xs font-bold transition-all duration-500 ease-[0.23, 1, 0.32, 1] ${selectedModel === m
                      ? "bg-foreground text-background shadow-premium"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                      }`}
                  >
                    {MODEL_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            {/* Confidence Gate */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-mono-premium uppercase tracking-[0.3em] text-muted-foreground">Confidence Gate</label>
                <span className="text-xs font-mono-premium font-black text-primary">{(confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="px-2">
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={confidence}
                  onChange={(e) => setConfidence(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-secondary rounded-full appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => setDualMode(!dualMode)}
                className={`flex-1 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all duration-500 flex items-center justify-center gap-3 interaction-bounce ${dualMode ? "bg-primary/10 border-primary/30 text-primary shadow-glow-primary" : "bg-white/50 border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                  }`}
              >
                <SplitSquareHorizontal size={16} />
                Compare Models
              </button>
              <button
                onClick={handleRunDetection}
                disabled={!selectedImage || isRunning}
                className={`flex-[1.5] py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-foreground text-background flex items-center justify-center gap-3 transition-all duration-500 shadow-2xl interaction-bounce ${(!selectedImage || isRunning) ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:bg-primary hover:shadow-glow-primary'}`}
              >
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" fill="currentColor" />}
                Run Inference
              </button>
            </div>
          </div>
        </motion.div>

        {/* Dynamic Workspace */}
        <AnimatePresence mode="wait">
          {!selectedImage ? (
            <motion.div
              key="uploader"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              onClick={() => fileInputRef.current?.click()}
              className="group glass-card border-dashed border-2 border-border/50 rounded-[3.5rem] p-24 text-center cursor-pointer hover:border-primary/50 transition-all duration-700 hover:bg-primary/[0.02] shadow-premium bg-white/20"
            >
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
              <div className="w-24 h-24 bg-secondary rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 shadow-premium">
                <Upload size={40} className="text-primary" />
              </div>
              <h3 className="text-3xl font-black mb-3 tracking-tight">Upload Image</h3>
              <p className="text-muted-foreground font-medium text-lg tracking-tight">Drop your inference samples or <span className="text-primary underline decoration-2 underline-offset-4">browse library</span></p>
            </motion.div>
          ) : (
            <motion.div
              key="arena"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className={`grid gap-8 ${dualMode ? "lg:grid-cols-2" : "max-w-5xl mx-auto"}`}
            >
              {[selectedModel, dualMode ? compareModel : null].filter(Boolean).map((m, idx) => (
                <div key={idx} className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${m === 'yolov5' ? 'bg-primary' : 'bg-accent'}`} />
                      <span className="text-[10px] font-mono-premium font-black uppercase tracking-[0.2em] text-foreground">{MODEL_LABELS[m as Model]}</span>
                    </div>
                    {filteredResult?.[m as Model] && (
                      <div className="glass px-3 py-1 rounded-full text-[10px] font-mono-premium text-muted-foreground">
                        {filteredResult[m as Model]!.inference_time_ms.toFixed(1)}ms LATENCY
                      </div>
                    )}
                  </div>

                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-[2.5rem] opacity-0 group-hover:opacity-10 transition-opacity duration-700 blur-2xl" />
                    <div className="relative rounded-[2rem] overflow-hidden bg-secondary/50 border border-border shadow-premium aspect-video">
                      {isRunning ? (
                        <div className="absolute inset-0 z-20 glass flex items-center justify-center">
                          <div className="flex flex-col items-center gap-6">
                            <div className="relative">
                              <Loader2 className="w-12 h-12 text-primary animate-spin" />
                              <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse rounded-full" />
                            </div>
                            <span className="text-xs font-mono-premium font-black tracking-[0.4em] uppercase text-foreground animate-pulse">Running Inference</span>
                          </div>
                        </div>
                      ) : (modelStatus?.[m as Model]?.status !== 'Ready' && m === 'detr') ? (
                        <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-md flex items-center justify-center p-8">
                          <div className="w-full max-w-sm space-y-6">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-mono-premium font-black uppercase tracking-widest text-primary">DETR Loading Engine</span>
                              <span className="text-[10px] font-mono-val text-muted-foreground">{modelStatus?.detr?.status === 'Initializing' ? 'STAGED' : 'RESIDENTIAL'}</span>
                            </div>

                            <div className="space-y-4">
                              {[
                                { label: 'Transformer Encoder', key: 'encoder' },
                                { label: 'Neural Weights', key: 'weights' },
                                { label: 'CUDA Warmup', key: 'warmup' }
                              ].map((stage) => (
                                <div key={stage.key} className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-1.5 h-1.5 rounded-full ${modelStatus?.detr?.stages?.[stage.key as keyof typeof modelStatus.detr.stages] === 'Ready' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/20 animate-pulse'}`} />
                                    <span className="text-xs font-medium text-text-secondary">{stage.label}</span>
                                  </div>
                                  <span className={`text-[10px] font-mono ${modelStatus?.detr?.stages?.[stage.key as keyof typeof modelStatus.detr.stages] === 'Ready' ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                                    {modelStatus?.detr?.stages?.[stage.key as keyof typeof modelStatus.detr.stages] || 'Awaiting'}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <div className="pt-4 text-center">
                              <p className="text-[10px] text-muted-foreground leading-relaxed">
                                Transformers require heavy initialization to compute attention maps.
                                <br />Results will stream as soon as the engine is primed.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        filteredResult?.[m as Model] ? (
                          <img
                            src={filteredResult[m as Model]!.image_with_boxes}
                            className="w-full h-full object-contain animate-fade-in"
                            alt="Detection Result"
                          />
                        ) : (
                          <img
                            src={selectedImage}
                            className="w-full h-full object-contain"
                            alt="Input Source"
                          />
                        )
                      )}
                    </div>
                  </div>

                  {filteredResult?.[m as Model] && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="grid grid-cols-2 md:grid-cols-3 gap-4"
                    >
                      <div className="glass-card p-5 rounded-2xl border border-white/50 bg-white/50">
                        <div className="text-[10px] font-mono-premium text-muted-foreground uppercase mb-2">Confidence</div>
                        <div className="text-2xl font-black tracking-tighter">{(filteredResult[m as Model]!.avg_confidence * 100).toFixed(1)}%</div>
                      </div>
                      <div className="glass-card p-5 rounded-2xl border border-white/50 bg-white/50">
                        <div className="text-[10px] font-mono-premium text-muted-foreground uppercase mb-2">Objects</div>
                        <div className="text-2xl font-black tracking-tighter">{filteredResult[m as Model]!.num_objects}</div>
                      </div>
                      <div className="glass-card p-5 rounded-2xl border border-white/50 bg-white/50 md:col-span-1 col-span-2">
                        <div className="text-[10px] font-mono-premium text-muted-foreground uppercase mb-2">Model Speed</div>
                        <div className="text-2xl font-black tracking-tighter">{(1000 / filteredResult[m as Model]!.inference_time_ms).toFixed(0)} FPS</div>
                      </div>
                    </motion.div>
                  )}

                  {filteredResult?.[m as Model] && renderInsightsPanel(m as Model)}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {selectedImage && !isRunning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12 text-center"
          >
            <button
              onClick={() => { setSelectedImage(null); }}
              className="group inline-flex items-center gap-3 text-[10px] font-mono-premium font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground transition-all duration-500"
            >
              <span className="w-8 h-[1px] bg-border group-hover:w-12 transition-all duration-500" />
              Reset Workspace
              <span className="w-8 h-[1px] bg-border group-hover:w-12 transition-all duration-500" />
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default DetectionPlayground;
