/**
 * Chaikin's Corner Smoothing Algorithm for map polyline coordinates.
 * Converts sharp angles/corners into silky smooth curves.
 * 
 * @param points Array of [lat, lng] coordinates
 * @param iterations Number of smoothing passes (default 4)
 * @returns Array of smoothed [lat, lng] coordinates
 */
export function smoothPolylinePoints(points: [number, number][], iterations = 4): [number, number][] {
  if (!points || points.length < 3) return points;

  let current = [...points];

  for (let it = 0; it < iterations; it++) {
    const next: [number, number][] = [];
    next.push(current[0]); // Keep start point fixed

    for (let i = 0; i < current.length - 1; i++) {
      const p0 = current[i];
      const p1 = current[i + 1];

      // Q = 0.75 * P0 + 0.25 * P1
      const q: [number, number] = [
        0.75 * p0[0] + 0.25 * p1[0],
        0.75 * p0[1] + 0.25 * p1[1],
      ];

      // R = 0.25 * P0 + 0.75 * P1
      const r: [number, number] = [
        0.25 * p0[0] + 0.75 * p1[0],
        0.25 * p0[1] + 0.75 * p1[1],
      ];

      next.push(q);
      next.push(r);
    }

    next.push(current[current.length - 1]); // Keep end point fixed
    current = next;
  }

  return current;
}

export interface FadingSegment {
  points: [number, number][];
  opacity: number;
}

/**
 * Calculates fading polyline segments for line rendering.
 * Solid middle section + progressive sub-segments with fading opacities towards start/end.
 */
export function generateFadingPolylineSegments(
  points: [number, number][],
  fadeStart: boolean,
  fadeEnd: boolean,
  baseOpacity = 0.9,
  steps = 14
): FadingSegment[] {
  if (!points || points.length < 2) return [];

  // Calculate cumulative distances
  const cumDists: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const dLat = points[i][0] - points[i - 1][0];
    const dLng = points[i][1] - points[i - 1][1];
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    cumDists.push(cumDists[i - 1] + dist);
  }

  const totalDist = cumDists[cumDists.length - 1];
  if (totalDist === 0) {
    return [{ points, opacity: baseOpacity }];
  }

  let startFadeDist = fadeStart ? totalDist * 0.35 : 0;
  let endFadeDist = fadeEnd ? totalDist * 0.35 : 0;

  if (startFadeDist + endFadeDist > totalDist) {
    const ratio = totalDist / (startFadeDist + endFadeDist);
    startFadeDist *= ratio;
    endFadeDist *= ratio;
  }

  const getPointAtDist = (targetDist: number): [number, number] => {
    if (targetDist <= 0) return points[0];
    if (targetDist >= totalDist) return points[points.length - 1];

    let idx = 0;
    while (idx < cumDists.length - 1 && cumDists[idx + 1] < targetDist) {
      idx++;
    }

    const d0 = cumDists[idx];
    const d1 = cumDists[idx + 1];
    const segmentLen = d1 - d0;
    if (segmentLen === 0) return points[idx];

    const t = (targetDist - d0) / segmentLen;
    const p0 = points[idx];
    const p1 = points[idx + 1];

    return [
      p0[0] + t * (p1[0] - p0[0]),
      p0[1] + t * (p1[1] - p0[1]),
    ];
  };

  const slicePath = (dStart: number, dEnd: number): [number, number][] => {
    if (dStart >= dEnd) return [];
    const pStart = getPointAtDist(dStart);
    const pEnd = getPointAtDist(dEnd);

    const result: [number, number][] = [pStart];

    for (let i = 0; i < points.length; i++) {
      if (cumDists[i] > dStart && cumDists[i] < dEnd) {
        result.push(points[i]);
      }
    }

    result.push(pEnd);
    return result;
  };

  const resultSegments: FadingSegment[] = [];

  const solidStart = startFadeDist;
  const solidEnd = totalDist - endFadeDist;

  // 1. Fade Start
  if (fadeStart && startFadeDist > 0) {
    const stepLen = startFadeDist / steps;
    for (let i = 0; i < steps; i++) {
      const d1 = i * stepLen;
      const d2 = (i + 1) * stepLen;
      const pts = slicePath(d1, d2);
      if (pts.length >= 2) {
        const progress = (i + 0.5) / steps;
        const opacity = baseOpacity * Math.pow(progress, 1.3);
        resultSegments.push({ points: pts, opacity: Math.max(0.02, opacity) });
      }
    }
  }

  // 2. Solid Middle
  if (solidEnd > solidStart) {
    const pts = slicePath(solidStart, solidEnd);
    if (pts.length >= 2) {
      resultSegments.push({ points: pts, opacity: baseOpacity });
    }
  }

  // 3. Fade End
  if (fadeEnd && endFadeDist > 0) {
    const stepLen = endFadeDist / steps;
    for (let i = 0; i < steps; i++) {
      const d1 = solidEnd + i * stepLen;
      const d2 = solidEnd + (i + 1) * stepLen;
      const pts = slicePath(d1, d2);
      if (pts.length >= 2) {
        const progress = 1 - (i + 0.5) / steps;
        const opacity = baseOpacity * Math.pow(progress, 1.3);
        resultSegments.push({ points: pts, opacity: Math.max(0.02, opacity) });
      }
    }
  }

  return resultSegments.length > 0 ? resultSegments : [{ points, opacity: baseOpacity }];
}
