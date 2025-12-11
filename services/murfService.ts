/**
 * Murf AI Text-to-Speech Service
 * High-quality, natural-sounding AI voices with emotion and tone control
 */

import axios from 'axios';

// Murf AI Voice Configuration
interface MurfVoiceConfig {
    voiceId: string;
    style: string;
    multiNativeLocale: string;
}

interface QueueItem {
    text: string;
    language: string;
    gender: string;
    tone: string;
}

class MurfService {
    private apiKey: string = '';
    private apiUrl: string = 'https://global.api.murf.ai/v1/speech/stream';
    private queue: QueueItem[] = [];
    private isPlaying: boolean = false;
    private initialized: boolean = false;
    private currentAudio: HTMLAudioElement | null = null;

    /**
     * Initialize Murf AI with API key
     */
    initialize(apiKey: string): boolean {
        if (typeof window === 'undefined') {
            throw new Error('Murf service requires browser environment');
        }

        this.apiKey = apiKey;
        this.initialized = true;

        console.log('[Murf] Murf AI initialized successfully');
        return true;
    }

    /**
     * Get Murf AI voice configuration based on language, gender, and tone
     * Murf AI supports many voices across languages with different styles
     */
    getVoiceConfig(language: string = 'English', gender: string = 'Male', tone: string = 'Professional'): MurfVoiceConfig {
        // Voice mapping for different languages and genders
        const voiceMap: Record<string, Record<string, string>> = {
            'English': {
                // Male voices - using verified en-US voices
                'Male-Conversational': 'en-US-marcus',
                'Male-Professional': 'en-US-ken',
                'Male-Calm': 'en-US-wayne',
                'Male-Exciting': 'en-US-ken',
                'Male-Dramatic': 'en-US-terrell',

                // Female voices - using verified en-US voices
                'Female-Conversational': 'en-US-natalie',
                'Female-Professional': 'en-US-natalie',
                'Female-Calm': 'en-US-claire',
                'Female-Exciting': 'en-US-alicia',
                'Female-Dramatic': 'en-US-samantha',
            },
            'Hindi': {
                // Actual Hindi voices from Murf AI
                'Male-Conversational': 'hi-IN-kabir',
                'Male-Professional': 'hi-IN-amit',
                'Male-Calm': 'hi-IN-rahul',
                'Male-Exciting': 'hi-IN-shaan',
                'Male-Dramatic': 'hi-IN-kabir',
                'Female-Conversational': 'hi-IN-ayushi',
                'Female-Professional': 'hi-IN-shweta',
                'Female-Calm': 'hi-IN-ayushi',
                'Female-Exciting': 'hi-IN-shweta',
                'Female-Dramatic': 'hi-IN-ayushi',
            },
            'Spanish': {
                'Male-Conversational': 'es-ES-alvaro',      // European Spanish
                'Male-Professional': 'es-MX-diego',         // Mexican Spanish
                'Male-Calm': 'es-ES-alvaro',
                'Male-Exciting': 'es-MX-diego',
                'Male-Dramatic': 'es-ES-alvaro',
                'Female-Conversational': 'es-ES-lucia',     // European Spanish
                'Female-Professional': 'es-MX-sofia',       // Mexican Spanish
                'Female-Calm': 'es-ES-lucia',
                'Female-Exciting': 'es-MX-sofia',
                'Female-Dramatic': 'es-ES-lucia',
            },
            'Tamil': {
                // Actual Tamil voices from Murf AI
                'Male-Conversational': 'ta-IN-suresh',
                'Male-Professional': 'ta-IN-sarvesh',
                'Male-Calm': 'ta-IN-suresh',
                'Male-Exciting': 'ta-IN-sarvesh',
                'Male-Dramatic': 'ta-IN-suresh',
                'Female-Conversational': 'ta-IN-iniya',
                'Female-Professional': 'ta-IN-abirami',
                'Female-Calm': 'ta-IN-iniya',
                'Female-Exciting': 'ta-IN-abirami',
                'Female-Dramatic': 'ta-IN-iniya',
            },
            'Telugu': {
                // Telugu doesn't have dedicated voices, using English-India fallback
                // These are multilingual voices that support Telugu
                'Male-Conversational': 'en-IN-aarav',
                'Male-Professional': 'en-IN-rohan',
                'Male-Calm': 'en-IN-eashwar',
                'Male-Exciting': 'en-IN-rohan',
                'Male-Dramatic': 'en-IN-aarav',
                'Female-Conversational': 'en-IN-arohi',
                'Female-Professional': 'en-IN-priya',
                'Female-Calm': 'en-IN-isha',
                'Female-Exciting': 'en-IN-alia',
                'Female-Dramatic': 'en-IN-arohi',
            },
        };

        // Style mapping based on tone
        const styleMap: Record<string, string> = {
            'Calm': 'Calm',
            'Exciting': 'Energetic',
            'Professional': 'Conversational',
            'Dramatic': 'Emotional',
        };

        const key = `${gender}-${tone}`;
        const voiceId = voiceMap[language]?.[key] || 'en-US-marcus'; // Fallback to verified voice
        const style = styleMap[tone] || 'Conversational';

        // FIXED: Extract locale from voice ID (e.g., "en-US-marcus" -> "en-US")
        // This ensures each voice uses its correct supported locale
        const multiNativeLocale = voiceId.split('-').slice(0, 2).join('-');

        console.log(`[Murf] Selected voice: ${voiceId} with style: ${style} and locale: ${multiNativeLocale} for ${language}-${gender}-${tone}`);

        return {
            voiceId,
            style,
            multiNativeLocale,
        };
    }

    /**
     * Convert text to speech using Murf AI
     */
    async speakWithMurf(
        text: string,
        language: string = 'English',
        gender: string = 'Male',
        tone: string = 'Professional'
    ): Promise<void> {
        console.log('[Murf] speakWithMurf called');
        console.log('[Murf] Initialized:', this.initialized);
        console.log('[Murf] API Key exists:', !!this.apiKey);

        if (!this.initialized || !this.apiKey) {
            console.error('[Murf] ❌ Murf AI not properly initialized');
            throw new Error('Murf AI not initialized. Please provide an API key.');
        }

        try {
            console.log('[Murf] ✅ Murf AI is initialized, generating speech');
            console.log('[Murf] Speaking:', text.substring(0, 50), 'Language:', language);

            const voiceConfig = this.getVoiceConfig(language, gender, tone);
            console.log('[Murf] Voice config:', voiceConfig);

            // Prepare request data
            const requestData = {
                voiceId: voiceConfig.voiceId,
                style: voiceConfig.style,
                text: text,
                multiNativeLocale: voiceConfig.multiNativeLocale,
                model: 'FALCON',          // Murf's latest AI model
                format: 'MP3',
                sampleRate: 24000,
                channelType: 'MONO',
            };

            console.log('[Murf] Request data:', requestData);

            // Make request to Murf AI API
            const response = await axios({
                method: 'post',
                url: this.apiUrl,
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': this.apiKey,
                },
                data: requestData,
                responseType: 'arraybuffer', // Get binary data
            });

            console.log('[Murf] Response received, status:', response.status);

            // Create audio blob from response
            const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(audioBlob);

            console.log('[Murf] Audio generated successfully');

            return this.playAudio(audioUrl);
        } catch (error: any) {
            console.error('[Murf] Murf AI speech error:', error);
            console.error('[Murf] Error details:', error.response?.data || error.message);
            throw new Error(`Murf AI error: ${error.response?.data?.error || error.message}`);
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
                await this.speakWithMurf(item.text, item.language, item.gender, item.tone);
            } catch (error) {
                console.error('[Murf] Error processing speech queue:', error);
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

        // Clear queue
        this.queue = [];
        this.isPlaying = false;
    }

    /**
     * Clean and format text for better speech output
     */
    formatTextForSpeech(text: string): string {
        // Convert to string if not already
        text = String(text || '');

        // Remove only emojis (but keep Hindi/Spanish/Devanagari text)
        text = text.replace(/[\u{1F000}-\u{1F9FF}]/gu, ''); // Emoticons
        text = text.replace(/[\u{2600}-\u{27BF}]/gu, ''); // Misc symbols
        text = text.replace(/[\u{1F300}-\u{1F5FF}]/gu, ''); // Misc symbols & pictographs
        text = text.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // Emoticons
        text = text.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // Transport & map symbols
        text = text.replace(/[\u{2700}-\u{27BF}]/gu, ''); // Dingbats
        text = text.replace(/[\u{FE00}-\u{FE0F}]/gu, ''); // Variation selectors
        text = text.replace(/[\u{1F900}-\u{1F9FF}]/gu, ''); // Supplemental symbols

        // Only remove specific special formatting characters
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
        commentary: string,
        language: string = 'English',
        gender: string = 'Male',
        tone: string = 'Professional',
        onComplete?: () => void
    ): Promise<void> {
        let text = commentary;

        console.log('[Murf] Original text:', text);

        // Format text for speech
        text = this.formatTextForSpeech(text);

        console.log('[Murf] Formatted text:', text);

        // Add emphasis for exciting events
        if (text.includes('FOUR') || text.includes('SIX') || text.includes('WICKET')) {
            // Make it more exciting by adjusting tone
            tone = 'Exciting';
        }

        // If callback provided, speak directly instead of queuing
        if (onComplete) {
            try {
                await this.speakWithMurf(text, language, gender, tone);
                onComplete();
            } catch (error) {
                console.error('[Murf] Error speaking commentary:', error);
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
        return this.initialized && !!this.apiKey;
    }

    /**
     * Get the name of the current audio service being used
     */
    getAudioServiceName(): string {
        if (this.isAvailable()) {
            return 'Murf AI';
        } else {
            return 'No Audio Service';
        }
    }
}

// Create singleton instance
const murfService = new MurfService();

export default murfService;
