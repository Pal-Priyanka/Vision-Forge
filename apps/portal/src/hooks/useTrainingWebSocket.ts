import { useState, useEffect, useCallback, useRef } from 'react';

export interface TrainingMetric {
    type: string;
    run_id: string;
    epoch?: number;
    train_loss?: number;
    val_loss?: number;
    map_50?: number;
    map_75?: number;
    precision?: number;
    recall?: number;
    f1?: number;
    lr?: number;
    eta?: number;
}

export const useTrainingWebSocket = (runId: string | null) => {
    const [messages, setMessages] = useState<TrainingMetric[]>([]);
    const [latestMetrics, setLatestMetrics] = useState<TrainingMetric | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 10;

    const connect = useCallback(() => {
        if (!runId) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/training/${runId}`;

        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log(`✅ Connected to training stream: ${runId}`);
                setIsConnected(true);
                setError(null);
                reconnectAttemptsRef.current = 0; // Reset attempts on successful connection
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data) as TrainingMetric;
                    setMessages((prev) => [...prev.slice(-49), data]); // Keep last 50 messages
                    if (data.type === 'epoch_complete') {
                        setLatestMetrics(data);
                    }
                } catch (err) {
                    console.error('Failed to parse WS message:', err);
                }
            };

            ws.onerror = (event) => {
                console.error('❌ WebSocket Error:', event);
                setError('Connection error');
            };

            ws.onclose = () => {
                console.log(`🔌 Disconnected from training stream: ${runId}`);
                setIsConnected(false);

                // Auto-reconnect with exponential backoff
                if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000); // Max 30s
                    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttemptsRef.current++;
                        connect();
                    }, delay);
                } else {
                    setError('Connection lost. Max reconnect attempts reached.');
                }
            };
        } catch (err) {
            console.error('Failed to create WebSocket:', err);
            setError('Failed to connect');
        }
    }, [runId]);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setLatestMetrics(null);
    }, []);

    const reconnect = useCallback(() => {
        reconnectAttemptsRef.current = 0;
        if (wsRef.current) {
            wsRef.current.close();
        }
        connect();
    }, [connect]);

    return {
        messages,
        latestMetrics,
        isConnected,
        error,
        clearMessages,
        reconnect,
        reconnectAttempts: reconnectAttemptsRef.current
    };
};
