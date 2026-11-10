export interface InfoSectionContent {
  id: string;
  number?: string;
  title: string;
  paragraphs: string[];
  bulletPoints?: string[];
  callout?: {
    title: string;
    text: string;
  };
}

export interface LocalizedInfoDocument {
  eyebrow: string;
  title: string;
  subtitle: string;
  academicNotice?: string;
  effectiveDate?: string;
  tableOfContentsLabel?: string;
  returnHomeLabel: string;
  otherDocumentTitle?: string;
  otherDocumentPath?: string;
  sections: InfoSectionContent[];
}

export interface InfoDocumentContent {
  en: LocalizedInfoDocument;
  ur: LocalizedInfoDocument;
}
