/**
 * Polly Text-to-Speech Service
 * Uses browser's Web Speech API for voice commentary
 */

interface QueueItem {
    text: string;
    language: string;
    gender: string;
}

class PollyService {
    private currentAudio: HTMLAudioElement | null = null;
    private queue: QueueItem[] = [];
    private isPlaying: boolean = false;
    private initialized: boolean = false;

    /**
     * Initialize browser speech synthesis
     */
    initializeBrowserSpeech(): boolean {
        if (typeof window === 'undefined') {
            return false;
        }

        if (!window.speechSynthesis) {
            throw new Error('Browser speech synthesis not supported');
        }

        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            console.log(`Browser speech: ${voices.length} voices loaded`);
            if (voices.length > 0) {
                console.log('Sample voices:', voices.slice(0, 3).map(v => `${v.name} (${v.lang})`));
            }
        };

        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        loadVoices();

        this.initialized = true;
        console.log('Using browser speech synthesis');
        return true;
    }

    /**
     * Convert text to speech using browser's Web Speech API
     */
    async speakWithBrowser(text: string, language: string = 'English'): Promise<void> {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            console.error('[Polly] Browser speech synthesis not supported');
            throw new Error('Browser speech synthesis not supported');
        }

        try {
            console.log('[Polly] Using browser speech for:', text.substring(0, 50));

            window.speechSynthesis.cancel();
            await new Promise(resolve => setTimeout(resolve, 100));

            const utterance = new SpeechSynthesisUtterance(text);

            const langMap: Record<string, string> = {
                'English': 'en-US',
                'Hindi': 'hi-IN',
                'Tamil': 'ta-IN',
                'Telugu': 'te-IN'
            };
            utterance.lang = langMap[language] || 'en-US';

            console.log('[Polly] Speech language set to:', utterance.lang);

            let voices = window.speechSynthesis.getVoices();

            if (voices.length === 0) {
                console.log('[Polly] No voices loaded yet, waiting...');
                await new Promise(resolve => setTimeout(resolve, 100));
                voices = window.speechSynthesis.getVoices();
            }

            console.log('[Polly] Available voices:', voices.length);

            return new Promise((resolve) => {
                if (voices.length > 0) {
                    const targetLang = langMap[language] || 'en-US';
                    const matchingVoice = voices.find(voice =>
                        voice.lang.startsWith(targetLang.split('-')[0])
                    );

                    if (matchingVoice) {
                        utterance.voice = matchingVoice;
                        console.log('[Polly] Using voice:', matchingVoice.name, matchingVoice.lang);
                    } else {
                        utterance.voice = voices[0];
                        console.log('[Polly] Using default voice:', voices[0].name);
                    }
                } else {
                    console.warn('[Polly] No voices available, using browser default');
                }

                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;

                utterance.onstart = () => {
                    console.log('[Polly] Browser speech started');
                };

                utterance.onend = () => {
                    console.log('[Polly] Browser speech completed');
                    resolve();
                };

                utterance.onerror = (error) => {
                    console.error('[Polly] Speech synthesis error:', error);
                    resolve();
                };

                console.log('[Polly] Speaking with browser - Text:', text.substring(0, 50) + '...');

                if (window.speechSynthesis.paused) {
                    console.log('[Polly] Speech was paused, resuming...');
                    window.speechSynthesis.resume();
                }

                window.speechSynthesis.speak(utterance);
                console.log('[Polly] Speech queued for playback');

                setTimeout(() => {
                    if (window.speechSynthesis.speaking) {
                        console.warn('[Polly] Speech synthesis timeout, forcing cancel');
                        window.speechSynthesis.cancel();
                        resolve();
                    }
                }, 30000);
            });
        } catch (error) {
            console.error('[Polly] Browser speech error:', error);
            return Promise.resolve();
        }
    }

    /**
     * Add commentary to speech queue
     */
    queueCommentary(text: string, language: string = 'English', gender: string = 'Male') {
        this.queue.push({ text, language, gender });

        if (!this.isPlaying) {
            this.processQueue();
        }
    }

    /**
     * Process speech queue
     */
    async processQueue() {
        if (this.queue.length === 0) {
            this.isPlaying = false;
            return;
        }

        this.isPlaying = true;
        const item = this.queue.shift();

        if (item) {
            try {
                await this.speakWithBrowser(item.text, item.language);
            } catch (error) {
                console.error('Error processing speech queue:', error);
            }
        }

        setTimeout(() => this.processQueue(), 500);
    }

    /**
     * Stop current speech and clear queue
     */
    stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }

        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        this.queue = [];
        this.isPlaying = false;
    }

    /**
     * Clean and format text for better speech output
     */
    formatTextForSpeech(text: string): string {
        text = String(text || '');

        // Remove emojis and special characters
        text = text.replace(/[\u{1F000}-\u{1F9FF}]/gu, '');
        text = text.replace(/[\u{2600}-\u{27BF}]/gu, '');
        text = text.replace(/[\u{1F300}-\u{1F5FF}]/gu, '');
        text = text.replace(/[\u{1F600}-\u{1F64F}]/gu, '');
        text = text.replace(/[\u{1F680}-\u{1F6FF}]/gu, '');
        text = text.replace(/[\u{2700}-\u{27BF}]/gu, '');
        text = text.replace(/[\u{FE00}-\u{FE0F}]/gu, '');
        text = text.replace(/[\u{1F900}-\u{1F9FF}]/gu, '');

        text = text.replace(/[^\x00-\x7F\s]/g, '');
        text = text.replace(/[$#@%^&*_+=[\]{}|\\<>~`]/g, '');

        text = text.replace(/\./g, '. ');
        text = text.replace(/,/g, ', ');
        text = text.replace(/!/g, '! ');
        text = text.replace(/\?/g, '? ');

        text = text.replace(/\s+/g, ' ').trim();

        return text;
    }

    /**
     * Speak commentary with excitement based on event type
     */
    async speakCommentary(commentary: string | { text: string }, language: string = 'English', gender: string = 'Male'): Promise<void> {
        let text = typeof commentary === 'string' ? commentary : commentary.text;

        console.log('[Polly] Original text:', text);

        text = this.formatTextForSpeech(text);

        console.log('[Polly] Formatted text:', text);

        if (text.includes('FOUR') || text.includes('SIX') || text.includes('WICKET')) {
            text = text.toUpperCase();
        }

        try {
            await this.speakWithBrowser(text, language);
        } catch (error) {
            console.error('Error speaking commentary:', error);
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
        if (typeof window === 'undefined') {
            return 'No Audio Service';
        }
        if (window.speechSynthesis && this.initialized) {
            return 'Browser Speech Synthesis';
        }
        return 'No Audio Service';
    }
}

// Create singleton instance
const pollyService = new PollyService();

// Initialize browser speech by default
if (typeof window !== 'undefined') {
    try {
        pollyService.initializeBrowserSpeech();
    } catch (error) {
        console.warn('Browser speech not available:', error);
    }
}

export default pollyService;
