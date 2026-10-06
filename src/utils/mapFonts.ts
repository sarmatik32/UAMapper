import { MapFontFamily, MapFontConfig } from '../types';

export const MAP_FONT_CONFIGS: MapFontConfig[] = [
  {
    id: 'inter',
    name: 'Inter',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    previewText: 'Кривий Ріг • Саксаганський р-н',
    descriptionUa: 'Найчіткіший та найстабільніший для мапи. Оптимізована кирилиця без розмиття.',
    descriptionEn: 'Ultra-crisp & stable for maps. Cyrillic geometric hinting prevents zoom blur.',
  },
  {
    id: 'plus-jakarta',
    name: 'Plus Jakarta Sans',
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    previewText: 'Кривий Ріг • Саксаганський р-н',
    descriptionUa: 'Сучасний відкритий шрифт з високою контрастністю.',
    descriptionEn: 'Modern open geometric font with great high-contrast clarity.',
  },
  {
    id: 'montserrat',
    name: 'Montserrat',
    fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    previewText: 'Кривий Ріг • Саксаганський р-н',
    descriptionUa: 'Геометричний та виразний акцентний шрифт.',
    descriptionEn: 'Punchy geometric display sans with distinct curves.',
  },
  {
    id: 'ubuntu',
    name: 'Ubuntu',
    fontFamily: "'Ubuntu', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    previewText: 'Кривий Ріг • Саксаганський р-н',
    descriptionUa: 'Округлий, контрастний та впізнаваний шрифт.',
    descriptionEn: 'Rounded, distinctive font with great legibility.',
  },
  {
    id: 'jetbrains-mono',
    name: 'JetBrains Mono',
    fontFamily: "'JetBrains Mono', 'SF Mono', ui-monospace, monospace",
    previewText: 'Кривий Ріг • Саксаганський р-н',
    descriptionUa: 'Тактичний моноширинний шрифт для точних координат і міток.',
    descriptionEn: 'Tactical monospaced font for coordinates and telemetry.',
  },
  {
    id: 'system',
    name: 'System UI',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    previewText: 'Кривий Ріг • Саксаганський р-н',
    descriptionUa: 'Рідний системний шрифт вашого пристрою (SF Pro / Segoe UI / Roboto).',
    descriptionEn: 'Native operating system font with hardware acceleration.',
  },
];

export function getMapFontFamilyCss(fontId?: MapFontFamily | string): string {
  const found = MAP_FONT_CONFIGS.find(f => f.id === fontId);
  return found ? found.fontFamily : MAP_FONT_CONFIGS[0].fontFamily;
}

const inMemoryFontCache = new Map<string, string>();
const pendingFontLoads = new Map<string, Promise<string>>();

const GOOGLE_FONT_URLS: Record<string, string> = {
  'inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap&subset=cyrillic,cyrillic-ext',
  'plus-jakarta': 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap&subset=cyrillic,cyrillic-ext',
  'montserrat': 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap&subset=cyrillic,cyrillic-ext',
  'ubuntu': 'https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap&subset=cyrillic,cyrillic-ext',
  'jetbrains-mono': 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap&subset=cyrillic,cyrillic-ext',
};

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function buildOverrideCssRules(fontFamily: string): string {
  return `
    #map-stage-wrapper,
    #map-stage-wrapper *,
    .tactical-logo-container,
    .tactical-logo-container *,
    .tactical-logo-title,
    .tactical-logo-author,
    .tactical-legend-container,
    .tactical-legend-container *,
    .tactical-legend-wrapper,
    .tactical-legend-text,
    #map-legend-widget-container,
    #map-legend-widget-container *,
    .leaflet-container,
    .leaflet-container *,
    .settlement-label-marker,
    .settlement-label-marker *,
    .custom-leaflet-div-icon,
    .custom-leaflet-div-icon *,
    .leaflet-marker-icon,
    .leaflet-popup,
    .leaflet-popup *,
    .leaflet-tooltip,
    .map-measurement-badge,
    .exporting-map,
    .exporting-map * {
      font-family: ${fontFamily} !important;
    }
  `;
}

/**
 * Retrieves an embedded @font-face CSS bundle with inlined base64 fonts
 * for crystal-clear font rendering during clipboard copy (buffer) and PNG export.
 */
export async function getFontEmbedCSS(fontId?: MapFontFamily | string): Promise<string> {
  const validFontId = fontId || 'inter';
  const fontConfig = MAP_FONT_CONFIGS.find(f => f.id === validFontId) || MAP_FONT_CONFIGS[0];
  const baseOverrideCss = buildOverrideCssRules(fontConfig.fontFamily);

  if (validFontId === 'system') {
    return baseOverrideCss;
  }

  // Check in-memory cache
  if (inMemoryFontCache.has(validFontId)) {
    return `${inMemoryFontCache.get(validFontId)}\n${baseOverrideCss}`;
  }

  // Check sessionStorage
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const stored = window.sessionStorage.getItem(`uamapper_font_embed_${validFontId}`);
      if (stored) {
        inMemoryFontCache.set(validFontId, stored);
        return `${stored}\n${baseOverrideCss}`;
      }
    } catch (_) {}
  }

  // Check if an existing fetch is already in flight
  if (pendingFontLoads.has(validFontId)) {
    return pendingFontLoads.get(validFontId)!;
  }

  const loadPromise = (async () => {
    const googleCssUrl = GOOGLE_FONT_URLS[validFontId];
    if (!googleCssUrl) return baseOverrideCss;

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = setTimeout(() => {
      controller?.abort();
    }, 4000);

    try {
      const res = await fetch(googleCssUrl, {
        signal: controller ? controller.signal : undefined,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const cssText = await res.text();

      // Extract @font-face blocks
      const fontFaceRegex = /@font-face\s*\{[^}]+\}/g;
      const allBlocks = cssText.match(fontFaceRegex) || [];

      // Filter blocks: keep cyrillic, cyrillic-ext, and latin subsets
      const neededBlocks = allBlocks.filter(b => 
        b.includes('0400-045F') || // cyrillic
        b.includes('0460-052F') || // cyrillic-ext
        b.includes('0000-00FF') || // latin
        (!b.includes('unicode-range')) // general
      );

      const targetBlocks = neededBlocks.length > 0 ? neededBlocks : allBlocks;

      // Concurrently fetch woff2 files and convert to base64
      const embeddedBlocks = await Promise.all(
        targetBlocks.map(async (block) => {
          const urlMatch = block.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/);
          if (!urlMatch) return block;
          const fontFileUrl = urlMatch[1];
          try {
            const fontRes = await fetch(fontFileUrl);
            if (!fontRes.ok) return block;
            const blob = await fontRes.blob();
            const dataUrl = await blobToDataUrl(blob);
            return block.replace(fontFileUrl, dataUrl);
          } catch {
            return block;
          }
        })
      );

      const fullFontFaceCss = embeddedBlocks.join('\n');
      inMemoryFontCache.set(validFontId, fullFontFaceCss);

      if (typeof window !== 'undefined' && window.sessionStorage) {
        try {
          window.sessionStorage.setItem(`uamapper_font_embed_${validFontId}`, fullFontFaceCss);
        } catch (_) {}
      }

      return `${fullFontFaceCss}\n${baseOverrideCss}`;
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn(`[mapFonts] Could not fetch font embed CSS for ${validFontId}:`, err);
      return baseOverrideCss;
    } finally {
      pendingFontLoads.delete(validFontId);
    }
  })();

  pendingFontLoads.set(validFontId, loadPromise);
  return loadPromise;
}

/**
 * Proactively preloads the font embed CSS in the background so that
 * when the user triggers a clipboard copy (buffer) or PNG export,
 * the base64 font rules are resolved in 0ms.
 */
export function preloadFontEmbedCSS(fontId?: MapFontFamily | string): void {
  if (!fontId || fontId === 'system' || typeof window === 'undefined') return;
  getFontEmbedCSS(fontId).catch(() => {});
}

