export interface LegalSectionContent {
  id: string;
  number: string;
  title: string;
  paragraphs: string[];
  bulletPoints?: string[];
  callout?: {
    title: string;
    text: string;
  };
}

export interface LocalizedLegalDocument {
  title: string;
  eyebrow: string;
  subtitle: string;
  effectiveDate: string;
  academicNotice: string;
  tableOfContentsLabel: string;
  sections: LegalSectionContent[];
  returnHomeLabel: string;
  otherDocumentLabel: string;
  otherDocumentTitle: string;
  otherDocumentPath: string;
}

export interface LegalDocumentContent {
  en: LocalizedLegalDocument;
  ur: LocalizedLegalDocument;
}
