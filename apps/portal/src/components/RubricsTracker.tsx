import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronUp, PartyPopper } from "lucide-react";

const rubrics = [
  { title: "CNN Detection Model (YOLOv5/Faster R-CNN)", detail: "Implemented YOLOv5s and Faster R-CNN with ResNet-50 backbone. Trained on COCO subset with custom augmentation pipeline." },
  { title: "Vision Transformer (ViT) Detection Model", detail: "DETR-style Vision Transformer with ViT-B/16 backbone. Positional embeddings and multi-head attention for global feature extraction." },
  { title: "Limited-data Scenario Testing", detail: "Evaluated all models on 10%, 25%, 50%, and 100% training data splits. ViT shows strongest few-shot performance." },
  { title: "mAP Computation & Visualization", detail: "Computed mAP@50 and mAP@75 using COCO evaluation protocol. Interactive charts with per-class breakdown." },
  { title: "Precision-Recall Analysis", detail: "Generated precision-recall curves for all models. Area under curve compared across different IoU thresholds." },
  { title: "Inference Stability Testing", detail: "Measured inference time variance over 100 runs per model. YOLOv5 shows lowest variance (±3ms)." },
  { title: "Transformer Architecture Understanding", detail: "Interactive pipeline visualization showing patch embedding, self-attention, and detection head components." },
  { title: "Computational vs Accuracy Trade-offs", detail: "Parameter count, FLOPs, and accuracy plotted. YOLOv5 best efficiency, Faster R-CNN highest accuracy." },
  { title: "Object Detection Pipeline Expertise", detail: "End-to-end pipeline: data loading, augmentation, training, evaluation, and visualization fully implemented." },
];

const RubricsTracker = () => {
  const [checked, setChecked] = useState<boolean[]>(new Array(rubrics.length).fill(true));
  const [expanded, setExpanded] = useState<number | null>(null);

  const toggle = (i: number) => {
    const next = [...checked];
    next[i] = !next[i];
    setChecked(next);
  };

  const progress = (checked.filter(Boolean).length / rubrics.length) * 100;
  const allDone = checked.every(Boolean);

  return (
    <section id="rubrics" className="py-32 relative overflow-hidden bg-background">
      {/* Background Decor */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/5 blur-[120px] rounded-full -mr-64 -mb-64 animate-float" />
      <div className="absolute inset-0 grid-pattern-light opacity-30 pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
          className="text-center mb-24"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-border text-accent text-[10px] font-mono-premium uppercase tracking-[0.3em] mb-8 shadow-premium">
            <Check size={14} className="animate-pulse" />
            Quality Assurance Hub
          </div>
          <h2 className="text-5xl sm:text-7xl font-black mb-8 tracking-tighter leading-tight">
            Project <span className="text-brand-gradient">Rubrics</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-xl font-medium tracking-tight">
            Tracking the operational requirements and architectural benchmarks for the <span className="text-foreground">Vision Forge AI</span> platform.
          </p>
        </motion.div>

        {/* Cinematic Progress Dashboard */}
        <div className="glass-card rounded-[3rem] p-12 mb-12 bg-white/40 border-white/50 shadow-premium relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl -mr-32 -mt-32" />
          <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-6">
            <div>
              <h4 className="text-[10px] font-mono-premium font-black uppercase tracking-[0.4em] text-muted-foreground mb-2">Completion Coefficient</h4>
              <div className="text-5xl font-black tracking-tighter">{progress.toFixed(0)}<span className="text-primary">%</span></div>
            </div>
            {allDone && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-emerald-500 text-white shadow-glow-primary"
              >
                <PartyPopper size={20} />
                <span className="text-xs font-black uppercase tracking-widest">Protocol Succeeded</span>
              </motion.div>
            )}
          </div>

          <div className="w-full h-4 bg-secondary rounded-full overflow-hidden p-1 border border-border/50">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${progress}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: [0.23, 1, 0.32, 1] }}
              className="h-full rounded-full bg-foreground shadow-lg shadow-foreground/20"
            />
          </div>
        </div>

        {/* Tactical Checklist */}
        <div className="space-y-4">
          {rubrics.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: [0.23, 1, 0.32, 1] }}
              className="glass-card rounded-[2rem] overflow-hidden border-white/50 hover:shadow-2xl transition-all duration-700 hover:-translate-y-1 bg-white/40 shadow-premium"
            >
              <div
                className="flex items-center gap-6 p-8 cursor-pointer group"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); toggle(i); }}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-700 flex-shrink-0 shadow-premium ${checked[i] ? "bg-foreground text-background" : "bg-white border border-border/50 text-transparent hover:border-foreground"
                    }`}
                >
                  <Check size={16} />
                </button>
                <span className={`text-base font-bold flex-1 tracking-tight transition-all duration-500 ${checked[i] ? "text-foreground" : "text-muted-foreground"}`}>
                  {item.title}
                </span>
                <div className={`p-2 rounded-xl bg-secondary/50 transition-all duration-500 ${expanded === i ? "rotate-180" : ""}`}>
                  <ChevronDown size={18} className="text-muted-foreground" />
                </div>
              </div>
              <AnimatePresence>
                {expanded === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                    className="overflow-hidden bg-white/20"
                  >
                    <div className="px-20 pb-10 pt-4 text-sm font-medium text-muted-foreground leading-relaxed tracking-tight max-w-2xl border-t border-border/20">
                      {item.detail}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RubricsTracker;
