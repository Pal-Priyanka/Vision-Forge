import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Loader2, Play, CheckCircle2, FileText, ChevronRight, Activity } from 'lucide-react';
import ImageUploader from '../components/ImageUploader';
import DetectionCanvas from '../components/DetectionCanvas';
import { runDetection } from '../utils/api';
import { useInference } from '../context/InferenceContext';

const VOC_CLASSES = [
    'person', 'bird', 'cat', 'cow', 'dog', 'horse', 'sheep',
    'aeroplane', 'bicycle', 'boat', 'bus', 'car', 'motorbike', 'train',
    'bottle', 'chair', 'diningtable', 'pottedplant', 'sofa', 'tvmonitor'
];

interface Detection {
    class: string;
    confidence: number;
    bbox: [number, number, number, number];
}

interface ModelResult {
    detections: Detection[];
    inference_time_ms: number;
    num_objects: number;
    avg_confidence: number;
}

interface BatchResult {
    id: string;
    preview: string;
    yolov5?: ModelResult;
    detr?: ModelResult;
    error?: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
}

interface UploadedImage {
    id: string;
    file: File;
    preview: string;
}

const InferencePage: React.FC = () => {
    const { refreshAnalytics } = useInference();
    const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
    const [selectedModel, setSelectedModel] = useState<'yolov5' | 'detr' | 'both'>('both');
    const [isDetecting, setIsDetecting] = useState(false);
    const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
    const [currentImageIdx, setCurrentImageIdx] = useState<number | null>(null);
    const [globalError, setGlobalError] = useState<string | null>(null);
    const resultsRef = useRef<HTMLDivElement>(null);


    const handleImagesSelect = (images: UploadedImage[]) => {
        setUploadedImages(images);
        setBatchResults(images.map(img => ({
            id: img.id,
            preview: img.preview,
            status: 'pending'
        })));
        setCurrentImageIdx(null);
        setGlobalError(null);
    };

    const handleBatchDetect = async () => {
        if (uploadedImages.length === 0) return;
        setIsDetecting(true);
        setGlobalError(null);
        const results = [...batchResults];
        for (let i = 0; i < uploadedImages.length; i++) {
            const img = uploadedImages[i];
            results[i].status = 'processing';
            setBatchResults([...results]);
            setCurrentImageIdx(i);
            try {
                const response = await runDetection(img.preview, selectedModel, 0.5, 0.45);
                results[i] = { ...results[i], ...response, status: 'completed' };
            } catch (err) {
                results[i].status = 'error';
                results[i].error = 'Detection failed';
            }
            setBatchResults([...results]);
        }

        // Finalize analytics after batch
        await refreshAnalytics();

        setIsDetecting(false);
        // Auto scroll to results
        setTimeout(() => {
            resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const selectedResult = currentImageIdx !== null ? batchResults[currentImageIdx] : null;

    return (
        <div className="min-h-screen bg-background py-24 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
            <div className="absolute inset-0 grid-pattern-light opacity-30 pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <header className="text-center mb-24">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-border text-primary text-[10px] font-mono-premium uppercase tracking-[0.3em] mb-8 shadow-premium">
                            <Activity size={14} className="animate-pulse" />
                            Batch Neural Pipeline
                        </div>
                        <h1 className="text-5xl sm:text-7xl font-black mb-8 tracking-tighter leading-tight">
                            Neural <span className="text-brand-gradient">Inference</span>
                        </h1>
                        <p className="text-muted-foreground max-w-2xl mx-auto text-xl font-medium tracking-tight">
                            Accelerating model validation through high-throughput batch detection across optimized <span className="text-foreground">YOLOv5</span> and <span className="text-foreground">DETR</span> backbones.
                        </p>
                    </motion.div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left Column - Controls */}
                    <div className="lg:col-span-4 space-y-8">
                        <section className="glass-card p-10 rounded-[2.5rem] bg-white/40 border-white/50 shadow-premium">
                            <h3 className="text-[10px] font-mono-premium font-black uppercase tracking-[0.4em] text-muted-foreground mb-8">Data Acquisition</h3>
                            <ImageUploader onImagesSelect={handleImagesSelect} maxFiles={12} />
                        </section>

                        <AnimatePresence>
                            {uploadedImages.length > 0 && (
                                <motion.section
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className="glass-card p-10 rounded-[2.5rem] space-y-10 bg-white/40 border-white/50 shadow-premium"
                                >
                                    <h3 className="text-[10px] font-mono-premium font-black uppercase tracking-[0.4em] text-muted-foreground">Tactical Configuration</h3>

                                    <div className="grid grid-cols-1 gap-4">
                                        {[
                                            { id: 'yolov5', name: 'YOLOv5 Opt.', icon: Zap, color: 'text-amber-500' },
                                            { id: 'detr', name: 'DETR ViT', icon: FileText, color: 'text-primary' },
                                            { id: 'both', name: 'Dual System Compare', icon: Activity, color: 'text-accent' },
                                        ].map(model => (
                                            <button
                                                key={model.id}
                                                onClick={() => setSelectedModel(model.id as any)}
                                                className={`flex items-center justify-between p-6 rounded-2xl transition-all duration-500 group relative overflow-hidden ${selectedModel === model.id
                                                    ? 'bg-foreground text-background shadow-premium translate-x-2'
                                                    : 'bg-white border border-border/50 hover:bg-secondary text-muted-foreground hover:text-foreground'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4 relative z-10">
                                                    <model.icon className={`transition-all duration-700 ${selectedModel === model.id ? 'text-background' : model.color}`} size={22} />
                                                    <span className="font-black text-base tracking-tight">{model.name}</span>
                                                </div>
                                                {selectedModel === model.id && (
                                                    <motion.div layoutId="active-tick" className="relative z-10">
                                                        <CheckCircle2 size={18} />
                                                    </motion.div>
                                                )}
                                                {selectedModel === model.id && <div className="absolute inset-0 bg-brand-gradient opacity-10 blur-2xl" />}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={handleBatchDetect}
                                        disabled={isDetecting || uploadedImages.length === 0}
                                        className="w-full py-8 bg-foreground text-background rounded-2xl font-black text-sm uppercase tracking-widest shadow-premium hover:shadow-2xl hover:scale-[1.02] active:scale-95 disabled:grayscale disabled:opacity-30 transition-all flex items-center justify-center gap-4 group"
                                    >
                                        {isDetecting ? (
                                            <Loader2 size={28} className="animate-spin" />
                                        ) : (
                                            <Play size={28} className="group-hover:translate-x-1 transition-transform" />
                                        )}
                                        {isDetecting ? 'Processing Matrix...' : 'Execute Synchronized Run'}
                                    </button>
                                </motion.section>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right Column - Results Display */}
                    <div className="lg:col-span-8 space-y-10">
                        {batchResults.length > 0 ? (
                            <div className="space-y-10">
                                {/* Batch Progress Header */}
                                <div className="glass-card p-10 rounded-[2.5rem] flex flex-col sm:flex-row items-center justify-between gap-8 bg-white/40 border-white/50 shadow-premium">
                                    <div className="flex items-center gap-6">
                                        <div className="h-16 w-16 bg-secondary rounded-[1.5rem] flex items-center justify-center text-primary shadow-premium">
                                            <Activity size={28} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black tracking-tight">Stream Telemetry</h3>
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <p className="text-xs font-mono-premium font-black text-muted-foreground uppercase tracking-[0.3em]">
                                                    {batchResults.filter(r => r.status === 'completed').length} / {batchResults.length} Units Synthesized
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {batchResults.map((r, i) => (
                                            <div
                                                key={i}
                                                className={`h-2 w-8 rounded-full transition-all duration-700 ${r.status === 'completed' ? 'bg-foreground' :
                                                    r.status === 'processing' ? 'bg-primary animate-pulse w-12' :
                                                        r.status === 'error' ? 'bg-red-500' : 'bg-secondary'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Results Grid / Table */}
                                <div className="glass-card overflow-hidden rounded-[2.5rem] bg-white/40 border-white/50 shadow-premium group">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-secondary/40 text-xs font-mono-premium font-black uppercase tracking-[0.3em] text-muted-foreground">
                                                    <th className="px-10 py-6">Sample</th>
                                                    <th className="px-6 py-6">Status</th>
                                                    <th className="px-6 py-6">YOLO Phase</th>
                                                    <th className="px-6 py-6">DETR Phase</th>
                                                    <th className="px-10 py-6 text-right">Inspect</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/30">
                                                {batchResults.map((result, idx) => (
                                                    <motion.tr
                                                        key={result.id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        className={`hover:bg-white/50 transition-all duration-500 cursor-pointer ${currentImageIdx === idx ? 'bg-white/80' : ''}`}
                                                        onClick={() => setCurrentImageIdx(idx)}
                                                    >
                                                        <td className="px-10 py-6">
                                                            <div className="relative group/thumb">
                                                                <img src={result.preview} className="h-16 w-16 rounded-2xl object-cover shadow-premium group-hover/thumb:scale-110 transition-transform duration-500" />
                                                                {currentImageIdx === idx && <div className="absolute inset-0 bg-primary/20 rounded-2xl border-2 border-primary" />}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-6">
                                                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${result.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                                                                result.status === 'processing' ? 'bg-primary/5 text-primary' :
                                                                    result.status === 'error' ? 'bg-red-50 text-red-500' : 'bg-secondary text-muted-foreground'
                                                                }`}>
                                                                <div className={`w-2 h-2 rounded-full ${result.status === 'completed' ? 'bg-emerald-500' : result.status === 'processing' ? 'bg-primary animate-ping' : 'bg-muted-foreground'}`} />
                                                                {result.status}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-6">
                                                            {result.yolov5 ? (
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-base font-black tracking-tight">{result.yolov5.inference_time_ms.toFixed(0)}ms</span>
                                                                    <span className="text-xs font-mono-premium font-black text-muted-foreground uppercase">{result.yolov5.num_objects} Detections</span>
                                                                </div>
                                                            ) : <span className="text-muted-foreground opacity-20">—</span>}
                                                        </td>
                                                        <td className="px-6 py-6">
                                                            {result.detr ? (
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-base font-black tracking-tight">{result.detr.inference_time_ms.toFixed(0)}ms</span>
                                                                    <span className="text-xs font-mono-premium font-black text-muted-foreground uppercase">{result.detr.num_objects} Detections</span>
                                                                </div>
                                                            ) : <span className="text-muted-foreground opacity-20">—</span>}
                                                        </td>
                                                        <td className="px-10 py-6 text-right">
                                                            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary group-hover:bg-foreground group-hover:text-background transition-colors duration-500">
                                                                <ChevronRight size={18} />
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <AnimatePresence mode="wait">
                                    {selectedResult && selectedResult.status === 'completed' && (
                                        <motion.div
                                            ref={resultsRef}
                                            key={selectedResult.id}
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -30 }}
                                            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                                            className="grid grid-cols-1 md:grid-cols-2 gap-10"
                                        >
                                            {[
                                                { label: 'YOLOv5 Opt.', result: selectedResult.yolov5, color: 'primary', icon: Zap },
                                                { label: 'DETR ViT', result: selectedResult.detr, color: 'accent', icon: FileText }
                                            ].map((m, i) => m.result && (
                                                <div key={i} className={`glass-card p-10 rounded-[3rem] bg-white/40 border-white/50 shadow-premium hover:shadow-2xl transition-all duration-700 relative overflow-hidden group/card`}>
                                                    <div className={`absolute top-0 right-0 w-48 h-48 bg-${m.color}/5 blur-3xl -mr-24 -mt-24 group-hover/card:bg-${m.color}/10 transition-all duration-700`} />
                                                    <div className="flex items-center justify-between mb-8 relative z-10">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`p-3 bg-${m.color}/10 text-${m.color} rounded-2xl`}>
                                                                <m.icon size={20} />
                                                            </div>
                                                            <h4 className="text-lg font-black tracking-tight">{m.label} Synthesis</h4>
                                                        </div>
                                                        <span className="text-xs font-mono-premium font-black text-muted-foreground uppercase tracking-[0.2em]">{m.result.inference_time_ms.toFixed(1)}ms Inference</span>
                                                    </div>
                                                    <div className="rounded-[2rem] overflow-hidden shadow-premium mb-8 border border-border/50">
                                                        <DetectionCanvas
                                                            imageUrl={selectedResult.preview}
                                                            detections={m.result.detections}
                                                        />
                                                    </div>
                                                    <PredictionsList detections={m.result.detections} model={m.label} />
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-20 glass-card rounded-[3rem] min-h-[600px] bg-white/40 border-white/50 shadow-premium relative overflow-hidden">
                                <div className="absolute inset-0 grid-pattern-light opacity-50" />
                                <div className="relative z-10">
                                    <div className="w-24 h-24 bg-secondary rounded-[2rem] flex items-center justify-center mb-10 rotate-12 mx-auto shadow-premium group hover:rotate-0 transition-transform duration-700">
                                        <Zap size={48} className="text-muted-foreground opacity-30 group-hover:text-primary transition-colors" />
                                    </div>
                                    <h3 className="text-3xl font-black mb-6 tracking-tight">Telemetry Offline</h3>
                                    <p className="text-muted-foreground max-w-sm mb-10 text-lg font-medium leading-relaxed">
                                        Select and initialize visual data streams on the left side to begin neural processing.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

// PredictionsList Component
const PredictionsList: React.FC<{ detections: Detection[]; model: string }> = ({ detections, model }) => {
    if (detections.length === 0) {
        return (
            <div className="mt-8 p-6 bg-secondary/30 rounded-2xl text-center text-muted-foreground text-xs font-mono-premium font-bold uppercase tracking-widest">
                No active detections in grid.
            </div>
        );
    }

    return (
        <div className="mt-8 space-y-3">
            {detections
                .sort((a, b) => b.confidence - a.confidence)
                .map((det, i) => (
                    <div key={i} className="group p-4 bg-white border border-border/50 rounded-2xl hover:border-foreground/20 hover:shadow-premium transition-all duration-500">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-black capitalize tracking-tight">{det.class}</span>
                            <div className="flex items-center gap-2">
                                <div className="h-1 w-8 bg-secondary rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${det.confidence * 100}%` }}
                                        className="h-full bg-emerald-500"
                                    />
                                </div>
                                <span className="text-xs font-mono-premium font-black text-emerald-600">{(det.confidence * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-mono-premium font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">Localization</span>
                            <div className="flex gap-1.5">
                                {det.bbox.map((coord, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-secondary/50 rounded-lg text-xs font-mono-premium font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                                        {Math.round(coord)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
        </div>
    );
};

export default InferencePage;

