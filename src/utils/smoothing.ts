import L from 'leaflet';

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

/**
 * Ramer-Douglas-Peucker 2D polyline simplification.
 * Strips out trembling/noise from raw pointer movement while strictly preserving genuine corners and turns.
 */
export function simplify2DPoints(points: [number, number][], tolerance = 3.0): [number, number][] {
  if (!points || points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lineLenSq = dx * dx + dy * dy;

  for (let i = 1; i < points.length - 1; i++) {
    const pt = points[i];
    let dist: number;

    if (lineLenSq === 0) {
      const px = pt[0] - start[0];
      const py = pt[1] - start[1];
      dist = Math.sqrt(px * px + py * py);
    } else {
      const num = Math.abs(dy * pt[0] - dx * pt[1] + end[0] * start[1] - end[1] * start[0]);
      dist = num / Math.sqrt(lineLenSq);
    }

    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplify2DPoints(points.slice(0, index + 1), tolerance);
    const right = simplify2DPoints(points.slice(index), tolerance);
    return left.slice(0, -1).concat(right);
  } else {
    return [start, end];
  }
}

/**
 * Reduces a freehand stroke to clean, manageable key control points for editing.
 * Instead of storing hundreds of dense micro-points, it extracts essential anchor vertices
 * (typically 6-18 points) spaced comfortably apart on screen.
 * 
 * When combined with line.smoothed=true, Leaflet renders a silky-smooth spline
 * while providing the user with clean, uncluttered drag handles for editing.
 */
export function extractControlPointsFromFreehand(
  map: L.Map,
  rawLatLngs: [number, number][],
  minDistancePx = 36,
  maxPoints = 18
): [number, number][] {
  if (!rawLatLngs || rawLatLngs.length <= 2) return rawLatLngs;
  if (rawLatLngs.length <= 3) return rawLatLngs;

  // 1. Convert to screen pixel space
  const pixelPoints: [number, number][] = rawLatLngs.map((pt) => {
    const cp = map.latLngToContainerPoint(L.latLng(pt[0], pt[1]));
    return [cp.x, cp.y];
  });

  // 2. Remove micro-adjacent pixel noise (< 2.5px apart)
  const filteredPixels: [number, number][] = [pixelPoints[0]];
  for (let i = 1; i < pixelPoints.length; i++) {
    const prev = filteredPixels[filteredPixels.length - 1];
    const curr = pixelPoints[i];
    const dx = curr[0] - prev[0];
    const dy = curr[1] - prev[1];
    if (dx * dx + dy * dy >= 6.25) {
      filteredPixels.push(curr);
    }
  }
  const lastPixel = pixelPoints[pixelPoints.length - 1];
  const lastFiltered = filteredPixels[filteredPixels.length - 1];
  if (lastFiltered[0] !== lastPixel[0] || lastFiltered[1] !== lastPixel[1]) {
    filteredPixels.push(lastPixel);
  }

  if (filteredPixels.length <= 3) {
    return [rawLatLngs[0], rawLatLngs[rawLatLngs.length - 1]];
  }

  // Calculate total screen path length
  let totalLengthPx = 0;
  for (let i = 1; i < filteredPixels.length; i++) {
    const dx = filteredPixels[i][0] - filteredPixels[i - 1][0];
    const dy = filteredPixels[i][1] - filteredPixels[i - 1][1];
    totalLengthPx += Math.sqrt(dx * dx + dy * dy);
  }

  // Determine adaptive RDP tolerance
  let tolerance = Math.max(5, Math.min(18, totalLengthPx / 60));
  let simplified = simplify2DPoints(filteredPixels, tolerance);

  // If still too many points (> maxPoints), iteratively increase tolerance
  let attempts = 0;
  while (simplified.length > maxPoints && attempts < 8) {
    tolerance *= 1.35;
    simplified = simplify2DPoints(filteredPixels, tolerance);
    attempts++;
  }

  // 3. Distance and angle thinning
  // Remove vertices that are too close to each other (< minDistancePx)
  // while preserving sharp corners (apex turns)
  if (simplified.length > 2) {
    const thinned: [number, number][] = [simplified[0]];
    for (let i = 1; i < simplified.length - 1; i++) {
      const prev = thinned[thinned.length - 1];
      const curr = simplified[i];
      const next = simplified[i + 1];

      const dPrev = Math.hypot(curr[0] - prev[0], curr[1] - prev[1]);
      
      if (dPrev >= minDistancePx) {
        thinned.push(curr);
      } else {
        // Calculate angle turn to preserve significant corners
        const v1x = curr[0] - prev[0];
        const v1y = curr[1] - prev[1];
        const v2x = next[0] - curr[0];
        const v2y = next[1] - curr[1];
        const dot = v1x * v2x + v1y * v2y;
        const mag1 = Math.hypot(v1x, v1y);
        const mag2 = Math.hypot(v2x, v2y);
        if (mag1 > 0 && mag2 > 0) {
          const cosTheta = dot / (mag1 * mag2);
          // If turn angle < 60° (cosTheta < 0.5) and at least 16px away, keep apex
          if (cosTheta < 0.5 && dPrev >= 16) {
            thinned.push(curr);
          }
        }
      }
    }
    thinned.push(simplified[simplified.length - 1]);
    simplified = thinned;
  }

  // Hard cap to maxPoints if needed
  if (simplified.length > maxPoints) {
    const step = (simplified.length - 1) / (maxPoints - 1);
    const capped: [number, number][] = [simplified[0]];
    for (let i = 1; i < maxPoints - 1; i++) {
      const idx = Math.round(i * step);
      capped.push(simplified[idx]);
    }
    capped.push(simplified[simplified.length - 1]);
    simplified = capped;
  }

  // 4. Convert back to LatLng coordinates
  return simplified.map((p) => {
    const ll = map.containerPointToLatLng(L.point(p[0], p[1]));
    return [ll.lat, ll.lng];
  });
}

/**
 * Simplifies a polyline of [lat, lng] points down to a target number of essential control vertices.
 * Preserves the overall geometry, turns, loops, and curvature while dramatically reducing
 * redundant points (e.g. from 200 down to 10-18 points).
 * 
 * Works purely in geographic coordinates (with equirectangular projection adjustment for latitude),
 * making it completely reliable without needing a DOM/Map reference.
 */
export function simplifyLatLngPath(
  points: [number, number][],
  targetPoints = 16,
  minPoints = 4
): [number, number][] {
  if (!points || points.length <= minPoints) return points;

  // Calculate mean latitude for aspect ratio correction
  let sumLat = 0;
  for (const pt of points) sumLat += pt[0];
  const meanLatRad = (sumLat / points.length) * (Math.PI / 180);
  const cosLat = Math.cos(meanLatRad);

  // Convert to projected 2D coordinates [x, y]
  const projected: [number, number][] = points.map(([lat, lng]) => [
    lng * cosLat,
    lat,
  ]);

  // Calculate total path length in projected degrees
  let totalLen = 0;
  for (let i = 1; i < projected.length; i++) {
    const dx = projected[i][0] - projected[i - 1][0];
    const dy = projected[i][1] - projected[i - 1][1];
    totalLen += Math.sqrt(dx * dx + dy * dy);
  }

  if (totalLen === 0) return [points[0], points[points.length - 1]];

  // Initial tolerance
  let tolerance = totalLen / (targetPoints * 8);

  let simplified = simplify2DPoints(projected, tolerance);

  // Iteratively adjust tolerance so that point count is around targetPoints
  let iterations = 0;
  while (simplified.length > targetPoints && iterations < 8) {
    tolerance *= 1.45;
    simplified = simplify2DPoints(projected, tolerance);
    iterations++;
  }

  // Thin out vertices that are too close to their neighbors
  const minSpacing = totalLen / (targetPoints * 2.2);
  if (simplified.length > 2) {
    const thinned: [number, number][] = [simplified[0]];
    for (let i = 1; i < simplified.length - 1; i++) {
      const prev = thinned[thinned.length - 1];
      const curr = simplified[i];
      const next = simplified[i + 1];

      const dx = curr[0] - prev[0];
      const dy = curr[1] - prev[1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist >= minSpacing) {
        thinned.push(curr);
      } else {
        // Keep apex if sharp corner
        const v1x = curr[0] - prev[0];
        const v1y = curr[1] - prev[1];
        const v2x = next[0] - curr[0];
        const v2y = next[1] - curr[1];
        const dot = v1x * v2x + v1y * v2y;
        const m1 = Math.hypot(v1x, v1y);
        const m2 = Math.hypot(v2x, v2y);
        if (m1 > 0 && m2 > 0 && dot / (m1 * m2) < 0.5 && dist >= minSpacing * 0.4) {
          thinned.push(curr);
        }
      }
    }
    thinned.push(simplified[simplified.length - 1]);
    simplified = thinned;
  }

  // Hard cap to targetPoints if needed
  if (simplified.length > targetPoints) {
    const step = (simplified.length - 1) / (targetPoints - 1);
    const capped: [number, number][] = [simplified[0]];
    for (let i = 1; i < targetPoints - 1; i++) {
      const idx = Math.round(i * step);
      capped.push(simplified[idx]);
    }
    capped.push(simplified[simplified.length - 1]);
    simplified = capped;
  }

  // Convert back to [lat, lng]
  return simplified.map(([x, y]) => [y, x / cosLat]);
}

/**
 * Simplifies an existing line's points down to a specified target number of points (e.g. 16).
 * Safe to call on any line with dozens or hundreds of points.
 */
export function simplifyExistingLinePoints(
  map: L.Map | null,
  points: [number, number][],
  targetMaxPoints = 16
): [number, number][] {
  if (!points || points.length <= 4) return points;
  if (map) {
    return extractControlPointsFromFreehand(map, points, 36, targetMaxPoints);
  }
  return simplifyLatLngPath(points, targetMaxPoints, 4);
}

/**
 * Transforms a raw freehand stroke (drawn with mouse or finger/touchscreen)
 * into a silky-smooth, natural vector trajectory on a Leaflet map.
 * 
 * 1. Converts [lat, lng] points to container screen pixels
 * 2. Filters micro-adjacent jitter (< 2.5px)
 * 3. Applies Ramer-Douglas-Peucker simplification (removes finger jitter while keeping trajectory shape)
 * 4. Converts back to LatLng coordinates
 * 5. Applies Chaikin corner curve smoothing for professional vector quality
 */
export function smoothFreehandStrokeOnMap(
  map: L.Map,
  rawLatLngs: [number, number][],
  pixelTolerance = 3.0,
  smoothingIterations = 3
): [number, number][] {
  if (!rawLatLngs || rawLatLngs.length < 2) return rawLatLngs;
  if (rawLatLngs.length === 2) return rawLatLngs;

  // 1. Convert to screen pixel space
  const pixelPoints: [number, number][] = rawLatLngs.map((pt) => {
    const cp = map.latLngToContainerPoint(L.latLng(pt[0], pt[1]));
    return [cp.x, cp.y];
  });

  // 2. Remove micro-adjacent pixel noise
  const filteredPixels: [number, number][] = [pixelPoints[0]];
  for (let i = 1; i < pixelPoints.length; i++) {
    const prev = filteredPixels[filteredPixels.length - 1];
    const curr = pixelPoints[i];
    const dx = curr[0] - prev[0];
    const dy = curr[1] - prev[1];
    if (dx * dx + dy * dy >= 6.25) { // at least 2.5px apart
      filteredPixels.push(curr);
    }
  }

  // Ensure last point is preserved
  const lastPixel = pixelPoints[pixelPoints.length - 1];
  const lastFiltered = filteredPixels[filteredPixels.length - 1];
  if (lastFiltered[0] !== lastPixel[0] || lastFiltered[1] !== lastPixel[1]) {
    filteredPixels.push(lastPixel);
  }

  if (filteredPixels.length <= 2) {
    return [rawLatLngs[0], rawLatLngs[rawLatLngs.length - 1]];
  }

  // 3. Ramer-Douglas-Peucker simplification in screen pixels
  const simplifiedPixels = simplify2DPoints(filteredPixels, pixelTolerance);

  // 4. Convert back to LatLng coordinates
  const simplifiedLatLngs: [number, number][] = simplifiedPixels.map((p) => {
    const ll = map.containerPointToLatLng(L.point(p[0], p[1]));
    return [ll.lat, ll.lng];
  });

  if (simplifiedLatLngs.length <= 2) {
    return simplifiedLatLngs;
  }

  // 5. Chaikin corner smoothing for silky aesthetic curves
  return smoothPolylinePoints(simplifiedLatLngs, smoothingIterations);
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
  steps = 30
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
