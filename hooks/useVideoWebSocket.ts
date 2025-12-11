'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { PoseFrame } from '@/utils/poseUtils';

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api';

export interface VideoWebSocketMessage {
    type: 'keypoints' | 'bedrock_analysis' | 'error' | 'complete';
    data?: any;
    message?: string;
}

export interface UseVideoWebSocketOptions {
    videoId: string | null;
    onKeypoints?: (keypoints: PoseFrame[]) => void;
    onBedrockAnalytics?: (analytics: any) => void;
    onError?: (error: string) => void;
    onComplete?: () => void;
    enabled?: boolean;
}

export interface UseVideoWebSocketReturn {
    isConnected: boolean;
    isConnecting: boolean;
    error: string | null;
    disconnect: () => void;
    reconnect: () => void;
}

export function useVideoWebSocket({
    videoId,
    onKeypoints,
    onBedrockAnalytics,
    onError,
    onComplete,
    enabled = true,
}: UseVideoWebSocketOptions): UseVideoWebSocketReturn {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef<number>(0);
    const maxReconnectAttempts = 5;
    const baseReconnectDelay = 1000; // 1 second

    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            // Remove event listeners before closing to prevent reconnection attempts
            wsRef.current.onclose = null;
            wsRef.current.onerror = null;
            wsRef.current.onmessage = null;
            wsRef.current.onopen = null;

            if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
                wsRef.current.close();
            }
            wsRef.current = null;
        }

        setIsConnected(false);
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;
    }, []);

    const connect = useCallback(() => {
        // Don't connect if not enabled, no videoId, or already connected
        if (!enabled || !videoId || wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        // Clean up existing connection
        disconnect();

        setIsConnecting(true);
        setError(null);

        const wsUrl = `${WS_BASE_URL}/videos/ws/${videoId}`;
        console.log('Connecting to WebSocket:', wsUrl);

        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('WebSocket connected for video:', videoId);
                setIsConnected(true);
                setIsConnecting(false);
                setError(null);
                reconnectAttemptsRef.current = 0;
            };

            ws.onmessage = (event) => {
                try {
                    const message: VideoWebSocketMessage = JSON.parse(event.data);
                    console.log('WebSocket message received:', message.type);

                    switch (message.type) {
                        case 'keypoints':
                            if (onKeypoints && message.data) {
                                onKeypoints(message.data);
                            }
                            break;

                        case 'bedrock_analysis':
                            if (onBedrockAnalytics && message.data) {
                                onBedrockAnalytics(message.data);
                            }
                            break;

                        case 'complete':
                            console.log('Video processing complete');
                            if (onComplete) {
                                onComplete();
                            }
                            break;

                        case 'error':
                            const errorMsg = message.message || 'Unknown error occurred';
                            console.error('WebSocket error message:', errorMsg);
                            setError(errorMsg);
                            if (onError) {
                                onError(errorMsg);
                            }
                            break;

                        default:
                            console.warn('Unknown WebSocket message type:', message.type);
                    }
                } catch (err) {
                    console.error('Failed to parse WebSocket message:', err);
                }
            };

            ws.onerror = (event) => {
                console.error('WebSocket error:', event);
                setError('WebSocket connection error');
                setIsConnecting(false);
            };

            ws.onclose = (event) => {
                console.log('WebSocket closed:', event.code, event.reason);
                setIsConnected(false);
                setIsConnecting(false);
                wsRef.current = null;

                // Attempt to reconnect with exponential backoff if not a normal closure
                if (event.code !== 1000 && enabled && reconnectAttemptsRef.current < maxReconnectAttempts) {
                    reconnectAttemptsRef.current += 1;
                    const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1);
                    console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, delay);
                } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
                    setError('Failed to connect after multiple attempts');
                    if (onError) {
                        onError('Failed to connect after multiple attempts');
                    }
                }
            };
        } catch (err) {
            console.error('Failed to create WebSocket:', err);
            setError('Failed to create WebSocket connection');
            setIsConnecting(false);
        }
    }, [videoId, enabled, onKeypoints, onBedrockAnalytics, onError, onComplete, disconnect]);

    // Connect when videoId changes or enabled changes
    useEffect(() => {
        if (enabled && videoId) {
            connect();
        } else {
            disconnect();
        }

        return () => {
            disconnect();
        };
    }, [videoId, enabled, connect, disconnect]);

    const reconnect = useCallback(() => {
        reconnectAttemptsRef.current = 0;
        connect();
    }, [connect]);

    return {
        isConnected,
        isConnecting,
        error,
        disconnect,
        reconnect,
    };
}
