export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`LocalStorage write failed for key "${key}". Attempting cache cleanup...`, err);
    
    // Clear large non-critical cache keys to free up space
    const cacheKeysToClear = [
      'uamapper_nominatim_cache_v1',
      'uamapper_kryvorizkyi_raion_boundary',
      'uamapper_kryvyi_rih_city_boundary',
      'visicom_searched_areas',
    ];

    for (const cacheKey of cacheKeysToClear) {
      if (cacheKey !== key) {
        try {
          localStorage.removeItem(cacheKey);
        } catch (e) {
          // ignore
        }
      }
    }

    // Clear secondary boundary cache keys if needed
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('uamapper_boundary_') || k.startsWith('uamapper_nominatim_')) && k !== key) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      // ignore
    }

    // Retry saving after cleanup
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (retryErr) {
      console.error(`LocalStorage write failed after cleanup for key "${key}":`, retryErr);
      return false;
    }
  }
}

export function optimizeIconDataUrl(dataUrl: string, maxDim: number = 128): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || dataUrl.startsWith('data:image/svg+xml') || dataUrl.length < 30000) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width <= maxDim && height <= maxDim) {
        resolve(dataUrl);
        return;
      }
      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png', 0.9));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
