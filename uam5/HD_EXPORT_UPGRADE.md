# UAMapper — HD Export Upgrade

Цей архів уже містить внесені зміни у `src/components/MapContainer.tsx`.

## Що зроблено

1. **Visicom source zoom до +2**
   - export більше не бере картографію тільки на поточному zoom;
   - при zoom 13 може запитувати Visicom на zoom 15;
   - geographic viewport залишається тим самим.

2. **Фрагменти не перевищують 2048×2048**
   - API limit не порушується;
   - source fragments розкладаються назад у CSS viewport.

3. **4096 px minimum export width**
   - PNG export тепер орієнтується на 4K-class output;
   - існуючий cap 8000 px збережений.

4. **SVG rendering hints**
   - `shape-rendering` / `text-rendering` / image rendering залишені максимально сприятливими для sharp output.

## Важливо

Це перший великий крок до якості з референсних скріншотів. Найбільший приріст дає не сам `pixelRatio`, а **запит картографічної основи на вищому source zoom**.

Повністю vector-only export для всіх HTML markers і labels можна робити окремим етапом, але цей варіант уже сумісний із поточною архітектурою UAMapper і не вимагає переписувати всі шари.

## Перевірка

У корені проекту:

```bash
npm install
npm run build
```

Потім:

- відкрий UAMapper;
- зроби Export PNG;
- порівняй дрібні дороги, підписи та межі при 100–200% zoom у редакторі з попереднім PNG.

