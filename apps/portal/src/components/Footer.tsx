import { motion } from "framer-motion";
import { Github, ExternalLink, Hammer } from "lucide-react";

const Footer = () => (
  <footer className="py-20 relative overflow-hidden bg-background">
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
    <div className="max-w-7xl mx-auto px-6 relative z-10">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
        <div className="flex flex-col items-center lg:items-start gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-foreground text-background flex items-center justify-center shadow-premium group transition-all duration-700">
              <Hammer size={24} className="group-hover:rotate-12 transition-transform" />
            </div>
            <div>
              <h4 className="text-xl font-black tracking-tighter">Vision Forge AI</h4>
              <p className="text-[10px] font-mono-premium font-black uppercase tracking-[0.3em] text-muted-foreground">Neural Infrastructure Platform</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-medium max-w-sm text-center lg:text-left leading-relaxed">
            Leading the evolution of computer vision through cinematic analytical interfaces and production-grade architectures.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-12">
          {["Architecture", "Dataset", "Arena", "Playground"].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-all duration-300">
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-8">
          <a href="#" className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:shadow-premium transition-all duration-500">
            <Github size={20} />
          </a>
          <a href="#" className="px-6 py-3 glass rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:shadow-premium transition-all duration-500">
            Research Paper <ExternalLink size={14} />
          </a>
        </div>
      </div>

      <div className="mt-20 pt-10 border-t border-border/30 flex flex-col md:flex-row items-center justify-between gap-6">
        <span className="text-[10px] font-mono-premium font-black uppercase tracking-widest text-muted-foreground/60">
          © 2024 Vision Forge AI — All System Rights Processed.
        </span>
        <div className="flex items-center gap-6">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-mono-premium font-black uppercase tracking-[0.3em] text-muted-foreground/40">Status: All Nodes Nominal</span>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
