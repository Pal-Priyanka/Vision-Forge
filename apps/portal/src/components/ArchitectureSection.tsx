import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Layers, Grid3X3, Box, Brain, Eye, Cpu } from "lucide-react";

interface PipelineStep {
  icon: React.ReactNode;
  label: string;
  detail: string;
}

const cnnPipeline: PipelineStep[] = [
  { icon: <Eye size={20} />, label: "Input Image", detail: "Raw image input (640×640 for YOLOv5, variable for Faster R-CNN)" },
  { icon: <Layers size={20} />, label: "Backbone CNN", detail: "Feature extraction via convolutional layers (CSPDarknet / ResNet-50)" },
  { icon: <Grid3X3 size={20} />, label: "Feature Pyramid", detail: "Multi-scale feature maps via FPN/PANet for detecting objects at different sizes" },
  { icon: <Box size={20} />, label: "Detection Head", detail: "Predicts bounding boxes, class probabilities, and confidence scores" },
  { icon: <Cpu size={20} />, label: "NMS", detail: "Non-Maximum Suppression filters overlapping detections" },
];

const vitPipeline: PipelineStep[] = [
  { icon: <Eye size={20} />, label: "Input Image", detail: "Raw image split into fixed-size patches (16×16 pixels)" },
  { icon: <Grid3X3 size={20} />, label: "Patch Embedding", detail: "Each patch flattened and linearly projected + positional encoding" },
  { icon: <Brain size={20} />, label: "Transformer Encoder", detail: "Multi-head self-attention captures global context across all patches" },
  { icon: <Layers size={20} />, label: "Feature Maps", detail: "Hierarchical features reconstructed for detection task" },
  { icon: <Box size={20} />, label: "Detection Head", detail: "DETR-style bipartite matching or anchor-based detection" },
];

const ArchitectureSection = () => {
  const [view, setView] = useState<"cnn" | "vit">("cnn");
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const pipeline = view === "cnn" ? cnnPipeline : vitPipeline;

  return (
    <section id="architecture" className="py-32 relative overflow-hidden bg-background">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -translate-y-1/2 -ml-64 animate-float" />
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-accent/5 blur-[120px] rounded-full -translate-y-1/2 -mr-64 animate-float" style={{ animationDelay: "2s" }} />
      <div className="absolute inset-0 grid-pattern-light opacity-30 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
          className="text-center mb-24"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-border text-primary text-[10px] font-mono-premium uppercase tracking-[0.3em] mb-8 shadow-premium">
            <Cpu size={14} className="animate-pulse" />
            Neural Infrastructure
          </div>
          <h2 className="text-5xl sm:text-7xl font-black mb-8 tracking-tighter leading-tight">
            Visual <span className="text-brand-gradient">Logic</span> Pipelines
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-xl font-medium tracking-tight">
            Deconstructing the topological differences between standard <span className="text-primary font-bold">CNN</span> feature extraction and global <span className="text-accent font-bold">Transformer</span> self-attention.
          </p>
        </motion.div>

        {/* Tactical Switcher */}
        <div className="flex justify-center mb-16">
          <div className="glass p-2 rounded-3xl border border-border/50 shadow-premium inline-flex bg-white/40">
            <button
              onClick={() => { setView("cnn"); setActiveStep(null); }}
              className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ease-[0.23, 1, 0.32, 1] ${view === "cnn" ? "bg-foreground text-background shadow-premium" : "text-muted-foreground hover:text-foreground"
                }`}
            >
              CNN Baseline
            </button>
            <button
              onClick={() => { setView("vit"); setActiveStep(null); }}
              className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ease-[0.23, 1, 0.32, 1] ${view === "vit" ? "bg-foreground text-background shadow-premium" : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Transformer Shift
            </button>
          </div>
        </div>

        {/* Cinematic Pipeline Map */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
          className="glass-card rounded-[3.5rem] p-4 bg-white/30 border-white/50 shadow-premium overflow-hidden"
        >
          <div className="bg-background/80 rounded-[3rem] p-12 lg:p-20 relative border border-border/50">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-4 relative">
              {/* Animated Connection Line (Desktop) */}
              <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-border to-transparent -translate-y-1/2 hidden lg:block" />

              {pipeline.map((step, i) => (
                <div key={`${view}-${i}`} className="relative z-10 flex flex-col items-center group w-full lg:w-auto">
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => setActiveStep(activeStep === i ? null : i)}
                    className={`flex flex-col items-center gap-6 p-8 rounded-[2.5rem] transition-all duration-700 ease-[0.23, 1, 0.32, 1] w-full lg:w-48 group relative ${activeStep === i
                        ? "bg-white shadow-2xl scale-110 border border-border"
                        : "hover:bg-white/50 hover:scale-105"
                      }`}
                  >
                    {/* Step Ring */}
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-700 ${activeStep === i
                        ? (view === 'cnn' ? 'bg-primary text-white shadow-glow-primary' : 'bg-accent text-white shadow-glow-accent')
                        : 'bg-secondary text-muted-foreground group-hover:text-foreground'
                      }`}>
                      {step.icon}
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-mono-premium text-muted-foreground mb-1 uppercase tracking-widest font-bold">Step {i + 1}</div>
                      <span className="text-xs font-black tracking-tight uppercase whitespace-nowrap">{step.label}</span>
                    </div>

                    {/* Arrow (Mobile Only) */}
                    {i < pipeline.length - 1 && (
                      <div className="lg:hidden mt-12 text-muted-foreground">
                        <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                          <ArrowRight size={20} className="rotate-90" />
                        </motion.div>
                      </div>
                    )}
                  </motion.button>
                </div>
              ))}
            </div>

            {/* Dynamic Explanation Panel */}
            <AnimatePresence mode="wait">
              {activeStep !== null ? (
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                  className="mt-20 glass-card p-12 rounded-[2.5rem] border-white/50 bg-white shadow-2xl relative overflow-hidden group"
                >
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${view === 'cnn' ? 'bg-primary' : 'bg-accent'}`} />
                  <div className="flex flex-col md:flex-row gap-12 items-center">
                    <div className={`p-8 rounded-3xl ${view === 'cnn' ? 'bg-primary/5 text-primary' : 'bg-accent/5 text-accent'}`}>
                      {pipeline[activeStep].icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[10px] font-mono-premium text-muted-foreground uppercase tracking-[0.4em] mb-4 font-black">Architecture Breakdown</h4>
                      <h5 className="text-3xl font-black mb-6 tracking-tight">{pipeline[activeStep].label}</h5>
                      <p className="text-lg text-muted-foreground font-medium leading-relaxed max-w-3xl tracking-tight">
                        {pipeline[activeStep].detail}
                      </p>
                    </div>
                    <div className="hidden md:block">
                      <Cpu size={80} className="text-secondary/30" />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-20 text-center text-muted-foreground italic font-mono-premium text-xs tracking-widest uppercase opacity-40"
                >
                  Select a tactical step to forge understanding
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ArchitectureSection;
