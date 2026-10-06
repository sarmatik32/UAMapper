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
