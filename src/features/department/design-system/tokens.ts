import { type DepartmentId } from '../../../types';

export interface DepartmentThemeConfig {
  id: DepartmentId;
  name: string;
  shortName: string;
  code: string;
  agencyUrdu: string;
  titleEn: string;
  titleUrdu: string;
  monumentalTitle: string;
  subtitleEn: string;
  subtitleUrdu: string;
  jurisdiction: string;
  primaryAccent: string;
  primaryAccentHover: string;
  primaryAccentMuted: string;
  primaryAccentGlow: string;
  focusRing: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  backgroundGradient: string;
  ambientGlowColor: string;
  activeStatus: 'active' | 'scheduled';
}

export const DEPARTMENT_THEMES: Record<DepartmentId, DepartmentThemeConfig> = {
  kmc: {
    id: 'kmc',
    name: 'Karachi Metropolitan Corporation',
    shortName: 'Roads & Infrastructure',
    code: 'KMC',
    agencyUrdu: 'کراچی میٹروپولیٹن کارپوریشن',
    titleEn: 'ROADS & INFRASTRUCTURE',
    titleUrdu: 'سڑکیں اور بلدیاتی انفراسٹرکچر',
    monumentalTitle: 'ROADS',
    subtitleEn: 'Department Staff Sign-In',
    subtitleUrdu: 'دفتری عملہ سائن ان',
    jurisdiction: 'Arterial roadways, flyovers, stormwater conduits, and municipal engineering works',
    primaryAccent: '#D4AF37', // Restrained Sovereign Gold
    primaryAccentHover: '#C29B28',
    primaryAccentMuted: 'rgba(212, 175, 55, 0.15)',
    primaryAccentGlow: 'rgba(212, 175, 55, 0.25)',
    focusRing: 'rgba(212, 175, 55, 0.45)',
    badgeBg: 'rgba(212, 175, 55, 0.12)',
    badgeBorder: 'rgba(212, 175, 55, 0.35)',
    badgeText: '#997300',
    backgroundGradient: 'linear-gradient(135deg, #FAF8F5 0%, #F5F2EC 50%, #FAF8F5 100%)',
    ambientGlowColor: 'rgba(212, 175, 55, 0.08)',
    activeStatus: 'active',
  },
  kelectric: {
    id: 'kelectric',
    name: 'K-Electric Limited',
    shortName: 'Electricity & Power',
    code: 'KE',
    agencyUrdu: 'کے الیکٹرک',
    titleEn: 'ELECTRICITY & POWER',
    titleUrdu: 'بجلی و پاور ڈسٹری بیوشن',
    monumentalTitle: 'ELECTRICITY',
    subtitleEn: 'Department Staff Sign-In',
    subtitleUrdu: 'دفتری عملہ سائن ان',
    jurisdiction: 'Power distribution, high-voltage substations, hazardous PMTs, and line restoration',
    primaryAccent: '#1D70B8', // Power Blue
    primaryAccentHover: '#155D9B',
    primaryAccentMuted: 'rgba(29, 112, 184, 0.15)',
    primaryAccentGlow: 'rgba(29, 112, 184, 0.25)',
    focusRing: 'rgba(29, 112, 184, 0.45)',
    badgeBg: 'rgba(29, 112, 184, 0.12)',
    badgeBorder: 'rgba(29, 112, 184, 0.35)',
    badgeText: '#155D9B',
    backgroundGradient: 'linear-gradient(135deg, #FAF8F5 0%, #F0F4F9 50%, #FAF8F5 100%)',
    ambientGlowColor: 'rgba(29, 112, 184, 0.08)',
    activeStatus: 'active',
  },
  kwsc: {
    id: 'kwsc',
    name: 'Karachi Water & Sewerage Corporation',
    shortName: 'Water & Sewerage',
    code: 'KWSC',
    agencyUrdu: 'کراچی واٹر اینڈ سیوریج کارپوریشن',
    titleEn: 'WATER & SEWERAGE',
    titleUrdu: 'پانی اور سیوریج کارپوریشن',
    monumentalTitle: 'WATER',
    subtitleEn: 'Department Staff Sign-In',
    subtitleUrdu: 'دفتری عملہ سائن ان',
    jurisdiction: 'Bulk water transmission, local feeder lines, sewer trunk mains, and pump stations',
    primaryAccent: '#0E6BA8', // Ocean Blue
    primaryAccentHover: '#0B5586',
    primaryAccentMuted: 'rgba(14, 107, 168, 0.15)',
    primaryAccentGlow: 'rgba(14, 107, 168, 0.25)',
    focusRing: 'rgba(14, 107, 168, 0.45)',
    badgeBg: 'rgba(14, 107, 168, 0.12)',
    badgeBorder: 'rgba(14, 107, 168, 0.35)',
    badgeText: '#0B5586',
    backgroundGradient: 'linear-gradient(135deg, #FAF8F5 0%, #EFF6FB 50%, #FAF8F5 100%)',
    ambientGlowColor: 'rgba(14, 107, 168, 0.08)',
    activeStatus: 'active',
  },
  ssgc: {
    id: 'ssgc',
    name: 'Sui Southern Gas Company',
    shortName: 'Gas Utility',
    code: 'SSGC',
    agencyUrdu: 'سوئی سدرن گیس کمپنی',
    titleEn: 'GAS UTILITY',
    titleUrdu: 'سوئی سدرن گیس پائپ لائنز',
    monumentalTitle: 'GAS',
    subtitleEn: 'Department Staff Sign-In',
    subtitleUrdu: 'دفتری عملہ سائن ان',
    jurisdiction: 'Natural gas mains, low-pressure zones, leak emergencies, and compressor enforcement',
    primaryAccent: '#B35C1E', // Industrial Copper
    primaryAccentHover: '#964B16',
    primaryAccentMuted: 'rgba(179, 92, 30, 0.15)',
    primaryAccentGlow: 'rgba(179, 92, 30, 0.25)',
    focusRing: 'rgba(179, 92, 30, 0.45)',
    badgeBg: 'rgba(179, 92, 30, 0.12)',
    badgeBorder: 'rgba(179, 92, 30, 0.35)',
    badgeText: '#964B16',
    backgroundGradient: 'linear-gradient(135deg, #FAF8F5 0%, #FAF3ED 50%, #FAF8F5 100%)',
    ambientGlowColor: 'rgba(179, 92, 30, 0.08)',
    activeStatus: 'active',
  },
  sswmb: {
    id: 'sswmb',
    name: 'Sindh Solid Waste Management Board',
    shortName: 'Solid Waste Management',
    code: 'SSWMB',
    agencyUrdu: 'سندھ سالڈ ویسٹ مینجمنٹ بورڈ',
    titleEn: 'SOLID WASTE MANAGEMENT',
    titleUrdu: 'ٹھوس کچرا اور بلدیاتی صفائی',
    monumentalTitle: 'SANITATION',
    subtitleEn: 'Department Staff Sign-In',
    subtitleUrdu: 'دفتری عملہ سائن ان',
    jurisdiction: 'Secondary garbage transfer stations, commercial collection fleets, and street cleanliness',
    primaryAccent: '#245938', // Municipal Forest Green
    primaryAccentHover: '#1C462B',
    primaryAccentMuted: 'rgba(36, 89, 56, 0.15)',
    primaryAccentGlow: 'rgba(36, 89, 56, 0.25)',
    focusRing: 'rgba(36, 89, 56, 0.45)',
    badgeBg: 'rgba(36, 89, 56, 0.12)',
    badgeBorder: 'rgba(36, 89, 56, 0.35)',
    badgeText: '#1C462B',
    backgroundGradient: 'linear-gradient(135deg, #FAF8F5 0%, #EEF6F1 50%, #FAF8F5 100%)',
    ambientGlowColor: 'rgba(36, 89, 56, 0.08)',
    activeStatus: 'active',
  },
  sbca: {
    id: 'sbca',
    name: 'Sindh Building Control Authority',
    shortName: 'Building Control Authority',
    code: 'SBCA',
    agencyUrdu: 'سندھ بلڈنگ کنٹرول اتھارٹی',
    titleEn: 'BUILDING CONTROL',
    titleUrdu: 'تعمیرات اور بلڈنگ ریگولیشن',
    monumentalTitle: 'BUILDING',
    subtitleEn: 'Department Staff Sign-In',
    subtitleUrdu: 'دفتری عملہ سائن ان',
    jurisdiction: 'Zoning approvals, hazardous building notices, illegal construction halts, and demolition orders',
    primaryAccent: '#4A5568', // Architectural Slate
    primaryAccentHover: '#3B4453',
    primaryAccentMuted: 'rgba(74, 85, 104, 0.15)',
    primaryAccentGlow: 'rgba(74, 85, 104, 0.25)',
    focusRing: 'rgba(74, 85, 104, 0.45)',
    badgeBg: 'rgba(74, 85, 104, 0.12)',
    badgeBorder: 'rgba(74, 85, 104, 0.35)',
    badgeText: '#3B4453',
    backgroundGradient: 'linear-gradient(135deg, #FAF8F5 0%, #F1F3F7 50%, #FAF8F5 100%)',
    ambientGlowColor: 'rgba(74, 85, 104, 0.08)',
    activeStatus: 'active',
  },
  unassigned: {
    id: 'unassigned',
    name: 'Unassigned Department',
    shortName: 'General',
    code: 'GEN',
    agencyUrdu: 'غیر تفویض شدہ',
    titleEn: 'CIVIC GOVERNANCE',
    titleUrdu: 'بلدیاتی امور',
    monumentalTitle: 'CIVIC',
    subtitleEn: 'Staff Access',
    subtitleUrdu: 'دفتری رسائی',
    jurisdiction: 'General municipal jurisdiction',
    primaryAccent: '#64748B',
    primaryAccentHover: '#788FA7',
    primaryAccentMuted: 'rgba(100, 116, 139, 0.15)',
    primaryAccentGlow: 'rgba(100, 116, 139, 0.25)',
    focusRing: 'rgba(100, 116, 139, 0.45)',
    badgeBg: 'rgba(100, 116, 139, 0.12)',
    badgeBorder: 'rgba(100, 116, 139, 0.35)',
    badgeText: '#334155',
    backgroundGradient: 'linear-gradient(135deg, #FAF8F5 0%, #F1F5F9 50%, #FAF8F5 100%)',
    ambientGlowColor: 'rgba(100, 116, 139, 0.08)',
    activeStatus: 'active',
  },
};

export const AUTHORITATIVE_DEPARTMENT_ORDER: DepartmentId[] = [
  'kmc',
  'kelectric',
  'kwsc',
  'ssgc',
  'sswmb',
  'sbca',
];

export const PORTAL_PALETTE = {
  foundation: '#FAF8F5',
  surfaceLight: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#6B7280',
  limeRibbon: '#84CC16',
  limeRibbonGlow: '#A3E635',
  asphaltCharcoal: '#1E2228',
  roadStripeYellow: '#F59E0B',
};

export const GLASS_SURFACE_STYLES = {
  card: 'bg-white/80 backdrop-blur-2xl border border-black/[0.08] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.07)]',
  cardSpecular: 'border-t border-t-white/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]',
  input: 'bg-white/80 border border-black/10 text-[#111827] placeholder:text-slate-400 rounded-2xl py-3.5 transition-all duration-200 outline-none',
  button: 'bg-[#111827] hover:bg-black text-white font-bold text-sm tracking-wide rounded-2xl py-3.5 px-6 transition-all duration-200 active:scale-[0.99] cursor-pointer shadow-[0_4px_14px_rgba(0,0,0,0.15)]',
  overlay: 'bg-[#FAF8F5]/96 backdrop-blur-2xl',
};
