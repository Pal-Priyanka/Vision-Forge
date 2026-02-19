import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { runDetection, getPRCurve, getPerClassMetrics, getStabilityMetrics } from '../utils/api';
import { DetectionResponse, ModelResult } from '../types/detection.types';

export interface ModelLoadingStatus {
    status: string;
    stages?: {
        encoder: string;
        weights: string;
        warmup: string;
    };
}

export interface InferenceEvent {
    model: string;
    latency_ms: number;
    fps: number;
    num_detections: number;
    timestamp: number;
}

export interface InferenceState {
    // Latest detection result
    latestResult: DetectionResponse | null;
    // Filtered result based on current confidence
    filteredResult: DetectionResponse | null;
    // Rolling history
    inferenceHistory: InferenceEvent[];
    // Is currently running
    isRunning: boolean;
    // Inference count
    inferenceCount: number;
    // Selected confidence for live filtering
    confidence: number;
    // Analytics data (refreshed after each inference)
    analyticsData: {
        prCurveYolo: any[];
        prCurveDetr: any[];
        perClassData: any[];
        latencyDistYolo: any[];
        latencyDistDetr: any[];
        fpsHistoryYolo: any[];
        fpsHistoryDetr: any[];
    };
    analyticsLoading: boolean;
    modelStatus: {
        yolov5: ModelLoadingStatus;
        detr: ModelLoadingStatus;
    };
}

interface InferenceContextType extends InferenceState {
    runInference: (
        imageBase64: string,
        model: 'yolov5' | 'detr' | 'both',
        confThreshold: number,
        iouThreshold: number
    ) => Promise<DetectionResponse | null>;
    setConfidence: (val: number) => void;
    refreshAnalytics: () => Promise<void>;
    clearHistory: () => void;
}

const InferenceContext = createContext<InferenceContextType | null>(null);

export const useInference = () => {
    const ctx = useContext(InferenceContext);
    if (!ctx) throw new Error('useInference must be used within InferenceProvider');
    return ctx;
};

export const InferenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [latestResult, setLatestResult] = useState<DetectionResponse | null>(null);
    const [inferenceHistory, setInferenceHistory] = useState<InferenceEvent[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [inferenceCount, setInferenceCount] = useState(0);
    const [confidence, setConfidence] = useState(0.5);
    const [analyticsData, setAnalyticsData] = useState({
        prCurveYolo: [] as any[],
        prCurveDetr: [] as any[],
        perClassData: [] as any[],
        latencyDistYolo: [] as any[],
        latencyDistDetr: [] as any[],
        fpsHistoryYolo: [] as any[],
        fpsHistoryDetr: [] as any[],
    });
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [modelStatus, setModelStatus] = useState({
        yolov5: { status: 'Loading' } as ModelLoadingStatus,
        detr: { status: 'Loading' } as ModelLoadingStatus,
    });

    // Memoized filtered result for UI synchronization
    const filteredResult = React.useMemo(() => {
        if (!latestResult) return null;
        const filterModel = (res: any) => {
            if (!res) return null;
            return {
                ...res,
                detections: res.detections.filter((d: any) => d.confidence >= confidence),
                num_objects: res.detections.filter((d: any) => d.confidence >= confidence).length
            };
        };
        return {
            yolov5: filterModel(latestResult.yolov5),
            detr: filterModel(latestResult.detr),
        };
    }, [latestResult, confidence]);

    // Handle initial loading and polling for status
    React.useEffect(() => {
        let isMounted = true;
        const fetchStatus = async () => {
            if (!isMounted) return;
            try {
                const API_BASE = import.meta.env.PROD ? 'http://localhost:8000/api' : '/api';
                const response = await fetch(`${API_BASE}/model/status`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();

                // Defensive check: Ensure data has expected structure
                if (isMounted && data && typeof data === 'object' && data.yolov5 && data.detr) {
                    setModelStatus(data);

                    // Keep polling if not ready
                    if (data.detr.status !== 'Ready' || data.yolov5.status !== 'Ready') {
                        setTimeout(() => {
                            if (isMounted) fetchStatus();
                        }, 2000);
                    }
                } else if (isMounted) {
                    console.warn('Received malformed model status data:', data);
                    setTimeout(() => {
                        if (isMounted) fetchStatus();
                    }, 5000);
                }
            } catch (err) {
                if (isMounted) {
                    console.error('Failed to fetch model status:', err);
                    setTimeout(() => {
                        if (isMounted) fetchStatus();
                    }, 5000); // Retry later
                }
            }
        };
        fetchStatus();
        return () => { isMounted = false; };
    }, []);

    const refreshAnalytics = useCallback(async () => {
        setAnalyticsLoading(true);
        try {
            const results = await Promise.allSettled([
                getPRCurve('yolov5'),
                getPRCurve('detr'),
                getPerClassMetrics('yolov5'),
                getPerClassMetrics('detr'),
                getStabilityMetrics('yolov5'),
                getStabilityMetrics('detr'),
            ]);

            const [prYolo, prDetr, perClassYolo, perClassDetr, latYolo, latDetr] = results;

            // Also fetch FPS history
            const API_BASE = import.meta.env.PROD ? 'http://localhost:8000/api' : '/api';
            const fpsResults = await Promise.allSettled([
                fetch(`${API_BASE}/evaluation/latest/fps-history?model=yolov5`).then(r => r.ok ? r.json() : []),
                fetch(`${API_BASE}/evaluation/latest/fps-history?model=detr`).then(r => r.ok ? r.json() : []),
            ]);

            const [fpsYolo, fpsDetr] = fpsResults;

            const yoloMetrics = (perClassYolo.status === 'fulfilled' && perClassYolo.value) ? perClassYolo.value : { metrics: [] };
            const detrMetrics = (perClassDetr.status === 'fulfilled' && perClassDetr.value) ? perClassDetr.value : { metrics: [] };

            // Merge per-class data for comparison with defensive mapping
            const yoloClasses = yoloMetrics?.metrics || [];
            const detrClasses = detrMetrics?.metrics || [];

            const perClassMerged = yoloClasses.map((m: any) => {
                const detrMatch = detrClasses.find((dm: any) => dm.class === m.class);
                return {
                    class: m.class,
                    yolov5_ap: m.ap || 0,
                    detr_ap: detrMatch?.ap || 0,
                };
            });

            setAnalyticsData({
                prCurveYolo: prYolo.status === 'fulfilled' ? (prYolo.value || []) : [],
                prCurveDetr: prDetr.status === 'fulfilled' ? (prDetr.value || []) : [],
                perClassData: perClassMerged,
                latencyDistYolo: latYolo.status === 'fulfilled' ? (latYolo.value || []) : [],
                latencyDistDetr: latDetr.status === 'fulfilled' ? (latDetr.value || []) : [],
                fpsHistoryYolo: fpsYolo.status === 'fulfilled' ? (fpsYolo.value || []) : [],
                fpsHistoryDetr: fpsDetr.status === 'fulfilled' ? (fpsDetr.value || []) : [],
            });
        } catch (err) {
            console.error('CRITICAL: Failed to refresh analytics:', err);
        } finally {
            setAnalyticsLoading(false);
        }
    }, []);

    const abortControllerRef = useRef<AbortController | null>(null);

    const runInference = useCallback(async (
        base64Image: string,
        model: 'yolov5' | 'detr' | 'both',
        confThreshold: number,
        iouThreshold: number
    ): Promise<DetectionResponse | null> => {
        // Cancel any pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setIsRunning(true);
        try {
            const result = await runDetection(base64Image, model, confThreshold, iouThreshold);
            setLatestResult(result);
            setInferenceCount(prev => prev + 1);

            // Record events
            const newEvents: InferenceEvent[] = [];
            if (result.yolov5) {
                newEvents.push({
                    model: 'yolov5',
                    latency_ms: result.yolov5.inference_time_ms,
                    fps: 1000 / result.yolov5.inference_time_ms,
                    num_detections: result.yolov5.num_objects,
                    timestamp: Date.now(),
                });
            }
            if (result.detr) {
                newEvents.push({
                    model: 'detr',
                    latency_ms: result.detr.inference_time_ms,
                    fps: 1000 / result.detr.inference_time_ms,
                    num_detections: result.detr.num_objects,
                    timestamp: Date.now(),
                });
            }
            setInferenceHistory(prev => [...prev.slice(-97), ...newEvents]);

            // Auto-refresh analytics after inference
            await refreshAnalytics();

            return result;
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                console.log('Inference request cancelled');
            } else {
                console.error('Inference failed:', err);
            }
            return null;
        } finally {
            setIsRunning(false);
            abortControllerRef.current = null;
        }
    }, [refreshAnalytics]);

    const clearHistory = useCallback(() => {
        setInferenceHistory([]);
        setLatestResult(null);
        setInferenceCount(0);
        setAnalyticsData({
            prCurveYolo: [],
            prCurveDetr: [],
            perClassData: [],
            latencyDistYolo: [],
            latencyDistDetr: [],
            fpsHistoryYolo: [],
            fpsHistoryDetr: [],
        });
    }, []);

    return (
        <InferenceContext.Provider value={{
            latestResult,
            filteredResult,
            inferenceHistory,
            isRunning,
            inferenceCount,
            confidence,
            analyticsData,
            analyticsLoading,
            modelStatus,
            runInference,
            setConfidence,
            refreshAnalytics,
            clearHistory,
        }}>
            {children}
        </InferenceContext.Provider>
    );
};

export default InferenceContext;
