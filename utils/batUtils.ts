import { BatDetection } from './poseUtils';

// Types for scaled bat data
export type ScaledBatDetection = {
    bbox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    confidence: number;
    bat_angle: number;
    bat_center: { x: number; y: number };
    bat_id: number;
};

/**
 * Scale bat bounding box coordinates to match canvas dimensions
 */
export const scaleBatDetections = (
    bats: BatDetection[],
    originalVideoWidth: number,
    originalVideoHeight: number,
    canvasWidth: number,
    canvasHeight: number
): ScaledBatDetection[] => {
    const scale = Math.min(
        canvasWidth / originalVideoWidth,
        canvasHeight / originalVideoHeight
    );

    const xOffset = (canvasWidth - originalVideoWidth * scale) / 2;
    const yOffset = (canvasHeight - originalVideoHeight * scale) / 2;

    return bats.map(bat => ({
        bbox: {
            x: bat.bbox.x * scale + xOffset,
            y: bat.bbox.y * scale + yOffset,
            width: bat.bbox.width * scale,
            height: bat.bbox.height * scale,
        },
        confidence: bat.confidence,
        bat_angle: bat.bat_angle,
        bat_center: {
            x: bat.bat_center[0] * scale + xOffset,
            y: bat.bat_center[1] * scale + yOffset,
        },
        bat_id: bat.bat_id,
    }));
};

/**
 * Draw bat bounding box and center on canvas
 */
export const drawBatDetection = (
    ctx: CanvasRenderingContext2D,
    bat: ScaledBatDetection,
    showAngle: boolean = true
) => {
    // Draw bounding box
    ctx.strokeStyle = '#FFD700'; // Gold color for visibility
    ctx.lineWidth = 3;
    ctx.strokeRect(bat.bbox.x, bat.bbox.y, bat.bbox.width, bat.bbox.height);

    // Draw bat center point
    ctx.beginPath();
    ctx.arc(bat.bat_center.x, bat.bat_center.y, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#FF4500'; // Orange-red for center
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Optionally draw angle line
    if (showAngle) {
        const angleRad = (bat.bat_angle * Math.PI) / 180;
        const lineLength = Math.max(bat.bbox.width, bat.bbox.height) / 2;

        const endX = bat.bat_center.x + lineLength * Math.cos(angleRad);
        const endY = bat.bat_center.y + lineLength * Math.sin(angleRad);

        ctx.beginPath();
        ctx.moveTo(bat.bat_center.x, bat.bat_center.y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = '#00FFFF'; // Cyan for angle line
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Draw confidence label (optional)
    const confidence = Math.round(bat.confidence * 100);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`${confidence}%`, bat.bbox.x, bat.bbox.y - 5);
};
