# UAMapper HD Export v2

## Що виправлено

Попередня версія могла давати мильний результат через дві причини:

1. native Visicom SVG background міг отримувати `blur(2px)` через `blurMapOnExport`;
2. при помилці native fragment exporter тихо повертався до 256px Leaflet tiles.

У v2:

- native Visicom SVG background **ніколи не розмивається**;
- PNG export для Visicom **не робить silent fallback** на Leaflet tiles;
- Visicom source zoom округлюється до цілого рівня;
- після успішного завантаження в console пишеться діагностика:
  - source zoom;
  - source pixel size;
  - кількість SVG-фрагментів;
  - export scale;
- UI статус показує `HD Visicom: ...` під час експорту;
- при помилці UI показує реальну причину замість загального `Export failed`.

Visicom офіційно підтримує Fragment API у SVG/PDF/PNG/JPG, максимум `2048×2048`, zoom `0–19`, тому схема `+2 zoom → фрагменти 2048 → складання viewport` відповідає можливостям API.

## Важливо

Якщо після v2 з'явиться повідомлення на кшталт:

`HD експорт не вдався: Visicom fragment HTTP 401/403`

або CORS/network error — це означає, що проблема вже не в rasterization, а в доступі до Visicom Fragment API. У такому разі треба перевірити Visicom key/referrer.

## Перевірка

У браузері при експорті відкрий DevTools → Console. Повинно з'явитися:

```text
[UAMapper HD Export] Visicom SVG background loaded
```

з `sourceZoom`, `sourceWidth`, `sourceHeight` та `fragments`.
