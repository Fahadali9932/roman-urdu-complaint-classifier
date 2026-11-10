import { KarachiDistrict } from '../../types';

export interface SubdivisionInfo {
  id: string;
  name: string;
  nameUrdu: string;
  district: KarachiDistrict;
}

export const KARACHI_SUBDIVISIONS_DATA: SubdivisionInfo[] = [
  // District Central (5)
  { id: 'gulberg', name: 'Gulberg', nameUrdu: 'گلبرگ', district: 'District Central' },
  { id: 'liaquatabad', name: 'Liaquatabad', nameUrdu: 'لیاقت آباد', district: 'District Central' },
  { id: 'nazimabad', name: 'Nazimabad', nameUrdu: 'ناظم آباد', district: 'District Central' },
  { id: 'new-karachi', name: 'New Karachi', nameUrdu: 'نیو کراچی', district: 'District Central' },
  { id: 'north-nazimabad', name: 'North Nazimabad', nameUrdu: 'نارتھ ناظم آباد', district: 'District Central' },

  // District East (4)
  { id: 'ferozabad', name: 'Ferozabad', nameUrdu: 'فیروز آباد', district: 'District East' },
  { id: 'gulshan-e-iqbal', name: 'Gulshan-e-Iqbal', nameUrdu: 'گلشن اقبال', district: 'District East' },
  { id: 'gulzar-e-hijri', name: 'Gulzar-e-Hijri', nameUrdu: 'گلزار ہجری', district: 'District East' },
  { id: 'jamshed-quarters', name: 'Jamshed Quarters', nameUrdu: 'جمشید کوارٹرز', district: 'District East' },

  // District South (5)
  { id: 'arambagh', name: 'Arambagh', nameUrdu: 'آرام باغ', district: 'District South' },
  { id: 'civil-lines', name: 'Civil Lines', nameUrdu: 'سول لائنز', district: 'District South' },
  { id: 'garden', name: 'Garden', nameUrdu: 'گارڈن', district: 'District South' },
  { id: 'lyari', name: 'Lyari', nameUrdu: 'لیاری', district: 'District South' },
  { id: 'saddar', name: 'Saddar', nameUrdu: 'صدر', district: 'District South' },

  // District West (3)
  { id: 'mangopir', name: 'Mangopir', nameUrdu: 'منگھوپیر', district: 'District West' },
  { id: 'mominabad', name: 'Mominabad', nameUrdu: 'مومن آباد', district: 'District West' },
  { id: 'orangi-town', name: 'Orangi Town', nameUrdu: 'اورنگی ٹاؤن', district: 'District West' },

  // District Keamari (4)
  { id: 'baldia', name: 'Baldia', nameUrdu: 'بلدیہ', district: 'District Keamari' },
  { id: 'harbor', name: 'Harbor', nameUrdu: 'ہاربر', district: 'District Keamari' },
  { id: 'maripur', name: 'Maripur', nameUrdu: 'ماری پور', district: 'District Keamari' },
  { id: 'site-keamari', name: 'SITE', nameUrdu: 'سائٹ', district: 'District Keamari' },

  // District Korangi (4)
  { id: 'korangi', name: 'Korangi', nameUrdu: 'کورنگی', district: 'District Korangi' },
  { id: 'landhi', name: 'Landhi', nameUrdu: 'لانڈھی', district: 'District Korangi' },
  { id: 'model-colony', name: 'Model Colony', nameUrdu: 'ماڈل کالونی', district: 'District Korangi' },
  { id: 'shah-faisal', name: 'Shah Faisal', nameUrdu: 'شاہ فیصل', district: 'District Korangi' },

  // District Malir (6)
  { id: 'airport', name: 'Airport', nameUrdu: 'ایئرپورٹ', district: 'District Malir' },
  { id: 'bin-qasim', name: 'Bin Qasim', nameUrdu: 'بن قاسم', district: 'District Malir' },
  { id: 'gadap', name: 'Gadap', nameUrdu: 'گڈاپ', district: 'District Malir' },
  { id: 'ibrahim-hyderi', name: 'Ibrahim Hyderi', nameUrdu: 'ابراہیم حیدری', district: 'District Malir' },
  { id: 'murad-memon', name: 'Murad Memon', nameUrdu: 'مراد میمن', district: 'District Malir' },
  { id: 'shah-mureed', name: 'Shah Mureed', nameUrdu: 'شاہ مرید', district: 'District Malir' },
];
