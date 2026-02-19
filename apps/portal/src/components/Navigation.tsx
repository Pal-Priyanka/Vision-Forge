import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Hammer, Menu, X } from "lucide-react";

const navItems = [
  { label: "Arena", href: "#metrics" },
  { label: "Dataset", href: "#dataset" },
  { label: "Playground", href: "#playground" },
];

const Navigation = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
      className={`fixed top-6 left-0 right-0 z-50 mx-auto w-[90%] max-w-5xl transition-all duration-500 ${scrolled ? "glass shadow-premium py-3 px-6 rounded-2xl" : "bg-transparent py-5 px-8"
        }`}
    >
      <div className="flex items-center justify-between">
        <a href="#hero" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center transition-transform duration-500 group-hover:rotate-12 shadow-glow-primary">
            <Hammer className="text-white w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base leading-tight tracking-tight text-foreground">
              VISION<span className="text-primary">FORGE</span>
            </span>
            <span className="text-[9px] font-mono-premium text-muted-foreground uppercase tracking-[0.2em]">
              Object Detection Studio
            </span>
          </div>
        </a>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-2">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="relative px-5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300 rounded-full hover:bg-secondary group overflow-hidden"
            >
              <span className="relative z-10">{item.label}</span>
              <motion.span
                className="absolute inset-0 bg-primary/5 scale-0 group-hover:scale-100 transition-transform duration-300 origin-center"
              />
            </a>
          ))}
          <a
            href="#playground"
            className="ml-4 px-6 py-2 bg-foreground text-background text-sm font-bold rounded-full hover:bg-primary hover:shadow-glow-primary transition-all duration-500 interaction-bounce"
          >
            Launch Arena
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-secondary text-foreground hover:bg-border transition-colors"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="absolute top-full left-0 right-0 mt-4 md:hidden glass-strong rounded-2xl overflow-hidden shadow-2xl"
        >
          <div className="p-4 flex flex-col space-y-2">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="px-5 py-4 text-base font-medium text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navigation;
