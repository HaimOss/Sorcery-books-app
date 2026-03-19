export interface Spell {
  code: string;
  cost: number;
  description: string;
}

export const SPELLS: Record<string, Spell> = {
  ZAP: { code: 'ZAP', cost: 1, description: 'ברק מהאצבעות' },
  HOT: { code: 'HOT', cost: 4, description: 'כדור אש' },
  FOF: { code: 'FOF', cost: 1, description: 'שדה כוח' },
  WAL: { code: 'WAL', cost: 4, description: 'קיר בלתי נראה' },
  LAW: { code: 'LAW', cost: 4, description: 'שליטה בחיות' },
  DUM: { code: 'DUM', cost: 4, description: 'בלבול' },
  DOP: { code: 'DOP', cost: 2, description: 'כפיל' },
  RAZ: { code: 'RAZ', cost: 1, description: 'להב מושחז' },
  SUS: { code: 'SUS', cost: 2, description: 'גילוי סכנה' },
  SIX: { code: 'SIX', cost: 2, description: 'מזל מוגבר' },
  JIG: { code: 'JIG', cost: 1, description: 'ריקוד בלתי נשלט' },
  MAG: { code: 'MAG', cost: 2, description: 'הגנה מפני קסם' },
  FAL: { code: 'FAL', cost: 2, description: 'נפילה איטית' },
  SSW: { code: 'SSW', cost: 1, description: 'שינה' },
  SUN: { code: 'SUN', cost: 1, description: 'אור שמש' },
  KID: { code: 'KID', cost: 1, description: 'אשליה' },
  YOB: { code: 'YOB', cost: 1, description: 'ענק' },
  GOD: { code: 'GOD', cost: 1, description: 'ברכת האלים' },
  TIP: { code: 'TIP', cost: 2, description: 'בלתי נראה' },
  DOZ: { code: 'DOZ', cost: 2, description: 'האטה' },
  DUD: { code: 'DUD', cost: 2, description: 'אשליית אוצר' },
  TEL: { code: 'TEL', cost: 2, description: 'טלפתיה' },
  YAZ: { code: 'YAZ', cost: 1, description: 'דיבור עם חיות' },
  GLO: { code: 'GLO', cost: 1, description: 'זוהר' },
  RES: { code: 'RES', cost: 1, description: 'החייאה' },
  ZEN: { code: 'ZEN', cost: 1, description: 'ריחוף' },
  YOK: { code: 'YOK', cost: 1, description: 'מעבר דרך קירות' },
};

export const WIZARD_NAMES = [
  'אלמינסטר',
  'גנדלף',
  'רייסטלין',
  'מרלין',
  'דמבלדור',
  'סארומן',
  'מורגנה',
  'רדגסט',
  'זאנה',
  'ניקודמוס'
];
