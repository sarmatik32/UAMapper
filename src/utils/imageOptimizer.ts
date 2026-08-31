/**
 * Helper to compress and optimize images for Telegram Bot API limits.
 * Telegram sendPhoto has a strict 10 MB (10,485,760 bytes) file size limit.
 */
export async function optimizeImageForTelegram(
  sourceBlob: Blob,
  maxSizeBytes: number = 9.5 * 1024 * 1024 // 9.5 MB threshold
): Promise<{ blob: Blob; filename: string; mimeType: string; wasCompressed: boolean }> {
  // If original blob is well within limits (< 9.2 MB)
  if (sourceBlob.size <= maxSizeBytes) {
    return {
      blob: sourceBlob,
      filename: `map_${Date.now()}.png`,
      mimeType: sourceBlob.type || 'image/png',
      wasCompressed: false,
    };
  }

  // Optimize image via Canvas conversion to high-quality JPEG
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(sourceBlob);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement('canvas');
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Limit max dimension to 4096px if unreasonably huge to ensure compatibility
      const maxDim = 4096;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        resolve({
          blob: sourceBlob,
          filename: `map_${Date.now()}.png`,
          mimeType: sourceBlob.type || 'image/png',
          wasCompressed: false,
        });
        return;
      }

      // White background for JPEG conversion
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Try High Quality JPEG (0.92) first
      canvas.toBlob(
        (jpegBlob) => {
          if (jpegBlob && jpegBlob.size < maxSizeBytes) {
            resolve({
              blob: jpegBlob,
              filename: `map_${Date.now()}.jpg`,
              mimeType: 'image/jpeg',
              wasCompressed: true,
            });
            return;
          }

          // If still over 9.5MB (rare for JPEG), compress with 0.85
          canvas.toBlob(
            (secondBlob) => {
              if (secondBlob) {
                resolve({
                  blob: secondBlob,
                  filename: `map_${Date.now()}.jpg`,
                  mimeType: 'image/jpeg',
                  wasCompressed: true,
                });
              } else {
                resolve({
                  blob: sourceBlob,
                  filename: `map_${Date.now()}.png`,
                  mimeType: sourceBlob.type || 'image/png',
                  wasCompressed: false,
                });
              }
            },
            'image/jpeg',
            0.85
          );
        },
        'image/jpeg',
        0.92
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        blob: sourceBlob,
        filename: `map_${Date.now()}.png`,
        mimeType: sourceBlob.type || 'image/png',
        wasCompressed: false,
      });
    };

    img.src = objectUrl;
  });
}
