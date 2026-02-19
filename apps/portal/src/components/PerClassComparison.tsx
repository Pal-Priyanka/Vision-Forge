import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, BarChart3 } from 'lucide-react';
import { exportChartAsPNG } from '@/utils/exportChart';

interface PerClassMetric {
    class: string;
    yolov5_ap: number;
    detr_ap: number;
}

interface PerClassComparisonProps {
    data: PerClassMetric[];
    className?: string;
}

const PerClassComparison: React.FC<PerClassComparisonProps> = ({ data, className = '' }) => {
    const chartId = 'per-class-ap-comparison';

    const handleExport = () => {
        exportChartAsPNG(chartId, 'Per-Class AP Comparison');
    };

    return (
        <div className={`glass-card p-8 rounded-[2rem] bg-white/40 shadow-premium ${className}`} id={chartId}>
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-accent/10 text-accent shadow-premium">
                        <BarChart3 size={18} />
                    </div>
                    <h3 className="text-xl font-black tracking-tight">Per-Class Precision Benchmark</h3>
                </div>
                <button
                    onClick={handleExport}
                    className="p-2.5 bg-secondary hover:bg-border rounded-xl transition-all duration-300 active:scale-95 group"
                    title="Export to PNG"
                >
                    <Download size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
            </div>
            <div className="h-[500px] w-full bg-white/30 rounded-3xl p-6 border border-border/50">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" barSize={12} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" horizontal={false} />
                        <XAxis
                            type="number"
                            domain={[0, 1]}
                            stroke="#737373"
                            fontSize={10}
                            fontWeight={700}
                            axisLine={false}
                            tickLine={false}
                            label={{ value: 'AVERAGE PRECISION (AP)', position: 'insideBottom', offset: -10, fill: '#737373', fontSize: 9, fontWeight: 900, letterSpacing: '0.1em' }}
                        />
                        <YAxis
                            type="category"
                            dataKey="class"
                            stroke="#737373"
                            fontSize={10}
                            fontWeight={700}
                            width={100}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#171717', fontSize: 9, fontWeight: 600 }}
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
                            formatter={(value: number) => [Number(value).toFixed(3), 'Precision Score']}
                            cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                        />
                        <Legend
                            verticalAlign="top"
                            align="right"
                            iconType="circle"
                            wrapperStyle={{ paddingBottom: '30px', fontSize: 10, fontWeight: 700, opacity: 0.8 }}
                        />
                        <Bar dataKey="yolov5_ap" fill="hsl(var(--primary))" name="YOLOv5 Architecture" radius={[0, 6, 6, 0]} />
                        <Bar dataKey="detr_ap" fill="hsl(var(--accent))" name="DETR Transformer" radius={[0, 6, 6, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default PerClassComparison;
