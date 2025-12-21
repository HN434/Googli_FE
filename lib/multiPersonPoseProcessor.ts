/**
 * MediaPipe Multi-Person Pose Detection Utility
 * Processes each detected person's bounding box region separately
 */

export interface Landmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
}

export interface PersonPoseData {
    personId: number;
    landmarks?: Landmark[];
    bbox?: number[];
    confidence?: number;
}

export interface MultiPersonPoseFrame {
    frameIndex: number;
    timestamp?: number;
    persons: PersonPoseData[];
}

// Global reference to loaded Pose class
let PoseClass: any = null;

/**
 * Load MediaPipe Pose library dynamically
 */
async function loadMediaPipe(): Promise<any> {
    if (PoseClass) return PoseClass;

    if (typeof window !== 'undefined') {
        return new Promise((resolve, reject) => {
            if ((window as any).Pose) {
                PoseClass = (window as any).Pose;
                resolve(PoseClass);
                return;
            }

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
 * Create a MediaPipe Pose detector instance
 */
async function createPoseDetector(): Promise<any> {
    const Pose = await loadMediaPipe();

    const pose = new Pose({
        locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
    });

    pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    return pose;
}

/**
 * Process a cropped region of the video frame for a single person
 */
async function detectPoseInRegion(
    pose: any,
    videoElement: HTMLVideoElement,
    bbox: number[]
): Promise<Landmark[] | null> {
    return new Promise((resolve) => {
        const [x, y, width, height] = bbox;

        // Create a canvas to extract the person's region
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            resolve(null);
            return;
        }

        // Set canvas size to bbox dimensions
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);

        // Draw the cropped region
        ctx.drawImage(
            videoElement,
            x, y, width, height,  // Source region
            0, 0, canvas.width, canvas.height  // Destination
        );

        // Process with MediaPipe
        pose.onResults((results: any) => {
            if (results.poseLandmarks) {
                // Convert landmarks back to full frame coordinates
                const fullFrameLandmarks: Landmark[] = results.poseLandmarks.map((lm: any) => ({
                    x: (lm.x * width + x) / videoElement.videoWidth,
                    y: (lm.y * height + y) / videoElement.videoHeight,
                    z: lm.z,
                    visibility: lm.visibility
                }));
                resolve(fullFrameLandmarks);
            } else {
                resolve(null);
            }
        });

        pose.send({ image: canvas }).catch((error: Error) => {
            console.error('Error processing region:', error);
            resolve(null);
        });
    });
}

/**
 * Process video with multi-person support using bounding boxes from pose analytics
 */
export async function processMultiPersonVideo(
    video: HTMLVideoElement,
    poseFrames: any[],  // Frames from WebSocket with persons array
    onProgress?: (progress: number) => void,
    onFrameProcessed?: (frameIndex: number, totalFrames: number) => void
): Promise<MultiPersonPoseFrame[]> {
    const results: MultiPersonPoseFrame[] = [];
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
    const totalFrames = poseFrames.length;
    const fps = totalFrames / duration;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Initialize MediaPipe Pose
    console.log('Loading MediaPipe Pose for multi-person detection...');
    const pose = await createPoseDetector();
    console.log('MediaPipe Pose loaded successfully');

    console.log(`Processing ${totalFrames} frames with multiple persons...`);

    // Process each frame
    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
        const timestamp = frameIdx / fps;
        const poseFrame = poseFrames[frameIdx];

        // Seek to specific frame
        video.currentTime = Math.min(timestamp, duration - 0.001);

        // Wait for seek to complete
        await new Promise((resolve) => {
            const handleSeeked = () => {
                video.removeEventListener('seeked', handleSeeked);
                resolve(null);
            };
            video.addEventListener('seeked', handleSeeked);

            setTimeout(() => {
                video.removeEventListener('seeked', handleSeeked);
                resolve(null);
            }, 500);
        });

        const framePersons: PersonPoseData[] = [];

        // Process each person in this frame
        if (poseFrame?.persons && Array.isArray(poseFrame.persons)) {
            for (let personIdx = 0; personIdx < poseFrame.persons.length; personIdx++) {
                const person = poseFrame.persons[personIdx];

                if (person.bbox && Array.isArray(person.bbox) && person.bbox.length === 4) {
                    const [x1, y1, x2, y2] = person.bbox;
                    const bbox = [
                        Math.floor(x1),
                        Math.floor(y1),
                        Math.ceil(x2 - x1),
                        Math.ceil(y2 - y1)
                    ];

                    // Detect pose in this person's bbox region
                    const landmarks = await detectPoseInRegion(pose, video, bbox);

                    framePersons.push({
                        personId: personIdx,
                        landmarks: landmarks || undefined,
                        bbox: person.bbox,
                        confidence: landmarks ? 1.0 : 0.0
                    });
                }
            }
        }

        results.push({
            frameIndex: frameIdx,
            timestamp,
            persons: framePersons
        });

        // Update progress
        const progress = Math.floor((frameIdx / totalFrames) * 100);
        if (onProgress) {
            onProgress(progress);
        }

        if (onFrameProcessed) {
            onFrameProcessed(frameIdx, totalFrames);
        }

        // Allow UI to update
        if (frameIdx % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    // Cleanup
    pose.close();

    const totalPersonsDetected = results.reduce((sum, frame) =>
        sum + frame.persons.filter(p => p.landmarks).length, 0
    );

    console.log(`Multi-person processing complete: ${totalPersonsDetected} person-poses detected across ${totalFrames} frames`);

    return results;
}
