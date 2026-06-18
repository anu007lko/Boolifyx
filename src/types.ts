export interface SkillItem {
  id: string;
  keyword: string;
  synonyms: string[];
  category: string;
  enabled: boolean;
}

export interface BooleanStringPreset {
  id: string;
  name: string;
  description: string;
  query: string;
}

export interface KeywordClusters {
  primary: string[];
  secondary: string[];
  toolsAndEcosystem: string[];
  alternativeTitles: string[];
  seniorityKeywords: string[];
}

export interface PortalBooleanSet {
  clean: string;
  targeted: string;
  broad: string;
}

export interface PortalBooleans {
  linkedin: PortalBooleanSet;
  jobdiva: PortalBooleanSet;
  xray: PortalBooleanSet;
}

export interface SuggestedFilters {
  locations?: string[];
  targetCompanies?: string[];
  industries?: string[];
  certifications?: string[];
}

export interface JDAnalysisResult {
  summary: string;
  jobTitles: string[];
  mandatorySkills: SkillItem[];
  preferredSkills: SkillItem[];
  excludedKeywords: string[];
  recruiterNotes: string;
  booleanStrings: BooleanStringPreset[];
  fromCache?: boolean;
  fallbackUsed?: boolean;
  
  // Deluxe AI Elite Sourcing Engine Fields
  keywordClusters?: KeywordClusters;
  portalBooleans?: PortalBooleans;
  searchLogicReasoning?: string;
  noiseReductionStrategy?: string;
  suggestedFilters?: SuggestedFilters;
}

export interface SearchProfile {
  id: string;
  title: string;
  jdText: string;
  analyzedAt: string;
  result: JDAnalysisResult;
}
