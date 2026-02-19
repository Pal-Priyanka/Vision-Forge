import { useState, useEffect, useCallback, useRef } from 'react';

export interface TelemetryEvent {
    type: string;
    model?: string;
    image_id?: string;
    num_detections?: number;
    latency_ms?: number;
    fps?: number;
    timestamp?: number;
    inference_count?: number;
    iteration?: number;
    total?: number;
    avg_latency?: number;
    log?: string;
}

export const useTelemetryStream = () => {
    const [events, setEvents] = useState<TelemetryEvent[]>([]);
    const [latestEvent, setLatestEvent] = useState<TelemetryEvent | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 15;

    const connect = useCallback(() => {
        // Use Vite proxy path in dev, direct URL in prod
        const baseUrl = import.meta.env.PROD ? 'http://localhost:8000' : '';
        const url = `${baseUrl}/api/telemetry/stream`;

        try {
            const es = new EventSource(url);
            eventSourceRef.current = es;

            es.onopen = () => {
                console.log('✅ Telemetry SSE connected');
                setIsConnected(true);
                setError(null);
                reconnectAttemptsRef.current = 0;
            };

            es.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data) as TelemetryEvent;
                    if (data.type === 'heartbeat') return;

                    setLatestEvent(data);
                    setEvents(prev => [...prev.slice(-49), data]); // Keep last 50 for performance
                } catch (err) {
                    console.error('Failed to parse SSE event:', err);
                }
            };

            es.onerror = () => {
                console.error('❌ Telemetry SSE error');
                setIsConnected(false);
                es.close();

                // Auto-reconnect with backoff
                if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                    const delay = Math.min(2000 * Math.pow(1.5, reconnectAttemptsRef.current), 30000);
                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttemptsRef.current++;
                        connect();
                    }, delay);
                } else {
                    setError('Telemetry connection lost. Max reconnect attempts reached.');
                }
            };
        }
    }, []);

    useEffect(() => {
        connect();
        return () => {
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (eventSourceRef.current) eventSourceRef.current.close();
        };
    }, [connect]);

    const reconnect = useCallback(() => {
        reconnectAttemptsRef.current = 0;
        if (eventSourceRef.current) eventSourceRef.current.close();
        connect();
    }, [connect]);

    // Derived metrics
    const inferenceEvents = events.filter(e => e.type === 'inference_complete' || e.type === 'inference_iteration');
    const rollingFPS = inferenceEvents.slice(-10).map(e => e.fps ?? (e.latency_ms ? (1000 / e.latency_ms) : 0));
    const avgFPS = rollingFPS.length > 0
        ? rollingFPS.reduce((a, b) => a + b, 0) / rollingFPS.length
        : 0;

    // Variance check for integrity
    const rollingLatency = inferenceEvents.slice(-10).map(e => e.latency_ms ?? 0);
    const latencyVariance = rollingLatency.length >= 2
        ? rollingLatency.reduce((sum, val) => {
            const mean = rollingLatency.reduce((a, b) => a + b, 0) / rollingLatency.length;
            return sum + Math.pow(val - mean, 2);
        }, 0) / rollingLatency.length
        : 0;

    return {
        events,
        inferenceEvents,
        latestEvent,
        isConnected,
        error,
        reconnect,
        reconnectAttempts: reconnectAttemptsRef.current,
        rollingFPS: Math.round(avgFPS * 10) / 10,
        latencyVariance: Math.round(latencyVariance * 100) / 100,
    };
};
