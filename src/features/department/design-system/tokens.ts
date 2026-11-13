import { type DepartmentId } from '../../../types';

export interface DepartmentThemeConfig {
  id: DepartmentId;
  name: string;
  shortName: string;
  code: string;
  agencyUrdu: string;
  titleEn: string;
  titleUrdu: string;
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
    subtitleEn: 'Staff Access • Municipal Operations Console',
    subtitleUrdu: 'دفتری عملہ • بلدیاتی آپریٹنگ کنسول',
    jurisdiction: 'Arterial roadways, flyovers, stormwater conduits, and municipal engineering works',
    primaryAccent: '#D4AF37', // Restrained Institutional Gold
    primaryAccentHover: '#E5C158',
    primaryAccentMuted: 'rgba(212, 175, 55, 0.15)',
    primaryAccentGlow: 'rgba(212, 175, 55, 0.25)',
    focusRing: 'rgba(212, 175, 55, 0.45)',
    badgeBg: 'rgba(212, 175, 55, 0.12)',
    badgeBorder: 'rgba(212, 175, 55, 0.35)',
    badgeText: '#F3E5AB',
    backgroundGradient: 'linear-gradient(135deg, #0C1015 0%, #121820 50%, #0A0D11 100%)',
    ambientGlowColor: 'rgba(212, 175, 55, 0.08)',
    activeStatus: 'active',
  },
  kelectric: {
    id: 'kelectric',
    name: 'K-Electric Limited',
    shortName: 'Electricity',
    code: 'KE',
    agencyUrdu: 'کے الیکٹرک',
    titleEn: 'ELECTRICITY & POWER DISTRIBUTION',
    titleUrdu: 'بجلی و پاور ڈسٹری بیوشن',
    subtitleEn: 'Staff Access • Power Grid Operations',
    subtitleUrdu: 'دفتری عملہ • پاور گرڈ آپریٹنگ کنسول',
    jurisdiction: 'Power distribution, high-voltage substations, hazardous PMTs, and line restoration',
    primaryAccent: '#1D70B8', // Power Blue
    primaryAccentHover: '#2A84D2',
    primaryAccentMuted: 'rgba(29, 112, 184, 0.15)',
    primaryAccentGlow: 'rgba(29, 112, 184, 0.25)',
    focusRing: 'rgba(29, 112, 184, 0.45)',
    badgeBg: 'rgba(29, 112, 184, 0.12)',
    badgeBorder: 'rgba(29, 112, 184, 0.35)',
    badgeText: '#93C5FD',
    backgroundGradient: 'linear-gradient(135deg, #08111B 0%, #0D1C2D 50%, #060B12 100%)',
    ambientGlowColor: 'rgba(29, 112, 184, 0.08)',
    activeStatus: 'scheduled',
  },
  kwsc: {
    id: 'kwsc',
    name: 'Karachi Water & Sewerage Corporation',
    shortName: 'Water & Sewerage',
    code: 'KWSC',
    agencyUrdu: 'کراچی واٹر اینڈ سیوریج کارپوریشن',
    titleEn: 'WATER & SEWERAGE SERVICES',
    titleUrdu: 'پانی اور سیوریج کارپوریشن',
    subtitleEn: 'Staff Access • Hydraulic Dispatch Console',
    subtitleUrdu: 'دفتری عملہ • واٹر ڈسپیچ کنسول',
    jurisdiction: 'Bulk water transmission, local feeder lines, sewer trunk mains, and pump stations',
    primaryAccent: '#0E6BA8', // Ocean Blue
    primaryAccentHover: '#1B81C4',
    primaryAccentMuted: 'rgba(14, 107, 168, 0.15)',
    primaryAccentGlow: 'rgba(14, 107, 168, 0.25)',
    focusRing: 'rgba(14, 107, 168, 0.45)',
    badgeBg: 'rgba(14, 107, 168, 0.12)',
    badgeBorder: 'rgba(14, 107, 168, 0.35)',
    badgeText: '#BAE6FD',
    backgroundGradient: 'linear-gradient(135deg, #07131B 0%, #0C2130 50%, #050B10 100%)',
    ambientGlowColor: 'rgba(14, 107, 168, 0.08)',
    activeStatus: 'scheduled',
  },
  ssgc: {
    id: 'ssgc',
    name: 'Sui Southern Gas Company',
    shortName: 'Gas',
    code: 'SSGC',
    agencyUrdu: 'سوئی سدرن گیس کمپنی',
    titleEn: 'GAS SUPPLY & PIPELINES',
    titleUrdu: 'سوئی سدرن گیس پائپ لائنز',
    subtitleEn: 'Staff Access • Gas Pipeline Surveillance',
    subtitleUrdu: 'دفتری عملہ • گیس مانیٹرنگ کنسول',
    jurisdiction: 'Natural gas mains, low-pressure zones, leak emergencies, and illegal compressor enforcement',
    primaryAccent: '#B35C1E', // Copper Bronze
    primaryAccentHover: '#C96C28',
    primaryAccentMuted: 'rgba(179, 92, 30, 0.15)',
    primaryAccentGlow: 'rgba(179, 92, 30, 0.25)',
    focusRing: 'rgba(179, 92, 30, 0.45)',
    badgeBg: 'rgba(179, 92, 30, 0.12)',
    badgeBorder: 'rgba(179, 92, 30, 0.35)',
    badgeText: '#FED7AA',
    backgroundGradient: 'linear-gradient(135deg, #180F0A 0%, #281810 50%, #0F0906 100%)',
    ambientGlowColor: 'rgba(179, 92, 30, 0.08)',
    activeStatus: 'scheduled',
  },
  sswmb: {
    id: 'sswmb',
    name: 'Sindh Solid Waste Management Board',
    shortName: 'Sanitation',
    code: 'SSWMB',
    agencyUrdu: 'سندھ سالڈ ویسٹ مینجمنٹ بورڈ',
    titleEn: 'SOLID WASTE & SANITATION',
    titleUrdu: 'ٹھوس کچرا اور بلدیاتی صفائی',
    subtitleEn: 'Staff Access • Municipal Sanitation Operations',
    subtitleUrdu: 'دفتری عملہ • ویسٹ مینجمنٹ کنسول',
    jurisdiction: 'Secondary garbage transfer stations, commercial collection fleets, and street cleanliness',
    primaryAccent: '#245938', // Forest Green
    primaryAccentHover: '#2E6F47',
    primaryAccentMuted: 'rgba(36, 89, 56, 0.15)',
    primaryAccentGlow: 'rgba(36, 89, 56, 0.25)',
    focusRing: 'rgba(36, 89, 56, 0.45)',
    badgeBg: 'rgba(36, 89, 56, 0.12)',
    badgeBorder: 'rgba(36, 89, 56, 0.35)',
    badgeText: '#BBF7D0',
    backgroundGradient: 'linear-gradient(135deg, #09140D 0%, #102216 50%, #060D08 100%)',
    ambientGlowColor: 'rgba(36, 89, 56, 0.08)',
    activeStatus: 'scheduled',
  },
  sbca: {
    id: 'sbca',
    name: 'Sindh Building Control Authority',
    shortName: 'Building Control',
    code: 'SBCA',
    agencyUrdu: 'سندھ بلڈنگ کنٹرول اتھارٹی',
    titleEn: 'BUILDING CONTROL & REGULATION',
    titleUrdu: 'تعمیرات اور بلڈنگ ریگولیشن',
    subtitleEn: 'Staff Access • Structural Compliance Console',
    subtitleUrdu: 'دفتری عملہ • عماراتی تعمیل کنسول',
    jurisdiction: 'Zoning approvals, hazardous building notices, illegal construction halts, and demolition orders',
    primaryAccent: '#4A5568', // Architectural Slate
    primaryAccentHover: '#5E6B82',
    primaryAccentMuted: 'rgba(74, 85, 104, 0.15)',
    primaryAccentGlow: 'rgba(74, 85, 104, 0.25)',
    focusRing: 'rgba(74, 85, 104, 0.45)',
    badgeBg: 'rgba(74, 85, 104, 0.12)',
    badgeBorder: 'rgba(74, 85, 104, 0.35)',
    badgeText: '#E2E8F0',
    backgroundGradient: 'linear-gradient(135deg, #0D0F14 0%, #171A22 50%, #090A0D 100%)',
    ambientGlowColor: 'rgba(74, 85, 104, 0.08)',
    activeStatus: 'scheduled',
  },
  unassigned: {
    id: 'unassigned',
    name: 'Unassigned Department',
    shortName: 'General',
    code: 'GEN',
    agencyUrdu: 'غیر تفویض شدہ',
    titleEn: 'CIVIC GOVERNANCE',
    titleUrdu: 'بلدیاتی امور',
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
    badgeText: '#CBD5E1',
    backgroundGradient: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0A0F1D 100%)',
    ambientGlowColor: 'rgba(100, 116, 139, 0.08)',
    activeStatus: 'scheduled',
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

export const GLASS_SURFACE_STYLES = {
  card: 'bg-[#121820]/75 backdrop-blur-2xl border border-white/10 rounded-[24px] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.65)]',
  cardSpecular: 'border-t border-t-white/20',
  input: 'bg-[#0A0D11]/60 border border-white/12 text-white placeholder-slate-500 rounded-xl transition-all duration-200',
  button: 'font-bold text-sm tracking-wide rounded-xl py-3.5 px-6 transition-all duration-200 active:scale-[0.99] cursor-pointer shadow-lg',
  overlay: 'bg-black/80 backdrop-blur-2xl',
};
