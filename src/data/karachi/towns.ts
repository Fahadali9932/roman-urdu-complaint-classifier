import { KarachiDistrict } from '../../types';

export interface TownInfo {
  id: string;
  name: string;
  nameUrdu: string;
  district: KarachiDistrict;
}

export const KARACHI_MUNICIPAL_TOWNS: TownInfo[] = [
  // Karachi Central (5)
  { id: 'liaquatabad-town', name: 'Liaquatabad Town', nameUrdu: 'لیاقت آباد ٹاؤن', district: 'District Central' },
  { id: 'nazimabad-town', name: 'Nazimabad Town', nameUrdu: 'ناظم آباد ٹاؤن', district: 'District Central' },
  { id: 'north-nazimabad-town', name: 'North Nazimabad Town', nameUrdu: 'نارتھ ناظم آباد ٹاؤن', district: 'District Central' },
  { id: 'gulberg-town', name: 'Gulberg Town', nameUrdu: 'گلبرگ ٹاؤن', district: 'District Central' },
  { id: 'new-karachi-town', name: 'New Karachi Town', nameUrdu: 'نیو کراچی ٹاؤن', district: 'District Central' },

  // Karachi East (5)
  { id: 'gulshan-iqbal-town', name: 'Gulshan-e-Iqbal Town', nameUrdu: 'گلشن اقبال ٹاؤن', district: 'District East' },
  { id: 'jamshed-town', name: 'Jamshed Town', nameUrdu: 'جمشید ٹاؤن', district: 'District East' },
  { id: 'sohrab-goth-town', name: 'Sohrab Goth Town', nameUrdu: 'سہراب گوٹھ ٹاؤن', district: 'District East' },
  { id: 'safoora-town', name: 'Safoora Town', nameUrdu: 'صفورہ ٹاؤن', district: 'District East' },
  { id: 'chanesar-town', name: 'Chanesar Town', nameUrdu: 'چنیسر ٹاؤن', district: 'District East' },

  // Karachi South (2)
  { id: 'saddar-town', name: 'Saddar Town', nameUrdu: 'صدر ٹاؤن', district: 'District South' },
  { id: 'lyari-town', name: 'Lyari Town', nameUrdu: 'لیاری ٹاؤن', district: 'District South' },

  // Karachi West (3)
  { id: 'orangi-town', name: 'Orangi Town', nameUrdu: 'اورنگی ٹاؤن', district: 'District West' },
  { id: 'mominabad-town', name: 'Mominabad Town', nameUrdu: 'مومن آباد ٹاؤن', district: 'District West' },
  { id: 'manghopir-town', name: 'Manghopir Town', nameUrdu: 'منگھوپیر ٹاؤن', district: 'District West' },

  // District Keamari (3)
  { id: 'baldia-town', name: 'Baldia Town', nameUrdu: 'بلدیہ ٹاؤن', district: 'District Keamari' },
  { id: 'mauripur-town', name: 'Mauripur Town', nameUrdu: 'ماری پور ٹاؤن', district: 'District Keamari' },
  { id: 'moriro-mirbahar-town', name: 'Moriro Mirbahar Town', nameUrdu: 'موریرو میربحر ٹاؤن', district: 'District Keamari' },

  // District Korangi (4)
  { id: 'model-colony-town', name: 'Model Colony Town', nameUrdu: 'ماڈل کالونی ٹاؤن', district: 'District Korangi' },
  { id: 'shah-faisal-town', name: 'Shah Faisal Town', nameUrdu: 'شاہ فیصل ٹاؤن', district: 'District Korangi' },
  { id: 'landhi-town', name: 'Landhi Town', nameUrdu: 'لانڈھی ٹاؤن', district: 'District Korangi' },
  { id: 'korangi-town', name: 'Korangi Town', nameUrdu: 'کورنگی ٹاؤن', district: 'District Korangi' },

  // District Malir (3)
  { id: 'gadap-town', name: 'Gadap Town', nameUrdu: 'گڈاپ ٹاؤن', district: 'District Malir' },
  { id: 'malir-town', name: 'Malir Town', nameUrdu: 'ملیر ٹاؤن', district: 'District Malir' },
  { id: 'ibrahim-hyderi-town', name: 'Ibrahim Hyderi Town', nameUrdu: 'ابراہیم حیدری ٹاؤن', district: 'District Malir' },
];
