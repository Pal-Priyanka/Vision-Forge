import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';
import { Download, Maximize2 } from 'lucide-react';
import { exportChartAsPNG } from '@/utils/exportChart';

interface PRCurveData {
    recall: number;
    precision: number;
}

interface PRCurveChartProps {
    data: PRCurveData[];
    className?: string;
    title?: string;
    color?: string;
}

const PRCurveChart: React.FC<PRCurveChartProps> = ({
    data,
    className = '',
    title = 'Precision-Recall Curve',
    color = '#3b82f6'
}) => {
    const chartId = `pr-curve-${title.replace(/\s+/g, '-').toLowerCase()}`;

    const handleExport = () => {
        exportChartAsPNG(chartId, title);
    };

    return (
        <div className={`glass-card p-8 rounded-[2rem] bg-white/40 shadow-premium ${className}`} id={chartId}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Maximize2 size={18} />
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
            <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" vertical={false} />
                        <XAxis
                            dataKey="recall"
                            stroke="#737373"
                            fontSize={10}
                            fontWeight={700}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                            label={{ value: 'RECALL', position: 'insideBottom', offset: -10, fill: '#737373', fontSize: 9, fontWeight: 900, letterSpacing: '0.1em' }}
                        />
                        <YAxis
                            stroke="#737373"
                            fontSize={10}
                            fontWeight={700}
                            tickLine={false}
                            axisLine={false}
                            dx={-10}
                            label={{ value: 'PRECISION', angle: -90, position: 'insideLeft', fill: '#737373', fontSize: 9, fontWeight: 900, letterSpacing: '0.1em' }}
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
                            cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="precision"
                            stroke={color}
                            strokeWidth={4}
                            dot={false}
                            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                            name="Precision"
                            animationDuration={2000}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default PRCurveChart;
