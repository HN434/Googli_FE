# Multi-Person MediaPipe 3D Implementation Guide

## Overview

This implementation enables the 3D view to display multiple cricket players simultaneously by:
1. Waiting for pose analytics (keypoints) from WebSocket
2. Using bounding box data to extract each person
3. Processing each person separately with MediaPipe
4. Rendering multiple 3D skeletons

## Architecture Changes

### Phase 1: Trigger Processing After Keypoints ✅

**File**: `VideoAnalysisTab.tsx`

**Location**: WebSocket onKeypoints callback (line ~143-162)

**Add this code** after setting keypoints data:

```tsx
// Trigger MediaPipe processing now that we have keypoints with bbox data
console.log('Keypoints received - starting MediaPipe multi-person processing...');
setTimeout(() => {
  const video = videoRef.current;
  if (video && keypoints.length > 0) {
    processMediaPipeVideo(video, keypoints); // ← Pass keypoints!
  }
}, 500);
```

### Phase 2: Update ProcessMediaPipeVideo Function

**File**: `VideoAnalysisTab.tsx`

**Location**: processMediaPipeVideo function (line ~356-407)

**REPLACE** the entire function with:

```tsx
// Process video with MediaPipe for 3D view (multi-person support)
const processMediaPipeVideo = useCallback(async (
  videoElement: HTMLVideoElement,
 poseFrames: PoseFrame[]  // ← NEW PARAMETER
) => {
  if (!videoElement || !poseFrames || poseFrames.length === 0) return;

  setIsMediaPipeProcessing(true);
  setMediaPipeProgress(0);
  setMediaPipeError("");

  try {
    console.log('Starting MediaPipe multi-person pose detection...');
    console.log(`Processing ${poseFrames.length} frames with bounding box data...`);
    
    // Wait for video to load
    if (videoElement.readyState < 2) {
      await new Promise((resolve) => {
        videoElement.addEventListener('loadeddata', () => resolve(null), { once: true });
      });
    }

    // Import and run multi-person MediaPipe processor
    const { processMultiPersonVideo } = await import('@/lib/multiPersonPoseProcessor');
    
    const frames = await processMultiPersonVideo(
      videoElement,
      poseFrames,  // Pass the pose frames with bbox data
      (progress) => {
        setMediaPipeProgress(progress);
      },
      (frameIndex, totalFrames) => {
        if (frameIndex % 25 === 0) {
          console.log(`MediaPipe: Processing frame ${frameIndex + 1}/${totalFrames}`);
        }
      }
    );

    console.log(`MediaPipe completed: ${frames.length} frames processed`);
    
    // Count frames with at least one detected person
    const framesWithPoses = frames.filter(f => f.persons.some(p => p.landmarks));
    console.log(`${framesWithPoses.length} frames with detected persons`);

    // Count total persons across all frames
    const totalPersons = frames.reduce((sum, f) => 
      sum + f.persons.filter(p => p.landmarks).length, 0
    );
    console.log(`Total ${totalPersons} person-poses detected across all frames`);

    if (framesWithPoses.length === 0) {
      setMediaPipeError("No poses detected. Please ensure persons are clearly visible.");
    } else {
      setMediaPipePoseData(frames);
      setMediaPipeProgress(100);
    }
    
  } catch (error) {
    console.error("MediaPipe processing error:", error);
    setMediaPipeError(`Failed to process video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    setIsMediaPipeProcessing(false);
  }
}, []);
```

### Phase 3: Update MediaPipe3DView Component

**File**: `MediaPipe3DView.tsx`

The component needs to be updated to handle the new multi-person data structure:

```tsx
interface PersonPoseData {
  personId: number;
  landmarks?: Landmark[];
  bbox?: number[];
  confidence?: number;
}

interface MultiPersonPoseFrame {
  frameIndex: number;
  timestamp?: number;
  persons: PersonPoseData[];
}

interface MediaPipe3DViewProps {
  poseData: MultiPersonPoseFrame[];  // ← Updated type
  isProcessing: boolean;
  processingProgress: number;
  error: string;
  isPlaying: boolean;
  playbackSpeed: number;
}
```

**Update AnimatedSkeleton to render multiple persons**:

```tsx
function AnimatedSkeleton({
  poseData,
  currentFrame,
  showSkeleton,
  showBodyParts,
  showHelmet
}: {
  poseData: MultiPersonPoseFrame[];
  currentFrame: number;
  showSkeleton: boolean;
  showBodyParts: boolean;
  showHelmet: boolean;
}) {
  if (!poseData || poseData.length === 0) return null;

  const frame = poseData[currentFrame];
  if (!frame || !frame.persons) return null;

  // Colors for different persons
  const personColors = [
    0x00ff00,  // Green (Person 1)
    0x00ffff,  // Cyan (Person 2)
    0xffff00,  // Yellow (Person 3)
    0xff00ff,  // Magenta (Person 4)
  ];

  return (
    <group>
      {/* Cricket pitch */}
      <CricketPitch />

      {/* Render each person */}
      {frame.persons.map((person, personIdx) => {
        if (!person.landmarks || person.landmarks.length === 0) return null;

        const positions = person.landmarks.map(lm => getLandmarkBasePosition(lm));
        const color = personColors[personIdx % personColors.length];

        // Offset each person slightly for visibility
        const xOffset = personIdx * 0.5;

        return (
          <group key={`person-${personIdx}`} position={[xOffset, 0, 0]}>
            {/* Joints for this person */}
            {positions.map((position, i) => (
              <mesh key={`joint-${personIdx}-${i}`} position={position}>
                <sphereGeometry args={[0.03, 16, 16]} />
                <meshPhongMaterial color={color} emissive={color} emissiveIntensity={0.4} />
              </mesh>
            ))}

            {/* Bones for this person */}
            {POSE_CONNECTIONS.map(([start, end], i) => (
              <Line
                key={`bone-${personIdx}-${i}`}
                points={[positions[start], positions[end]]}
                color={color}
                lineWidth={3}
                transparent
                opacity={0.95}
              />
            ))}

            {/* Body parts for this person (if enabled) */}
            {showBodyParts && <PersonBodyParts landmarks={person.landmarks} positions={positions} color={color} />}
          </group>
        );
      })}
    </group>
  );
}
```

## How It Works

### Flow Diagram

```
1. User uploads video
        ↓
2. Backend processes with YOLOv8 + PoseNet
        ↓
3. WebSocket sends keypoints with bbox data
   {
     persons: [
       { bbox: [x1, y1, x2, y2], keypoints: [...] },
       { bbox: [x1, y1, x2, y2], keypoints: [...] }
     ]
   }
        ↓
4. processMediaPipeVideo(video, keypointsData)
        ↓
5. For each frame:
   For each person:
     - Extract bbox region from video
     - Process with MediaPipe Pose
     - Convert landmarks back to full frame coords
        ↓
6. Store multi-person results:
   [
     {
       frameIndex: 0,
       persons: [
         { personId: 0, landmarks: [...], bbox: [...] },
         { personId: 1, landmarks: [...], bbox: [...] }
       ]
     },
     ...
   ]
        ↓
7. Render in 3D:
   - Person 1: Green skeleton
   - Person 2: Cyan skeleton
   - Person  3: Yellow skeleton
   - etc.
```

## Files Created

1. ✅ `lib/multiPersonPoseProcessor.ts` - Multi-person MediaPipe processor

## Files To Modify

1. ⏳ `VideoAnalysisTab.tsx`:
   - Update onKeypoints callback
   - Update processMediaPipeVideo function

2. ⏳ `MediaPipe3DView.tsx`:
   - Update data types
   - Update AnimatedSkeleton to render multiple persons

## Testing

### Console Output to Expect

```
✓ Received keypoints via WebSocket: 750 frames
✓ Keypoints received - starting MediaPipe multi-person processing...
✓ Starting MediaPipe multi-person pose detection...
✓ Processing 750 frames with bounding box data...
✓ Loading MediaPipe Pose for multi-person detection...
✓ MediaPipe Pose loaded successfully
✓ Processing 750 frames with multiple persons...
✓ MediaPipe: Processing frame 26/750
✓ MediaPipe: Processing frame 51/750
...
✓ Multi-person processing complete: 1500 person-poses detected across 750 frames
✓ MediaPipe completed: 750 frames processed
✓ 750 frames with detected persons
✓ Total 1500 person-poses detected across all frames
```

### Visual Result

- Multiple colored skeletons displayed simultaneously
- Each person maintains their own color throughout
- Slight x-offset prevents overlapping
- All persons move independently

## Benefits

1. **Multiple Players**: Track batsman + bowler + fielders
2. **Individual Analysis**: Each person processed separately
3. **Better Accuracy**: Bbox cropping improves MediaPipe accuracy
4. **Scalable**: Handles 1-4 persons efficiently
5. **Color-Coded**: Easy to distinguish between persons

## Next Steps

1. Apply changes to VideoAnalysisTab.tsx
2. Update MediaPipe3DView.tsx  
3. Test with multi-person cricket video
4. Tune person offsets for optimal visibility
5. Add person labels/names if available

## Status

- ✅ Multi-person processor created
- ✅ WebSocket callback updated
- ⏳ processMediaPipeVideo function (needs manual update)
- ⏳ MediaPipe3DView component (needs manual update)
