import axios from 'axios';
import { HealthStatus, MetricsResponse, DetectionResponse } from '../types/detection.types';

// Use proxy in development, direct URL in production
const API_BASE_URL = import.meta.env.PROD ? 'http://localhost:8000/api' : '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const checkHealth = async (): Promise<HealthStatus> => {
    const response = await api.get<HealthStatus>('/health');
    return response.data;
};

export const getMetrics = async (): Promise<MetricsResponse> => {
    const response = await api.get<MetricsResponse>('/evaluation/latest/metrics');
    return response.data;
};

export const getPRCurve = async (model: string = 'yolov5'): Promise<any[]> => {
    const response = await api.get(`/evaluation/latest/pr-curve`, { params: { model } });
    return response.data;
};

export const getPerClassMetrics = async (model: string = 'yolov5'): Promise<any> => {
    const response = await api.get(`/evaluation/latest/per-class`, { params: { model } });
    return response.data;
};

export const getStabilityMetrics = async (model: string = 'yolov5'): Promise<any[]> => {
    const response = await api.get(`/evaluation/latest/stability`, { params: { model } });
    return response.data;
};

export const getFPSHistory = async (model: string = 'yolov5'): Promise<any[]> => {
    const response = await api.get(`/evaluation/latest/fps-history`, { params: { model } });
    return response.data;
};

export const runDetection = async (
    base64Image: string,
    model: 'yolov5' | 'detr' | 'both',
    confThreshold: number,
    iouThreshold: number
): Promise<DetectionResponse> => {
    const response = await api.post<DetectionResponse>('/detect', {
        image: base64Image,
        model,
        conf_threshold: confThreshold,
        iou_threshold: iouThreshold,
    });
    return response.data;
};

export interface DatasetStats {
    total_images: number;
    total_annotations: number;
    num_classes: number;
    class_distribution: Record<string, number>;
}

export interface DatasetSample {
    filename: string;
    data: string; // base64
}

export interface SubsetEvalResult {
    model: string;
    subset_pct: number;
    subset_size: number;
    total_images_in_dataset: number;
    mAP_50: number;
    per_class_ap: Record<string, number>;
    avg_latency_ms: number;
    total_time_s: number;
}

export interface IntegrityReport {
    integrity_status: string;
    total_checks: number;
    passed: number;
    failed: number;
    checks: Array<{
        check: string;
        passed: boolean;
        value: number;
        detail: string;
    }>;
    inference_count: number;
}

export const getDatasetStats = async (): Promise<DatasetStats> => {
    const response = await api.get<DatasetStats>('/dataset/stats');
    return response.data;
};

export const getDatasetSamples = async (cls?: string, count: number = 10): Promise<DatasetSample[]> => {
    const response = await api.get<DatasetSample[]>('/dataset/samples', {
        params: { cls, count }
    });
    return response.data;
};

export const evaluateSubset = async (
    model: string = 'yolov5',
    subsetPct: number = 0.1,
    confThreshold: number = 0.5
): Promise<SubsetEvalResult> => {
    const response = await api.get<SubsetEvalResult>('/dataset/evaluate-subset', {
        params: {
            model,
            subset_pct: subsetPct,
            conf_threshold: confThreshold,
        },
    });
    return response.data;
};

export const getIntegrityCheck = async (): Promise<IntegrityReport> => {
    const response = await api.get<IntegrityReport>('/health/integrity');
    return response.data;
};

export const getSystemReport = async (): Promise<any> => {
    const response = await api.get('/health/report');
    return response.data;
};

export const aiChat = async (message: string, context?: string): Promise<string> => {
    const baseUrl = import.meta.env.PROD ? 'http://localhost:8000' : '';
    const response = await fetch(`${baseUrl}/api/ai/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, context: context || 'General computer vision assistant' }),
    });

    if (!response.ok) {
        throw new Error(`AI chat failed: ${response.statusText}`);
    }

    const text = await response.text();
    return text;
};

export default api;
