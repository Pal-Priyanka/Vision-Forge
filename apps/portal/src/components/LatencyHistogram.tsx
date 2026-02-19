import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Download } from 'lucide-react';
import { exportChartAsPNG } from '@/utils/exportChart';

interface LatencyBin {
    bin: string;
    count: number;
    ms: number;
}

interface LatencyHistogramProps {
    data: LatencyBin[];
    className?: string;
    title?: string;
    color?: string;
}

const LatencyHistogram: React.FC<LatencyHistogramProps> = ({
    data,
    className = '',
    title = 'Latency Distribution',
    color = '#ec4899'
}) => {
    const chartId = `latency-dist-${title.replace(/\s+/g, '-').toLowerCase()}`;

    const handleExport = () => {
        exportChartAsPNG(chartId, title);
    };

    return (
        <div className={`glass-card p-8 rounded-[2rem] bg-white/40 shadow-premium ${className}`} id={chartId}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-pink-500/10 text-pink-500">
                        <Activity size={18} />
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
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" vertical={false} />
                        <XAxis
                            dataKey="bin"
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
                            cursor={{ fill: 'rgba(236, 72, 153, 0.05)' }}
                        />
                        <Bar
                            dataKey="count"
                            fill={color}
                            radius={[6, 6, 0, 0]}
                            name="Frequency"
                            animationDuration={1500}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default LatencyHistogram;
