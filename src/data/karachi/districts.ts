import { KarachiDistrict } from '../../types';

export interface DistrictInfo {
  id: KarachiDistrict;
  name: string;
  nameUrdu: string;
  headquarters: string;
  subdivisionsCount: number;
}

export const KARACHI_DISTRICTS_DATA: DistrictInfo[] = [
  {
    id: 'District Central',
    name: 'District Central',
    nameUrdu: 'کراچی وسطی',
    headquarters: 'North Nazimabad',
    subdivisionsCount: 5,
  },
  {
    id: 'District East',
    name: 'District East',
    nameUrdu: 'کراچی شرقی',
    headquarters: 'Gulshan-e-Iqbal',
    subdivisionsCount: 4,
  },
  {
    id: 'District South',
    name: 'District South',
    nameUrdu: 'کراچی جنوبی',
    headquarters: 'Saddar',
    subdivisionsCount: 5,
  },
  {
    id: 'District West',
    name: 'District West',
    nameUrdu: 'کراچی غربی',
    headquarters: 'Orangi Town',
    subdivisionsCount: 3,
  },
  {
    id: 'District Keamari',
    name: 'District Keamari',
    nameUrdu: 'ضلع کیماڑی',
    headquarters: 'Mauripur / Keamari',
    subdivisionsCount: 4,
  },
  {
    id: 'District Korangi',
    name: 'District Korangi',
    nameUrdu: 'ضلع کورنگی',
    headquarters: 'Korangi',
    subdivisionsCount: 4,
  },
  {
    id: 'District Malir',
    name: 'District Malir',
    nameUrdu: 'ضلع ملیر',
    headquarters: 'Malir',
    subdivisionsCount: 6,
  },
];
