/**
 * MediaPipe Pose Detection Utility
 * Handles real pose detection using MediaPipe Pose library
 * Uses dynamic script loading for browser compatibility
 */

export interface Landmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
}

export interface PoseFrame {
    landmarks?: Landmark[];
    landmarksArray?: number[];
    timestamp?: number;
    confidence?: number;
    frameIndex?: number;
}

// Type definitions for MediaPipe Results
interface PoseLandmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
}

interface MediaPipeResults {
    poseLandmarks?: PoseLandmark[];
    poseWorldLandmarks?: PoseLandmark[];
}

// Global reference to loaded Pose class
let PoseClass: any = null;

/**
 * Load MediaPipe Pose library dynamically
 */
async function loadMediaPipe(): Promise<any> {
    if (PoseClass) return PoseClass;

    // Load from CDN in browser environment
    if (typeof window !== 'undefined') {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if ((window as any).Pose) {
                PoseClass = (window as any).Pose;
                resolve(PoseClass);
                return;
            }

            // Create script tag to load MediaPipe
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js';
            script.crossOrigin = 'anonymous';

            script.onload = () => {
                PoseClass = (window as any).Pose;
                if (PoseClass) {
                    resolve(PoseClass);
                } else {
                    reject(new Error('MediaPipe Pose not loaded correctly'));
                }
            };

            script.onerror = () => {
                reject(new Error('Failed to load MediaPipe Pose from CDN'));
            };

            document.head.appendChild(script);
        });
    }

    throw new Error('MediaPipe can only be loaded in browser environment');
}

/**
 * Initialize MediaPipe Pose detector
 */
export async function createPoseDetector(): Promise<any> {
    const Pose = await loadMediaPipe();

    const pose = new Pose({
        locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
    });

    pose.setOptions({
        modelComplexity: 1,         // 0=lite, 1=full, 2=heavy (1 is best for real-time)
        smoothLandmarks: true,       // Smooth landmarks across frames
        enableSegmentation: false,   // We don't need segmentation
        smoothSegmentation: false,
        minDetectionConfidence: 0.5, // Minimum confidence for detection
        minTrackingConfidence: 0.5   // Minimum confidence for tracking
    });

    return pose;
}

/**
 * Process a single video frame and detect pose
 */
export async function detectPoseInFrame(
    pose: any,
    imageElement: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement
): Promise<MediaPipeResults | null> {
    return new Promise((resolve) => {
        pose.onResults((results: MediaPipeResults) => {
            resolve(results);
        });

        pose.send({ image: imageElement }).catch((error: Error) => {
            console.error('Error sending frame to MediaPipe:', error);
            resolve(null);
        });
    });
}

/**
 * Process entire video and extract pose data for all frames
 */
export async function processVideoToPose(
    video: HTMLVideoElement,
    onProgress?: (progress: number) => void,
    onFrameProcessed?: (frameIndex: number, totalFrames: number) => void
): Promise<PoseFrame[]> {
    const frames: PoseFrame[] = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Failed to get canvas context');
    }

    // Wait for video metadata
    if (video.readyState < 2) {
        await new Promise((resolve) => {
            video.addEventListener('loadeddata', () => resolve(null), { once: true });
        });
    }

    const duration = video.duration;
    const fps = 25; // Target FPS for analysis
    const frameInterval = 1 / fps;
    const totalFrames = Math.floor(duration * fps);

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Initialize MediaPipe Pose
    console.log('Loading MediaPipe Pose...');
    const pose = await createPoseDetector();
    console.log('MediaPipe Pose loaded successfully');

    console.log(`Processing ${totalFrames} frames at ${fps} FPS...`);

    // Process each frame
    for (let i = 0; i < totalFrames; i++) {
        const timestamp = i * frameInterval;

        // Seek to specific frame
        video.currentTime = Math.min(timestamp, duration - 0.001);

        // Wait for seek to complete
        await new Promise((resolve) => {
            const handleSeeked = () => {
                video.removeEventListener('seeked', handleSeeked);
                resolve(null);
            };
            video.addEventListener('seeked', handleSeeked);

            // Fallback timeout
            setTimeout(() => {
                video.removeEventListener('seeked', handleSeeked);
                resolve(null);
            }, 500);
        });

        // Draw current frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Detect pose in frame
        const results = await detectPoseInFrame(pose, canvas);

        if (results && results.poseLandmarks) {
            // Convert MediaPipe landmarks to our format
            const landmarks: Landmark[] = results.poseLandmarks.map((lm: PoseLandmark) => ({
                x: lm.x,
                y: lm.y,
                z: lm.z,
                visibility: lm.visibility
            }));

            frames.push({
                landmarks,
                timestamp,
                confidence: calculateAverageConfidence(landmarks),
                frameIndex: i
            });
        } else {
            // No pose detected in this frame - create empty frame
            console.warn(`No pose detected in frame ${i}`);
            frames.push({
                landmarks: [],
                timestamp,
                confidence: 0,
                frameIndex: i
            });
        }

        // Update progress
        const progress = Math.floor((i / totalFrames) * 100);
        if (onProgress) {
            onProgress(progress);
        }

        if (onFrameProcessed) {
            onFrameProcessed(i, totalFrames);
        }

        // Allow UI to update every 5 frames
        if (i % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    // Cleanup
    pose.close();

    console.log(`Processed ${frames.length} frames, ${frames.filter(f => f.landmarks && f.landmarks.length > 0).length} with detected poses`);

    return frames;
}

/**
 * Calculate average confidence from landmarks
 */
function calculateAverageConfidence(landmarks: Landmark[]): number {
    if (!landmarks || landmarks.length === 0) return 0;

    const visibilities = landmarks
        .map(lm => lm.visibility || 0)
        .filter(v => v > 0);

    if (visibilities.length === 0) return 0;

    return visibilities.reduce((sum, v) => sum + v, 0) / visibilities.length;
}

/**
 * Validate video file before processing
 */
export function validateVideo(file: File): { valid: boolean; error?: string } {
    const maxSize = 50 * 1024 * 1024; // 50 MB

    if (file.size > maxSize) {
        return {
            valid: false,
            error: `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum size of 50 MB`
        };
    }

    if (!file.type.startsWith('video/')) {
        return {
            valid: false,
            error: 'File must be a video'
        };
    }

    return { valid: true };
}

/**
 * Check video duration asynchronously
 */
export async function checkVideoDuration(
    videoUrl: string
): Promise<{ valid: boolean; duration?: number; error?: string }> {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = () => {
            const duration = video.duration;

            if (duration < 10) {
                resolve({
                    valid: false,
                    duration,
                    error: `Video duration (${duration.toFixed(1)}s) is too short. Minimum is 10 seconds.`
                });
            } else if (duration > 60) {
                resolve({
                    valid: false,
                    duration,
                    error: `Video duration (${duration.toFixed(1)}s) is too long. Maximum is 60 seconds.`
                });
            } else {
                resolve({
                    valid: true,
                    duration
                });
            }

            // Cleanup
            URL.revokeObjectURL(videoUrl);
        };

        video.onerror = () => {
            resolve({
                valid: false,
                error: 'Failed to load video metadata'
            });
            URL.revokeObjectURL(videoUrl);
        };

        video.src = videoUrl;
    });
}
