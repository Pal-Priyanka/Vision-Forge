import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageSquare, X, Send, Bot, User, Sparkles,
    ChevronRight, Brain, Zap, Loader2
} from "lucide-react";
import { aiChat } from "../utils/api";

const AIChatPanel = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [messages, setMessages] = useState<{ role: "assistant" | "user"; content: string }[]>([
        { role: "assistant", content: "I am your Vision Forge AI assistant. How can I help you analyze these model architectures today?" }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Keyboard shortcut: Cmd+K / Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        const userMsg = query;
        setMessages(prev => [...prev, { role: "user", content: userMsg }]);
        setQuery("");
        setIsTyping(true);

        try {
            const answer = await aiChat(userMsg, "Vision Forge AI - YOLOv5 vs DETR comparison platform");

            if (answer && answer.trim()) {
                setMessages(prev => [...prev, { role: "assistant", content: answer.trim() }]);
            } else {
                setMessages(prev => [...prev, { role: "assistant", content: "I received an empty response. Please ensure Ollama is running with the llama3.2:3b model." }]);
            }
        } catch (error) {
            console.error("AI Chat Error:", error);
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            setMessages(prev => [...prev, {
                role: "assistant",
                content: `⚠️ Connection failed: ${errorMsg}. Please verify:\n• Backend is running on port 8000\n• Ollama is running on port 11434\n• llama3.2:3b model is installed`
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="fixed bottom-12 right-12 z-[100]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 40, scale: 0.9, filter: "blur(20px)" }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: 40, scale: 0.9, filter: "blur(20px)" }}
                        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                        className="mb-8 w-[450px] h-[700px] glass-card rounded-[3rem] shadow-premium border-white/50 flex flex-col overflow-hidden bg-white/40 backdrop-blur-3xl"
                    >
                        {/* Header */}
                        <div className="p-10 border-b border-border/40 flex items-center justify-between bg-white/20">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-foreground rounded-[1.5rem] flex items-center justify-center shadow-2xl group transition-all duration-700">
                                    <Bot size={28} className="text-background transition-transform group-hover:scale-110" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black tracking-tighter">Vision Forge AI</h3>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-glow-primary animate-pulse" />
                                        <span className="text-[10px] font-mono-premium font-black uppercase tracking-[0.3em] text-muted-foreground">Neural Matrix Active</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-3 bg-secondary/50 hover:bg-border/50 rounded-2xl text-muted-foreground hover:text-foreground transition-all duration-500 active:scale-90"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar bg-gradient-to-b from-transparent to-white/10">
                            {messages.map((m, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: i * 0.05 }}
                                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div className={`flex gap-6 max-w-[90%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                        <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-premium transition-all duration-700 ${m.role === "user" ? "bg-accent text-white" : "bg-white text-primary border border-border/50"
                                            }`}>
                                            {m.role === "user" ? <User size={20} /> : <Sparkles size={20} />}
                                        </div>
                                        <div className={`p-8 rounded-[2.5rem] text-[13px] font-medium leading-relaxed shadow-premium border-white/50 ${m.role === "user"
                                                ? "bg-accent/5 text-accent rounded-tr-none"
                                                : "bg-white text-foreground rounded-tl-none"
                                            }`}>
                                            {m.content}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="flex gap-6 items-center">
                                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border border-border/50 shadow-premium">
                                            <Loader2 size={20} className="text-primary animate-spin" />
                                        </div>
                                        <div className="p-8 rounded-[2.5rem] rounded-tl-none bg-white border border-border/50 shadow-premium flex gap-1.5">
                                            <div className="w-1.5 h-1.5 bg-primary/20 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                            <div className="w-1.5 h-1.5 bg-primary/20 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                            <div className="w-1.5 h-1.5 bg-primary/20 rounded-full animate-bounce" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Form */}
                        <form onSubmit={handleSubmit} className="p-10 bg-white/40 border-t border-border/40">
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Ask the Neural Core..."
                                    className="w-full bg-white border border-border/50 rounded-[2rem] py-6 pl-8 pr-20 text-[13px] font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all shadow-premium"
                                />
                                <button
                                    type="submit"
                                    disabled={!query.trim() || isTyping}
                                    className="absolute right-3 top-3 bottom-3 w-14 bg-foreground text-background rounded-2xl shadow-premium hover:shadow-2xl hover:scale-105 active:scale-95 disabled:grayscale disabled:opacity-30 transition-all flex items-center justify-center"
                                >
                                    <Send size={24} />
                                </button>
                            </div>
                            <div className="mt-6 flex justify-center">
                                <span className="text-[9px] font-mono-premium font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40">Press <span className="text-foreground">⌘K</span> to toggle interface</span>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
                className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-premium transition-all duration-700 ${isOpen
                        ? "bg-white text-primary rotate-0"
                        : "bg-foreground text-background shadow-glow-primary hover:shadow-glow-accent"
                    }`}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={isOpen ? 'close' : 'open'}
                        initial={{ opacity: 0, rotate: -90 }}
                        animate={{ opacity: 1, rotate: 0 }}
                        exit={{ opacity: 0, rotate: 90 }}
                    >
                        {isOpen ? <X size={32} /> : <MessageSquare size={32} />}
                    </motion.div>
                </AnimatePresence>
            </motion.button>
        </div>
    );
};

export default AIChatPanel;
