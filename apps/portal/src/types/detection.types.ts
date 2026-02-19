export interface Detection {
    class: string;
    confidence: number;
    bbox: [number, number, number, number];
}

export interface ModelResult {
    detections: Detection[];
    inference_time_ms: number;
    num_objects: number;
    avg_confidence: number;
    image_with_boxes: string; // Base64 string
}

export interface DetectionResponse {
    yolov5?: ModelResult;
    detr?: ModelResult;
}

export interface ModelMetrics {
    map_50: number;
    map_75: number;
    avg_inference_ms: number;
    precision: number;
    recall: number;
    params_millions: number;
    fps: number;
}

export interface MetricsResponse {
    yolov5: ModelMetrics;
    detr: ModelMetrics;
}

export interface HealthStatus {
    status: string;
    yolov5_loaded: boolean;
    detr_loaded: boolean;
    gpu_available: boolean;
    device: string;
}
