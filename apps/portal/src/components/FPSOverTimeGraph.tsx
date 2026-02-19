import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Download } from 'lucide-react';
import { exportChartAsPNG } from '@/utils/exportChart';

interface FPSPoint {
    time: string;
    fps: number;
}

interface FPSOverTimeGraphProps {
    data: FPSPoint[];
    className?: string;
    title?: string;
    color?: string;
}

const FPSOverTimeGraph: React.FC<FPSOverTimeGraphProps> = ({
    data,
    className = '',
    title = 'FPS Stability Over Time',
    color = '#10b981'
}) => {
    const chartId = `fps-time-${title.replace(/\s+/g, '-').toLowerCase()}`;

    const handleExport = () => {
        exportChartAsPNG(chartId, title);
    };

    return (
        <div className={`glass-card p-8 rounded-[2rem] bg-white/40 shadow-premium ${className}`} id={chartId}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                        <TrendingUp size={18} />
                    </div>
                    <h3 className="text-xl font-black tracking-tight">{title}</h3>
                </div>
                <button
                    onClick={handleExport}
                    className="p-2.5 bg-secondary hover:bg-border rounded-xl transition-all duration-300 active:scale-95 group"
                    title="Export to PNG"
                >
                    <Download size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
            </div>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorFps" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" vertical={false} />
                        <XAxis
                            dataKey="time"
                            stroke="#737373"
                            fontSize={10}
                            fontWeight={700}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            stroke="#737373"
                            fontSize={10}
                            fontWeight={700}
                            tickLine={false}
                            axisLine={false}
                            dx={-10}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#171717',
                                border: 'none',
                                borderRadius: '16px',
                                color: '#fff',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                            }}
                            itemStyle={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="fps"
                            stroke={color}
                            fillOpacity={1}
                            fill="url(#colorFps)"
                            strokeWidth={3}
                            animationDuration={2000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default FPSOverTimeGraph;
