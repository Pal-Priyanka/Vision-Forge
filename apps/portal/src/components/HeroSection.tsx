import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Zap, Cpu, CheckCircle } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <section
      id="hero"
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background pt-20"
    >
      {/* Background patterns */}
      <div className="absolute inset-0 grid-pattern opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

      {/* Decorative elements - Subtle large blur orbs */}
      <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] animate-float" />
      <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-[100px] animate-float" style={{ animationDelay: "2s" }} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-12 text-center">
        {/* Superior Branding / Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 shadow-premium"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="text-[10px] sm:text-xs font-mono-premium uppercase tracking-[0.3em] text-muted-foreground">
            Benchmarking Vision Architectures v2.0
          </span>
        </motion.div>

        {/* Cinematic Title */}
        <div className="mb-6 overflow-hidden">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col items-center gap-6 mt-12 mb-8 text-6xl sm:text-8xl lg:text-[10rem] font-black tracking-tighter leading-none"
          >
            <span className="text-foreground tracking-[-0.05em]">TRANSFORMER</span>
            <span className="text-brand-gradient tracking-[-0.05em]">VS CNN</span>
          </motion.h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="max-w-3xl mx-auto"
        >
          <p className="text-xl sm:text-2xl font-medium text-foreground/70 mb-10 leading-relaxed tracking-tight">
            A high-fidelity comparison of <span className="text-primary">YOLOv5</span> and <span className="text-accent">DETR</span> — visual AI benchmarking reimagined for professionals.
          </p>

          {/* Action Hub */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#playground"
              className="group relative px-8 py-4 rounded-2xl bg-foreground text-background font-bold text-base overflow-hidden transition-all duration-500 hover:scale-105 active:scale-95 shadow-2xl interaction-bounce"
            >
              <span className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex items-center gap-3">
                <Play size={18} fill="currentColor" />
                <span>Launch Live Arena</span>
              </div>
            </a>

            <a
              href="#metrics"
              className="group px-8 py-4 rounded-2xl glass font-bold text-base text-foreground hover:bg-secondary transition-all duration-500 hover:scale-105 active:scale-95 shadow-premium"
            >
              <div className="flex items-center gap-3">
                <Zap size={18} className="text-primary group-hover:animate-pulse" />
                <span>Analytical Deep-dive</span>
              </div>
            </a>
          </div>
        </motion.div>

        {/* Visual Anchor / Stats Mini-Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 2 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
        >
          {[
            { label: "YOLOv5 mAP", value: "0.682" },
            { label: "DETR mAP", value: "0.645" },
            { label: "VOC Classes", value: "20" },
            { label: "Inference", value: "~12ms" },
          ].map((stat) => (
            <div key={stat.label} className="border-l border-border pl-4 py-1 text-left">
              <div className="text-[12px] font-mono-premium text-muted-foreground uppercase tracking-widest">{stat.label}</div>
              <div className="text-2xl font-black text-foreground mt-0.5 tracking-tighter">{stat.value}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Floating scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
      >
        <span className="text-[10px] font-mono-premium text-muted-foreground uppercase tracking-[0.4em]">Scroll</span>
        <div className="w-[1px] h-12 bg-gradient-to-b from-primary to-transparent" />
      </motion.div>
    </section>
  );
};

export default HeroSection;
