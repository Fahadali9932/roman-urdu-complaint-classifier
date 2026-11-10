export interface DataSourceMeta {
  sourceName: string;
  sourceUrl: string;
  scope: string;
  dateValidated: string;
}

export const KARACHI_LOCATION_SOURCES: DataSourceMeta[] = [
  {
    sourceName: 'Commissioner Karachi Administrative Directory',
    sourceUrl: 'https://commissionerkarachi.gos.pk/area-map',
    scope: '7 Administrative Districts and 31 Subdivisions',
    dateValidated: 'November 2026',
  },
  {
    sourceName: 'Sindh Local Government Union Committee Notifications',
    sourceUrl: 'https://www.lgdsindh.gov.pk/downloads/UCsKarachi.pdf',
    scope: 'Union Committees, Goths, and Rural Settled Areas',
    dateValidated: 'November 2026',
  },
  {
    sourceName: 'Sindh Government CLICK Locality & UC Directory',
    sourceUrl: 'https://click.gos.pk/karachiuc',
    scope: 'Urban Karachi Neighborhoods and Municipal Clusters',
    dateValidated: 'November 2026',
  },
  {
    sourceName: 'Karachi Development Authority (KDA) Scheme Maps',
    sourceUrl: 'https://www.kda.gos.pk/contents/?id=94',
    scope: 'KDA Schemes, Blocks, and Housing Societies',
    dateValidated: 'November 2026',
  },
  {
    sourceName: 'OpenStreetMap Karachi Urban Baseline',
    sourceUrl: 'https://www.openstreetmap.org',
    scope: 'Residential Colony and Block Boundary Cross-Referencing (ODbL)',
    dateValidated: 'November 2026',
  },
];
