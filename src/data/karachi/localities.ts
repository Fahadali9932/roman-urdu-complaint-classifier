import { KarachiDistrict } from '../../types';

export type LocalityCategory =
  | 'neighbourhood'
  | 'housing_scheme'
  | 'block_sector'
  | 'colony'
  | 'village_goth'
  | 'industrial_area'
  | 'commercial_area'
  | 'subdivision'
  | 'unresolved';

export interface LocalityRecord {
  id: string;
  name: string;
  nameUrdu?: string;
  district: KarachiDistrict;
  subdivision?: string;
  town?: string;
  parentLocality?: string;
  category: LocalityCategory;
  aliases?: string[];
}

export const KARACHI_LOCALITIES_DATA: LocalityRecord[] = [
  // =========================================================================
  // GULSHAN-E-IQBAL & SURROUNDINGS (District East)
  // =========================================================================
  { id: 'gulshan-e-iqbal', name: 'Gulshan-e-Iqbal', nameUrdu: 'گلشن اقبال', district: 'District East', subdivision: 'gulshan-e-iqbal', town: 'gulshan-iqbal-town', category: 'neighbourhood', aliases: ['Gulshan', 'Gulshan e Iqbal'] },
  { id: 'gulshan-block-1', name: 'Gulshan-e-Iqbal Block 1', nameUrdu: 'گلشن اقبال بلاک ۱', district: 'District East', parentLocality: 'Gulshan-e-Iqbal', category: 'block_sector', aliases: ['Gulshan Block 1'] },
  { id: 'gulshan-block-2', name: 'Gulshan-e-Iqbal Block 2', nameUrdu: 'گلشن اقبال بلاک ۲', district: 'District East', parentLocality: 'Gulshan-e-Iqbal', category: 'block_sector', aliases: ['Gulshan Block 2'] },
  { id: 'gulshan-block-3', name: 'Gulshan-e-Iqbal Block 3', nameUrdu: 'گلشن اقبال بلاک ۳', district: 'District East', parentLocality: 'Gulshan-e-Iqbal', category: 'block_sector', aliases: ['Gulshan Block 3'] },
  { id: 'gulshan-block-4', name: 'Gulshan-e-Iqbal Block 4', nameUrdu: 'گلشن اقبال بلاک ۴', district: 'District East', parentLocality: 'Gulshan-e-Iqbal', category: 'block_sector', aliases: ['Gulshan Block 4'] },
  { id: 'gulshan-block-4a', name: 'Gulshan-e-Iqbal Block 4-A', nameUrdu: 'گلشن اقبال بلاک ۴-اے', district: 'District East', parentLocality: 'Gulshan-e-Iqbal', category: 'block_sector', aliases: ['Gulshan Block 4A'] },
  { id: 'gulshan-block-5', name: 'Gulshan-e-Iqbal Block 5', nameUrdu: 'گلشن اقبال بلاک ۵', district: 'District East', parentLocality: 'Gulshan-e-Iqbal', category: 'block_sector', aliases: ['Gulshan Block 5'] },
  { id: 'gulshan-block-6', name: 'Gulshan-e-Iqbal Block 6', nameUrdu: 'گلشن اقبال بلاک ۶', district: 'District East', parentLocality: 'Gulshan-e-Iqbal', category: 'block_sector', aliases: ['Gulshan Block 6'] },
  { id: 'gulshan-block-7', name: 'Gulshan-e-Iqbal Block 7', nameUrdu: 'گلشن اقبال بلاک ۷', district: 'District East', parentLocality: 'Gulshan-e-Iqbal', category: 'block_sector', aliases: ['Gulshan Block 7'] },
  { id: 'gulshan-block-8', name: 'Gulshan-e-Iqbal Block 8', nameUrdu: 'گلشن اقبال بلاک ۸', district: 'District East', parentLocality: 'Gulshan-e-Iqbal', category: 'block_sector', aliases: ['Gulshan Block 8'] },
  { id: 'gulshan-block-9', name: 'Gulshan-e-Iqbal Block 9', nameUrdu: 'گلشن اقبال بلاک ۹', district: 'District East', parentLocality: 'Gulshan-e-Iqbal', category: 'block_sector', aliases: ['Gulshan Block 9'] },
  { id: 'gulshan-block-10', name: 'Gulshan-e-Iqbal Block 10', nameUrdu: 'گلشن اقبال بلاک ۱۰', district: 'District East', parentLocality: 'Gulshan-e-Iqbal', category: 'block_sector', aliases: ['Gulshan Block 10'] },
  { id: 'gulshan-block-10a', name: 'Gulshan-e-Iqbal Block 10-A', nameUrdu: 'گلشن اقبال بلاک ۱۰-اے', district: 'District East', parentLocality: 'Gulshan-e-Iqbal', category: 'block_sector', aliases: ['Gulshan Block 10A'] },
  { id: 'gulshan-block-11', name: 'Gulshan-e-Iqbal Block 11', nameUrdu: 'گلشن اقبال بلاک ۱۱', district: 'District East', parentLocality: 'Gulshan-e-Iqbal', category: 'block_sector', aliases: ['Gulshan Block 11'] },
  { id: 'gulshan-block-13a', name: 'Gulshan-e-Iqbal Block 13-A', nameUrdu: 'گلشن اقبال بلاک ۱۳-اے', district: 'District East', parentLocality: 'Gulshan-e-Iqbal', category: 'block_sector', aliases: ['Gulshan Block 13A'] },
  { id: 'gulshan-block-13b', name: 'Gulshan-e-Iqbal Block 13-B', nameUrdu: 'گلشن اقبال بلاک ۱۳-بی', district: 'District East', parentLocality: 'Gulshan-e-Iqbal', category: 'block_sector', aliases: ['Gulshan Block 13B'] },
  { id: 'gulshan-block-13c', name: 'Gulshan-e-Iqbal Block 13-C', nameUrdu: 'گلشن اقبال بلاک ۱۳-سی', district: 'District East', parentLocality: 'Gulshan-e-Iqbal', category: 'block_sector', aliases: ['Gulshan Block 13C'] },
  { id: 'gulshan-block-13d', name: 'Gulshan-e-Iqbal Block 13-D', nameUrdu: 'گلشن اقبال بلاک ۱۳-ڈی', district: 'District East', parentLocality: 'Gulshan-e-Iqbal', category: 'block_sector', aliases: ['Gulshan Block 13D', '13-D/1', '13-D/2'] },
  { id: 'gulshan-block-14', name: 'Gulshan-e-Iqbal Block 14', nameUrdu: 'گلشن اقبال بلاک ۱۴', district: 'District East', parentLocality: 'Gulshan-e-Iqbal', category: 'block_sector', aliases: ['Gulshan Block 14'] },
  { id: 'gulshan-block-16', name: 'Gulshan-e-Iqbal Block 16', nameUrdu: 'گلشن اقبال بلاک ۱۶', district: 'District East', parentLocality: 'Gulshan-e-Iqbal', category: 'block_sector', aliases: ['Gulshan Block 16'] },
  { id: 'gulshan-block-17', name: 'Gulshan-e-Iqbal Block 17', nameUrdu: 'گلشن اقبال بلاک ۱۷', district: 'District East', parentLocality: 'Gulshan-e-Iqbal', category: 'block_sector', aliases: ['Gulshan Block 17'] },
  { id: 'gulshan-block-18', name: 'Gulshan-e-Iqbal Block 18', nameUrdu: 'گلشن اقبال بلاک ۱۸', district: 'District East', parentLocality: 'Gulshan-e-Iqbal', category: 'block_sector', aliases: ['Gulshan Block 18'] },
  { id: 'gulshan-block-19', name: 'Gulshan-e-Iqbal Block 19', nameUrdu: 'گلشن اقبال بلاک ۱۹', district: 'District East', parentLocality: 'Gulshan-e-Iqbal', category: 'block_sector', aliases: ['Gulshan Block 19'] },
  { id: 'civic-centre', name: 'Civic Centre', nameUrdu: 'سیوک سینٹر', district: 'District East', subdivision: 'gulshan-e-iqbal', category: 'commercial_area', aliases: ['Civic Center', 'Hassan Square'] },
  { id: 'pib-colony', name: 'PIB Colony', nameUrdu: 'پی آئی بی کالونی', district: 'District East', subdivision: 'jamshed-quarters', category: 'colony', aliases: ['P.I.B. Colony'] },
  { id: 'essa-nagri', name: 'Essa Nagri', nameUrdu: 'عیسیٰ نگری', district: 'District East', subdivision: 'gulshan-e-iqbal', category: 'colony', aliases: ['Isa Nagri'] },
  { id: 'shanti-nagar', name: 'Shanti Nagar', nameUrdu: 'شانتی نگر', district: 'District East', subdivision: 'gulshan-e-iqbal', category: 'colony' },
  { id: 'pehlwan-goth', name: 'Pehlwan Goth', nameUrdu: 'پہلوان گوٹھ', district: 'District East', subdivision: 'gulshan-e-iqbal', category: 'village_goth' },

  // =========================================================================
  // GULISTAN-E-JAUHAR & SCHEME 33 (District East & Malir)
  // =========================================================================
  { id: 'gulistan-e-jauhar', name: 'Gulistan-e-Jauhar', nameUrdu: 'گلستان جوہر', district: 'District East', subdivision: 'gulshan-e-iqbal', town: 'gulshan-iqbal-town', category: 'neighbourhood', aliases: ['Johar', 'Jauhar', 'Gulistan e Johar', 'Gulistan-e-Johar'] },
  { id: 'jauhar-block-1', name: 'Gulistan-e-Jauhar Block 1', nameUrdu: 'گلستان جوہر بلاک ۱', district: 'District East', parentLocality: 'Gulistan-e-Jauhar', category: 'block_sector', aliases: ['Johar Block 1', 'Jauhar Block 1', 'Block 1-A'] },
  { id: 'jauhar-block-2', name: 'Gulistan-e-Jauhar Block 2', nameUrdu: 'گلستان جوہر بلاک ۲', district: 'District East', parentLocality: 'Gulistan-e-Jauhar', category: 'block_sector', aliases: ['Johar Block 2', 'Jauhar Block 2'] },
  { id: 'jauhar-block-3', name: 'Gulistan-e-Jauhar Block 3', nameUrdu: 'گلستان جوہر بلاک ۳', district: 'District East', parentLocality: 'Gulistan-e-Jauhar', category: 'block_sector', aliases: ['Johar Block 3', 'Jauhar Block 3', 'Block 3-A'] },
  { id: 'jauhar-block-4', name: 'Gulistan-e-Jauhar Block 4', nameUrdu: 'گلستان جوہر بلاک ۴', district: 'District East', parentLocality: 'Gulistan-e-Jauhar', category: 'block_sector', aliases: ['Johar Block 4', 'Jauhar Block 4'] },
  { id: 'jauhar-block-5', name: 'Gulistan-e-Jauhar Block 5', nameUrdu: 'گلستان جوہر بلاک ۵', district: 'District East', parentLocality: 'Gulistan-e-Jauhar', category: 'block_sector', aliases: ['Johar Block 5', 'Jauhar Block 5'] },
  { id: 'jauhar-block-6', name: 'Gulistan-e-Jauhar Block 6', nameUrdu: 'گلستان جوہر بلاک ۶', district: 'District East', parentLocality: 'Gulistan-e-Jauhar', category: 'block_sector', aliases: ['Johar Block 6', 'Jauhar Block 6'] },
  { id: 'jauhar-block-7', name: 'Gulistan-e-Jauhar Block 7', nameUrdu: 'گلستان جوہر بلاک ۷', district: 'District East', parentLocality: 'Gulistan-e-Jauhar', category: 'block_sector', aliases: ['Johar Block 7', 'Jauhar Block 7'] },
  { id: 'jauhar-block-8', name: 'Gulistan-e-Jauhar Block 8', nameUrdu: 'گلستان جوہر بلاک ۸', district: 'District East', parentLocality: 'Gulistan-e-Jauhar', category: 'block_sector', aliases: ['Johar Block 8', 'Jauhar Block 8', 'Block 8-A'] },
  { id: 'jauhar-block-9', name: 'Gulistan-e-Jauhar Block 9', nameUrdu: 'گلستان جوہر بلاک ۹', district: 'District East', parentLocality: 'Gulistan-e-Jauhar', category: 'block_sector', aliases: ['Johar Block 9', 'Jauhar Block 9'] },
  { id: 'jauhar-block-10', name: 'Gulistan-e-Jauhar Block 10', nameUrdu: 'گلستان جوہر بلاک ۱۰', district: 'District East', parentLocality: 'Gulistan-e-Jauhar', category: 'block_sector', aliases: ['Johar Block 10', 'Jauhar Block 10'] },
  { id: 'jauhar-block-11', name: 'Gulistan-e-Jauhar Block 11', nameUrdu: 'گلستان جوہر بلاک ۱۱', district: 'District East', parentLocality: 'Gulistan-e-Jauhar', category: 'block_sector', aliases: ['Johar Block 11', 'Jauhar Block 11'] },
  { id: 'jauhar-block-12', name: 'Gulistan-e-Jauhar Block 12', nameUrdu: 'گلستان جوہر بلاک ۱۲', district: 'District East', parentLocality: 'Gulistan-e-Jauhar', category: 'block_sector', aliases: ['Johar Block 12', 'Jauhar Block 12'] },
  { id: 'jauhar-block-13', name: 'Gulistan-e-Jauhar Block 13', nameUrdu: 'گلستان جوہر بلاک ۱۳', district: 'District East', parentLocality: 'Gulistan-e-Jauhar', category: 'block_sector', aliases: ['Johar Block 13', 'Jauhar Block 13'] },
  { id: 'jauhar-block-14', name: 'Gulistan-e-Jauhar Block 14', nameUrdu: 'گلستان جوہر بلاک ۱۴', district: 'District East', parentLocality: 'Gulistan-e-Jauhar', category: 'block_sector', aliases: ['Johar Block 14', 'Jauhar Block 14'] },
  { id: 'jauhar-block-15', name: 'Gulistan-e-Jauhar Block 15', nameUrdu: 'گلستان جوہر بلاک ۱۵', district: 'District East', parentLocality: 'Gulistan-e-Jauhar', category: 'block_sector', aliases: ['Johar Block 15', 'Jauhar Block 15'] },
  { id: 'jauhar-block-16', name: 'Gulistan-e-Jauhar Block 16', nameUrdu: 'گلستان جوہر بلاک ۱۶', district: 'District East', parentLocality: 'Gulistan-e-Jauhar', category: 'block_sector', aliases: ['Johar Block 16', 'Jauhar Block 16', 'Block 16-A'] },
  { id: 'jauhar-block-17', name: 'Gulistan-e-Jauhar Block 17', nameUrdu: 'گلستان جوہر بلاک ۱۷', district: 'District East', parentLocality: 'Gulistan-e-Jauhar', category: 'block_sector', aliases: ['Johar Block 17', 'Jauhar Block 17'] },
  { id: 'jauhar-block-18', name: 'Gulistan-e-Jauhar Block 18', nameUrdu: 'گلستان جوہر بلاک ۱۸', district: 'District East', parentLocality: 'Gulistan-e-Jauhar', category: 'block_sector', aliases: ['Johar Block 18', 'Jauhar Block 18'] },
  { id: 'jauhar-block-19', name: 'Gulistan-e-Jauhar Block 19', nameUrdu: 'گلستان جوہر بلاک ۱۹', district: 'District East', parentLocality: 'Gulistan-e-Jauhar', category: 'block_sector', aliases: ['Johar Block 19', 'Jauhar Block 19'] },
  { id: 'jauhar-block-20', name: 'Gulistan-e-Jauhar Block 20', nameUrdu: 'گلستان جوہر بلاک ۲۰', district: 'District East', parentLocality: 'Gulistan-e-Jauhar', category: 'block_sector', aliases: ['Johar Block 20', 'Jauhar Block 20'] },
  { id: 'scheme-33', name: 'Scheme 33 (Gulzar-e-Hijri)', nameUrdu: 'اسکیم ۳۳ (گلزار ہجری)', district: 'District East', subdivision: 'gulzar-e-hijri', town: 'sohrab-goth-town', category: 'housing_scheme', aliases: ['Scheme 33', 'Gulzar e Hijri', 'Gulzar-e-Hijri'] },
  { id: 'safoora-goth', name: 'Safoora Goth', nameUrdu: 'صفورہ گوٹھ', district: 'District East', subdivision: 'gulzar-e-hijri', town: 'safoora-town', category: 'village_goth', aliases: ['Safoora', 'Safoora Chowrangi'] },
  { id: 'saadi-town', name: 'Saadi Town', nameUrdu: 'سعدی ٹاؤن', district: 'District Malir', subdivision: 'gadap', category: 'housing_scheme', aliases: ['Saadi Town Blocks 1-7'] },
  { id: 'saadi-garden', name: 'Saadi Garden', nameUrdu: 'سعدی گارڈن', district: 'District Malir', subdivision: 'gadap', category: 'housing_scheme' },

  // =========================================================================
  // PECHS, JAMSHED QUARTERS, MEHMOODABAD (District East)
  // =========================================================================
  { id: 'pechs', name: 'PECHS', nameUrdu: 'پی ای سی ایچ ایس', district: 'District East', subdivision: 'jamshed-quarters', town: 'jamshed-town', category: 'housing_scheme', aliases: ['P.E.C.H.S', 'PECHS Karachi', 'Tariq Road'] },
  { id: 'pechs-block-1', name: 'PECHS Block 1', nameUrdu: 'پی ای سی ایچ ایس بلاک ۱', district: 'District East', parentLocality: 'PECHS', category: 'block_sector' },
  { id: 'pechs-block-2', name: 'PECHS Block 2', nameUrdu: 'پی ای سی ایچ ایس بلاک ۲', district: 'District East', parentLocality: 'PECHS', category: 'block_sector', aliases: ['PECHS Block 2 Tariq Road'] },
  { id: 'pechs-block-3', name: 'PECHS Block 3', nameUrdu: 'پی ای سی ایچ ایس بلاک ۳', district: 'District East', parentLocality: 'PECHS', category: 'block_sector' },
  { id: 'pechs-block-6', name: 'PECHS Block 6', nameUrdu: 'پی ای سی ایچ ایس بلاک ۶', district: 'District East', parentLocality: 'PECHS', category: 'block_sector', aliases: ['PECHS Nursery', 'PECHS Block 6'] },
  { id: 'bahadurabad', name: 'Bahadurabad', nameUrdu: 'بہادر آباد', district: 'District East', subdivision: 'ferozabad', category: 'neighbourhood', aliases: ['Bahadur Yar Jang Society', 'Bahadurabad Chowrangi'] },
  { id: 'dhoraji-colony', name: 'Dhoraji Colony', nameUrdu: 'دھوراجی کالونی', district: 'District East', subdivision: 'ferozabad', category: 'colony', aliases: ['Dhoraji'] },
  { id: 'sharfabad', name: 'Sharfabad', nameUrdu: 'شرف آباد', district: 'District East', subdivision: 'ferozabad', category: 'neighbourhood' },
  { id: 'mohammad-ali-society', name: 'Mohammad Ali Society (MACHS)', nameUrdu: 'محمد علی سوسائٹی', district: 'District East', subdivision: 'ferozabad', category: 'housing_scheme', aliases: ['MACHS', 'M.A.C.H.S'] },
  { id: 'delhi-mercantile', name: 'Delhi Mercantile Society', nameUrdu: 'دہلی مرکنٹائل سوسائٹی', district: 'District East', subdivision: 'ferozabad', category: 'housing_scheme' },
  { id: 'mehmoodabad', name: 'Mehmoodabad', nameUrdu: 'محمود آباد', district: 'District East', subdivision: 'jamshed-quarters', town: 'chanesar-town', category: 'neighbourhood', aliases: ['Mahmoodabad'] },
  { id: 'akhtar-colony', name: 'Akhtar Colony', nameUrdu: 'اختر کالونی', district: 'District East', subdivision: 'jamshed-quarters', town: 'chanesar-town', category: 'colony' },
  { id: 'manzoor-colony', name: 'Manzoor Colony', nameUrdu: 'منظور کالونی', district: 'District East', subdivision: 'jamshed-quarters', town: 'chanesar-town', category: 'colony' },
  { id: 'azam-basti', name: 'Azam Basti', nameUrdu: 'اعظم بستی', district: 'District East', subdivision: 'jamshed-quarters', town: 'chanesar-town', category: 'colony' },
  { id: 'chanesar-goth', name: 'Chanesar Goth', nameUrdu: 'چنیسر گوٹھ', district: 'District East', subdivision: 'jamshed-quarters', town: 'chanesar-town', category: 'village_goth' },
  { id: 'jamshed-quarters', name: 'Jamshed Quarters', nameUrdu: 'جمشید کوارٹرز', district: 'District East', subdivision: 'jamshed-quarters', town: 'jamshed-town', category: 'neighbourhood' },
  { id: 'soldier-bazar', name: 'Soldier Bazar', nameUrdu: 'سولجر بازار', district: 'District East', subdivision: 'jamshed-quarters', category: 'commercial_area', aliases: ['Soldier Bazaar'] },
  { id: 'garden-east', name: 'Garden East', nameUrdu: 'گارڈن ایسٹ', district: 'District East', subdivision: 'jamshed-quarters', category: 'neighbourhood' },
  { id: 'pakistan-quarters', name: 'Pakistan Quarters', nameUrdu: 'پاکستان کوارٹرز', district: 'District East', subdivision: 'jamshed-quarters', category: 'colony' },

  // =========================================================================
  // FEDERAL B AREA & CENTRAL (District Central)
  // =========================================================================
  { id: 'federal-b-area', name: 'Federal B Area', nameUrdu: 'فیڈرل بی ایریا', district: 'District Central', subdivision: 'gulberg', town: 'gulberg-town', category: 'neighbourhood', aliases: ['FB Area', 'F.B. Area', 'Fed B Area', 'Federal B'] },
  { id: 'fb-area-block-1', name: 'Federal B Area Block 1 (Samnabad)', nameUrdu: 'بلاک ۱ (سمن آباد)', district: 'District Central', parentLocality: 'Federal B Area', category: 'block_sector', aliases: ['FB Area Block 1'] },
  { id: 'fb-area-block-2', name: 'Federal B Area Block 2', nameUrdu: 'بلاک ۲', district: 'District Central', parentLocality: 'Federal B Area', category: 'block_sector', aliases: ['FB Area Block 2'] },
  { id: 'fb-area-block-3', name: 'Federal B Area Block 3', nameUrdu: 'بلاک ۳', district: 'District Central', parentLocality: 'Federal B Area', category: 'block_sector', aliases: ['FB Area Block 3'] },
  { id: 'fb-area-block-4', name: 'Federal B Area Block 4', nameUrdu: 'بلاک ۴', district: 'District Central', parentLocality: 'Federal B Area', category: 'block_sector', aliases: ['FB Area Block 4'] },
  { id: 'fb-area-block-5', name: 'Federal B Area Block 5', nameUrdu: 'بلاک ۵', district: 'District Central', parentLocality: 'Federal B Area', category: 'block_sector', aliases: ['FB Area Block 5'] },
  { id: 'fb-area-block-6', name: 'Federal B Area Block 6', nameUrdu: 'بلاک ۶', district: 'District Central', parentLocality: 'Federal B Area', category: 'block_sector', aliases: ['FB Area Block 6'] },
  { id: 'fb-area-block-7', name: 'Federal B Area Block 7', nameUrdu: 'بلاک ۷', district: 'District Central', parentLocality: 'Federal B Area', category: 'block_sector', aliases: ['FB Area Block 7'] },
  { id: 'fb-area-block-8', name: 'Federal B Area Block 8 (Yaseenabad)', nameUrdu: 'بلاک ۸ (یاسین آباد)', district: 'District Central', parentLocality: 'Federal B Area', category: 'block_sector', aliases: ['FB Area Block 8', 'Yaseenabad'] },
  { id: 'fb-area-block-9', name: 'Federal B Area Block 9 (Dastagir)', nameUrdu: 'بلاک ۹ (دستگیر)', district: 'District Central', parentLocality: 'Federal B Area', category: 'block_sector', aliases: ['FB Area Block 9', 'Dastagir'] },
  { id: 'fb-area-block-10', name: 'Federal B Area Block 10 (Aisha Manzil)', nameUrdu: 'بلاک ۱۰ (عائشہ منزل)', district: 'District Central', parentLocality: 'Federal B Area', category: 'block_sector', aliases: ['FB Area Block 10', 'Aisha Manzil'] },
  { id: 'fb-area-block-11', name: 'Federal B Area Block 11', nameUrdu: 'بلاک ۱۱', district: 'District Central', parentLocality: 'Federal B Area', category: 'block_sector', aliases: ['FB Area Block 11'] },
  { id: 'fb-area-block-12', name: 'Federal B Area Block 12', nameUrdu: 'بلاک ۱۲', district: 'District Central', parentLocality: 'Federal B Area', category: 'block_sector', aliases: ['FB Area Block 12'] },
  { id: 'fb-area-block-13', name: 'Federal B Area Block 13', nameUrdu: 'بلاک ۱۳', district: 'District Central', parentLocality: 'Federal B Area', category: 'block_sector', aliases: ['FB Area Block 13'] },
  { id: 'fb-area-block-14', name: 'Federal B Area Block 14 (Naseerabad)', nameUrdu: 'بلاک ۱۴ (نصیر آباد)', district: 'District Central', parentLocality: 'Federal B Area', category: 'block_sector', aliases: ['FB Area Block 14', 'Naseerabad'] },
  { id: 'fb-area-block-15', name: 'Federal B Area Block 15', nameUrdu: 'بلاک ۱۵', district: 'District Central', parentLocality: 'Federal B Area', category: 'block_sector', aliases: ['FB Area Block 15'] },
  { id: 'fb-area-block-16', name: 'Federal B Area Block 16 (Water Pump)', nameUrdu: 'بلاک ۱۶ (واٹر پمپ)', district: 'District Central', parentLocality: 'Federal B Area', category: 'block_sector', aliases: ['FB Area Block 16', 'Water Pump'] },
  { id: 'fb-area-block-17', name: 'Federal B Area Block 17', nameUrdu: 'بلاک ۱۷', district: 'District Central', parentLocality: 'Federal B Area', category: 'block_sector', aliases: ['FB Area Block 17'] },
  { id: 'fb-area-block-18', name: 'Federal B Area Block 18', nameUrdu: 'بلاک ۱۸', district: 'District Central', parentLocality: 'Federal B Area', category: 'block_sector', aliases: ['FB Area Block 18'] },
  { id: 'fb-area-block-19', name: 'Federal B Area Block 19', nameUrdu: 'بلاک ۱۹', district: 'District Central', parentLocality: 'Federal B Area', category: 'block_sector', aliases: ['FB Area Block 19'] },
  { id: 'fb-area-block-20', name: 'Federal B Area Block 20 (Ancholi)', nameUrdu: 'بلاک ۲۰ (انچولی)', district: 'District Central', parentLocality: 'Federal B Area', category: 'block_sector', aliases: ['FB Area Block 20', 'Ancholi', 'Incholi'] },
  { id: 'fb-area-block-21', name: 'Federal B Area Block 21', nameUrdu: 'بلاک ۲۱', district: 'District Central', parentLocality: 'Federal B Area', category: 'block_sector', aliases: ['FB Area Block 21'] },
  { id: 'azizabad', name: 'Azizabad', nameUrdu: 'عزیز آباد', district: 'District Central', subdivision: 'gulberg', town: 'gulberg-town', category: 'neighbourhood' },
  { id: 'karimabad', name: 'Karimabad', nameUrdu: 'کریم آباد', district: 'District Central', subdivision: 'gulberg', category: 'commercial_area' },
  { id: 'shafiq-mill-colony', name: 'Shafiq Mill Colony', nameUrdu: 'شفیق مل کالونی', district: 'District Central', subdivision: 'gulberg', category: 'colony' },

  // =========================================================================
  // NORTH NAZIMABAD & NAZIMABAD (District Central)
  // =========================================================================
  { id: 'north-nazimabad', name: 'North Nazimabad', nameUrdu: 'نارتھ ناظم آباد', district: 'District Central', subdivision: 'north-nazimabad', town: 'north-nazimabad-town', category: 'neighbourhood', aliases: ['N. Nazimabad', 'North Nazim'] },
  { id: 'nn-block-a', name: 'North Nazimabad Block A', nameUrdu: 'نارتھ ناظم آباد بلاک اے', district: 'District Central', parentLocality: 'North Nazimabad', category: 'block_sector' },
  { id: 'nn-block-b', name: 'North Nazimabad Block B', nameUrdu: 'نارتھ ناظم آباد بلاک بی', district: 'District Central', parentLocality: 'North Nazimabad', category: 'block_sector' },
  { id: 'nn-block-c', name: 'North Nazimabad Block C', nameUrdu: 'نارتھ ناظم آباد بلاک سی', district: 'District Central', parentLocality: 'North Nazimabad', category: 'block_sector' },
  { id: 'nn-block-d', name: 'North Nazimabad Block D', nameUrdu: 'نارتھ ناظم آباد بلاک ڈی', district: 'District Central', parentLocality: 'North Nazimabad', category: 'block_sector' },
  { id: 'nn-block-f', name: 'North Nazimabad Block F', nameUrdu: 'نارتھ ناظم آباد بلاک ایف', district: 'District Central', parentLocality: 'North Nazimabad', category: 'block_sector' },
  { id: 'nn-block-g', name: 'North Nazimabad Block G', nameUrdu: 'نارتھ ناظم آباد بلاک جی', district: 'District Central', parentLocality: 'North Nazimabad', category: 'block_sector' },
  { id: 'nn-block-h', name: 'North Nazimabad Block H (Hyderi)', nameUrdu: 'نارتھ ناظم آباد بلاک ایچ (حیدری)', district: 'District Central', parentLocality: 'North Nazimabad', category: 'block_sector', aliases: ['Hyderi Market', 'Hyderi'] },
  { id: 'nn-block-i', name: 'North Nazimabad Block I', nameUrdu: 'نارتھ ناظم آباد بلاک آئی', district: 'District Central', parentLocality: 'North Nazimabad', category: 'block_sector' },
  { id: 'nn-block-j', name: 'North Nazimabad Block J', nameUrdu: 'نارتھ ناظم آباد بلاک جے', district: 'District Central', parentLocality: 'North Nazimabad', category: 'block_sector' },
  { id: 'nn-block-k', name: 'North Nazimabad Block K', nameUrdu: 'نارتھ ناظم آباد بلاک کے', district: 'District Central', parentLocality: 'North Nazimabad', category: 'block_sector' },
  { id: 'nn-block-l', name: 'North Nazimabad Block L', nameUrdu: 'نارتھ ناظم آباد بلاک ایل', district: 'District Central', parentLocality: 'North Nazimabad', category: 'block_sector' },
  { id: 'nn-block-m', name: 'North Nazimabad Block M', nameUrdu: 'نارتھ ناظم آباد بلاک ایم', district: 'District Central', parentLocality: 'North Nazimabad', category: 'block_sector' },
  { id: 'nn-block-n', name: 'North Nazimabad Block N (Sakhi Hassan)', nameUrdu: 'نارتھ ناظم آباد بلاک این (سخی حسن)', district: 'District Central', parentLocality: 'North Nazimabad', category: 'block_sector', aliases: ['Sakhi Hassan'] },
  { id: 'nn-block-q', name: 'North Nazimabad Block Q', nameUrdu: 'نارتھ ناظم آباد بلاک کیو', district: 'District Central', parentLocality: 'North Nazimabad', category: 'block_sector' },
  { id: 'nn-block-r', name: 'North Nazimabad Block R', nameUrdu: 'نارتھ ناظم آباد بلاک آر', district: 'District Central', parentLocality: 'North Nazimabad', category: 'block_sector' },
  { id: 'nn-block-s', name: 'North Nazimabad Block S', nameUrdu: 'نارتھ ناظم آباد بلاک ایس', district: 'District Central', parentLocality: 'North Nazimabad', category: 'block_sector' },
  { id: 'nn-block-t', name: 'North Nazimabad Block T', nameUrdu: 'نارتھ ناظم آباد بلاک ٹی', district: 'District Central', parentLocality: 'North Nazimabad', category: 'block_sector' },
  { id: 'shadman-town', name: 'Shadman Town', nameUrdu: 'شادمان ٹاؤن', district: 'District Central', subdivision: 'north-nazimabad', category: 'neighbourhood' },
  { id: 'buffer-zone', name: 'Buffer Zone', nameUrdu: 'بفر زون', district: 'District Central', subdivision: 'north-nazimabad', category: 'neighbourhood', aliases: ['Buffer Zone 15-A', 'Buffer Zone 15-B'] },
  { id: 'nazimabad', name: 'Nazimabad', nameUrdu: 'ناظم آباد', district: 'District Central', subdivision: 'nazimabad', town: 'nazimabad-town', category: 'neighbourhood', aliases: ['Nazimabad 1', 'Nazimabad 2', 'Nazimabad 3', 'Nazimabad 4', 'Nazimabad 5'] },
  { id: 'paposh-nagar', name: 'Paposh Nagar', nameUrdu: 'پاپوش نگر', district: 'District Central', subdivision: 'nazimabad', category: 'neighbourhood' },
  { id: 'rizvia-society', name: 'Rizvia Society', nameUrdu: 'رضویہ سوسائٹی', district: 'District Central', subdivision: 'nazimabad', category: 'colony', aliases: ['Rizvia'] },
  { id: 'firdous-colony', name: 'Firdous Colony', nameUrdu: 'فردوس کالونی', district: 'District Central', subdivision: 'nazimabad', category: 'colony' },
  { id: 'naya-nazimabad', name: 'Naya Nazimabad', nameUrdu: 'نیا ناظم آباد', district: 'District Central', subdivision: 'north-nazimabad', category: 'housing_scheme', aliases: ['New Nazimabad', 'Naya Nazimabad Scheme'] },
  { id: 'liaquatabad', name: 'Liaquatabad', nameUrdu: 'لیاقت آباد', district: 'District Central', subdivision: 'liaquatabad', town: 'liaquatabad-town', category: 'neighbourhood', aliases: ['Lalu Khet', 'Liaquatabad No 1-10', 'Dak Khana', 'Super Market'] },

  // =========================================================================
  // NEW KARACHI & NORTH KARACHI (District Central)
  // =========================================================================
  { id: 'north-karachi', name: 'North Karachi', nameUrdu: 'نارتھ کراچی', district: 'District Central', subdivision: 'new-karachi', town: 'new-karachi-town', category: 'neighbourhood', aliases: ['New Karachi', 'N. Karachi'] },
  { id: 'nk-sector-5c', name: 'North Karachi Sector 5-C', nameUrdu: 'نارتھ کراچی سیکٹر ۵-سی', district: 'District Central', parentLocality: 'North Karachi', category: 'block_sector', aliases: ['Sector 5C', '5-C/1', '5-C/2', '5-C/3', '5-C/4'] },
  { id: 'nk-sector-7d', name: 'North Karachi Sector 7-D', nameUrdu: 'نارتھ کراچی سیکٹر ۷-ڈی', district: 'District Central', parentLocality: 'North Karachi', category: 'block_sector', aliases: ['Sector 7D', '7-D1', '7-D2', '7-D3'] },
  { id: 'nk-sector-8', name: 'North Karachi Sector 8', nameUrdu: 'نارتھ کراچی سیکٹر ۸', district: 'District Central', parentLocality: 'North Karachi', category: 'block_sector', aliases: ['Sector 8 North Karachi'] },
  { id: 'nk-sector-9', name: 'North Karachi Sector 9', nameUrdu: 'نارتھ کراچی سیکٹر ۹', district: 'District Central', parentLocality: 'North Karachi', category: 'block_sector' },
  { id: 'nk-sector-10', name: 'North Karachi Sector 10', nameUrdu: 'نارتھ کراچی سیکٹر ۱۰', district: 'District Central', parentLocality: 'North Karachi', category: 'block_sector' },
  { id: 'nk-sector-11a', name: 'North Karachi Sector 11-A', nameUrdu: 'نارتھ کراچی سیکٹر ۱۱-اے', district: 'District Central', parentLocality: 'North Karachi', category: 'block_sector', aliases: ['Sector 11A'] },
  { id: 'nk-sector-11b', name: 'North Karachi Sector 11-B', nameUrdu: 'نارتھ کراچی سیکٹر ۱۱-بی', district: 'District Central', parentLocality: 'North Karachi', category: 'block_sector', aliases: ['Sector 11B', 'Nagan Chowrangi'] },
  { id: 'nk-sector-11c', name: 'North Karachi Sector 11-C', nameUrdu: 'نارتھ کراچی سیکٹر ۱۱-سی', district: 'District Central', parentLocality: 'North Karachi', category: 'block_sector', aliases: ['Sector 11C', '11-C/1', '11-C/2', '11-C/3'] },
  { id: 'nk-sector-11e', name: 'North Karachi Sector 11-E', nameUrdu: 'نارتھ کراچی سیکٹر ۱۱-ای', district: 'District Central', parentLocality: 'North Karachi', category: 'block_sector', aliases: ['Sector 11E'] },
  { id: 'nk-sector-11h', name: 'North Karachi Sector 11-H', nameUrdu: 'نارتھ کراچی سیکٹر ۱۱-ایچ', district: 'District Central', parentLocality: 'North Karachi', category: 'block_sector', aliases: ['Sector 11H'] },
  { id: 'nk-sector-11k', name: 'North Karachi Sector 11-K', nameUrdu: 'نارتھ کراچی سیکٹر ۱۱-کے', district: 'District Central', parentLocality: 'North Karachi', category: 'block_sector', aliases: ['Sector 11K', 'Godhra'] },
  { id: 'sir-syed-colony', name: 'Sir Syed Colony', nameUrdu: 'سر سید کالونی', district: 'District Central', subdivision: 'new-karachi', category: 'colony' },
  { id: 'fatima-jinnah-colony', name: 'Fatima Jinnah Colony', nameUrdu: 'فاطمہ جناح کالونی', district: 'District Central', subdivision: 'new-karachi', category: 'colony' },
  { id: 'khawaja-ajmer-nagri', name: 'Khawaja Ajmer Nagri', nameUrdu: 'خواجہ اجمیر نگری', district: 'District Central', subdivision: 'new-karachi', category: 'neighbourhood' },

  // =========================================================================
  // SURJANI TOWN (District West)
  // =========================================================================
  { id: 'surjani-town', name: 'Surjani Town', nameUrdu: 'سرجانی ٹاؤن', district: 'District West', subdivision: 'mangopir', town: 'manghopir-town', category: 'neighbourhood', aliases: ['Surjani'] },
  { id: 'surjani-sector-4a', name: 'Surjani Town Sector 4-A', nameUrdu: 'سرجانی ٹاؤن سیکٹر ۴-اے', district: 'District West', parentLocality: 'Surjani Town', category: 'block_sector', aliases: ['Surjani 4A'] },
  { id: 'surjani-sector-5d', name: 'Surjani Town Sector 5-D', nameUrdu: 'سرجانی ٹاؤن سیکٹر ۵-ڈی', district: 'District West', parentLocality: 'Surjani Town', category: 'block_sector', aliases: ['Surjani 5D'] },
  { id: 'surjani-sector-7a', name: 'Surjani Town Sector 7-A', nameUrdu: 'سرجانی ٹاؤن سیکٹر ۷-اے', district: 'District West', parentLocality: 'Surjani Town', category: 'block_sector', aliases: ['Surjani 7A'] },
  { id: 'khuda-ki-basti', name: 'Khuda Ki Basti', nameUrdu: 'خدا کی بستی', district: 'District West', parentLocality: 'Surjani Town', category: 'colony' },

  // =========================================================================
  // CLIFTON & DHA DEFENCE (District South)
  // =========================================================================
  { id: 'clifton', name: 'Clifton', nameUrdu: 'کلفٹن', district: 'District South', subdivision: 'civil-lines', town: 'saddar-town', category: 'neighbourhood', aliases: ['Clifton Karachi'] },
  { id: 'clifton-block-1', name: 'Clifton Block 1', nameUrdu: 'کلفٹن بلاک ۱', district: 'District South', parentLocality: 'Clifton', category: 'block_sector' },
  { id: 'clifton-block-2', name: 'Clifton Block 2', nameUrdu: 'کلفٹن بلاک ۲', district: 'District South', parentLocality: 'Clifton', category: 'block_sector', aliases: ['Bilawal House'] },
  { id: 'clifton-block-3', name: 'Clifton Block 3', nameUrdu: 'کلفٹن بلاک ۳', district: 'District South', parentLocality: 'Clifton', category: 'block_sector' },
  { id: 'clifton-block-4', name: 'Clifton Block 4', nameUrdu: 'کلفٹن بلاک ۴', district: 'District South', parentLocality: 'Clifton', category: 'block_sector' },
  { id: 'clifton-block-5', name: 'Clifton Block 5 (Kehkashan)', nameUrdu: 'کلفٹن بلاک ۵ (کہکشاں)', district: 'District South', parentLocality: 'Clifton', category: 'block_sector', aliases: ['Kehkashan', 'Boat Basin'] },
  { id: 'clifton-block-6', name: 'Clifton Block 6', nameUrdu: 'کلفٹن بلاک ۶', district: 'District South', parentLocality: 'Clifton', category: 'block_sector' },
  { id: 'clifton-block-7', name: 'Clifton Block 7', nameUrdu: 'کلفٹن بلاک ۷', district: 'District South', parentLocality: 'Clifton', category: 'block_sector' },
  { id: 'clifton-block-8', name: 'Clifton Block 8', nameUrdu: 'کلفٹن بلاک ۸', district: 'District South', parentLocality: 'Clifton', category: 'block_sector' },
  { id: 'clifton-block-9', name: 'Clifton Block 9 (Sea View)', nameUrdu: 'کلفٹن بلاک ۹ (سی ویو)', district: 'District South', parentLocality: 'Clifton', category: 'block_sector', aliases: ['Sea View', 'Do Darya'] },
  { id: 'bath-island', name: 'Bath Island', nameUrdu: 'باتھ آئی لینڈ', district: 'District South', subdivision: 'civil-lines', category: 'neighbourhood' },
  { id: 'frere-town', name: 'Frere Town', nameUrdu: 'فریئر ٹاؤن', district: 'District South', subdivision: 'civil-lines', category: 'neighbourhood' },
  { id: 'dha-defence', name: 'DHA Defence', nameUrdu: 'ڈی ایچ اے ڈیفنس', district: 'District South', subdivision: 'civil-lines', category: 'housing_scheme', aliases: ['DHA', 'Defence', 'Defense', 'D.H.A.'] },
  { id: 'dha-phase-1', name: 'DHA Phase 1', nameUrdu: 'ڈی ایچ اے فیز ۱', district: 'District South', parentLocality: 'DHA Defence', category: 'block_sector', aliases: ['Defence Phase 1'] },
  { id: 'dha-phase-2', name: 'DHA Phase 2', nameUrdu: 'ڈی ایچ اے فیز ۲', district: 'District South', parentLocality: 'DHA Defence', category: 'block_sector', aliases: ['Defence Phase 2', 'Phase 2 Extension'] },
  { id: 'dha-phase-4', name: 'DHA Phase 4', nameUrdu: 'ڈی ایچ اے فیز ۴', district: 'District South', parentLocality: 'DHA Defence', category: 'block_sector', aliases: ['Defence Phase 4'] },
  { id: 'dha-phase-5', name: 'DHA Phase 5', nameUrdu: 'ڈی ایچ اے فیز ۵', district: 'District South', parentLocality: 'DHA Defence', category: 'block_sector', aliases: ['Defence Phase 5', 'Zamzama', 'Khayaban-e-Shamsheer', 'Badar Commercial'] },
  { id: 'dha-phase-6', name: 'DHA Phase 6', nameUrdu: 'ڈی ایچ اے فیز ۶', district: 'District South', parentLocality: 'DHA Defence', category: 'block_sector', aliases: ['Defence Phase 6', 'Bukhari Commercial', 'Shahbaz Commercial'] },
  { id: 'dha-phase-7', name: 'DHA Phase 7', nameUrdu: 'ڈی ایچ اے فیز ۷', district: 'District South', parentLocality: 'DHA Defence', category: 'block_sector', aliases: ['Defence Phase 7', 'Phase 7 Extension', 'Sehar Commercial'] },
  { id: 'dha-phase-8', name: 'DHA Phase 8', nameUrdu: 'ڈی ایچ اے فیز ۸', district: 'District South', parentLocality: 'DHA Defence', category: 'block_sector', aliases: ['Defence Phase 8', 'Do Darya', 'Creek Marina'] },
  { id: 'gizri', name: 'Gizri', nameUrdu: 'گیزری', district: 'District South', subdivision: 'civil-lines', category: 'neighbourhood', aliases: ['Upper Gizri', 'Lower Gizri'] },
  { id: 'punjab-colony', name: 'Punjab Colony', nameUrdu: 'پنجاب کالونی', district: 'District South', subdivision: 'civil-lines', category: 'colony' },
  { id: 'delhi-colony', name: 'Delhi Colony', nameUrdu: 'دہلی کالونی', district: 'District South', subdivision: 'civil-lines', category: 'colony' },

  // =========================================================================
  // SADDAR, OLD CITY & LYARI (District South)
  // =========================================================================
  { id: 'saddar', name: 'Saddar', nameUrdu: 'صدر', district: 'District South', subdivision: 'saddar', town: 'saddar-town', category: 'commercial_area', aliases: ['Saddar Bazaar', 'Empress Market', 'Regal Chowk'] },
  { id: 'civil-lines', name: 'Civil Lines', nameUrdu: 'سول لائنز', district: 'District South', subdivision: 'civil-lines', category: 'neighbourhood', aliases: ['Karachi Club Area', 'Commissioner House'] },
  { id: 'arambagh', name: 'Arambagh', nameUrdu: 'آرام باغ', district: 'District South', subdivision: 'arambagh', category: 'neighbourhood', aliases: ['Ram Bagh'] },
  { id: 'burns-road', name: 'Burns Road', nameUrdu: 'برنس روڈ', district: 'District South', subdivision: 'arambagh', category: 'commercial_area', aliases: ['Burns Rd', 'Food Street Burns Road'] },
  { id: 'pakistan-chowk', name: 'Pakistan Chowk', nameUrdu: 'پاکستان چوک', district: 'District South', subdivision: 'arambagh', category: 'commercial_area' },
  { id: 'ranchore-line', name: 'Ranchore Line', nameUrdu: 'رنچھوڑ لائن', district: 'District South', subdivision: 'garden', category: 'neighbourhood' },
  { id: 'kharadar', name: 'Kharadar', nameUrdu: 'کھارادر', district: 'District South', subdivision: 'saddar', category: 'neighbourhood', aliases: ['Kharadar Market'] },
  { id: 'mithadar', name: 'Mithadar', nameUrdu: 'میٹھادر', district: 'District South', subdivision: 'saddar', category: 'neighbourhood' },
  { id: 'jodia-bazaar', name: 'Jodia Bazaar', nameUrdu: 'جوڑیا بازار', district: 'District South', subdivision: 'saddar', category: 'commercial_area' },
  { id: 'lyari', name: 'Lyari', nameUrdu: 'لیاری', district: 'District South', subdivision: 'lyari', town: 'lyari-town', category: 'neighbourhood', aliases: ['Lyari Town'] },
  { id: 'chakiwara', name: 'Chakiwara', nameUrdu: 'چاکیواڑہ', district: 'District South', subdivision: 'lyari', parentLocality: 'Lyari', category: 'neighbourhood' },
  { id: 'baghdadi', name: 'Baghdadi', nameUrdu: 'بغدادی', district: 'District South', subdivision: 'lyari', parentLocality: 'Lyari', category: 'neighbourhood' },
  { id: 'agra-taj-colony', name: 'Agra Taj Colony', nameUrdu: 'آگرہ تاج کالونی', district: 'District South', subdivision: 'lyari', parentLocality: 'Lyari', category: 'colony' },
  { id: 'bihar-colony', name: 'Bihar Colony', nameUrdu: 'بہار کالونی', district: 'District South', subdivision: 'lyari', parentLocality: 'Lyari', category: 'colony' },
  { id: 'nawabad', name: 'Nawabad', nameUrdu: 'نوا آباد', district: 'District South', subdivision: 'lyari', parentLocality: 'Lyari', category: 'neighbourhood' },

  // =========================================================================
  // KORANGI & SHAH FAISAL (District Korangi)
  // =========================================================================
  { id: 'korangi', name: 'Korangi', nameUrdu: 'کورنگی', district: 'District Korangi', subdivision: 'korangi', town: 'korangi-town', category: 'neighbourhood', aliases: ['Korangi Town'] },
  { id: 'korangi-industrial-area', name: 'Korangi Industrial Area', nameUrdu: 'کورنگی انڈسٹریل ایریا', district: 'District Korangi', subdivision: 'korangi', category: 'industrial_area', aliases: ['KIA'] },
  { id: 'korangi-crossing', name: 'Korangi Crossing', nameUrdu: 'کورنگی کراسنگ', district: 'District Korangi', subdivision: 'korangi', category: 'neighbourhood' },
  { id: 'korangi-creek', name: 'Korangi Creek', nameUrdu: 'کورنگی کریک', district: 'District Korangi', subdivision: 'korangi', category: 'neighbourhood' },
  { id: 'zaman-town', name: 'Zaman Town', nameUrdu: 'زمان ٹاؤن', district: 'District Korangi', subdivision: 'korangi', category: 'neighbourhood' },
  { id: 'chakra-goth', name: 'Chakra Goth', nameUrdu: 'چکرا گوٹھ', district: 'District Korangi', subdivision: 'korangi', category: 'village_goth' },
  { id: 'landhi', name: 'Landhi', nameUrdu: 'لانڈھی', district: 'District Korangi', subdivision: 'landhi', town: 'landhi-town', category: 'neighbourhood', aliases: ['Landhi Town', 'Dawood Chowrangi', 'Babar Market'] },
  { id: 'landhi-industrial-area', name: 'Landhi Industrial Area', nameUrdu: 'لانڈھی انڈسٹریل ایریا', district: 'District Korangi', subdivision: 'landhi', category: 'industrial_area' },
  { id: 'cattle-colony', name: 'Cattle Colony (Bhains Colony)', nameUrdu: 'بھینس کالونی', district: 'District Malir', subdivision: 'bin-qasim', category: 'colony', aliases: ['Bhains Colony'] },
  { id: 'quaidabad', name: 'Quaidabad', nameUrdu: 'قائد آباد', district: 'District Malir', subdivision: 'bin-qasim', category: 'neighbourhood' },
  { id: 'shah-faisal-colony', name: 'Shah Faisal Colony', nameUrdu: 'شاہ فیصل کالونی', district: 'District Korangi', subdivision: 'shah-faisal', town: 'shah-faisal-town', category: 'neighbourhood', aliases: ['Shah Faisal', 'Drigh Road'] },
  { id: 'model-colony', name: 'Model Colony', nameUrdu: 'ماڈل کالونی', district: 'District Korangi', subdivision: 'model-colony', town: 'model-colony-town', category: 'neighbourhood' },
  { id: 'al-falah-society', name: 'Al-Falah Society', nameUrdu: 'الفلاح سوسائٹی', district: 'District Korangi', subdivision: 'shah-faisal', category: 'housing_scheme' },
  { id: 'green-town', name: 'Green Town', nameUrdu: 'گرین ٹاؤن', district: 'District Korangi', subdivision: 'shah-faisal', category: 'colony' },
  { id: 'golden-town', name: 'Golden Town', nameUrdu: 'گولڈن ٹاؤن', district: 'District Korangi', subdivision: 'shah-faisal', category: 'colony' },
  { id: 'shamsi-society', name: 'Shamsi Society', nameUrdu: 'شمسی سوسائٹی', district: 'District Korangi', subdivision: 'shah-faisal', category: 'housing_scheme' },
  { id: 'qayyumabad', name: 'Qayyumabad', nameUrdu: 'قیوم آباد', district: 'District Korangi', subdivision: 'korangi', category: 'neighbourhood' },
  { id: 'defence-view', name: 'Defence View Society', nameUrdu: 'ڈیفنس ویو سوسائٹی', district: 'District Korangi', subdivision: 'korangi', category: 'housing_scheme', aliases: ['Defence View Phase 1', 'Defence View Phase 2'] },

  // =========================================================================
  // MALIR & GADAP (District Malir)
  // =========================================================================
  { id: 'malir-cantt', name: 'Malir Cantonment', nameUrdu: 'ملیر کینٹ', district: 'District Malir', subdivision: 'airport', category: 'neighbourhood', aliases: ['Malir Cantt', 'Cantt Malir'] },
  { id: 'malir-city', name: 'Malir City', nameUrdu: 'ملیر سٹی', district: 'District Malir', subdivision: 'airport', town: 'malir-town', category: 'neighbourhood', aliases: ['Malir Halt', 'Malir 15', 'Kala Board'] },
  { id: 'saudabad', name: 'Saudabad', nameUrdu: 'سعود آباد', district: 'District Malir', subdivision: 'airport', category: 'neighbourhood' },
  { id: 'khokhrapar', name: 'Khokhrapar', nameUrdu: 'کھوکراپار', district: 'District Malir', subdivision: 'airport', category: 'neighbourhood' },
  { id: 'jafar-e-tayyar', name: 'Jafar-e-Tayyar Society', nameUrdu: 'جعفر طیار سوسائٹی', district: 'District Malir', subdivision: 'airport', category: 'housing_scheme' },
  { id: 'airport-area', name: 'Jinnah International Airport Area', nameUrdu: 'کراچی ایئرپورٹ ایریا', district: 'District Malir', subdivision: 'airport', category: 'commercial_area', aliases: ['Airport', 'Star Gate'] },
  { id: 'gulshan-e-hadeed', name: 'Gulshan-e-Hadeed', nameUrdu: 'گلشن حدید', district: 'District Malir', subdivision: 'bin-qasim', category: 'housing_scheme', aliases: ['Hadeed', 'Steel Town', 'Gulshan-e-Hadeed Phase 1', 'Gulshan-e-Hadeed Phase 2'] },
  { id: 'ibrahim-hyderi', name: 'Ibrahim Hyderi', nameUrdu: 'ابراہیم حیدری', district: 'District Malir', subdivision: 'ibrahim-hyderi', town: 'ibrahim-hyderi-town', category: 'village_goth' },
  { id: 'rehri-goth', name: 'Rehri Goth', nameUrdu: 'ریڑھی گوٹھ', district: 'District Malir', subdivision: 'ibrahim-hyderi', category: 'village_goth' },
  { id: 'memon-goth', name: 'Murad Memon Goth', nameUrdu: 'مراد میمن گوٹھ', district: 'District Malir', subdivision: 'murad-memon', category: 'village_goth', aliases: ['Memon Goth'] },
  { id: 'gadap', name: 'Gadap', nameUrdu: 'گڈاپ', district: 'District Malir', subdivision: 'gadap', town: 'gadap-town', category: 'neighbourhood' },
  { id: 'gulshan-e-maymar', name: 'Gulshan-e-Maymar', nameUrdu: 'گلشن معمار', district: 'District Malir', subdivision: 'gadap', category: 'housing_scheme', aliases: ['Maymar', 'Gulshan e Maymar', 'Sectors P-ZA'] },
  { id: 'bahria-town-karachi', name: 'Bahria Town Karachi', nameUrdu: 'بحریہ ٹاؤن کراچی', district: 'District Malir', subdivision: 'gadap', category: 'housing_scheme', aliases: ['Bahria Town', 'BTK', 'Bahria Sports City', 'Bahria Paradise', 'Precincts 1-30'] },
  { id: 'dha-city-karachi', name: 'DHA City Karachi (DCK)', nameUrdu: 'ڈی ایچ اے سٹی کراچی', district: 'District Malir', subdivision: 'gadap', category: 'housing_scheme', aliases: ['DHA City', 'DCK'] },

  // =========================================================================
  // ORANGI, BALDIA, SITE & KEAMARI (Districts West & Keamari)
  // =========================================================================
  { id: 'orangi-town', name: 'Orangi Town', nameUrdu: 'اورنگی ٹاؤن', district: 'District West', subdivision: 'orangi-town', town: 'orangi-town', category: 'neighbourhood', aliases: ['Orangi', 'Banaras', 'Qasba Colony'] },
  { id: 'mominabad', name: 'Mominabad', nameUrdu: 'مومن آباد', district: 'District West', subdivision: 'mominabad', town: 'mominabad-town', category: 'neighbourhood' },
  { id: 'banaras-colony', name: 'Banaras Colony', nameUrdu: 'بنارس کالونی', district: 'District West', subdivision: 'orangi-town', category: 'colony', aliases: ['Banaras Chowk'] },
  { id: 'qasba-colony', name: 'Qasba Colony', nameUrdu: 'قصبہ کالونی', district: 'District West', subdivision: 'orangi-town', category: 'colony' },
  { id: 'baldia-town', name: 'Baldia Town', nameUrdu: 'بلدیہ ٹاؤن', district: 'District Keamari', subdivision: 'baldia', town: 'baldia-town', category: 'neighbourhood', aliases: ['Baldia'] },
  { id: 'saeedabad', name: 'Saeedabad', nameUrdu: 'سعید آباد', district: 'District Keamari', subdivision: 'baldia', category: 'neighbourhood', aliases: ['New Saeedabad'] },
  { id: 'ittehad-town', name: 'Ittehad Town', nameUrdu: 'اتحاد ٹاؤن', district: 'District Keamari', subdivision: 'baldia', category: 'neighbourhood' },
  { id: 'naval-colony', name: 'Naval Colony (Haroon Bahria)', nameUrdu: 'نیول کالونی', district: 'District Keamari', subdivision: 'baldia', category: 'housing_scheme', aliases: ['Haroon Bahria Colony'] },
  { id: 'site-area', name: 'SITE Industrial Area', nameUrdu: 'سائٹ انڈسٹریل ایریا', district: 'District Keamari', subdivision: 'site-keamari', category: 'industrial_area', aliases: ['SITE Karachi', 'S.I.T.E'] },
  { id: 'pak-colony', name: 'Pak Colony', nameUrdu: 'پاک کالونی', district: 'District Keamari', subdivision: 'site-keamari', category: 'colony' },
  { id: 'old-golimar', name: 'Old Golimar', nameUrdu: 'پرانا گولی مار', district: 'District Keamari', subdivision: 'site-keamari', category: 'neighbourhood' },
  { id: 'sher-shah', name: 'Sher Shah', nameUrdu: 'شیر شاہ', district: 'District Keamari', subdivision: 'site-keamari', category: 'commercial_area', aliases: ['Shershah Kabari Market'] },
  { id: 'keamari', name: 'Keamari (Harbour)', nameUrdu: 'کیماڑی', district: 'District Keamari', subdivision: 'harbor', town: 'moriro-mirbahar-town', category: 'neighbourhood', aliases: ['Kimari', 'Kemari', 'Keamari Docks', 'Jackson Bazaar'] },
  { id: 'mauripur', name: 'Mauripur', nameUrdu: 'ماری پور', district: 'District Keamari', subdivision: 'maripur', town: 'mauripur-town', category: 'neighbourhood', aliases: ['Maripur', 'Hawksbay Road'] },
  { id: 'machar-colony', name: 'Machar Colony', nameUrdu: 'مچھر کالونی', district: 'District Keamari', subdivision: 'maripur', category: 'colony', aliases: ['Muhammadi Colony'] },
  { id: 'sultanabad', name: 'Sultanabad', nameUrdu: 'سلطان آباد', district: 'District Keamari', subdivision: 'harbor', category: 'colony' },
  { id: 'hawksbay', name: 'Hawksbay Beach Area', nameUrdu: 'ہاکس بے', district: 'District Keamari', subdivision: 'maripur', category: 'neighbourhood', aliases: ['Hawkesbay', 'Gabo Pat'] },
];
