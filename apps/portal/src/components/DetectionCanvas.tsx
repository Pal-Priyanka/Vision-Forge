import React, { useRef, useEffect } from 'react';

interface Detection {
    class: string;
    confidence: number;
    bbox: [number, number, number, number]; // [x1, y1, x2, y2]
}

interface DetectionCanvasProps {
    imageUrl: string;
    detections: Detection[];
    width?: number;
    height?: number;
}

const CLASS_COLORS: Record<string, string> = {
    person: '#3B82F6',
    car: '#EF4444',
    cat: '#F59E0B',
    dog: '#10B981',
    bird: '#8B5CF6',
    bicycle: '#EC4899',
    motorbike: '#F97316',
    bus: '#14B8A6',
    train: '#6366F1',
    boat: '#06B6D4',
    // Default colors for other classes
};

const getColorForClass = (className: string): string => {
    return CLASS_COLORS[className] || `hsl(${Math.random() * 360}, 70%, 50%)`;
};

const DetectionCanvas: React.FC<DetectionCanvasProps> = ({
    imageUrl,
    detections,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const img = imageRef.current;
        if (!canvas || !img) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const drawDetections = () => {
            // High-fidelity drawing
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);

            detections.forEach((detection) => {
                const [x1, y1, x2, y2] = detection.bbox;
                // Use theme colors: Primary for person/standard, Accent for others
                const isPrimary = detection.class === 'person';
                const color = isPrimary ? '#0061e0' : '#8b5cf6';

                // Draw Box with Shadow/Glow
                ctx.save();
                ctx.shadowBlur = 15;
                ctx.shadowColor = `${color}44`;
                ctx.strokeStyle = color;
                ctx.lineWidth = 4;
                ctx.lineJoin = 'round';

                // Rounded rectangle path
                const r = 8; // radius
                const w = x2 - x1;
                const h = y2 - y1;
                ctx.beginPath();
                ctx.moveTo(x1 + r, y1);
                ctx.lineTo(x1 + w - r, y1);
                ctx.quadraticCurveTo(x1 + w, y1, x1 + w, y1 + r);
                ctx.lineTo(x1 + w, y1 + h - r);
                ctx.quadraticCurveTo(x1 + w, y1 + h, x1 + w - r, y1 + h);
                ctx.lineTo(x1 + r, y1 + h);
                ctx.quadraticCurveTo(x1, y1 + h, x1, y1 + h - r);
                ctx.lineTo(x1, y1 + r);
                ctx.quadraticCurveTo(x1, y1, x1 + r, y1);
                ctx.closePath();
                ctx.stroke();

                // Draw Label - Premium Minimalist Style
                const label = `${detection.class.toUpperCase()} • ${(detection.confidence * 100).toFixed(0)}%`;
                ctx.font = 'bold 16px "JetBrains Mono", monospace';
                const textWidth = ctx.measureText(label).width;
                const padding = 10;

                // Label background (glass effect)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.shadowBlur = 10;
                ctx.shadowColor = 'rgba(0,0,0,0.1)';
                ctx.fillRect(x1, y1 - 40, textWidth + padding * 2, 32);

                // Accent indicator line on label
                ctx.fillStyle = color;
                ctx.fillRect(x1, y1 - 40, 4, 32);

                // Label text
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#171717';
                ctx.fillText(label, x1 + padding, y1 - 18);

                ctx.restore();
            });
        };

        if (img.complete) {
            drawDetections();
        } else {
            img.onload = drawDetections;
        }
    }, [imageUrl, detections]);

    return (
        <div className="relative w-full group overflow-hidden rounded-2xl bg-secondary/30 p-1 border border-border shadow-premium transition-all duration-500 hover:shadow-2xl">
            <img
                ref={imageRef}
                src={imageUrl}
                alt="Detection source"
                className="opacity-0 absolute pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <canvas
                ref={canvasRef}
                className="w-full h-auto rounded-[calc(1rem-4px)] block"
                style={{ maxWidth: '100%', height: 'auto' }}
            />

            {/* Minimalist Overlay Info */}
            <div className="absolute bottom-4 right-4 glass px-4 py-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                <span className="text-xs font-mono-premium text-foreground tracking-widest uppercase">
                    {detections.length} Objects Detected
                </span>
            </div>
        </div>
    );
};

export default DetectionCanvas;
