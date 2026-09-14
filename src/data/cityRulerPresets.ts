export interface CityRulerPreset {
  id: string;
  nameUa: string;
  nameEn: string;
  lat: number;
  lng: number;
  region: string;
  isPopular?: boolean;
}

export interface InterCityMeasurePreset {
  id: string;
  city1Id: string;
  city2Id: string;
  labelUa: string;
  labelEn: string;
}

export const MEASURE_TRACK_COLORS = [
  { id: 'yellow', hex: '#facc15', nameUa: 'Жовтий', nameEn: 'Yellow', dotClass: 'bg-amber-400', textClass: 'text-amber-400' },
  { id: 'sky', hex: '#38bdf8', nameUa: 'Блакитний', nameEn: 'Sky', dotClass: 'bg-sky-400', textClass: 'text-sky-400' },
  { id: 'emerald', hex: '#34d399', nameUa: 'Смарагдовий', nameEn: 'Emerald', dotClass: 'bg-emerald-400', textClass: 'text-emerald-400' },
  { id: 'orange', hex: '#fb923c', nameUa: 'Помаранчевий', nameEn: 'Orange', dotClass: 'bg-orange-400', textClass: 'text-orange-400' },
  { id: 'purple', hex: '#c084fc', nameUa: 'Фіолетовий', nameEn: 'Purple', dotClass: 'bg-purple-400', textClass: 'text-purple-400' },
  { id: 'rose', hex: '#f43f5e', nameUa: 'Рожевий', nameEn: 'Rose', dotClass: 'bg-rose-400', textClass: 'text-rose-400' },
  { id: 'lime', hex: '#a3e635', nameUa: 'Салатовий', nameEn: 'Lime', dotClass: 'bg-lime-400', textClass: 'text-lime-400' },
];

export const MAJOR_CITIES_RULER: CityRulerPreset[] = [
  // Primary regional hubs and strategic cities
  { id: 'city_kryvyi_rih', nameUa: 'Кривий Ріг', nameEn: 'Kryvyi Rih', lat: 47.9105, lng: 33.3918, region: 'Дніпропетровська обл.', isPopular: true },
  { id: 'city_dnipro', nameUa: 'Дніпро', nameEn: 'Dnipro', lat: 48.4647, lng: 35.0462, region: 'Дніпропетровська обл.', isPopular: true },
  { id: 'city_zaporizhzhia', nameUa: 'Запоріжжя', nameEn: 'Zaporizhzhia', lat: 47.8388, lng: 35.1396, region: 'Запорізька обл.', isPopular: true },
  { id: 'city_kyiv', nameUa: 'Київ', nameEn: 'Kyiv', lat: 50.4501, lng: 30.5234, region: 'м. Київ', isPopular: true },
  { id: 'city_kropyvnytskyi', nameUa: 'Кропивницький', nameEn: 'Kropyvnytskyi', lat: 48.5106, lng: 32.2623, region: 'Кіровоградська обл.', isPopular: true },
  { id: 'city_mykolaiv', nameUa: 'Миколаїв', nameEn: 'Mykolaiv', lat: 46.9750, lng: 31.9950, region: 'Миколаївська обл.', isPopular: true },
  { id: 'city_nikopol', nameUa: 'Нікополь', nameEn: 'Nikopol', lat: 47.5750, lng: 34.3980, region: 'Дніпропетровська обл.', isPopular: true },
  { id: 'city_kharkiv', nameUa: 'Харків', nameEn: 'Kharkiv', lat: 49.9935, lng: 36.2304, region: 'Харківська обл.', isPopular: true },
  { id: 'city_odesa', nameUa: 'Одеса', nameEn: 'Odesa', lat: 46.4825, lng: 30.7233, region: 'Одеська обл.', isPopular: true },
  { id: 'city_poltava', nameUa: 'Полтава', nameEn: 'Poltava', lat: 49.5883, lng: 34.5514, region: 'Полтавська обл.', isPopular: true },
  { id: 'city_kherson', nameUa: 'Херсон', nameEn: 'Kherson', lat: 46.6354, lng: 32.6169, region: 'Херсонська обл.', isPopular: true },
  { id: 'city_lviv', nameUa: 'Львів', nameEn: 'Lviv', lat: 49.8383, lng: 24.0232, region: 'Львівська обл.', isPopular: true },
  
  // District centers & nearby strategic locations
  { id: 'city_kremenchuk', nameUa: 'Кременчук', nameEn: 'Kremenchuk', lat: 49.0631, lng: 33.4042, region: 'Полтавська обл.', isPopular: true },
  { id: 'city_zhovti_vody', nameUa: 'Жовті Води', nameEn: 'Zhovti Vody', lat: 48.3450, lng: 33.5080, region: 'Дніпропетровська обл.', isPopular: true },
  { id: 'city_apostolove', nameUa: 'Апостолове', nameEn: 'Apostolove', lat: 47.6600, lng: 33.7170, region: 'Криворізький р-н', isPopular: true },
  { id: 'city_zelenodolsk', nameUa: 'Зеленодольськ', nameEn: 'Zelenodolsk', lat: 47.5640, lng: 33.6450, region: 'Криворізький р-н', isPopular: true },
  { id: 'city_oleksandriia', nameUa: 'Олександрія', nameEn: 'Oleksandriia', lat: 48.6710, lng: 33.1150, region: 'Кіровоградська обл.' },
  { id: 'city_piatykhatky', nameUa: 'П\'ятихатки', nameEn: 'Piatykhatky', lat: 48.4120, lng: 33.7050, region: 'Кам\'янський р-н' },
  { id: 'city_shyroke', nameUa: 'Широке', nameEn: 'Shyroke', lat: 47.6890, lng: 33.2590, region: 'Криворізький р-н' },
  { id: 'city_sofiivka', nameUa: 'Софіївка', nameEn: 'Sofiivka', lat: 48.0530, lng: 33.8760, region: 'Криворізький р-н' },
  { id: 'city_inhulets', nameUa: 'Інгулець', nameEn: 'Inhulets', lat: 47.6830, lng: 33.1550, region: 'Кривий Ріг' },
  { id: 'city_kazanka', nameUa: 'Казанка', nameEn: 'Kazanka', lat: 47.8450, lng: 32.8250, region: 'Баштанський р-н' },
  { id: 'city_novyi_buh', nameUa: 'Новий Буг', nameEn: 'Novyi Buh', lat: 47.6850, lng: 32.5120, region: 'Баштанський р-н' },
  { id: 'city_bashtanka', nameUa: 'Баштанка', nameEn: 'Bashtanka', lat: 47.4050, lng: 32.4420, region: 'Баштанський р-н' },
  { id: 'city_snihurivka', nameUa: 'Снігурівка', nameEn: 'Snihurivka', lat: 47.0750, lng: 32.8020, region: 'Баштанський р-н' },
  { id: 'city_beryslav', nameUa: 'Берислав', nameEn: 'Beryslav', lat: 46.8450, lng: 33.4280, region: 'Бериславський р-н' },
  { id: 'city_nova_kakhovka', nameUa: 'Нова Каховка', nameEn: 'Nova Kakhovka', lat: 46.7550, lng: 33.3650, region: 'Каховський р-н' },
  
  // Regional capitals
  { id: 'city_cherkasy', nameUa: 'Черкаси', nameEn: 'Cherkasy', lat: 49.4444, lng: 32.0598, region: 'Черкаська обл.' },
  { id: 'city_vinnytsia', nameUa: 'Вінниця', nameEn: 'Vinnytsia', lat: 49.2331, lng: 28.4682, region: 'Вінницька обл.' },
  { id: 'city_sumy', nameUa: 'Суми', nameEn: 'Sumy', lat: 50.9077, lng: 34.7981, region: 'Сумська обл.' },
  { id: 'city_chernihiv', nameUa: 'Чернігів', nameEn: 'Chernihiv', lat: 51.4982, lng: 31.2893, region: 'Чернігівська обл.' },
  { id: 'city_zhytomyr', nameUa: 'Житомир', nameEn: 'Zhytomyr', lat: 50.2547, lng: 28.6587, region: 'Житомирська обл.' },
  { id: 'city_khmelnytskyi', nameUa: 'Хмельницький', nameEn: 'Khmelnytskyi', lat: 49.4230, lng: 26.9871, region: 'Хмельницька обл.' },
  { id: 'city_rivne', nameUa: 'Рівне', nameEn: 'Rivne', lat: 50.6199, lng: 26.2516, region: 'Рівненська обл.' },
  { id: 'city_lutsk', nameUa: 'Луцьк', nameEn: 'Lutsk', lat: 50.7472, lng: 25.3254, region: 'Волинська обл.' },
  { id: 'city_ivano_frankivsk', nameUa: 'Івано-Франківськ', nameEn: 'Ivano-Frankivsk', lat: 48.9226, lng: 24.7111, region: 'Івано-Франківська обл.' },
  { id: 'city_ternopil', nameUa: 'Тернопіль', nameEn: 'Ternopil', lat: 49.5535, lng: 25.5948, region: 'Тернопільська обл.' },
  { id: 'city_uzhhorod', nameUa: 'Ужгород', nameEn: 'Uzhhorod', lat: 48.6208, lng: 22.2879, region: 'Закарпатська обл.' },
  { id: 'city_chernivtsi', nameUa: 'Чернівці', nameEn: 'Chernivtsi', lat: 48.2921, lng: 25.9358, region: 'Чернівецька обл.' },
];

export const INTER_CITY_MEASURE_PRESETS: InterCityMeasurePreset[] = [
  { id: 'kr_dnipro', city1Id: 'city_kryvyi_rih', city2Id: 'city_dnipro', labelUa: 'Кривий Ріг ↔ Дніпро', labelEn: 'Kryvyi Rih ↔ Dnipro' },
  { id: 'kr_zaporizhzhia', city1Id: 'city_kryvyi_rih', city2Id: 'city_zaporizhzhia', labelUa: 'Кривий Ріг ↔ Запоріжжя', labelEn: 'Kryvyi Rih ↔ Zaporizhzhia' },
  { id: 'kr_nikopol', city1Id: 'city_kryvyi_rih', city2Id: 'city_nikopol', labelUa: 'Кривий Ріг ↔ Нікополь', labelEn: 'Kryvyi Rih ↔ Nikopol' },
  { id: 'kr_kropyvnytskyi', city1Id: 'city_kryvyi_rih', city2Id: 'city_kropyvnytskyi', labelUa: 'Кривий Ріг ↔ Кропивницький', labelEn: 'Kryvyi Rih ↔ Kropyvnytskyi' },
  { id: 'kr_mykolaiv', city1Id: 'city_kryvyi_rih', city2Id: 'city_mykolaiv', labelUa: 'Кривий Ріг ↔ Миколаїв', labelEn: 'Kryvyi Rih ↔ Mykolaiv' },
  { id: 'kr_zelenodolsk', city1Id: 'city_kryvyi_rih', city2Id: 'city_zelenodolsk', labelUa: 'Кривий Ріг ↔ Зеленодольськ', labelEn: 'Kryvyi Rih ↔ Zelenodolsk' },
  { id: 'kr_apostolove', city1Id: 'city_kryvyi_rih', city2Id: 'city_apostolove', labelUa: 'Кривий Ріг ↔ Апостолове', labelEn: 'Kryvyi Rih ↔ Apostolove' },
  { id: 'kr_zhovti_vody', city1Id: 'city_kryvyi_rih', city2Id: 'city_zhovti_vody', labelUa: 'Кривий Ріг ↔ Жовті Води', labelEn: 'Kryvyi Rih ↔ Zhovti Vody' },
  { id: 'dnipro_zaporizhzhia', city1Id: 'city_dnipro', city2Id: 'city_zaporizhzhia', labelUa: 'Дніпро ↔ Запоріжжя', labelEn: 'Dnipro ↔ Zaporizhzhia' },
  { id: 'dnipro_nikopol', city1Id: 'city_dnipro', city2Id: 'city_nikopol', labelUa: 'Дніпро ↔ Нікополь', labelEn: 'Dnipro ↔ Nikopol' },
  { id: 'dnipro_kharkiv', city1Id: 'city_dnipro', city2Id: 'city_kharkiv', labelUa: 'Дніпро ↔ Харків', labelEn: 'Dnipro ↔ Kharkiv' },
  { id: 'dnipro_poltava', city1Id: 'city_dnipro', city2Id: 'city_poltava', labelUa: 'Дніпро ↔ Полтава', labelEn: 'Dnipro ↔ Poltava' },
  { id: 'kyiv_kr', city1Id: 'city_kyiv', city2Id: 'city_kryvyi_rih', labelUa: 'Київ ↔ Кривий Ріг', labelEn: 'Kyiv ↔ Kryvyi Rih' },
  { id: 'kyiv_dnipro', city1Id: 'city_kyiv', city2Id: 'city_dnipro', labelUa: 'Київ ↔ Дніпро', labelEn: 'Kyiv ↔ Dnipro' },
  { id: 'odesa_mykolaiv', city1Id: 'city_odesa', city2Id: 'city_mykolaiv', labelUa: 'Одеса ↔ Миколаїв', labelEn: 'Odesa ↔ Mykolaiv' },
  { id: 'mykolaiv_kherson', city1Id: 'city_mykolaiv', city2Id: 'city_kherson', labelUa: 'Миколаїв ↔ Херсон', labelEn: 'Mykolaiv ↔ Kherson' },
  { id: 'poltava_kremenchuk', city1Id: 'city_poltava', city2Id: 'city_kremenchuk', labelUa: 'Полтава ↔ Кременчук', labelEn: 'Poltava ↔ Kremenchuk' },
];
