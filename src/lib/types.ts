export type JournalId =
  | "jama"
  | "jama-im"
  | "nejm"
  | "jacc"
  | "circulation"
  | "jama-cardio"
  | "ehj"
  | "ajrccm"
  | "chest"
  | "jco"
  | "lancet-onc"
  | "jama-onc";

export type EditorRole = "eic" | "deputy" | "interim-eic";

export type SourceRef = {
  label: string;
  url: string;
  quote?: string;
};

export type InstitutionMember = {
  openAlexId: string;
  displayName: string;
};

export type InstitutionGroup = {
  id: string;
  label: string;
  members: InstitutionMember[];
};

export type EditorTenure = {
  role: EditorRole;
  name: string;
  institutionGroupId: string | null;
  startYear: number | null;
  endYear: number | null;
  sources: SourceRef[];
  gapReason?: string;
};

export type JournalCatalog = {
  id: JournalId;
  name: string;
  shortName: string;
  openAlexId: string;
  issnL: string;
  issns: string[];
  predecessorOpenAlexIds: string[];
  predecessorNote?: string;
  firstYear: number;
  notes: string[];
};

export type YearInstitutionPoint = {
  articles: number;
  share: number;
  controlArticles: number;
  controlTotal: number;
  controlShare: number;
};

export type YearPoint = {
  year: number;
  journalArticles: number;
  byInstitution: Record<string, YearInstitutionPoint>;
};

export type JournalBundle = {
  journal: JournalCatalog;
  editors: EditorTenure[];
  series: YearPoint[];
  trackedInstitutions: InstitutionGroup[];
};

export type DataBundle = {
  fetchedAt: string;
  yearStart: number;
  yearEnd: number;
  workType: "article";
  journals: JournalBundle[];
  institutions: InstitutionGroup[];
  caveats: string[];
};
