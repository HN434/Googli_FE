'use client';

import { useState, useRef, useEffect } from 'react';
import { History } from 'lucide-react';
import bedrockService from '@/services/bedrockService';
import pollyService from '@/services/pollyService';
import transcribeService from '@/services/transcribeService';

// Add keyframe animation for drawer
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInLeft {
            from {
                transform: translateX(-100%);
            }
            to {
                transform: translateX(0);
            }
        }
    `;
    if (!document.head.querySelector('style[data-drawer-animation]')) {
        style.setAttribute('data-drawer-animation', 'true');
        document.head.appendChild(style);
    }
}

interface Message {
    id: string;
    type: 'user' | 'assistant' | 'error';
    text: string;
    timestamp: number;
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

interface ChatHistory {
    id: string;
    title: string;
    timestamp: number;
    messages: Message[];
}

interface FloatingChatProps {
    onClose?: () => void;
    isFullscreen?: boolean;
    onToggleFullscreen?: () => void;
}

export default function FloatingChat({ onClose, isFullscreen = false, onToggleFullscreen }: FloatingChatProps = {}) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<FileData[]>([]);
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
        enabled: false,
        language: 'English',
        gender: 'Female',
        persona: 'Normal'
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize AWS services
    useEffect(() => {
        const initServices = async () => {
            const accessKeyId = process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;
            const secretAccessKey = process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;
            const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';

            if (accessKeyId && secretAccessKey) {
                try {
                    await bedrockService.initialize(accessKeyId, secretAccessKey, region);
                    await pollyService.initialize(accessKeyId, secretAccessKey, region);
                } catch (err) {
                    console.error('Failed to initialize AWS services:', err);
                }
            }
        };

        initServices();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if ((!inputValue.trim() && uploadedFiles.length === 0) || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            text: inputValue.trim() || 'Analyze the uploaded file(s)',
            timestamp: Date.now()
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInputValue('');
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
                timestamp: Date.now()
            };

            setMessages([...newMessages, botMessage]);
            setUploadedFiles([]);

            // Speak response if voice is enabled
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

            setMessages([...newMessages, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

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

    const handleVoiceRecording = async () => {
        if (isRecording) return;

        setIsRecording(true);

        try {
            const transcript = await transcribeService.transcribeRecording('en-US', 60000);

            if (transcript && transcript.trim()) {
                setInputValue(transcript);
            }
        } catch (err: any) {
            console.error('Transcription error:', err);
        } finally {
            setIsRecording(false);
        }
    };

    const quickSuggestions = [
        'How to improve my cover drive?',
        'Best bowling strategies for T20?',
        'Explain LBW rule',
        'Fitness routine for cricketers'
    ];

    const saveCurrentChat = () => {
        if (messages.length === 0) return;

        const chatId = currentChatId || Date.now().toString();
        const firstUserMessage = messages.find(m => m.type === 'user')?.text || 'New Chat';
        const title = firstUserMessage.slice(0, 50) + (firstUserMessage.length > 50 ? '...' : '');

        const chatData: ChatHistory = {
            id: chatId,
            title,
            timestamp: Date.now(),
            messages: [...messages]
        };

        setChatHistory(prev => {
            const existingIndex = prev.findIndex(chat => chat.id === chatId);
            if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = chatData;
                return updated;
            }
            return [chatData, ...prev];
        });

        setCurrentChatId(chatId);
    };

    const loadChat = (chatId: string) => {
        const chat = chatHistory.find(c => c.id === chatId);
        if (chat) {
            setMessages(chat.messages);
            setCurrentChatId(chatId);
            setShowHistoryDrawer(false);
        }
    };

    const startNewChat = () => {
        saveCurrentChat();
        setMessages([]);
        setCurrentChatId(null);
        setUploadedFiles([]);
        setInputValue('');
        setShowHistoryDrawer(false);
    };

    const deleteChat = (chatId: string) => {
        setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
        if (currentChatId === chatId) {
            setMessages([]);
            setCurrentChatId(null);
        }
    };

    // Auto-save chat when messages change
    useEffect(() => {
        if (messages.length > 0) {
            const timeoutId = setTimeout(() => {
                saveCurrentChat();
            }, 1000);
            return () => clearTimeout(timeoutId);
        }
    }, [messages]);

    return (
        <div className="flex flex-col h-full relative">
            {/* History Drawer */}
            {showHistoryDrawer && (
                <>
                    {/* Overlay */}
                    <div 
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
                        onClick={() => setShowHistoryDrawer(false)}
                    />
                    
                    {/* Drawer */}
                    <div 
                        className="absolute left-0 top-0 bottom-0 w-[50%] bg-slate-900 border-r border-slate-700/50 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-out"
                        style={{ animation: 'slideInLeft 0.3s ease-out' }}
                    >
                        {/* Drawer Header */}
                        <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                                    <History className="w-5 h-5 text-emerald-400" />
                                    Chat History
                                </h3>
                                <button
                                    onClick={() => setShowHistoryDrawer(false)}
                                    className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors"
                                >
                                    <span className="text-slate-300 text-lg hover:text-white">✕</span>
                                </button>
                            </div>
                        </div>

                        {/* New Chat Button */}
                        <div className="p-3 border-b border-slate-700/50">
                            <button
                                onClick={startNewChat}
                                className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Start New Chat
                            </button>
                        </div>

                        {/* Chat History List */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                            {chatHistory.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm">
                                    <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>No chat history yet</p>
                                    <p className="text-xs mt-1">Start a conversation to see it here</p>
                                </div>
                            ) : (
                                chatHistory.map(chat => (
                                    <div
                                        key={chat.id}
                                        className={`group relative p-3 rounded-lg border transition-all cursor-pointer ${
                                            currentChatId === chat.id
                                                ? 'bg-emerald-500/10 border-emerald-500/50'
                                                : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                                        }`}
                                        onClick={() => loadChat(chat.id)}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium text-white truncate mb-1">
                                                    {chat.title}
                                                </h4>
                                                <p className="text-xs text-slate-400">
                                                    {new Date(chat.timestamp).toLocaleDateString()} • {chat.messages.length} messages
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteChat(chat.id);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                                                title="Delete chat"
                                            >
                                                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-900/30 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <span className="text-xl">🏏</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-semibold text-white">Cricket AI</h3>
                                <span className="flex items-center gap-1 text-xs text-emerald-400">
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                                    Online
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">Ask me anything!</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
                            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                            title="Chat History"
                        >
                            <History className="w-5 h-5 text-slate-300 hover:text-emerald-400 transition-colors" />
                        </button>

                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                            title="Settings"
                        >
                            <svg 
                                className="w-5 h-5 text-slate-300 hover:text-emerald-400 transition-colors" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
                                />
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                                />
                            </svg>
                        </button>
                        
                        {onToggleFullscreen && (
                            <button
                                onClick={onToggleFullscreen}
                                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                            >
                                {isFullscreen ? (
                                    <svg 
                                        className="w-5 h-5 text-slate-300 hover:text-emerald-400 transition-colors" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                            strokeWidth={2} 
                                            d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9h4.5M15 9V4.5M15 9l5.25-5.25M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" 
                                        />
                                    </svg>
                                ) : (
                                    <svg 
                                        className="w-5 h-5 text-slate-300 hover:text-emerald-400 transition-colors" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                            strokeWidth={2} 
                                            d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" 
                                        />
                                    </svg>
                                )}
                            </button>
                        )}
                        
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                                title="Close"
                            >
                                <span className="text-slate-300 text-lg hover:text-white">✕</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Voice Response Settings - Collapsible */}
            {showSettings && (
                <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🔊</span>
                            <h4 className="text-sm font-semibold text-white">Voice Response</h4>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={voiceSettings.enabled}
                                onChange={(e) => setVoiceSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-400/30 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-emerald-400 peer-checked:to-teal-500"></div>
                        </label>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-xs font-medium text-slate-400 block mb-1">Language</label>
                            <select
                                value={voiceSettings.language}
                                onChange={(e) => setVoiceSettings(prev => ({ ...prev, language: e.target.value }))}
                                disabled={!voiceSettings.enabled}
                                className="w-full px-2 py-1.5 text-xs bg-slate-800/80 text-white rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <option value="English">English</option>
                                <option value="Hindi">Hindi</option>
                                <option value="Tamil">Tamil</option>
                                <option value="Telugu">Telugu</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-slate-400 block mb-1">Voice</label>
                            <select
                                value={voiceSettings.gender}
                                onChange={(e) => setVoiceSettings(prev => ({ ...prev, gender: e.target.value }))}
                                disabled={!voiceSettings.enabled}
                                className="w-full px-2 py-1.5 text-xs bg-slate-800/80 text-white rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <option value="Female">Female</option>
                                <option value="Male">Male</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-slate-400 block mb-1">Persona</label>
                            <select
                                value={voiceSettings.persona}
                                onChange={(e) => setVoiceSettings(prev => ({ ...prev, persona: e.target.value }))}
                                disabled={!voiceSettings.enabled}
                                className="w-full px-2 py-1.5 text-xs bg-slate-800/80 text-white rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <option value="Normal">Normal</option>
                                <option value="Casual">Casual</option>
                                <option value="Enthusiastic">Enthusiastic</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900 hover:scrollbar-thumb-emerald-500">
                {messages.length === 0 && (
                    <div className="text-center py-8">
                        <div className="text-5xl mb-3">🏏</div>
                        <h4 className="text-lg font-semibold text-white mb-2">Welcome!</h4>
                        <p className="text-sm text-slate-400 mb-4">Ask me anything about cricket</p>
                        <div className="space-y-2">
                            {quickSuggestions.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => setInputValue(q)}
                                    className="w-full p-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg text-xs text-slate-300 transition-all border border-slate-700/50 hover:border-emerald-500/50 text-left"
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
                        className={`flex gap-2 ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${
                            msg.type === 'user' ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}>
                            {msg.type === 'user' ? '👤' : '🏏'}
                        </div>

                        <div className={`flex-1 max-w-[75%]`}>
                            <div className={`px-3 py-2 rounded-2xl text-sm ${
                                msg.type === 'user'
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                                    : msg.type === 'error'
                                        ? 'bg-red-500/20 border border-red-500/50 text-red-200'
                                        : 'bg-slate-800/80 text-slate-100'
                            }`}>
                                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            </div>
                            <span className="text-xs text-slate-500 px-2 mt-1 block">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-sm">
                            🏏
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 rounded-2xl">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-slate-700/50 bg-slate-900/30 backdrop-blur-sm">
                <div className="flex items-end gap-2">
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
                        className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0 mb-0.5"
                        title="Upload file"
                    >
                        <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                    </button>

                    <div className="flex-1 relative bg-slate-800 rounded-2xl">
                        {uploadedFiles.length > 0 && (
                            <div className="px-3 pt-3 pb-2 flex gap-2 flex-wrap border-b border-slate-700/50">
                                {uploadedFiles.map((file, idx) => (
                                    <div key={idx} className="relative group">
                                        {file.fileType === 'image' ? (
                                            <img
                                                src={`data:${file.type};base64,${file.data}`}
                                                alt={file.name}
                                                className="w-12 h-12 object-cover rounded-lg border border-slate-600"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-slate-700 rounded-lg border border-slate-600 flex items-center justify-center">
                                                <span className="text-lg">🎵</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="relative">
                            <textarea
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Ask about cricket..."
                                disabled={isLoading}
                                rows={1}
                                className="w-full px-3 py-2.5 pr-20 bg-transparent text-white text-sm focus:outline-none disabled:opacity-50 placeholder:text-slate-500 resize-none max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
                                style={{
                                    minHeight: '42px',
                                    height: 'auto'
                                }}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                                }}
                            />
                            <div className="absolute right-2 bottom-2 flex items-center gap-1">
                                <button
                                    onClick={handleVoiceRecording}
                                    disabled={isLoading || isRecording}
                                    className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
                                        isRecording
                                            ? 'bg-red-500 animate-pulse'
                                            : 'bg-slate-700 hover:bg-slate-600'
                                    } disabled:opacity-50`}
                                    title={isRecording ? 'Recording...' : 'Voice input'}
                                >
                                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={handleSend}
                                    disabled={(!inputValue.trim() && uploadedFiles.length === 0) || isLoading}
                                    className="p-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Send message"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
