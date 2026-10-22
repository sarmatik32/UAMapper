import React from 'react';

// Definitions of beautiful vector icons
// Local, numbered PNG silhouettes supplied in the MonitorWar archive.
export const MONITORWAR_ICON_ASSETS: Record<string, string> = {
  'monitorwar-target': '/img/monitorwar-icons/001.png',
  'monitorwar-aircraft-1': '/img/monitorwar-icons/002.png',
  'monitorwar-aircraft-2': '/img/monitorwar-icons/003.png',
  'monitorwar-aircraft-3': '/img/monitorwar-icons/004.png',
  'monitorwar-aircraft-4': '/img/monitorwar-icons/005.png',
  'monitorwar-aircraft-5': '/img/monitorwar-icons/006.png',
  'monitorwar-aircraft-6': '/img/monitorwar-icons/007.png',
  'monitorwar-aircraft-7': '/img/monitorwar-icons/008.png',
  'monitorwar-aircraft-8': '/img/monitorwar-icons/009.png',
  'monitorwar-aircraft-9': '/img/monitorwar-icons/010.png',
  'monitorwar-aircraft-10': '/img/monitorwar-icons/011.png',
  'monitorwar-aircraft-11': '/img/monitorwar-icons/012.png',
  'monitorwar-aircraft-12': '/img/monitorwar-icons/013.png',
  'monitorwar-drone-1': '/img/monitorwar-icons/014.png',
  'monitorwar-drone-2': '/img/monitorwar-icons/015.png',
  'monitorwar-drone-3': '/img/monitorwar-icons/016.png',
  'monitorwar-drone-4': '/img/monitorwar-icons/017.png',
  'monitorwar-drone-5': '/img/monitorwar-icons/018.png',
  'monitorwar-drone-6': '/img/monitorwar-icons/019.png',
  'monitorwar-drone-7': '/img/monitorwar-icons/020.png',
  'monitorwar-drone-8': '/img/monitorwar-icons/021.png',
  'monitorwar-drone-9': '/img/monitorwar-icons/022.png',
  'monitorwar-drone-10': '/img/monitorwar-icons/023.png',
  'monitorwar-drone-11': '/img/monitorwar-icons/024.png',
  'monitorwar-drone-12': '/img/monitorwar-icons/025.png',
  'monitorwar-drone-13': '/img/monitorwar-icons/026.png',
  'monitorwar-aircraft-13': '/img/monitorwar-icons/027.png',
  'monitorwar-aircraft-14': '/img/monitorwar-icons/028.png',
  'monitorwar-aircraft-15': '/img/monitorwar-icons/029.png',
  'monitorwar-aircraft-16': '/img/monitorwar-icons/030.png',
  'monitorwar-aircraft-17': '/img/monitorwar-icons/031.png',
  'monitorwar-aircraft-18': '/img/monitorwar-icons/032.png',
  'monitorwar-aircraft-19': '/img/monitorwar-icons/033.png',
  'monitorwar-missile-1': '/img/monitorwar-icons/034.png',
  'monitorwar-aircraft-20': '/img/monitorwar-icons/035.png',
  'monitorwar-missile-2': '/img/monitorwar-icons/036.png',
  'monitorwar-missile-3': '/img/monitorwar-icons/037.png',
  'monitorwar-missile-4': '/img/monitorwar-icons/038.png',
  'monitorwar-missile-5': '/img/monitorwar-icons/039.png',
  'monitorwar-missile-6': '/img/monitorwar-icons/040.png',
  'monitorwar-missile-7': '/img/monitorwar-icons/041.png',
  'monitorwar-missile-8': '/img/monitorwar-icons/042.png',
  'monitorwar-missile-9': '/img/monitorwar-icons/043.png',
  'monitorwar-missile-10': '/img/monitorwar-icons/044.png',
  'monitorwar-aircraft-21': '/img/monitorwar-icons/045.png',
  'monitorwar-aircraft-22': '/img/monitorwar-icons/046.png',
  'monitorwar-ship-1': '/img/monitorwar-icons/047.png',
  'monitorwar-ship-2': '/img/monitorwar-icons/048.png',
  'monitorwar-ground-1': '/img/monitorwar-icons/049.png',
  'monitorwar-ground-2': '/img/monitorwar-icons/050.png',
  'monitorwar-ground-3': '/img/monitorwar-icons/051.png',
  'monitorwar-ground-4': '/img/monitorwar-icons/052.png',
  'monitorwar-ground-5': '/img/monitorwar-icons/053.png',
  'monitorwar-ground-6': '/img/monitorwar-icons/054.png',
  'monitorwar-ground-7': '/img/monitorwar-icons/055.png',
  'monitorwar-ground-8': '/img/monitorwar-icons/056.png',
  'monitorwar-ground-9': '/img/monitorwar-icons/057.png',
  'monitorwar-ground-10': '/img/monitorwar-icons/058.png',
  'monitorwar-ground-11': '/img/monitorwar-icons/059.png',
  'monitorwar-ground-12': '/img/monitorwar-icons/060.png',
  'monitorwar-ground-13': '/img/monitorwar-icons/061.png',
  'monitorwar-ground-14': '/img/monitorwar-icons/062.png',
  'monitorwar-aircraft-23': '/img/monitorwar-icons/063.png',
  'monitorwar-aircraft-24': '/img/monitorwar-icons/064.png',
  'monitorwar-aircraft-25': '/img/monitorwar-icons/065.png',
  'monitorwar-aircraft-26': '/img/monitorwar-icons/066.png',
  'monitorwar-aircraft-27': '/img/monitorwar-icons/067.png',
  'monitorwar-aircraft-28': '/img/monitorwar-icons/068.png',
  'monitorwar-missile-11': '/img/monitorwar-icons/069.png',
  'monitorwar-missile-12': '/img/monitorwar-icons/070.png',
  'monitorwar-drone-14': '/img/monitorwar-icons/071.png',
  'monitorwar-drone-15': '/img/monitorwar-icons/072.png',
  'monitorwar-drone-16': '/img/monitorwar-icons/073.png',
  'monitorwar-drone-17': '/img/monitorwar-icons/074.png',
  'monitorwar-drone-18': '/img/monitorwar-icons/075.png',
  'monitorwar-drone-19': '/img/monitorwar-icons/076.png',
  'monitorwar-drone-20': '/img/monitorwar-icons/077.png',
  'monitorwar-ua-symbol-1': '/img/monitorwar-icons/078.png',
  'monitorwar-ua-symbol-2': '/img/monitorwar-icons/079.png',
  'monitorwar-naval-symbol': '/img/monitorwar-icons/080.png',
  'monitorwar-warning': '/img/monitorwar-icons/081.png',
  'monitorwar-location': '/img/monitorwar-icons/082.png',
  'monitorwar-time': '/img/monitorwar-icons/083.png',
  'monitorwar-explosion': '/img/monitorwar-icons/084.png',
  'monitorwar-lightning': '/img/monitorwar-icons/085.png',
  'monitorwar-arrow-right': '/img/monitorwar-icons/086.png',
  'monitorwar-turn-back': '/img/monitorwar-icons/087.png',
  'monitorwar-rotate': '/img/monitorwar-icons/088.png',
  'monitorwar-close': '/img/monitorwar-icons/089.png',
  'monitorwar-add': '/img/monitorwar-icons/090.png',
};

export const MONITORWAR_ICON_TYPES = [
  { id: 'monitorwar-target', nameUa: 'Радар / приціл', nameEn: 'Radar / target' },
  { id: 'monitorwar-aircraft-1', nameUa: 'Літак 1', nameEn: 'Aircraft 1' },
  { id: 'monitorwar-aircraft-2', nameUa: 'Літак 2', nameEn: 'Aircraft 2' },
  { id: 'monitorwar-aircraft-3', nameUa: 'Літак 3', nameEn: 'Aircraft 3' },
  { id: 'monitorwar-aircraft-4', nameUa: 'Літак 4', nameEn: 'Aircraft 4' },
  { id: 'monitorwar-aircraft-5', nameUa: 'Літак 5', nameEn: 'Aircraft 5' },
  { id: 'monitorwar-aircraft-6', nameUa: 'Літак 6', nameEn: 'Aircraft 6' },
  { id: 'monitorwar-aircraft-7', nameUa: 'Літак 7', nameEn: 'Aircraft 7' },
  { id: 'monitorwar-aircraft-8', nameUa: 'Літак 8', nameEn: 'Aircraft 8' },
  { id: 'monitorwar-aircraft-9', nameUa: 'Літак 9', nameEn: 'Aircraft 9' },
  { id: 'monitorwar-aircraft-10', nameUa: 'Літак 10', nameEn: 'Aircraft 10' },
  { id: 'monitorwar-aircraft-11', nameUa: 'Літак 11', nameEn: 'Aircraft 11' },
  { id: 'monitorwar-aircraft-12', nameUa: 'Літак 12', nameEn: 'Aircraft 12' },
  { id: 'monitorwar-drone-1', nameUa: 'Дрон 1', nameEn: 'Drone 1' },
  { id: 'monitorwar-drone-2', nameUa: 'Дрон 2', nameEn: 'Drone 2' },
  { id: 'monitorwar-drone-3', nameUa: 'Дрон 3', nameEn: 'Drone 3' },
  { id: 'monitorwar-drone-4', nameUa: 'Дрон 4', nameEn: 'Drone 4' },
  { id: 'monitorwar-drone-5', nameUa: 'Дрон 5', nameEn: 'Drone 5' },
  { id: 'monitorwar-drone-6', nameUa: 'Дрон 6', nameEn: 'Drone 6' },
  { id: 'monitorwar-drone-7', nameUa: 'Дрон 7', nameEn: 'Drone 7' },
  { id: 'monitorwar-drone-8', nameUa: 'Дрон 8', nameEn: 'Drone 8' },
  { id: 'monitorwar-drone-9', nameUa: 'Дрон 9', nameEn: 'Drone 9' },
  { id: 'monitorwar-drone-10', nameUa: 'Дрон 10', nameEn: 'Drone 10' },
  { id: 'monitorwar-drone-11', nameUa: 'Дрон 11', nameEn: 'Drone 11' },
  { id: 'monitorwar-drone-12', nameUa: 'Дрон 12', nameEn: 'Drone 12' },
  { id: 'monitorwar-drone-13', nameUa: 'Дрон 13', nameEn: 'Drone 13' },
  { id: 'monitorwar-aircraft-13', nameUa: 'Літак 13', nameEn: 'Aircraft 13' },
  { id: 'monitorwar-aircraft-14', nameUa: 'Літак 14', nameEn: 'Aircraft 14' },
  { id: 'monitorwar-aircraft-15', nameUa: 'Літак 15', nameEn: 'Aircraft 15' },
  { id: 'monitorwar-aircraft-16', nameUa: 'Літак 16', nameEn: 'Aircraft 16' },
  { id: 'monitorwar-aircraft-17', nameUa: 'Літак 17', nameEn: 'Aircraft 17' },
  { id: 'monitorwar-aircraft-18', nameUa: 'Літак 18', nameEn: 'Aircraft 18' },
  { id: 'monitorwar-aircraft-19', nameUa: 'Літак 19', nameEn: 'Aircraft 19' },
  { id: 'monitorwar-missile-1', nameUa: 'Ракета 1', nameEn: 'Missile 1' },
  { id: 'monitorwar-aircraft-20', nameUa: 'Літак 20', nameEn: 'Aircraft 20' },
  { id: 'monitorwar-missile-2', nameUa: 'Ракета 2', nameEn: 'Missile 2' },
  { id: 'monitorwar-missile-3', nameUa: 'Ракета 3', nameEn: 'Missile 3' },
  { id: 'monitorwar-missile-4', nameUa: 'Ракета 4', nameEn: 'Missile 4' },
  { id: 'monitorwar-missile-5', nameUa: 'Ракета 5', nameEn: 'Missile 5' },
  { id: 'monitorwar-missile-6', nameUa: 'Ракета 6', nameEn: 'Missile 6' },
  { id: 'monitorwar-missile-7', nameUa: 'Ракета 7', nameEn: 'Missile 7' },
  { id: 'monitorwar-missile-8', nameUa: 'Ракета 8', nameEn: 'Missile 8' },
  { id: 'monitorwar-missile-9', nameUa: 'Ракета 9', nameEn: 'Missile 9' },
  { id: 'monitorwar-missile-10', nameUa: 'Ракета 10', nameEn: 'Missile 10' },
  { id: 'monitorwar-aircraft-21', nameUa: 'Літак 21', nameEn: 'Aircraft 21' },
  { id: 'monitorwar-aircraft-22', nameUa: 'Літак 22', nameEn: 'Aircraft 22' },
  { id: 'monitorwar-ship-1', nameUa: 'Корабель 1', nameEn: 'Ship 1' },
  { id: 'monitorwar-ship-2', nameUa: 'Корабель 2', nameEn: 'Ship 2' },
  { id: 'monitorwar-ground-1', nameUa: 'Наземна техніка 1', nameEn: 'Ground vehicle 1' },
  { id: 'monitorwar-ground-2', nameUa: 'Наземна техніка 2', nameEn: 'Ground vehicle 2' },
  { id: 'monitorwar-ground-3', nameUa: 'Наземна техніка 3', nameEn: 'Ground vehicle 3' },
  { id: 'monitorwar-ground-4', nameUa: 'Наземна техніка 4', nameEn: 'Ground vehicle 4' },
  { id: 'monitorwar-ground-5', nameUa: 'Наземна техніка 5', nameEn: 'Ground vehicle 5' },
  { id: 'monitorwar-ground-6', nameUa: 'Наземна техніка 6', nameEn: 'Ground vehicle 6' },
  { id: 'monitorwar-ground-7', nameUa: 'Наземна техніка 7', nameEn: 'Ground vehicle 7' },
  { id: 'monitorwar-ground-8', nameUa: 'Наземна техніка 8', nameEn: 'Ground vehicle 8' },
  { id: 'monitorwar-ground-9', nameUa: 'Наземна техніка 9', nameEn: 'Ground vehicle 9' },
  { id: 'monitorwar-ground-10', nameUa: 'Наземна техніка 10', nameEn: 'Ground vehicle 10' },
  { id: 'monitorwar-ground-11', nameUa: 'Наземна техніка 11', nameEn: 'Ground vehicle 11' },
  { id: 'monitorwar-ground-12', nameUa: 'Наземна техніка 12', nameEn: 'Ground vehicle 12' },
  { id: 'monitorwar-ground-13', nameUa: 'Наземна техніка 13', nameEn: 'Ground vehicle 13' },
  { id: 'monitorwar-ground-14', nameUa: 'Наземна техніка 14', nameEn: 'Ground vehicle 14' },
  { id: 'monitorwar-aircraft-23', nameUa: 'Літак 23', nameEn: 'Aircraft 23' },
  { id: 'monitorwar-aircraft-24', nameUa: 'Літак 24', nameEn: 'Aircraft 24' },
  { id: 'monitorwar-aircraft-25', nameUa: 'Літак 25', nameEn: 'Aircraft 25' },
  { id: 'monitorwar-aircraft-26', nameUa: 'Літак 26', nameEn: 'Aircraft 26' },
  { id: 'monitorwar-aircraft-27', nameUa: 'Літак 27', nameEn: 'Aircraft 27' },
  { id: 'monitorwar-aircraft-28', nameUa: 'Літак 28', nameEn: 'Aircraft 28' },
  { id: 'monitorwar-missile-11', nameUa: 'Ракета 11', nameEn: 'Missile 11' },
  { id: 'monitorwar-missile-12', nameUa: 'Ракета 12', nameEn: 'Missile 12' },
  { id: 'monitorwar-drone-14', nameUa: 'Дрон 14', nameEn: 'Drone 14' },
  { id: 'monitorwar-drone-15', nameUa: 'Дрон 15', nameEn: 'Drone 15' },
  { id: 'monitorwar-drone-16', nameUa: 'Дрон 16', nameEn: 'Drone 16' },
  { id: 'monitorwar-drone-17', nameUa: 'Дрон 17', nameEn: 'Drone 17' },
  { id: 'monitorwar-drone-18', nameUa: 'Дрон 18', nameEn: 'Drone 18' },
  { id: 'monitorwar-drone-19', nameUa: 'Дрон 19', nameEn: 'Drone 19' },
  { id: 'monitorwar-drone-20', nameUa: 'Дрон 20', nameEn: 'Drone 20' },
  { id: 'monitorwar-ua-symbol-1', nameUa: 'Тризуб 1', nameEn: 'Trident 1' },
  { id: 'monitorwar-ua-symbol-2', nameUa: 'Тризуб 2', nameEn: 'Trident 2' },
  { id: 'monitorwar-naval-symbol', nameUa: 'Військово-морський символ', nameEn: 'Naval insignia' },
  { id: 'monitorwar-warning', nameUa: 'Увага', nameEn: 'Warning' },
  { id: 'monitorwar-location', nameUa: 'Місце', nameEn: 'Location' },
  { id: 'monitorwar-time', nameUa: 'Час', nameEn: 'Time' },
  { id: 'monitorwar-explosion', nameUa: 'Вибух', nameEn: 'Explosion' },
  { id: 'monitorwar-lightning', nameUa: 'Блискавка', nameEn: 'Lightning' },
  { id: 'monitorwar-arrow-right', nameUa: 'Стрілка праворуч', nameEn: 'Arrow right' },
  { id: 'monitorwar-turn-back', nameUa: 'Повернення', nameEn: 'Turn back' },
  { id: 'monitorwar-rotate', nameUa: 'Обертання', nameEn: 'Rotate' },
  { id: 'monitorwar-close', nameUa: 'Закрити', nameEn: 'Close' },
  { id: 'monitorwar-add', nameUa: 'Додати', nameEn: 'Add' },
];

export const ICON_TYPES = [
  { id: 'uav-recon', nameUa: 'БПЛА Розвідник 🛩️', nameEn: 'Recon UAV 🛩️' },
  { id: 'standard-aircraft', nameUa: 'Літак — стандарт', nameEn: 'Aircraft — standard' },
  { id: 'standard-symbol-2', nameUa: 'Іконка 2 — стандарт', nameEn: 'Symbol 2 — standard' },
  { id: 'uav-kamikaze', nameUa: 'БПЛА-Камікадзе ⚡', nameEn: 'Kamikaze UAV ⚡' },
  { id: 'uav-strike', nameUa: 'Ударний БПЛА 💥', nameEn: 'Strike UAV 💥' },
  { id: 'uav-flyingwing', nameUa: 'БПЛА "Летюче Крило" 🦅', nameEn: 'Stealth Flying Wing 🦅' },
  { id: 'missile-cruise', nameUa: 'Крилата Ракета 🚀', nameEn: 'Cruise Missile 🚀' },
  { id: 'missile-ballistic', nameUa: 'Балістична Ракета 🎯', nameEn: 'Ballistic Missile 🎯' },
  { id: 'bomb-air', nameUa: 'Авіабомба 💣', nameEn: 'Aerial Bomb 💣' },
  { id: 'target', nameUa: 'Ціль', nameEn: 'Target' },
  { id: 'explosion', nameUa: 'Вибух 💥', nameEn: 'Explosion 💥' },
  { id: 'warning', nameUa: 'Увага', nameEn: 'Warning' },
  { id: 'pin', nameUa: 'Шпилька', nameEn: 'Location Pin' },
  { id: 'arrow', nameUa: 'Стрілка (напрямок)', nameEn: 'Arrow (Direction)' },
  { id: 'car', nameUa: 'Легкове авто', nameEn: 'Car' },
  { id: 'truck', nameUa: 'Вантажівка', nameEn: 'Truck' },
  { id: 'plane', nameUa: 'Літак', nameEn: 'Airplane' },
  { id: 'boat', nameUa: 'Корабель', nameEn: 'Ship/Boat' },
  { id: 'person', nameUa: 'Пішохід', nameEn: 'Pedestrian' },
  { id: 'drone', nameUa: 'Квадрокоптер', nameEn: 'Quadcopter' },
  { id: 'star', nameUa: 'Зірка', nameEn: 'Star' },
  { id: 'circle', nameUa: 'Точка', nameEn: 'Point' },
];

export const PRESET_COLORS = [
  { nameUa: 'Червоний', nameEn: 'Red', hex: '#ef4444' },
  { nameUa: 'Помаранчевий', nameEn: 'Orange', hex: '#f97316' },
  { nameUa: 'Жовтий', nameEn: 'Yellow', hex: '#eab308' },
  { nameUa: 'Зелений', nameEn: 'Green', hex: '#22c55e' },
  { nameUa: 'Блакитний', nameEn: 'Teal', hex: '#06b6d4' },
  { nameUa: 'Синій', nameEn: 'Blue', hex: '#3b82f6' },
  { nameUa: 'Фіолетовий', nameEn: 'Purple', hex: '#a855f7' },
  { nameUa: 'Рожевий', nameEn: 'Pink', hex: '#ec4899' },
  { nameUa: 'Чорний', nameEn: 'Black', hex: '#1e293b' },
  { nameUa: 'Білий', nameEn: 'White', hex: '#ffffff' },
];

const svgCache = new Map<string, string>();

function buildIconSvgContent(type: string, fill: string, stroke: string, strokeWidth: string): string {
  const archiveAsset = MONITORWAR_ICON_ASSETS[type];
  if (archiveAsset) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-full h-full" aria-hidden="true">
        <image href="${archiveAsset}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet" />
      </svg>
    `;
  }
  switch (type) {
    case 'standard-aircraft':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" class="w-full h-full">
          <image href="/img/aircraft.png" x="0" y="0" width="128" height="128" preserveAspectRatio="xMidYMid meet" />
        </svg>
      `;
    case 'standard-symbol-2':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-full h-full">
          <image href="/img/icon2.png" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet" />
        </svg>
      `;
    case 'uav-recon':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" class="w-full h-full">
          <path d="M 12 3 C 11.3 3 10.7 4 10.7 7 L 10.7 9 L 2 9 C 1 9 1 11 2 11 L 10.7 11 L 10.7 18 L 8 18 C 7.5 18 7.5 19 8 19 L 16 19 C 16.5 19 16.5 18 16 18 L 13.3 18 L 13.3 11 L 22 11 C 23 11 23 9 22 9 L 13.3 9 L 13.3 7 C 13.3 4 12.7 3 12 3 Z"/>
        </svg>
      `;
    case 'uav-kamikaze':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" class="w-full h-full">
          <path d="M 12 2 L 2 17 L 2 21 L 3.5 21 L 3.5 18.5 L 12 16 L 20.5 18.5 L 20.5 21 L 22 21 L 22 17 Z" />
        </svg>
      `;
    case 'uav-strike':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" class="w-full h-full">
          <path d="M 12 2 C 11.2 2 10.5 3.5 10.5 7 L 10.5 10 L 1 10 C 0.5 10 0.5 11 1 11 L 10.5 11 L 10.5 16 L 7.5 19.5 L 8.5 20.5 L 12 18 L 15.5 20.5 L 16.5 19.5 L 13.5 16 L 13.5 11 L 23 11 C 23.5 11 23.5 10 23 10 L 13.5 10 L 13.5 7 C 13.5 3.5 12.8 2 12 2 Z"/>
          <rect x="5.5" y="8" width="1.5" height="4.5" rx="0.5" fill="${stroke}" stroke="${stroke}" stroke-width="0.5" />
          <rect x="17" y="8" width="1.5" height="4.5" rx="0.5" fill="${stroke}" stroke="${stroke}" stroke-width="0.5" />
        </svg>
      `;
    case 'uav-flyingwing':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" class="w-full h-full">
          <path d="M 12 4 L 22 13 L 18 15 L 15 14 L 12 16 L 9 14 L 6 15 L 2 13 Z"/>
        </svg>
      `;
    case 'missile-cruise':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" class="w-full h-full">
          <path d="M 12 2 C 10.5 2 9.5 4 9.5 7 L 9.5 10 L 3 13 L 3 14 L 9.5 12 L 9.5 19 L 7 21 L 7 22 L 12 21 L 17 22 L 17 21 L 14.5 19 L 14.5 12 L 21 14 L 21 13 L 14.5 10 L 14.5 7 C 14.5 4 13.5 2 12 2 Z" />
        </svg>
      `;
    case 'missile-ballistic':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" class="w-full h-full">
          <path d="M 12 1 C 11.3 1 10.5 3 10.5 5 L 10.5 7 L 8 8 L 8 9 L 10.5 9 L 10.5 17 L 6 19 L 6 21 L 10.5 21 L 10.5 23 L 13.5 23 L 13.5 21 L 18 21 L 18 19 L 13.5 17 L 13.5 9 L 16 9 L 16 8 L 13.5 7 L 13.5 5 C 13.5 3 12.7 1 12 1 Z" />
        </svg>
      `;
    case 'bomb-air':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" class="w-full h-full">
          <path d="M 12 2 C 9.5 2 8 4 8 9 L 8 15 C 8 17 6.5 18 5.5 19 L 5.5 21 L 9.5 21 L 10.5 18.5 L 13.5 18.5 L 14.5 21 L 18.5 21 L 18.5 19 C 17.5 18 16 17 16 15 L 16 9 C 16 4 14.5 2 12 2 Z" />
        </svg>
      `;
    case 'circle':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" class="w-full h-full">
          <circle cx="12" cy="12" r="8"/>
        </svg>
      `;
    case 'square':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" class="w-full h-full">
          <rect x="4" y="4" width="16" height="16" rx="2"/>
        </svg>
      `;
    case 'triangle':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" class="w-full h-full">
          <polygon points="12,3 3,20 21,20"/>
        </svg>
      `;
    case 'arrow':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" class="w-full h-full">
          <polygon points="12,3 4,21 12,17 20,21"/>
        </svg>
      `;
    case 'pin':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="1.5" class="w-full h-full">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      `;
    case 'car':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="1.5" class="w-full h-full">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-5h14v5z"/>
          <circle cx="7.5" cy="14.5" r="1.5" fill="${stroke}"/>
          <circle cx="16.5" cy="14.5" r="1.5" fill="${stroke}"/>
        </svg>
      `;
    case 'truck':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="1.5" class="w-full h-full">
          <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm12 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm2-5.5h-3V9h3v4z"/>
        </svg>
      `;
    case 'plane':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="1" class="w-full h-full">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5l7 2.5z"/>
        </svg>
      `;
    case 'boat':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="1.5" class="w-full h-full">
          <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v-2h2c1.02 0 1.85-.51 2.63-1.14l.05-.04 1.4-1.17c1.47-1.23 3.44-1.9 5.42-1.9s3.95.67 5.42 1.9l1.4 1.17.05.04c.78.63 1.61 1.14 2.63 1.14h2v2h-2zM20 11l-3.32-4.43C16.32 6.13 15.7 5.8 15.05 5.8H12V3h-2v2.8H7l-3 4.2V14h16v-3z"/>
        </svg>
      `;
    case 'person':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="1.5" class="w-full h-full">
          <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/>
        </svg>
      `;
    case 'drone':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full">
          <circle cx="12" cy="12" r="3" fill="${fill}" stroke="${stroke}" stroke-width="1"/>
          <path d="M12 2v7M12 15v7M2 12h7M15 12h7" stroke="${stroke}" stroke-width="2"/>
          <circle cx="12" cy="2" r="1.5" fill="${stroke}" stroke="${stroke}"/>
          <circle cx="12" cy="22" r="1.5" fill="${stroke}" stroke="${stroke}"/>
          <circle cx="2" cy="12" r="1.5" fill="${stroke}" stroke="${stroke}"/>
          <circle cx="22" cy="12" r="1.5" fill="${stroke}" stroke="${stroke}"/>
        </svg>
      `;
    case 'star':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="1.5" class="w-full h-full">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
        </svg>
      `;
    case 'target':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.5" class="w-full h-full">
          <circle cx="12" cy="12" r="10" stroke="${stroke}" fill="none"/>
          <circle cx="12" cy="12" r="6" stroke="${stroke}" fill="none"/>
          <circle cx="12" cy="12" r="1.5" fill="${stroke}"/>
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="${stroke}"/>
        </svg>
      `;
    case 'warning':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="1.5" class="w-full h-full">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
        </svg>
      `;
    case 'explosion':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-full h-full">
          <text x="50%" y="55%" dominant-baseline="central" text-anchor="middle" font-size="22">💥</text>
        </svg>
      `;
    default:
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" class="w-full h-full">
          <circle cx="12" cy="12" r="10"/>
        </svg>
      `;
  }
}

export function getIconSvgContent(type: string, fillColor: string = 'currentColor', strokeColor: string = 'white'): string {
  const cacheKey = `${type}_${fillColor}_${strokeColor}`;
  const cached = svgCache.get(cacheKey);
  if (cached) return cached;

  const isTransparent = fillColor === 'transparent' || fillColor === 'none';
  const fill = isTransparent ? 'none' : fillColor;
  const stroke = strokeColor;
  const strokeWidth = isTransparent ? '2.5' : '1.5';

  const res = buildIconSvgContent(type, fill, stroke, strokeWidth);
  svgCache.set(cacheKey, res);
  return res;
}

export function hexToRgba(hex: string, alpha: number): string {
  if (!hex || hex === 'transparent' || hex === 'none') return 'transparent';
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  const num = parseInt(cleanHex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function createMarkerHtml(
  title: string,
  color: string,
  size: number,
  rotation: number,
  iconType: string,
  labelVisible: boolean,
  isSelected: boolean,
  customIconUrl?: string,
  borderColor: string = '#ffffff',
  endPointStyle: string = 'none',
  hasZone?: boolean,
  zoneColor?: string,
  zoneSize?: number,
  labelFontSize: number = 11,
  labelOrientation: 'horizontal' | 'rotate' = 'horizontal',
  showIconTrail: boolean = false,
  iconTrailLength: number = 85
): string {
  let innerContent = '';
  const monitorwarAssetUrl = MONITORWAR_ICON_ASSETS[iconType] || '';
  const standardAssetUrl = iconType === 'standard-aircraft'
    ? '/img/aircraft.png'
    : iconType === 'standard-symbol-2'
      ? '/img/icon2.png'
      : '';

  if (monitorwarAssetUrl) {
    const safeUrl = monitorwarAssetUrl.replace(/'/g, '%27');
    const iconColor = color && color !== 'transparent' && color !== 'none' ? color : '#ffffff';
    innerContent = `<div style="width:100%;height:100%;background-color:${iconColor};-webkit-mask-image:url('${safeUrl}');mask-image:url('${safeUrl}');-webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center;"></div>`;
  } else if (standardAssetUrl) {
    // Treat the supplied raster silhouettes as built-in symbols, not uploaded
    // user icons, so their color/size/rotation settings behave like every
    // other standard icon.
    innerContent = color && color !== 'transparent' && color !== 'none' && color !== '#ffffff'
      ? `<div style="width:100%;height:100%;background-color:${color};-webkit-mask-image:url('${standardAssetUrl}');mask-image:url('${standardAssetUrl}');-webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center;"></div>`
      : `<img src="${standardAssetUrl}" alt="${title}" style="width:100%;height:100%;object-fit:contain;" />`;
  } else if (customIconUrl) {
    if (color && color !== 'transparent' && color !== 'none' && color !== '#ffffff') {
      innerContent = `
        <div style="
          width: 100%;
          height: 100%;
          background-color: ${color};
          -webkit-mask-image: url('${customIconUrl}');
          mask-image: url('${customIconUrl}');
          -webkit-mask-size: contain;
          mask-size: contain;
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
          -webkit-mask-position: center;
          mask-position: center;
        "></div>
      `;
    } else {
      innerContent = `
        <img src="${customIconUrl}" alt="${title}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 4px;" referrerPolicy="no-referrer" />
      `;
    }
  } else {
    innerContent = getIconSvgContent(iconType, color, borderColor);
  }
  const borderStyle = isSelected ? `outline: 3px solid #3b82f6; outline-offset: 4px; box-shadow: 0 0 15px ${color};` : '';

  // Handle End Point style indicators (extra small decorators if requested)
  let decoratorHtml = '';

  // Generate circular zone CSS/HTML
  let zoneHtml = '';
  if (hasZone) {
    const finalZoneColor = zoneColor || color || '#ef4444';
    const rgbaBg = hexToRgba(finalZoneColor, 0.5);
    zoneHtml = `
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: ${zoneSize || 60}px;
        height: ${zoneSize || 60}px;
        border: 2.5px dashed ${finalZoneColor};
        background-color: ${rgbaBg};
        border-radius: 50%;
        z-index: -1;
        pointer-events: none;
      "></div>
    `;
  }

  const trailColor = color && color !== 'transparent' && color !== 'none' ? color : '#ffffff';
  const trailOutline = borderColor && borderColor !== 'transparent' && borderColor !== 'none'
    ? `drop-shadow(0 0 0.35px ${borderColor})`
    : '';
  const trailHeight = Math.max(30, Math.min(160, Number(iconTrailLength) || 85));
  // The icon artwork has a 45° clockwise base heading, so offset the trail by 45° too.
  // Fade the trail's far end smoothly into transparency.
  const iconTrailHtml = showIconTrail ? `<div aria-hidden="true" style="position:absolute;left:50%;top:50%;transform:translateX(-50%) rotate(45deg);transform-origin:top center;width:2.2px;height:${trailHeight}%;background:linear-gradient(to bottom,${trailColor} 0%,${trailColor} 58%,transparent 100%);filter:${trailOutline || 'none'};border-radius:2px;z-index:0;pointer-events:none;-webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 58%,transparent 100%);mask-image:linear-gradient(to bottom,#000 0%,#000 58%,transparent 100%);"></div>` : '';

  // Label styling: ensure text is always readable (never inverted / upside-down)
  let labelHtml = '';
  if (labelVisible) {
    const fSize = Math.max(8, Math.min(26, labelFontSize || 11));
    const padY = Math.max(2, Math.round(fSize * 0.22));
    const padX = Math.max(5, Math.round(fSize * 0.55));
    const bColor = borderColor || color || '#38bdf8';

    if (labelOrientation === 'rotate') {
      // Rotate with icon, but automatically flip 180° when angle is between 90° and 270° so letters are NEVER inverted
      const normAngle = ((rotation % 360) + 360) % 360;
      const effectiveAngle = (normAngle > 90 && normAngle < 270) ? normAngle - 180 : normAngle;
      labelHtml = `
        <div class="absolute select-none pointer-events-none" style="top: 100%; left: 50%; transform: translateX(-50%) rotate(${effectiveAngle}deg); margin-top: 6px; z-index: 1000;">
          <div style="background-color: rgba(15, 23, 42, 0.95); color: #ffffff; border: 1.5px solid ${bColor}; border-radius: 5px; padding: ${padY}px ${padX}px; font-size: ${fSize}px; font-weight: 700; white-space: nowrap; box-shadow: 0 3px 10px rgba(0,0,0,0.6); letter-spacing: 0.01em; font-family: inherit;">
            ${title || 'Маркер'}
          </div>
        </div>
      `;
    } else {
      // Default: Always upright & strictly horizontal (0deg) regardless of icon heading, guaranteed 100% readable
      labelHtml = `
        <div class="absolute select-none pointer-events-none" style="top: 100%; left: 50%; transform: translateX(-50%); margin-top: 6px; z-index: 1000;">
          <div style="background-color: rgba(15, 23, 42, 0.95); color: #ffffff; border: 1.5px solid ${bColor}; border-radius: 5px; padding: ${padY}px ${padX}px; font-size: ${fSize}px; font-weight: 700; white-space: nowrap; box-shadow: 0 3px 10px rgba(0,0,0,0.6); letter-spacing: 0.01em; font-family: inherit;">
            ${title || 'Маркер'}
          </div>
        </div>
      `;
    }
  }

  return `
    <div class="relative flex items-center justify-center ${isSelected ? 'selected-marker-highlight' : ''}" style="width: ${size}px; height: ${size}px; ${borderStyle} transition: all 0.2s ease;">
      <!-- Circular tactical zone (rendered behind the main icon) -->
      ${zoneHtml}

      <!-- Main rotating icon container (rotates ONLY the icon visual) -->
      <div style="transform: rotate(${rotation}deg); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: visible; filter: ${borderColor && borderColor !== 'transparent' && borderColor !== 'none' ? `drop-shadow(0 0 0.3px ${borderColor}) drop-shadow(0 0 0.3px ${borderColor}) drop-shadow(0 2px 4px rgba(0,0,0,0.3))` : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'}; transition: transform 0.1s ease; z-index: 2; position: relative;">
        ${iconTrailHtml}
        <div style="position:relative;width:100%;height:100%;z-index:2;display:flex;align-items:center;justify-content:center;">${innerContent}</div>
      </div>

      <!-- Label placed outside rotation container so letters are always upright, readable, and never upside down -->
      ${labelHtml}
      
      ${decoratorHtml}
    </div>
  `;
}
