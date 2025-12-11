'use client';

import { useState, useRef, useEffect } from 'react';
import bedrockService from '@/services/bedrockService';
import pollyService from '@/services/pollyService';
import transcribeService from '@/services/transcribeService';

interface Message {
    id: string;
    type: 'user' | 'assistant' | 'error';
    text: string;
    timestamp: number;
    tokens?: { input: number; output: number };
    file?: FileData;
}

interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    createdAt: number;
    updatedAt: number;
}

interface FileData {
    name: string;
    type: string;
    fileType: string;
    size: number;
    data: string;
    timestamp: number;
}

interface VoiceSettings {
    enabled: boolean;
    language: string;
    gender: string;
    persona: string;
}

export default function MultiModelChat() {
    // Chat sessions
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);

    // UI state
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(true);

    // Voice settings
    const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
        enabled: false,
        language: 'UK-EN',
        gender: 'Female',
        persona: 'Professional'
    });

    // File upload
    const [uploadedFiles, setUploadedFiles] = useState<FileData[]>([]);
    const [isProcessingFile, setIsProcessingFile] = useState(false);

    // Audio recording
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize AWS services
    useEffect(() => {
        const initServices = async () => {
            // Get AWS credentials from environment variables
            const accessKeyId = process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;
            const secretAccessKey = process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;
            const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';

            if (accessKeyId && secretAccessKey) {
                try {
                    // Initialize Bedrock
                    await bedrockService.initialize(
                        accessKeyId,
                        secretAccessKey,
                        region
                    );

                    // Initialize Polly for voice
                    await pollyService.initialize(
                        accessKeyId,
                        secretAccessKey,
                        region
                    );

                    console.log('AWS services initialized successfully');
                } catch (err) {
                    console.error('Failed to initialize AWS services:', err);
                    console.log('Chatbot will work with fallback options');
                }
            } else {
                console.log('AWS credentials not provided. Using fallback options.');
            }
        };

        initServices();
    }, []);

    // Initialize first session
    useEffect(() => {
        if (sessions.length === 0) {
            createNewSession();
        }
    }, []);

    // Load current session messages
    useEffect(() => {
        if (currentSessionId) {
            const session = sessions.find(s => s.id === currentSessionId);
            if (session) {
                setMessages(session.messages);
            }
        }
    }, [currentSessionId, sessions]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Create new chat session
    const createNewSession = () => {
        const newSession: ChatSession = {
            id: Date.now().toString(),
            title: 'New Chat',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
        setMessages([]);
        bedrockService.clearHistory();
    };

    // Update session
    const updateSession = (sessionId: string, updates: Partial<ChatSession>) => {
        setSessions(prev => prev.map(s =>
            s.id === sessionId ? { ...s, ...updates, updatedAt: Date.now() } : s
        ));
    };

    // Delete session
    const deleteSession = (sessionId: string) => {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        if (currentSessionId === sessionId) {
            const remaining = sessions.filter(s => s.id !== sessionId);
            if (remaining.length > 0) {
                setCurrentSessionId(remaining[0].id);
            } else {
                createNewSession();
            }
        }
    };

    // Handle send message
    const handleSend = async () => {
        if ((!inputValue.trim() && uploadedFiles.length === 0) || isLoading || !currentSessionId) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            text: inputValue.trim() || 'Analyze the uploaded file(s)',
            timestamp: Date.now()
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInputValue('');

        // Update session title from first message
        if (newMessages.length === 1) {
            const title = userMessage.text.substring(0, 30) + (userMessage.text.length > 30 ? '...' : '');
            updateSession(currentSessionId, { title });
        }

        setIsLoading(true);

        try {
            let messageContext = userMessage.text;
            if (uploadedFiles.length > 0) {
                messageContext += '\n\n[Attached files: ' + uploadedFiles.map(f => f.name).join(', ') + ']';
            }

            const response = await bedrockService.getCricketAdvice(messageContext, uploadedFiles);

            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'assistant',
                text: response.message,
                timestamp: Date.now(),
                tokens: response.tokens
            };

            const updatedMessages = [...newMessages, botMessage];
            setMessages(updatedMessages);
            updateSession(currentSessionId, { messages: updatedMessages });

            setUploadedFiles([]);

            if (voiceSettings.enabled) {
                await pollyService.speakCommentary(response.message, voiceSettings.language, voiceSettings.gender);
            }
        } catch (err: any) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'error',
                text: `Sorry, I encountered an error: ${err.message}. Please try again.`,
                timestamp: Date.now()
            };

            const updatedMessages = [...newMessages, errorMessage];
            setMessages(updatedMessages);
            updateSession(currentSessionId, { messages: updatedMessages });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle file upload
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        setIsProcessingFile(true);

        try {
            for (const file of files) {
                const fileType = file.type.split('/')[0];

                if (!['image', 'audio'].includes(fileType)) {
                    throw new Error(`Unsupported file type: ${file.type}`);
                }

                if (file.size > 10 * 1024 * 1024) {
                    throw new Error(`File too large: ${file.name}. Maximum size is 10MB.`);
                }

                const base64Data = await readFileAsBase64(file);

                const fileData: FileData = {
                    name: file.name,
                    type: file.type,
                    fileType: fileType,
                    size: file.size,
                    data: base64Data,
                    timestamp: Date.now()
                };

                setUploadedFiles(prev => [...prev, fileData]);
            }
        } catch (err: any) {
            console.error('Error uploading file:', err);
        } finally {
            setIsProcessingFile(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const readFileAsBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // Handle voice recording
    const handleVoiceRecording = async () => {
        if (isRecording) return;

        setIsRecording(true);
        setIsTranscribing(true);

        try {
            const transcript = await transcribeService.transcribeRecording('en-US', 60000);

            if (transcript && transcript.trim()) {
                setInputValue(transcript);
                setTimeout(() => handleSend(), 500);
            }
        } catch (err: any) {
            console.error('Transcription error:', err);
        } finally {
            setIsRecording(false);
            setIsTranscribing(false);
        }
    };

    return (
        <div className="flex h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl overflow-hidden shadow-2xl relative">
            {/* Chat History Sidebar */}
            <div className={`${showHistory ? 'w-64' : 'w-0'} transition-all duration-300 bg-slate-900/50 border-r border-slate-700/50 flex flex-col overflow-hidden`}>
                <div className="p-4 border-b border-slate-700/50">
                    <button
                        onClick={createNewSession}
                        className="w-full px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 font-medium shadow-lg"
                    >
                        + New Chat
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {sessions.map(session => (
                        <div
                            key={session.id}
                            onClick={() => setCurrentSessionId(session.id)}
                            className={`p-3 rounded-lg cursor-pointer transition-all duration-200 group ${currentSessionId === session.id
                                ? 'bg-emerald-500/20 border border-emerald-500/50'
                                : 'bg-slate-800/50 hover:bg-slate-700/50 border border-transparent'
                                }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-200 truncate">
                                        {session.title}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {new Date(session.updatedAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteSession(session.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 transition-all"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-700/50 bg-slate-900/30 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                            >
                                <span className="text-xl">{showHistory ? '◀' : '▶'}</span>
                            </button>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Cricket AI Assistant</h3>
                                {/* <p className="text-xs text-slate-400">
                                    {bedrockService.initialized ? '🟢 AWS Bedrock Connected' : '🟡 Basic Mode'}
                                </p> */}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                                title="Settings"
                            >
                                <span className="text-xl">⚙️</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">🏏</div>
                            <h4 className="text-xl font-semibold text-white mb-2">Welcome to Cricket AI</h4>
                            <p className="text-slate-400 mb-6">Ask me anything about cricket!</p>
                            <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
                                {[
                                    'How to improve my cover drive?',
                                    'Best bowling strategies for T20?',
                                    'Explain LBW rule',
                                    'Fitness routine for cricketers'
                                ].map((q, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setInputValue(q)}
                                        className="p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg text-sm text-slate-300 transition-all border border-slate-700/50 hover:border-emerald-500/50"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map(msg => (
                        <div
                            key={msg.id}
                            className={`flex gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.type === 'user' ? 'bg-emerald-500' : 'bg-slate-700'
                                }`}>
                                {msg.type === 'user' ? '👤' : '🏏'}
                            </div>

                            <div className={`flex-1 max-w-[80%] ${msg.type === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                                <div className={`px-4 py-3 rounded-2xl ${msg.type === 'user'
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                                    : msg.type === 'error'
                                        ? 'bg-red-500/20 border border-red-500/50 text-red-200'
                                        : 'bg-slate-800/80 text-slate-100'
                                    }`}>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                </div>

                                <div className="flex items-center gap-2 mt-1 px-2">
                                    <span className="text-xs text-slate-500">
                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                    </span>
                                    {msg.tokens && (
                                        <span className="text-xs text-slate-500">
                                            • {msg.tokens.input + msg.tokens.output} tokens
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                                🏏
                            </div>
                            <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/80 rounded-2xl">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-slate-700/50 bg-slate-900/30 backdrop-blur-sm">
                    {uploadedFiles.length > 0 && (
                        <div className="mb-3 flex gap-2 flex-wrap">
                            {uploadedFiles.map((file, idx) => (
                                <div key={idx} className="relative group">
                                    {file.fileType === 'image' ? (
                                        <img
                                            src={`data:${file.type};base64,${file.data}`}
                                            alt={file.name}
                                            className="w-16 h-16 object-cover rounded-lg border border-slate-600"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 bg-slate-800 rounded-lg border border-slate-600 flex items-center justify-center">
                                            <span className="text-2xl">🎵</span>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept="image/*,audio/*"
                            multiple
                            className="hidden"
                        />

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading || isProcessingFile}
                            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                            title="Upload file"
                        >
                            <span className="text-xl">📎</span>
                        </button>

                        <button
                            onClick={handleVoiceRecording}
                            disabled={isLoading || isRecording}
                            className={`p-3 rounded-lg transition-all ${isRecording
                                ? 'bg-red-500 animate-pulse'
                                : 'bg-slate-800 hover:bg-slate-700'
                                } disabled:opacity-50`}
                            title={isRecording ? 'Recording...' : 'Voice input'}
                        >
                            <span className="text-xl">🎙️</span>
                        </button>

                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            placeholder="Ask me anything about cricket..."
                            disabled={isLoading}
                            className="flex-1 px-4 py-3 bg-slate-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                        />

                        <button
                            onClick={handleSend}
                            disabled={(!inputValue.trim() && uploadedFiles.length === 0) || isLoading}
                            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>

            {/* Settings Drawer from Top - Minimal */}
            <div className={`absolute top-0 left-0 right-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700 shadow-2xl z-50 transition-all duration-300 ease-in-out ${showSettings ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
                <div className="max-w-4xl mx-auto px-6 py-5">
                    {/* Minimal Header with Close */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400/20 to-teal-500/20 flex items-center justify-center">
                                <span className="text-xl">🔊</span>
                            </div>
                            <div>
                                <h4 className="text-base font-semibold text-white">Voice Response</h4>
                                <p className="text-xs text-gray-400">Configure AI voice settings</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={voiceSettings.enabled}
                                    onChange={(e) => setVoiceSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-400/30 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-emerald-400 peer-checked:to-teal-500"></div>
                            </label>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="p-2 hover:bg-gray-700/50 rounded-lg transition-all duration-200"
                                title="Close"
                            >
                                <span className="text-lg text-gray-400 hover:text-white">✕</span>
                            </button>
                        </div>
                    </div>

                    {/* Compact Settings Grid */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-medium text-gray-400 block mb-1.5">Language</label>
                            <select
                                value={voiceSettings.language}
                                onChange={(e) => setVoiceSettings(prev => ({ ...prev, language: e.target.value }))}
                                disabled={!voiceSettings.enabled}
                                className="w-full px-3 py-2 text-sm bg-gray-800/80 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <option value="UK-EN">English</option>
                                <option value="Hindi">Hindi</option>
                                <option value="Tamil">Tamil</option>
                                <option value="Telugu">Telugu</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-gray-400 block mb-1.5">Voice</label>
                            <select
                                value={voiceSettings.gender}
                                onChange={(e) => setVoiceSettings(prev => ({ ...prev, gender: e.target.value }))}
                                disabled={!voiceSettings.enabled}
                                className="w-full px-3 py-2 text-sm bg-gray-800/80 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <option value="Female">Female</option>
                                <option value="Male">Male</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-gray-400 block mb-1.5">Persona</label>
                            <select
                                value={voiceSettings.persona}
                                onChange={(e) => setVoiceSettings(prev => ({ ...prev, persona: e.target.value }))}
                                disabled={!voiceSettings.enabled}
                                className="w-full px-3 py-2 text-sm bg-gray-800/80 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <option value="Professional">Normal</option>
                                <option value="Casual">Casual</option>
                                <option value="Enthusiastic">Enthusiastic</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Backdrop overlay when settings open */}
            {showSettings && (
                <div
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
                    onClick={() => setShowSettings(false)}
                />
            )}
        </div>
    );
}
