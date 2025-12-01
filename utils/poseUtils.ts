export type Keypoint = { x: number; y: number; score: number };

export type PoseFrame = {
    frame_number: number;
    persons: Array<{
        keypoints: number[][];
        scores: number[];
    }>;
};

// 1. Define Colors
const COLORS = {
    head: '#00FFFF',      // Cyan
    leftArm: '#FF0000',   // Red
    rightArm: '#FFA500',  // Orange
    torso: '#00FF00',     // Green
    leftLeg: '#FF00FF',   // Magenta
    rightLeg: '#800080',  // Purple
};

// 2. Updated Connections
// Note: We use Index 17 for the calculated "Neck"
export const SKELETON_CONNECTIONS = [
    // Torso
    { start: 5, end: 6, color: COLORS.torso },   // Shoulder to Shoulder
    { start: 11, end: 12, color: COLORS.torso }, // Hip to Hip
    { start: 5, end: 11, color: COLORS.torso },  // Left Side
    { start: 6, end: 12, color: COLORS.torso },  // Right Side

    // Left Arm
    { start: 5, end: 7, color: COLORS.leftArm },
    { start: 7, end: 9, color: COLORS.leftArm },

    // Right Arm
    { start: 6, end: 8, color: COLORS.rightArm },
    { start: 8, end: 10, color: COLORS.rightArm },

    // Left Leg
    { start: 11, end: 13, color: COLORS.leftLeg },
    { start: 13, end: 15, color: COLORS.leftLeg },

    // Right Leg
    { start: 12, end: 14, color: COLORS.rightLeg },
    { start: 14, end: 16, color: COLORS.rightLeg },

    // Head: Connect Nose (0) to Calculated Neck (17)
    { start: 0, end: 17, color: COLORS.head },
];

export const getKeypointColor = (index: number): string => {
    if (index === 0) return COLORS.head;                  // Nose
    if ([5, 7, 9].includes(index)) return COLORS.leftArm; // Left Arm
    if ([6, 8, 10].includes(index)) return COLORS.rightArm;// Right Arm
    if ([11, 12].includes(index)) return COLORS.torso;    // Hips
    if ([13, 15].includes(index)) return COLORS.leftLeg;  // Left Leg
    if ([14, 16].includes(index)) return COLORS.rightLeg; // Right Leg

    return 'transparent'; // Hide Eyes/Ears and the Virtual Neck dot
};

export const parseKeypoints = (frameData: PoseFrame): Keypoint[] => {
    if (!frameData || !frameData.persons || frameData.persons.length === 0) return [];

    const person = frameData.persons[0];
    return person.keypoints.map((kp, index) => ({
        x: kp[0],
        y: kp[1],
        score: person.scores[index],
    }));
};

// 3. Updated Scaling Logic with "Neck" Calculation
export const scaleKeypoints = (
    keypoints: Keypoint[],
    originalVideoWidth: number,
    originalVideoHeight: number,
    canvasWidth: number,
    canvasHeight: number
): Keypoint[] => {
    const scale = Math.min(
        canvasWidth / originalVideoWidth,
        canvasHeight / originalVideoHeight
    );

    const xOffset = (canvasWidth - originalVideoWidth * scale) / 2;
    const yOffset = (canvasHeight - originalVideoHeight * scale) / 2;

    // Scale the standard 17 keypoints (0-16)
    const scaled = keypoints.map((kp) => ({
        x: kp.x * scale + xOffset,
        y: kp.y * scale + yOffset,
        score: kp.score,
    }));

    // 4. Calculate Virtual Neck (Index 17)
    // Midpoint between Left Shoulder (5) and Right Shoulder (6)
    const leftShoulder = scaled[5];
    const rightShoulder = scaled[6];

    if (leftShoulder && rightShoulder) {
        const neck: Keypoint = {
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2,
            score: Math.min(leftShoulder.score, rightShoulder.score), // Conservative score
        };
        scaled.push(neck); // This becomes index 17
    }

    return scaled;
};