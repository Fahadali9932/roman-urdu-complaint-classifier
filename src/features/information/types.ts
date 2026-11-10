export interface InfoSectionContent {
  id: string;
  title: string;
  paragraphs: string[];
  bulletPoints?: string[];
}

export interface LocalizedInfoDocument {
  title: string;
  subtitle?: string;
  returnHomeLabel: string;
  otherDocumentTitle?: string;
  otherDocumentPath?: string;
  sections: InfoSectionContent[];
}

export interface InfoDocumentContent {
  en: LocalizedInfoDocument;
  ur: LocalizedInfoDocument;
}
