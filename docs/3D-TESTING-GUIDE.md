# Testing the 3D Cricket Pose Analysis

## Quick Start

### 1. Access the Feature
1. Navigate to your Next.js application: `http://localhost:3000` (or your dev server URL)
2. Go to the Features section
3. Click on the **3D Video** tab

### 2. Upload a Video
1. Click the **"Upload Video"** button
2. Select a cricket batting video:
   - **Format**: MP4, MOV, WebM, or any video format
   - **Duration**: Between 10-60 seconds
   - **Size**: Maximum 50 MB
3. Wait for validation (automatic)

### 3. Process the Video
1. Once uploaded, click **"Analyze Video"**
2. Watch the progress bar (0-100%)
3. Processing takes ~5-30 seconds depending on video length
4. Currently uses placeholder pose data (ready for MediaPipe)

### 4. View the 3D Analysis

#### Camera Controls:
- **Front View**: See the batsman from bowler's perspective
- **Side View**: Perfect for batting technique analysis (default)
- **Top View**: Bird's eye view of footwork
- **Free View**: Custom camera positioning

#### Playback Controls:
- **Play/Pause**: Animate the skeleton
- **Reset**: Go back to first frame
- **Step Forward/Backward**: Frame-by-frame analysis
- **Speed Control**: 0.25x to 2.0x playback speed
- **Frame Scrubber**: Jump to any frame instantly

#### Display Options:
- Toggle Skeleton (joints and bones)
- Toggle Body Parts (cricket gear ready)
- Toggle Cricket Bat
- Toggle Helmet

### 5. Interactive 3D Scene
- **Rotate**: Left-click + drag
- **Pan**: Right-click + drag
- **Zoom**: Mouse scroll wheel
- **Smooth Controls**: Damped camera movement

## Testing Checklist

### Upload Validation ✓
- [ ] Upload video less than 10 seconds → Should show error
- [ ] Upload video more than 60 seconds → Should show error
- [ ] Upload file larger than 50 MB → Should show error
- [ ] Upload non-video file → Should show error
- [ ] Upload valid video (10-60s, <50MB) → Should succeed

### Processing ✓
- [ ] Progress bar shows 0-100%
- [ ] Processing completes successfully
- [ ] 3D view appears after processing
- [ ] Frame count matches video duration

### Playback ✓
- [ ] Play button starts animation
- [ ] Pause button stops animation
- [ ] Reset returns to frame 0
- [ ] Step forward/backward works
- [ ] Speed control changes playback rate
- [ ] Frame scrubber allows jumping to any frame
- [ ] Animation loops or stops at end

### 3D Visualization ✓
- [ ] Skeleton appears with correct proportions
- [ ] Joints are color-coded by confidence
- [ ] Bones connect joints correctly
- [ ] Cricket pitch is visible
- [ ] Ground, pitch strip, and creases render

### Camera Views ✓
- [ ] Front view positions correctly
- [ ] Side view is default and well-positioned
- [ ] Top view shows overhead perspective
- [ ] Free view allows custom positioning
- [ ] Orbit controls work smoothly

### Display Options ✓
- [ ] Skeleton toggle works
- [ ] Body parts toggle ready
- [ ] Bat toggle ready
- [ ] Helmet toggle ready
- [ ] All toggles update in real-time

### Error Handling ✓
- [ ] Error messages display clearly
- [ ] Can recover from errors
- [ ] Can upload new video after error

## Sample Videos for Testing

### Good Test Videos:
1. **Short Cricket Clip** (15-30s)
   - Single batsman
   - Clear view
   - Good lighting

2. **Batting Tutorial** (30-45s)
   - Shows technique
   - Side-on camera angle
   - Slow motion optional

3. **Practice Session** (20-40s)
   - Multiple shots
   - Various angles
   - Clear background

### Videos to Avoid (for now):
- ❌ Match footage with multiple players
- ❌ Poor lighting/low quality
- ❌ Extreme camera angles
- ❌ Very fast motion without clear frames

## Integration with MediaPipe (Next Steps)

When ready to integrate real pose detection:

1. Install dependencies:
   ```bash
   npm install @mediapipe/pose @mediapipe/camera_utils
   ```

2. The placeholder function `createRealisticPoseLandmarks()` in `3DVideo.tsx` should be replaced with actual MediaPipe processing

3. Update the `processVideo()` function to use MediaPipe Pose:
   ```typescript
   // Initialize MediaPipe
   const pose = new Pose({...});
   
   // Process each frame
   const results = await pose.send({ image: canvas });
   const landmarks = results.poseLandmarks;
   ```

## Troubleshooting

### Video Won't Upload
- Check file size (<50MB)
- Check duration (10-60s)
- Try different video format
- Check browser console for errors

### Processing Hangs
- Refresh page and try again
- Try shorter video
- Check browser console
- Ensure dev server is running

### 3D View Doesn't Appear
- Check WebGL support in browser
- Update graphics drivers
- Try different browser
- Check console for Three.js errors

### Skeleton Looks Wrong
- Currently using placeholder data
- Will be accurate once MediaPipe is integrated
- Check that pose data has 33 landmarks

## Browser Compatibility

### Tested & Supported:
- ✅ Chrome/Edge (V8)
- ✅ Firefox
- ✅ Safari (WebGL2 required)

### Requirements:
- WebGL 2.0 support
- Modern ES6+ JavaScript
- HTMLVideoElement API
- FileReader API
- Canvas 2D context

## Performance Tips

- Shorter videos process faster
- Higher quality = larger file size
- 720p is ideal balance
- Close other browser tabs during processing
- Use hardware acceleration if available

## Features Coming Soon

- ✅ Real MediaPipe pose detection
- ✅ Rendered body parts (torso, arms, legs)
- ✅ Cricket equipment (bat, pads, gloves, helmet)
- ✅ Velocity vectors visualization
- ✅ Shot type classification
- ✅ Technique scoring
- ✅ Coaching feedback overlay
- ✅ Comparison with professional players

## Support

If you encounter issues:
1. Check browser console (F12)
2. Check terminal/server logs
3. Verify dev server is running
4. Review implementation docs in `docs/3D-IMPLEMENTATION.md`
