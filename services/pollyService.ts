/**
 * Polly Text-to-Speech Service
 * Supports AWS Polly (with fallback to browser's Web Speech API)
 */

// Type definitions for AWS SDK (loaded dynamically)
interface AWSCredentials {
    accessKeyId: string;
    secretAccessKey: string;
}

interface PollyParams {
    Text: string;
    OutputFormat: string;
    VoiceId: string;
    Engine: string;
    TextType: string;
}

interface PollyResponse {
    AudioStream: Uint8Array;
}

interface TranslateParams {
    Text: string;
    SourceLanguageCode: string;
    TargetLanguageCode: string;
}

interface TranslateResponse {
    TranslatedText: string;
}

interface QueueItem {
    text: string;
    language: string;
    gender: string;
    tone: string;
}

interface Commentary {
    text?: string;
}

class PollyService {
    private polly: any = null;
    private audioContext: AudioContext | null = null;
    private currentAudio: HTMLAudioElement | null = null;
    private queue: QueueItem[] = [];
    private isPlaying: boolean = false;
    private initialized: boolean = false;
    private credentials: AWSCredentials | null = null;
    private region: string = 'us-east-1';

    /**
     * Initialize AWS Polly with credentials
     */
    async initialize(
        awsAccessKeyId: string,
        awsSecretAccessKey: string,
        region: string = 'us-east-1'
    ): Promise<boolean> {
        if (typeof window === 'undefined') {
            throw new Error('Polly service requires browser environment');
        }

        this.region = region;
        this.credentials = {
            accessKeyId: awsAccessKeyId,
            secretAccessKey: awsSecretAccessKey,
        };

        try {
            // Import AWS SDK dynamically
            const AWS = await import('aws-sdk');

            AWS.config.update({
                region: this.region,
                credentials: new AWS.Credentials(
                    this.credentials.accessKeyId,
                    this.credentials.secretAccessKey
                ),
            });

            this.polly = new AWS.Polly();
            this.initialized = true;

            console.log('AWS Polly initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize AWS Polly:', error);
            throw new Error(`Polly initialization failed: ${(error as Error).message}`);
        }
    }

    /**
     * Use browser's Web Speech API as fallback
     */
    initializeBrowserSpeech(): boolean {
        if (typeof window === 'undefined') {
            return false;
        }

        if (!window.speechSynthesis) {
            throw new Error('Browser speech synthesis not supported');
        }

        // Load voices (needed for some browsers like Chrome)
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            console.log(`Browser speech: ${voices.length} voices loaded`);
            if (voices.length > 0) {
                console.log('Sample voices:', voices.slice(0, 3).map(v => `${v.name} (${v.lang})`));
            }
        };

        // Voices may load asynchronously in some browsers
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        // Try to load voices immediately
        loadVoices();

        // Test audio output
        console.log('Speech synthesis state:', {
            speaking: window.speechSynthesis.speaking,
            pending: window.speechSynthesis.pending,
            paused: window.speechSynthesis.paused,
        });

        this.initialized = true;
        console.log('Using browser speech synthesis');
        return true;
    }

    /**
     * Test if audio output is working
     */
    async testAudioOutput(): Promise<boolean> {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            return false;
        }

        return new Promise((resolve) => {
            const testUtterance = new SpeechSynthesisUtterance('Test');
            testUtterance.volume = 1.0;
            testUtterance.rate = 2.0; // Fast test

            testUtterance.onend = () => {
                console.log('Audio test successful');
                resolve(true);
            };

            testUtterance.onerror = () => {
                console.log('Audio test failed');
                resolve(false);
            };

            setTimeout(() => resolve(false), 2000); // Timeout after 2 seconds
            window.speechSynthesis.speak(testUtterance);
        });
    }

    /**
     * Get available voices based on language and gender
     * Updated for English, Spanish, and Hindi
     */
    getVoiceId(language: string = 'English', gender: string = 'Male'): string {
        const voiceMap: Record<string, string> = {
            // English voices
            'English-Male': 'Matthew',
            'English-Female': 'Joanna',

            // Spanish voices
            'Spanish-Male': 'Miguel',      // Standard engine, Spanish (US)
            'Spanish-Female': 'Lupe',      // Standard engine, Spanish (US)

            // Hindi voices
            'Hindi-Male': 'Aditi',         // Standard engine (supports both genders)
            'Hindi-Female': 'Kajal',       // Neural engine

            // Fallback for Tamil/Telugu if needed
            'Tamil-Male': 'Aditi',
            'Tamil-Female': 'Aditi',
            'Telugu-Male': 'Aditi',
            'Telugu-Female': 'Aditi',
        };

        const key = `${language}-${gender}`;
        const voiceId = voiceMap[key] || 'Matthew';

        // Log voice selection for debugging
        console.log(`[Polly] Selected voice: ${voiceId} for ${language}-${gender}`);

        return voiceId;
    }

    /**
     * Check if voice supports Neural engine
     */
    private supportsNeuralEngine(voiceId: string): boolean {
        // Neural-compatible voices
        const neuralVoices = [
            'Matthew', 'Joanna',  // English
            'Kajal'                // Hindi (female only)
        ];

        return neuralVoices.includes(voiceId);
    }

    /**
     * Generate SSML with prosody tags for tone control
     * NOTE: Only works with Standard engine, not Neural
     */
    private getToneSSML(text: string, tone: string = 'Professional'): string {
        // Escape special XML characters
        const escapedText = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');

        // Standard engine supports percentage values for rate/pitch
        const toneSettings: Record<string, { rate: string; pitch: string }> = {
            'Calm': { rate: '85%', pitch: '-5%' },
            'Exciting': { rate: '120%', pitch: '+10%' },
            'Professional': { rate: '100%', pitch: '+0%' },
            'Dramatic': { rate: '105%', pitch: '+15%' }
        };

        const settings = toneSettings[tone] || toneSettings['Professional'];

        return `<speak><prosody rate="${settings.rate}" pitch="${settings.pitch}">${escapedText}</prosody></speak>`;
    }

    /**
     * Convert text to speech using AWS Polly
     */
    async speakWithPolly(
        text: string,
        language: string = 'English',
        gender: string = 'Male',
        tone: string = 'Professional'
    ): Promise<void> {
        console.log('[Polly] speakWithPolly called');
        console.log('[Polly] Initialized:', this.initialized);
        console.log('[Polly] Polly client exists:', !!this.polly);
        console.log('[Polly] Credentials:', this.credentials ? 'Present' : 'Missing');

        if (!this.initialized || !this.polly) {
            console.warn('[Polly] ❌ Polly not properly initialized, using browser speech fallback');
            console.warn('[Polly] - initialized:', this.initialized);
            console.warn('[Polly] - polly client:', !!this.polly);
            return this.speakWithBrowser(text, language);
        }

        try {
            console.log('[Polly] ✅ AWS Polly is initialized, using AWS Polly');
            console.log('[Polly] AWS Polly speaking:', text.substring(0, 50), 'Language:', language);

            const voiceId = this.getVoiceId(language, gender);
            console.log('[Polly] Using AWS Polly voice:', voiceId, 'with tone:', tone);

            // Determine which engine to use based on voice and tone requirements
            const useNeuralEngine = this.supportsNeuralEngine(voiceId) && tone === 'Professional';
            const engine = useNeuralEngine ? 'neural' : 'standard';

            console.log('[Polly] Using engine:', engine);

            let params: PollyParams;

            // Neural engine: Use plain text (no SSML prosody support)
            // Standard engine: Use SSML with prosody for tone control
            if (engine === 'neural') {
                params = {
                    Text: text,
                    OutputFormat: 'mp3',
                    VoiceId: voiceId,
                    Engine: 'neural',
                    TextType: 'text',
                };
                console.log('[Polly] Using Neural engine with plain text');
            } else {
                // Generate SSML with tone-based prosody for standard engine
                const ssmlText = this.getToneSSML(text, tone);
                console.log('[Polly] Generated SSML:', ssmlText.substring(0, 100));

                params = {
                    Text: ssmlText,
                    OutputFormat: 'mp3',
                    VoiceId: voiceId,
                    Engine: 'standard',
                    TextType: 'ssml',
                };
                console.log('[Polly] Using Standard engine with SSML prosody');
            }

            const data: PollyResponse = await this.polly.synthesizeSpeech(params).promise();

            // Create audio from the response
            // Convert to Uint8Array with ArrayBuffer to satisfy TypeScript's Blob type requirements
            const audioData = new Uint8Array(data.AudioStream);
            const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(audioBlob);

            console.log('[Polly] AWS Polly audio generated successfully');

            return this.playAudio(audioUrl);
        } catch (error) {
            console.error('[Polly] AWS Polly speech error:', error);
            console.error('[Polly] Error details:', (error as Error).message);
            // Fallback to browser speech
            console.log('[Polly] Falling back to browser speech');
            return this.speakWithBrowser(text, language);
        }
    }

    /**
     * Translate text using AWS Translate (or fallback to English romanization)
     */
    async translateText(text: string, targetLanguage: string): Promise<string> {
        // If English, no translation needed
        if (targetLanguage === 'English') {
            return text;
        }

        // Try AWS Translate if credentials available
        if (this.credentials && this.credentials.accessKeyId) {
            try {
                const AWS = await import('aws-sdk');

                const translate = new AWS.Translate({
                    region: this.region,
                    credentials: new AWS.Credentials(
                        this.credentials.accessKeyId,
                        this.credentials.secretAccessKey
                    ),
                });

                const languageCodeMap: Record<string, string> = {
                    Hindi: 'hi',
                    Spanish: 'es',
                    Tamil: 'ta',
                    Telugu: 'te',
                };

                const targetCode = languageCodeMap[targetLanguage] || 'hi';

                const params: TranslateParams = {
                    Text: text,
                    SourceLanguageCode: 'en',
                    TargetLanguageCode: targetCode,
                };

                console.log('[Polly] Translating with AWS Translate:', text.substring(0, 50));

                const result: TranslateResponse = await translate.translateText(params).promise();

                console.log('[Polly] Translation result:', result.TranslatedText.substring(0, 50));

                return result.TranslatedText;
            } catch (error) {
                console.warn('[Polly] AWS Translate not available, using fallback:', (error as Error).message);
                // Fall through to romanization
            }
        }

        // Fallback: Enhanced romanization/transliteration for browser speech
        console.log('[Polly] Using romanization for:', targetLanguage);
        console.warn(
            '[Polly] AWS Translate not configured. For full translation, add translate:TranslateText permission to your IAM policy.'
        );

        // For Hindi/Spanish browser speech, keep English text with phonetic adjustments
        if (targetLanguage === 'Hindi') {
            // Replace cricket terms with phonetic Hindi for better pronunciation
            text = text.replace(/\bfour runs\b/gi, 'chaar runs');
            text = text.replace(/\bfour\b/gi, 'chauka');
            text = text.replace(/\bsix runs\b/gi, 'chhah runs');
            text = text.replace(/\bsix\b/gi, 'chhakka');
            text = text.replace(/\bout\b/gi, 'out');
            text = text.replace(/\bwicket\b/gi, 'wicket');
        }

        console.log('[Polly] Romanization result (English text will be spoken with native accent)');
        return text;
    }

    /**
     * Convert text to speech using browser's Web Speech API (fallback)
     */
    async speakWithBrowser(text: string, language: string = 'English', tone: string = 'Professional'): Promise<void> {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            console.error('[Polly] Browser speech synthesis not supported');
            throw new Error('Browser speech synthesis not supported');
        }

        try {
            console.log('[Polly] Using browser speech for:', text.substring(0, 50), 'Language:', language, 'Tone:', tone);

            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            // Wait a bit to ensure cancellation is processed
            await new Promise((resolve) => setTimeout(resolve, 100));

            const utterance = new SpeechSynthesisUtterance(text);

            // Set language
            const langMap: Record<string, string> = {
                English: 'en-US',
                Spanish: 'es-ES',
                Hindi: 'hi-IN',
                Tamil: 'ta-IN',
                Telugu: 'te-IN',
            };
            utterance.lang = langMap[language] || 'en-US';

            console.log('[Polly] Speech language set to:', utterance.lang);

            // Try to select appropriate voice
            let voices = window.speechSynthesis.getVoices();

            // If no voices loaded, wait a bit and try again
            if (voices.length === 0) {
                console.log('[Polly] No voices loaded yet, waiting...');
                await new Promise((resolve) => setTimeout(resolve, 100));
                voices = window.speechSynthesis.getVoices();
            }

            console.log('[Polly] Available voices:', voices.length);

            return new Promise((resolve) => {
                if (voices.length > 0) {
                    // Try to find a voice matching the language
                    const targetLang = langMap[language] || 'en-US';
                    const matchingVoice = voices.find((voice) =>
                        voice.lang.startsWith(targetLang.split('-')[0])
                    );

                    if (matchingVoice) {
                        utterance.voice = matchingVoice;
                        console.log('[Polly] Using voice:', matchingVoice.name, matchingVoice.lang);
                    } else {
                        // Use default voice
                        utterance.voice = voices[0];
                        console.log('[Polly] Using default voice:', voices[0].name);
                    }
                } else {
                    console.warn('[Polly] No voices available, using browser default');
                }

                // Set voice parameters based on tone
                const toneSettings: Record<string, { rate: number; pitch: number; volume: number }> = {
                    'Calm': { rate: 0.85, pitch: 0.95, volume: 0.8 },
                    'Exciting': { rate: 1.2, pitch: 1.1, volume: 1.0 },
                    'Professional': { rate: 1.0, pitch: 1.0, volume: 0.9 },
                    'Dramatic': { rate: 1.05, pitch: 1.15, volume: 1.0 }
                };

                const settings = toneSettings[tone] || toneSettings['Professional'];
                utterance.rate = settings.rate;
                utterance.pitch = settings.pitch;
                utterance.volume = settings.volume;

                console.log('[Polly] Tone settings applied:', tone, settings);

                utterance.onstart = () => {
                    console.log('[Polly] Browser speech started');
                };

                utterance.onend = () => {
                    console.log('[Polly] Browser speech completed');
                    resolve();
                };

                utterance.onerror = (error) => {
                    console.error('[Polly] Speech synthesis error:', error);
                    console.error('[Polly] Error details:', {
                        error: error.error,
                        charIndex: error.charIndex,
                        elapsedTime: error.elapsedTime,
                        text: text.substring(0, 50),
                    });
                    // Don't reject on error, just resolve to continue
                    resolve();
                };

                console.log('[Polly] Speaking with browser - Text:', text.substring(0, 50) + '...');
                console.log('[Polly] Volume:', utterance.volume, 'Rate:', utterance.rate);

                // Resume speech synthesis if paused
                if (window.speechSynthesis.paused) {
                    console.log('[Polly] Speech was paused, resuming...');
                    window.speechSynthesis.resume();
                }

                // Speak the utterance
                window.speechSynthesis.speak(utterance);
                console.log('[Polly] Speech queued for playback');

                // Fallback timeout in case onend never fires
                setTimeout(() => {
                    if (window.speechSynthesis.speaking) {
                        console.warn('[Polly] Speech synthesis timeout, forcing cancel');
                        window.speechSynthesis.cancel();
                        resolve();
                    }
                }, 30000); // 30 second timeout
            });
        } catch (error) {
            console.error('[Polly] Browser speech error:', error);
            return Promise.resolve(); // Resolve anyway to not block
        }
    }

    /**
     * Play audio from URL
     */
    async playAudio(audioUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // Stop current audio if playing
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
            }

            const audio = new Audio(audioUrl);
            this.currentAudio = audio;

            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                this.currentAudio = null;
                resolve();
            };

            audio.onerror = (error) => {
                URL.revokeObjectURL(audioUrl);
                this.currentAudio = null;
                reject(error);
            };

            audio.play().catch(reject);
        });
    }

    /**
     * Add commentary to speech queue
     */
    queueCommentary(text: string, language: string = 'English', gender: string = 'Male', tone: string = 'Professional'): void {
        this.queue.push({ text, language, gender, tone });

        if (!this.isPlaying) {
            this.processQueue();
        }
    }

    /**
     * Process speech queue
     */
    async processQueue(): Promise<void> {
        if (this.queue.length === 0) {
            this.isPlaying = false;
            return;
        }

        this.isPlaying = true;
        const item = this.queue.shift();

        if (item) {
            try {
                if (this.polly) {
                    await this.speakWithPolly(item.text, item.language, item.gender, item.tone);
                } else {
                    await this.speakWithBrowser(item.text, item.language, item.tone);
                }
            } catch (error) {
                console.error('Error processing speech queue:', error);
            }
        }

        // Process next item
        setTimeout(() => this.processQueue(), 500);
    }

    /**
     * Stop current speech and clear queue
     */
    stop(): void {
        // Stop current audio
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }

        // Stop browser speech
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        // Clear queue
        this.queue = [];
        this.isPlaying = false;
    }

    /**
     * Clean and format text for better speech output
     * IMPORTANT: Preserve Unicode characters for Hindi/Spanish
     */
    formatTextForSpeech(text: string): string {
        // Convert to string if not already
        text = String(text || '');

        // Remove only emojis (but keep Hindi/Spanish/Devanagari text)
        text = text.replace(/[\u{1F000}-\u{1F9FF}]/gu, ''); // Emoticons
        text = text.replace(/[\u{2600}-\u{27BF}]/gu, ''); // Misc symbols (but not Devanagari)
        text = text.replace(/[\u{1F300}-\u{1F5FF}]/gu, ''); // Misc symbols & pictographs
        text = text.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // Emoticons
        text = text.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // Transport & map symbols
        text = text.replace(/[\u{2700}-\u{27BF}]/gu, ''); // Dingbats
        text = text.replace(/[\u{FE00}-\u{FE0F}]/gu, ''); // Variation selectors
        text = text.replace(/[\u{1F900}-\u{1F9FF}]/gu, ''); // Supplemental symbols

        // IMPORTANT: DO NOT remove non-ASCII characters!
        // Hindi (Devanagari): U+0900–U+097F
        // Spanish: Standard Latin characters with accents
        // We want to KEEP these characters for proper speech synthesis!

        // Only remove specific special formatting characters that cause speech issues
        text = text.replace(/[$#@%^&*_+=\[\]{}|\\<>~`]/g, '');

        // Add pauses for better clarity
        text = text.replace(/\./g, '. ');
        text = text.replace(/,/g, ', ');
        text = text.replace(/!/g, '! ');
        text = text.replace(/\?/g, '? ');

        // Clean up multiple spaces
        text = text.replace(/\s+/g, ' ').trim();

        return text;
    }

    /**
     * Speak commentary with excitement based on event type
     */
    async speakCommentary(
        commentary: string | Commentary,
        language: string = 'English',
        gender: string = 'Male',
        tone: string = 'Professional',
        onComplete?: () => void
    ): Promise<void> {
        let text = typeof commentary === 'string' ? commentary : commentary.text || '';

        console.log('[Polly] Original text:', text);

        // Format text for speech
        text = this.formatTextForSpeech(text);

        console.log('[Polly] Formatted text:', text);

        // Add emphasis for exciting events
        if (text.includes('FOUR') || text.includes('SIX') || text.includes('WICKET')) {
            // Make it more exciting
            text = text.toUpperCase();
        }

        // If callback provided, speak directly instead of queuing
        if (onComplete) {
            try {
                if (this.polly) {
                    await this.speakWithPolly(text, language, gender, tone);
                } else {
                    await this.speakWithBrowser(text, language, tone);
                }
                onComplete();
            } catch (error) {
                console.error('Error speaking commentary:', error);
                onComplete(); // Call callback even on error
            }
        } else {
            // Queue the commentary (old behavior)
            this.queueCommentary(text, language, gender, tone);
        }
    }

    /**
     * Check if service is available
     */
    isAvailable(): boolean {
        if (typeof window === 'undefined') return false;
        return this.initialized || window.speechSynthesis !== undefined;
    }

    /**
     * Get the name of the current audio service being used
     */
    getAudioServiceName(): string {
        if (this.polly) {
            return 'AWS Polly';
        } else if (typeof window !== 'undefined' && window.speechSynthesis && this.initialized) {
            return 'Browser Speech Synthesis';
        } else {
            return 'No Audio Service';
        }
    }
}

// Create singleton instance
const pollyService = new PollyService();

// Initialize browser speech by default (no credentials needed)
if (typeof window !== 'undefined') {
    try {
        pollyService.initializeBrowserSpeech();
    } catch (error) {
        console.warn('Browser speech not available:', error);
    }
}

export default pollyService;