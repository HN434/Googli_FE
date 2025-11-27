/**
 * Transcribe Service for Speech-to-Text
 * Uses browser's Web Speech API for live transcription
 */

class TranscribeService {
  private recognition: any = null;
  private isListening: boolean = false;

  /**
   * Initialize speech recognition
   */
  initialize(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported in this browser');
      return false;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    return true;
  }

  /**
   * Start recording and transcribe speech
   */
  async transcribeRecording(language: string = 'en-US', timeout: number = 60000): Promise<string> {
    if (!this.initialize()) {
      throw new Error('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
    }

    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not initialized'));
        return;
      }

      this.recognition.lang = language;
      this.isListening = true;

      let finalTranscript = '';
      let timeoutId: NodeJS.Timeout | undefined;

      this.recognition.onstart = () => {
        console.log('[Transcribe] Speech recognition started');
        
        // Set timeout
        timeoutId = setTimeout(() => {
          if (this.isListening) {
            console.log('[Transcribe] Timeout reached, stopping...');
            this.recognition?.stop();
          }
        }, timeout);
      };

      this.recognition.onresult = (event: any) => {
        console.log('[Transcribe] Got result:', event);
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
            console.log('[Transcribe] Final transcript:', transcript);
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error('[Transcribe] Error:', event.error);
        if (timeoutId) clearTimeout(timeoutId);
        this.isListening = false;
        
        let errorMessage = 'Speech recognition failed';
        
        if (event.error === 'not-allowed') {
          errorMessage = 'Microphone access denied. Please allow microphone access in browser settings.';
        } else if (event.error === 'no-speech') {
          errorMessage = 'No speech detected. Please try again and speak clearly.';
        } else if (event.error === 'network') {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          errorMessage = `Speech recognition error: ${event.error}`;
        }
        
        reject(new Error(errorMessage));
      };

      this.recognition.onend = () => {
        console.log('[Transcribe] Speech recognition ended');
        if (timeoutId) clearTimeout(timeoutId);
        this.isListening = false;
        
        if (finalTranscript.trim()) {
          resolve(finalTranscript.trim());
        } else {
          reject(new Error('No speech detected. Please try again and speak clearly.'));
        }
      };

      try {
        this.recognition.start();
        console.log('[Transcribe] Starting speech recognition...');
      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        this.isListening = false;
        reject(error);
      }
    });
  }

  /**
   * Stop current transcription
   */
  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Check if currently listening
   */
  isActive(): boolean {
    return this.isListening;
  }
}

// Create singleton instance
const transcribeService = new TranscribeService();

export default transcribeService;
