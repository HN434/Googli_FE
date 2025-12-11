/**
 * Chat API Service
 * Handles communication with backend chat API including streaming responses
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BE_URL!;

interface ImageData {
    format: 'jpeg' | 'png' | 'webp';
    source: string; // base64 encoded
}

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    images?: ImageData[];
    timestamp?: string;
}

interface ChatRequest {
    message: string;
    images?: ImageData[];
    conversation_history?: ChatMessage[];
    stream?: boolean;
    use_search?: boolean;
    session_id?: string;
    language?: string;
    tone?: string;
}

interface StreamChunk {
    content: string;
    is_final: boolean;
    tool_use?: {
        tool_name: string;
        input: Record<string, any>;
        output?: string;
    };
}

interface FileData {
    name: string;
    type: string;
    fileType: string;
    size: number;
    data: string;
    timestamp: number;
}

class ChatApiService {
    /**
     * Convert frontend message format to backend ChatMessage format
     */
    private convertMessageHistory(messages: Array<{ type: string; text: string; timestamp: number }>): ChatMessage[] {
        return messages
            .filter(msg => msg.type === 'user' || msg.type === 'assistant')
            .map(msg => ({
                role: msg.type === 'user' ? 'user' : 'assistant',
                content: msg.text,
                timestamp: new Date(msg.timestamp).toISOString()
            }));
    }

    /**
     * Convert base64 string to Blob
     */
    private base64ToBlob(base64: string, mimeType: string): Blob {
        const byteCharacters = atob(base64);
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);

            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }

            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }

        return new Blob(byteArrays, { type: mimeType });
    }

    /**
     * Send a chat message with streaming support
     * Note: When images are present, streaming is not available (backend limitation)
     */
    async sendMessage(
        message: string,
        files: FileData[] = [],
        conversationHistory: Array<{ type: string; text: string; timestamp: number }> = [],
        onChunk?: (chunk: string) => void,
        sessionId?: string,
        language?: string,
        tone?: string
    ): Promise<{ message: string }> {
        const hasImages = files.some(file => file.fileType === 'image');

        // If there are images, use FormData endpoint (no streaming)
        if (hasImages) {
            return this.sendMessageWithImages(message, files, onChunk, sessionId, language, tone);
        }

        // Otherwise, use streaming endpoint
        const history = this.convertMessageHistory(conversationHistory);

        const requestBody: ChatRequest = {
            message,
            conversation_history: history,
            stream: true,
            use_search: undefined, // Let AI decide
            session_id: sessionId,
            language,
            tone
        };

        const response = await fetch(`${BACKEND_URL}chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Chat API request failed: ${response.status} ${response.statusText}`);
        }

        // Handle Server-Sent Events stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullMessage = '';

        if (!reader) {
            throw new Error('Response body is not readable');
        }

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                // Decode the chunk
                const chunk = decoder.decode(value, { stream: true });

                // Split by SSE message boundaries
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6); // Remove 'data: ' prefix

                        if (data === '[DONE]') {
                            // Stream complete
                            continue;
                        }

                        try {
                            const streamChunk: StreamChunk = JSON.parse(data);

                            if (streamChunk.content) {
                                fullMessage += streamChunk.content;

                                // Call the chunk callback if provided
                                if (onChunk) {
                                    onChunk(streamChunk.content);
                                }
                            }

                            if (streamChunk.is_final) {
                                break;
                            }
                        } catch (e) {
                            // Skip invalid JSON
                            console.warn('Failed to parse SSE chunk:', data);
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        return { message: fullMessage };
    }

    /**
     * Send a message with complete response (no streaming)
     * This is the new method that gets the full response before displaying
     */
    async sendMessageComplete(
        message: string,
        files: FileData[] = [],
        conversationHistory: Array<{ type: string; text: string; timestamp: number }> = [],
        sessionId?: string,
        language?: string,
        tone?: string
    ): Promise<{ message: string }> {
        const hasImages = files.some(file => file.fileType === 'image');

        // If there are images, use FormData endpoint
        if (hasImages) {
            return this.sendMessageWithImagesComplete(message, files, sessionId, language, tone);
        }

        // Otherwise, use regular chat endpoint with stream=false
        const history = this.convertMessageHistory(conversationHistory);

        const requestBody: ChatRequest = {
            message,
            conversation_history: history,
            stream: false, // Complete response, no streaming
            use_search: undefined, // Let AI decide
            session_id: sessionId,
            language,
            tone
        };

        const response = await fetch(`${BACKEND_URL}chat/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Chat API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        return { message: result.message };
    }

    /**
     * Send a message with images using FormData (complete response)
     * Note: This endpoint does not support streaming
     */
    private async sendMessageWithImagesComplete(
        message: string,
        files: FileData[],
        sessionId?: string,
        language?: string,
        tone?: string
    ): Promise<{ message: string }> {
        const formData = new FormData();

        // Add message
        formData.append('message', message);

        // Add images as File objects
        for (const file of files) {
            if (file.fileType === 'image') {
                // Convert base64 back to File object
                const blob = this.base64ToBlob(file.data, file.type);
                const imageFile = new File([blob], file.name, { type: file.type });
                formData.append('images', imageFile);
            }
        }

        // Add stream parameter
        formData.append('stream', 'false');

        // Add session_id if provided
        if (sessionId) {
            formData.append('session_id', sessionId);
        }

        // Add language and tone if provided
        if (language) {
            formData.append('language', language);
        }
        if (tone) {
            formData.append('tone', tone);
        }

        const response = await fetch(`${BACKEND_URL}chat/message-with-image`, {
            method: 'POST',
            body: formData
            // Don't set Content-Type header - browser will set it with boundary
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Chat API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        return { message: result.message };
    }

    /**
     * Send a message with images using FormData
     * Note: This endpoint does not support streaming
     */
    private async sendMessageWithImages(
        message: string,
        files: FileData[],
        onChunk?: (chunk: string) => void,
        sessionId?: string,
        language?: string,
        tone?: string
    ): Promise<{ message: string }> {
        const formData = new FormData();

        // Add message
        formData.append('message', message);

        // Add images as File objects
        for (const file of files) {
            if (file.fileType === 'image') {
                // Convert base64 back to File object
                const blob = this.base64ToBlob(file.data, file.type);
                const imageFile = new File([blob], file.name, { type: file.type });
                formData.append('images', imageFile);
            }
        }

        // Add stream parameter (although backend doesn't support streaming for images yet)
        formData.append('stream', 'false');

        // Add session_id if provided
        if (sessionId) {
            formData.append('session_id', sessionId);
        }

        // Add language and tone if provided
        if (language) {
            formData.append('language', language);
        }
        if (tone) {
            formData.append('tone', tone);
        }

        const response = await fetch(`${BACKEND_URL}chat/message-with-image`, {
            method: 'POST',
            body: formData
            // Don't set Content-Type header - browser will set it with boundary
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Chat API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();

        // Simulate streaming effect for consistency with regular chat
        if (onChunk && result.message) {
            const words = result.message.split(' ');
            for (let i = 0; i < words.length; i++) {
                const chunk = (i === 0 ? '' : ' ') + words[i];
                onChunk(chunk);
                // Small delay to simulate streaming
                await new Promise(resolve => setTimeout(resolve, 20));
            }
        }

        return { message: result.message };
    }
}

// Create singleton instance
const chatApiService = new ChatApiService();

export default chatApiService;
