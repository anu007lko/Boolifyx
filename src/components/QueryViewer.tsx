import React, { useState } from "react";
import { JDAnalysisResult } from "../types";
import { Copy, Sparkles, Check, BrainCircuit, ShieldAlert, ListFilter, Tag, EyeOff, ClipboardList, Info, Database, FolderOpen } from "lucide-react";

interface QueryViewerProps {
  result: JDAnalysisResult;
  targetPlatform: "xray" | "linkedin" | "jobdiva";
  mode?: "summary" | "blueprints";
  history?: any[];
  onSelectHistory?: (id: string) => void;
  activeProfileId?: string;
}

// Highly optimized dynamic compiler for Boolean query strings based on recruiter best practices
const compileQueries = (result: JDAnalysisResult, platform: "xray" | "linkedin" | "jobdiva") => {
  const activeTitles = (result.jobTitles || []).filter(t => t.trim().length > 0);
  const activeMandatory = (result.mandatorySkills || []).filter(s => s.enabled);
  const activePreferred = (result.preferredSkills || []).filter(s => s.enabled);
  const activeExcludes = (result.excludedKeywords || []).filter(w => w.trim().length > 0);

  // Helper to format words/phrases with double-quotes if they contain space or special characters
  const formatTerm = (term: string) => {
    const trimmed = term.trim();
    if (trimmed.includes(" ") || trimmed.includes("/") || trimmed.includes("-") || trimmed.includes(".")) {
      return `"${trimmed}"`;
    }
    return trimmed;
  };

  // Build the Title block: ("Title 1" OR "Title 2" OR "Title 3")
  let titleBlock = "";
  if (activeTitles.length > 0) {
    titleBlock = `(${activeTitles.map(formatTerm).join(" OR ")})`;
  }

  // Build skill blocks
  const getSkillQueryBlock = (skill: any) => {
    const terms = [skill.keyword, ...(skill.synonyms || [])].filter((v, i, a) => a.indexOf(v) === i && v.trim());
    if (terms.length === 0) return "";
    if (terms.length === 1) return formatTerm(terms[0]);
    return `(${terms.map(formatTerm).join(" OR ")})`;
  };

  // EXCLUSIONS formatting
  let excludeBlock = "";
  if (activeExcludes.length > 0) {
    if (platform === "xray") {
      excludeBlock = activeExcludes.map(w => `-${formatTerm(w)}`).join(" ");
    } else if (platform === "linkedin") {
      excludeBlock = activeExcludes.map(w => `NOT ${formatTerm(w)}`).join(" ");
    } else if (platform === "jobdiva") {
      excludeBlock = activeExcludes.map(w => `-${formatTerm(w)}`).join(" ");
    } else {
      // General fallback
      excludeBlock = `NOT (${activeExcludes.map(formatTerm).join(" OR ")})`;
    }
  }

  // GOOGLE X-RAY prefix
  const prefix = platform === "xray" ? "site:linkedin.com/in/ " : "";
  const xrayGoogleSuffix = platform === "xray" ? " -inurl:dir -intitle:profiles" : "";

  // 1. STRICT MANDATORY blocks
  const skillsBlocks: string[] = [];
  activeMandatory.forEach(s => {
    const b = getSkillQueryBlock(s);
    if (b) skillsBlocks.push(b);
  });

  const combineWithAnd = (segments: string[]) => {
    return segments.filter(Boolean).join(" AND ");
  };

  let comprehensiveQuery = "";
  let technicalQuery = "";
  let broadQuery = "";

  // Target Preferred block
  const prefTerms = activePreferred.flatMap(s => [s.keyword, ...(s.synonyms || [])]).filter((v, i, a) => a.indexOf(v) === i && v.trim());
  const prefOrBlock = prefTerms.length > 0 ? `(${prefTerms.map(formatTerm).join(" OR ")})` : "";

  // Compile Comprehensive Search (Titles AND all Mandatory)
  {
    const positiveParts = [];
    if (titleBlock) positiveParts.push(titleBlock);
    if (skillsBlocks.length > 0) {
      positiveParts.push(...skillsBlocks); // Use ALL mandatory
    }
    const positiveQuery = combineWithAnd(positiveParts);
    
    comprehensiveQuery = prefix + positiveQuery;
    if (excludeBlock) {
      comprehensiveQuery += " " + excludeBlock;
    }
    if (xrayGoogleSuffix) comprehensiveQuery += " " + xrayGoogleSuffix;
  }

  // Compile Deep Technical Sourcing (Titles AND all Mandatory AND at least 1 Preferred)
  {
    const positiveParts = [];
    if (titleBlock) positiveParts.push(titleBlock);
    if (skillsBlocks.length > 0) {
      positiveParts.push(...skillsBlocks);
    }
    if (prefOrBlock) {
      positiveParts.push(prefOrBlock);
    }
    
    const positiveQuery = combineWithAnd(positiveParts);
    technicalQuery = prefix + positiveQuery;
    if (excludeBlock) {
      technicalQuery += " " + excludeBlock;
    }
    if (xrayGoogleSuffix) technicalQuery += " " + xrayGoogleSuffix;
  }

  // Compile Broad Synonym & Sourcing Coverage (Drop titles, OR everything together loosely)
  {
    const positiveParts = [];
    if (titleBlock) positiveParts.push(titleBlock);
    const flattenedORs = [...activeMandatory, ...activePreferred].flatMap(s => [s.keyword, ...(s.synonyms || [])]).filter((v, i, a) => a.indexOf(v) === i && v.trim());
    if (flattenedORs.length > 0) {
      const orBlock = `(${flattenedORs.slice(0, 10).map(formatTerm).join(" OR ")})`;
      positiveParts.push(orBlock);
    }
    
    const positiveQuery = combineWithAnd(positiveParts);
    broadQuery = prefix + positiveQuery;
    if (activeExcludes.length > 0) {
      const primaryExclude = activeExcludes[0];
      if (platform === "xray" || platform === "jobdiva") {
        broadQuery += ` -${formatTerm(primaryExclude)}`;
      } else {
        broadQuery += ` NOT ${formatTerm(primaryExclude)}`;
      }
    }
    if (xrayGoogleSuffix) broadQuery += " " + xrayGoogleSuffix;
  }

  return [
    {
      id: "comprehensive",
      name: "Live Recruiter Query: Strict Mandatory",
      description: "Dynamically compiled using all strict checked skills for high-fidelity interactive refinement.",
      query: comprehensiveQuery || "No active search parameters setup."
    },
    {
      id: "technical-focused",
      name: "Live Recruiter Query: Core + Preferred",
      description: "Targeted string enforcing all mandatory skills and boosting relevance via optional skills.",
      query: technicalQuery || "No active skills list setup."
    },
    {
      id: "broad-synonyms",
      name: "Live General Synonym Broadener",
      description: "Casts a wide net with your alternative checked terminology, grouping mandatory and optional items.",
      query: broadQuery || "No titles or primary skills list setup."
    }
  ];
};

// Strategic dynamic compiler generating platform-tailored queries using lives checkmarks & edits
const compileStrategicBlueprints = (result: JDAnalysisResult, platform: "xray" | "linkedin" | "jobdiva") => {
  const activeTitles = (result.jobTitles || []).filter(t => t.trim().length > 0);
  const activeMandatory = (result.mandatorySkills || []).filter(s => s.enabled);
  const activePreferred = (result.preferredSkills || []).filter(s => s.enabled);
  const activeExcludes = (result.excludedKeywords || []).filter(w => w.trim().length > 0);

  const formatTerm = (term: string) => {
    const trimmed = term.trim();
    if (trimmed.includes(" ") || trimmed.includes("/") || trimmed.includes("-") || trimmed.includes(".")) {
      return `"${trimmed}"`;
    }
    return trimmed;
  };

  const getSkillBlock = (skill: any) => {
    const terms = [skill.keyword, ...(skill.synonyms || [])].filter((v, i, a) => a.indexOf(v) === i && v.trim());
    if (terms.length === 0) return "";
    if (terms.length === 1) return formatTerm(terms[0]);
    return `(${terms.map(formatTerm).join(" OR ")})`;
  };

  const titleBlock = activeTitles.length > 0 ? `(${activeTitles.map(formatTerm).join(" OR ")})` : "";
  
  // Base exclude behavior for X-Ray
  let excludeBlock = "";
  if (activeExcludes.length > 0 && platform === "xray") {
    excludeBlock = activeExcludes.map(w => `-${formatTerm(w)}`).join(" ");
  }

  // All strict mandatory skills MUST be ANDed
  const mainSkillsAll = activeMandatory.map(getSkillBlock).filter(Boolean);

  // Group preferred skills as an OR block
  const prefTerms = activePreferred.flatMap(s => [s.keyword, ...(s.synonyms || [])]).filter((v, i, a) => a.indexOf(v) === i && v.trim());
  const prefOrBlock = prefTerms.length > 0 ? `(${prefTerms.map(formatTerm).join(" OR ")})` : "";

  if (platform === "linkedin") {
    // LinkedIn specific NOT syntax (flat NOTs without brackets to prevent parsing errors)
    let liExcludeBlock = "";
    if (activeExcludes.length > 0) {
      liExcludeBlock = activeExcludes.map(w => `NOT ${formatTerm(w)}`).join(" ");
    }
    const liExcludesStr = liExcludeBlock ? " " + liExcludeBlock : "";

    // 1. Core Mandatory: Strict AND on all mandatory requirements
    const cleanQuery = [
      titleBlock,
      ...mainSkillsAll
    ].filter(Boolean).join(" AND ") + liExcludesStr;

    // 2. Targeted with Preferred: All mandatory AND (at least one preferred)
    const targetedQuery = [
      titleBlock,
      ...mainSkillsAll,
      activePreferred.length > 0 ? prefOrBlock : ""
    ].filter(Boolean).join(" AND ") + liExcludesStr;

    // 3. Broad Terminology (Flattened ORs prevent deep-nesting breakage on LinkedIn standard)
    const allSkillsTerms = [...activeMandatory, ...activePreferred]
        .flatMap(s => [s.keyword, ...(s.synonyms || [])])
        .filter((v, i, a) => a.indexOf(v) === i && v.trim());
    const skillsOrBlock = allSkillsTerms.length > 0 ? `(${allSkillsTerms.slice(0, 15).map(formatTerm).join(" OR ")})` : "";
    
    let broadQuery = [
      titleBlock,
      skillsOrBlock
    ].filter(Boolean).join(" AND ") + liExcludesStr;

    if (!broadQuery) broadQuery = "No titles or primary skills list setup.";

    return [
      {
        id: "li-clean",
        name: "LinkedIn Strict Mandatory Boolean",
        description: "Enforces 100% of all mandatory skills using strict AND clustering.",
        query: cleanQuery || "No active search parameters setup."
      },
      {
        id: "li-targeted",
        name: "LinkedIn Core + Preferred Skills",
        description: "Requires all mandatory skills plus at least one verified preferred/optional skill.",
        query: targetedQuery || "No active skills list setup."
      },
      {
        id: "li-broad",
        name: "LinkedIn Terminology Broadener",
        description: "Flat, unnested broad structure utilizing profile style terms and informal tech synonyms.",
        query: broadQuery
      }
    ];
  } else if (platform === "jobdiva") {
    // JobDiva highly optimized resume syntaxes (Prefers native minus signs for negations without brackets)
    let jdExcludeBlock = "";
    if (activeExcludes.length > 0) {
      jdExcludeBlock = activeExcludes.map(w => `-${formatTerm(w)}`).join(" ");
    }
    const jdExcludesStr = jdExcludeBlock ? " " + jdExcludeBlock : "";

    // 1. Strict Mandatory Core Stack
    const cleanQuery = [
      titleBlock,
      ...mainSkillsAll
    ].filter(Boolean).join(" AND ") + jdExcludesStr;

    // 2. Core Stack + Preferred Stack + Active Resume Verbs
    const verbsBlock = "(developed OR built OR implemented OR designed OR configure OR architect OR code)";
    const targetedQuery = [
      titleBlock,
      ...mainSkillsAll,
      activePreferred.length > 0 ? prefOrBlock : "",
      verbsBlock
    ].filter(Boolean).join(" AND ") + jdExcludesStr;

    // 3. Broadened Terminology Stack
    const broadQuery = [
      titleBlock,
      mainSkillsAll.length > 0 ? `(${mainSkillsAll.map(s => s.replace(/[()]/g, '')).join(" OR ")})` : "",
      prefOrBlock
    ].filter(Boolean).join(" AND ") + jdExcludesStr;

    return [
      {
        id: "jd-clean",
        name: "JobDiva Strict Mandatory Resume Query",
        description: "Deep boolean securely bounding all core requirements distinct AND blocks.",
        query: cleanQuery || "No active search parameters setup."
      },
      {
        id: "jd-deep",
        name: "JobDiva Advanced Target Profile",
        description: "Locks all mandatory needs, filters by preferred stack traits, and enforces past-tense tech verbs.",
        query: targetedQuery || "No active skills list setup."
      },
      {
        id: "jd-legacy",
        name: "JobDiva Broad Expansion",
        description: "Expanded fallback dropping strict AND constraints to pool broader matching talent.",
        query: broadQuery || "No titles or primary skills list setup."
      }
    ];
  } else {
    // xray
    const suffix = " -inurl:dir -intitle:profiles";
    
    // 1. Google X-Ray Strict Mandatory
    const briefTitles = activeTitles.slice(0, 2).map(formatTerm);
    const briefTitleBlock = briefTitles.length > 0 ? `(${briefTitles.join(" OR ")})` : "";
    const coreSkillsBlock = mainSkillsAll.slice(0, 5).join(" AND "); // cap for Google limits
    
    const cleanQuery = `site:linkedin.com/in/ ${[briefTitleBlock, coreSkillsBlock].filter(Boolean).join(" AND ")}${excludeBlock ? " " + excludeBlock : ""}${suffix}`;

    // 2. Google X-Ray with Preferred Additions
    const focusSkills = [
       ...mainSkillsAll.slice(0, 4),
       prefOrBlock
    ].filter(Boolean);
    const targetedQuery = `site:linkedin.com/in/ ${[briefTitleBlock, ...focusSkills].filter(Boolean).join(" AND ")}${excludeBlock ? " " + excludeBlock : ""}${suffix}`;

    // 3. Synonym Outreach
    const altTitles = activeTitles.length > 0 ? formatTerm(activeTitles[0]) : "";
    const broadSkillsBlock = activeMandatory.length > 0 ? `(${activeMandatory.slice(0, 3).map(s => formatTerm(s.keyword)).join(" OR ")})` : "";
    
    const broadQuery = `site:linkedin.com/in/ ${[altTitles, broadSkillsBlock].filter(Boolean).join(" AND ")}${excludeBlock ? " " + excludeBlock : ""}${suffix}`;

    return [
      {
        id: "xr-clean",
        name: "Google X-Ray Strict Core",
        description: "Engineered tightly on Google's maximum capacities enforcing all mandatory keywords.",
        query: cleanQuery
      },
      {
        id: "xr-targeted",
        name: "Google X-Ray Tech + Preferred Specific",
        description: "Augments the string with preferred additions inside a strict bounded boundary.",
        query: targetedQuery
      },
      {
        id: "xr-broad",
        name: "Google X-Ray Synonym Outreach",
        description: "Cast broader search boundaries using alternative nomenclature and high-density terminology.",
        query: broadQuery
      }
    ];
  }
};

export default function QueryViewer({
  result,
  targetPlatform,
  mode,
  history,
  onSelectHistory,
  activeProfileId,
}: QueryViewerProps) {
  const [copiedId, setCopiedId] = useState("");
  const [reportCopied, setReportCopied] = useState(false);
  const [useHighLevelIntelligence, setUseHighLevelIntelligence] = useState(true);

  // Compile live custom strings based on checklist
  const liveCompiledStrings = compileQueries(result, targetPlatform);

  // Setup platform-specific presets directly from AI or dynamic compilation
  const getBlueprints = () => {
    if (useHighLevelIntelligence) {
      return compileStrategicBlueprints(result, targetPlatform);
    }

    if (result.portalBooleans) {
      const booleans = result.portalBooleans;
      if (targetPlatform === "linkedin") {
        return [
          {
            id: "li-clean",
            name: "LinkedIn Premium Boolean",
            description: "Cleaner, shorter optimized Boolean with title structures designed specifically for fast candidate index matching.",
            query: booleans.linkedin.clean
          },
          {
            id: "li-targeted",
            name: "LinkedIn Exact Targeted Suffix",
            description: "High-relevancy Boolean matching exact key title blocks and precise primary stack clusters.",
            query: booleans.linkedin.targeted
          },
          {
            id: "li-broad",
            name: "LinkedIn Terminology Broadener",
            description: "Utilizes LinkedIn profile style terms, abbreviations, and informal tech synonyms.",
            query: booleans.linkedin.broad
          }
        ];
      } else if (targetPlatform === "jobdiva") {
        return [
          {
            id: "jd-clean",
            name: "JobDiva ATS Resume Query",
            description: "Deep, long-nesting Boolean string. Casts an incredibly wide net on historic resume database columns.",
            query: booleans.jobdiva.clean
          },
          {
            id: "jd-deep",
            name: "JobDiva Active Resume Verbs",
            description: "Incorporate primary skills alongside action-oriented resume keywords (developed, built, implemented).",
            query: booleans.jobdiva.targeted
          },
          {
            id: "jd-legacy",
            name: "JobDiva Legacy Allied Stack",
            description: "Comprehensive OR query including ancestral frameworks, associated technology aliases & older revisions.",
            query: booleans.jobdiva.broad
          }
        ];
      } else {
        return [
          {
            id: "xr-clean",
            name: "Google X-Ray LinkedIn Main",
            description: "Engineered specifically to abide under Google's 32-word query limit. Bypasses junk directories with clean minus rules.",
            query: booleans.xray.clean
          },
          {
            id: "xr-targeted",
            name: "Google X-Ray Tech Specific",
            description: "Google query focusing purely on exact engineering components within sub-branches of the directory tree.",
            query: booleans.xray.targeted
          },
          {
            id: "xr-broad",
            name: "Google X-Ray Synonym Outreach",
            description: "Cast broader search boundaries using alternative nomenclature and high-density terminology.",
            query: booleans.xray.broad
          }
        ];
      }
    }
    
    // Fallback if portalBooleans not present in older loaded queries
    return liveCompiledStrings;
  };

  const currentBlueprints = getBlueprints();

  // Syntax highlighting helper for UI render
  const renderCodeWithHighlight = (code: string) => {
    if (!code) return <span className="text-[#A0A09A] italic font-serif">No query compiled yet.</span>;
    
    const regex = /(AND|OR|NOT|site:linkedin\.com\/in\/|\(|\)|"[\w\s-./+*]+"|-[a-zA-Z0-9:]+| -inurl:dir -intitle:profiles)/g;
    const parts = code.split(regex);

    return (
      <code className="whitespace-pre-wrap select-text break-all tracking-wide text-[#1A1A1A]">
        {parts.map((part, idx) => {
          if (part === "AND") {
            return <span key={idx} className="text-red-800 font-extrabold font-mono"> AND </span>;
          } else if (part === "OR") {
            return <span key={idx} className="text-blue-800 font-extrabold font-mono"> OR </span>;
          } else if (part === "NOT") {
            return <span key={idx} className="text-amber-800 font-extrabold font-mono"> NOT </span>;
          } else if (part.startsWith("-") || part.includes("-inurl")) {
            return <span key={idx} className="text-rose-700 font-bold font-mono">{part}</span>;
          } else if (part === "(" || part === ")") {
            return <span key={idx} className="text-neutral-400 font-semibold">{part}</span>;
          } else if (part === "site:linkedin.com/in/") {
            return <span key={idx} className="text-indigo-800 font-bold font-mono">{part}</span>;
          } else if (part.startsWith('"') && part.endsWith('"')) {
            return <span key={idx} className="text-emerald-800 font-serif italic">"{part.slice(1, -1)}"</span>;
          }
          return <span key={idx} className="text-[#4A4A45]">{part}</span>;
        })}
      </code>
    );
  };

  // Export full recruiting report
  const handleCopyReport = async () => {
    let blueprintsDesc = currentBlueprints
      .map((p) => `[${p.name}]\nQuery: ${p.query}\n`)
      .join("\n");

    const liveDesc = liveCompiledStrings
      .map((p) => `[${p.name}]\nQuery: ${p.query}\n`)
      .join("\n");

    let textBlocks = "";
    if (result.searchLogicReasoning) textBlocks += `\nSEARCH LOGIC & STRATEGY:\n${result.searchLogicReasoning}\n`;
    if (result.noiseReductionStrategy) textBlocks += `\nNOISE REDUCTION STRATEGY:\n${result.noiseReductionStrategy}\n`;
    if (result.keywordClusters) {
      textBlocks += `\nKEYWORD CLUSTERS:
- Primary stack: ${(result.keywordClusters.primary || []).join(", ")}
- Secondary: ${(result.keywordClusters.secondary || []).join(", ")}
- Tools: ${(result.keywordClusters.toolsAndEcosystem || []).join(", ")}
- Titles alternative: ${(result.keywordClusters.alternativeTitles || []).join(", ")}
- Seniority signals: ${(result.keywordClusters.seniorityKeywords || []).join(", ")}\n`;
    }

    const reportText = `================================================
RECRUITER SOURCING RESUME BRIEF & BOOLEAN REPORT
================================================
ROLE SUMMARY:
${result.summary}

RECRUITER NOTES:
${result.recruiterNotes}
${textBlocks}
TARGET SOURCING STRATEGY ON: ${targetPlatform.toUpperCase()}

AI-ENGINEERED PLATFORM BLUEPRINTS:
${blueprintsDesc}

LIVE DYNAMIC STRINGS (CHECKLIST DRIVEN):
${liveDesc}

MANUFACTURER SOURCING PARAMETERS:
- Titles Searched: ${(result.jobTitles || []).join(", ")}
- Checked Core Skills: ${(result.mandatorySkills || []).filter(s => s.enabled).map(s => s.keyword).join(", ")}
- Exclusions Map: ${(result.excludedKeywords || []).join(", ")}
================================================`;

    try {
      await navigator.clipboard.writeText(reportText);
      setReportCopied(true);
      setTimeout(() => setReportCopied(false), 2500);
    } catch (err) {
      alert("Sourcing report generation failed.");
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Sourcing Intelligence brief summary card */}
      {(!mode || mode === "summary") && (
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] relative overflow-hidden space-y-5">
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-indigo-500"></div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between w-full flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
                <span className="font-mono text-[10px] font-extrabold tracking-widest text-slate-400 uppercase">
                  Role Summary & Search Strategy
                </span>
              </div>
              {result.fromCache && (
                <div className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase font-bold tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md select-none animate-fade-in shadow-sm">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shrink-0"></span>
                  <span>⚡ Instant Cache Hit</span>
                </div>
              )}
            </div>
            <p className="text-slate-900 font-sans text-xl font-medium leading-relaxed tracking-tight select-text">
              {result.summary}
            </p>
          </div>

          {/* Sourcing Filters Suggestion Bento */}
          {result.suggestedFilters && (
            <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-5 space-y-3 pt-4 translate-y-0 hover:-translate-y-0.5 transition-all duration-300">
              <span className="font-mono text-[9px] text-slate-500 tracking-widest font-extrabold uppercase flex items-center gap-1.5">
                <ListFilter className="h-3.5 w-3.5 text-slate-600" />
                <span>Recommended Search Filters</span>
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                {result.suggestedFilters.locations && result.suggestedFilters.locations.length > 0 && (
                  <div>
                    <span className="block font-bold text-slate-700 uppercase tracking-wider text-[9px] mb-1.5 font-mono">Hub Locations:</span>
                    <ul className="text-slate-600 space-y-1 list-disc list-inside select-text font-medium">
                      {result.suggestedFilters.locations.map(l => <li key={l}>{l}</li>)}
                    </ul>
                  </div>
                )}
                {result.suggestedFilters.targetCompanies && result.suggestedFilters.targetCompanies.length > 0 && (
                  <div>
                    <span className="block font-bold text-slate-700 uppercase tracking-wider text-[9px] mb-1.5 font-mono">Target Pools:</span>
                    <ul className="text-slate-600 space-y-1 list-disc list-inside select-text font-medium">
                      {result.suggestedFilters.targetCompanies.map(c => <li key={c}>{c}</li>)}
                    </ul>
                  </div>
                )}
                {result.suggestedFilters.industries && result.suggestedFilters.industries.length > 0 && (
                  <div>
                    <span className="block font-bold text-slate-700 uppercase tracking-wider text-[9px] mb-1.5 font-mono">Ideal verticals:</span>
                    <ul className="text-slate-600 space-y-1 list-disc list-inside select-text font-medium">
                      {result.suggestedFilters.industries.map(i => <li key={i}>{i}</li>)}
                    </ul>
                  </div>
                )}
                {result.suggestedFilters.certifications && result.suggestedFilters.certifications.length > 0 && (
                  <div>
                    <span className="block font-bold text-slate-700 uppercase tracking-wider text-[9px] mb-1.5 font-mono">Certs/Credentials:</span>
                    <ul className="text-slate-600 space-y-1 list-disc list-inside select-text font-medium">
                      {result.suggestedFilters.certifications.map(crt => <li key={crt}>{crt}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Sourcing Projects Table */}
          {(() => {
            let historyList = history;
            if (!historyList) {
              try {
                const stored = localStorage.getItem("recruiter_boolean_history");
                if (stored) {
                  historyList = JSON.parse(stored);
                }
              } catch (_) {}
            }
            const displayHistory = historyList || [];
            if (displayHistory.length === 0) return null;

            return (
              <div className="bg-white border text-sm border-slate-200/80 rounded-xl space-y-0 shadow-sm mt-8 overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4">
                  <span className="font-mono text-[9px] text-slate-500 tracking-widest font-extrabold uppercase flex items-center gap-2">
                    <Database className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Recent Search History</span>
                  </span>
                  <span className="font-mono text-[9px] bg-white border border-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-md uppercase">
                    {displayHistory.length} Results
                  </span>
                </div>

                <div className="overflow-x-auto bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200/80 uppercase text-[9px] tracking-widest font-mono text-slate-400 font-bold">
                        <th className="p-4 font-semibold w-1/3">Sourcing Title / Role</th>
                        <th className="p-4 font-semibold">Extracted Stack</th>
                        <th className="p-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayHistory.map((item) => {
                        const isActive = activeProfileId ? (item.id === activeProfileId) : (item.result?.summary === result.summary);
                        const keywords = [
                          ...(item.result?.mandatorySkills || []).map((s: any) => s.keyword),
                          ...(item.result?.preferredSkills || []).map((s: any) => s.keyword)
                        ].slice(0, 3);

                        return (
                          <tr
                            key={item.id}
                            className={`transition-colors duration-200 group ${
                              isActive
                                ? "bg-indigo-50/30"
                                : "hover:bg-slate-50/80"
                            }`}
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-2.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-slate-300'}`}></span>
                                <span className={`font-medium tracking-tight text-xs ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>
                                  {item.title}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1.5">
                                {keywords.map((kw: string, i: number) => (
                                  <span key={i} className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 border border-slate-200 text-slate-600 font-medium">
                                    {kw}
                                  </span>
                                ))}
                                {keywords.length === 0 && (
                                  <span className="text-[10px] text-slate-400 italic">Empty Stack</span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onSelectHistory) {
                                    onSelectHistory(item.id);
                                  } else {
                                    const event = new CustomEvent("select-sourcing-project", { detail: { id: item.id } });
                                    window.dispatchEvent(event);
                                  }
                                }}
                                disabled={isActive}
                                className={`text-[10px] font-mono font-bold tracking-widest px-4 py-2 rounded-lg transition-all duration-300 inline-flex items-center justify-center gap-1.5 ${
                                  isActive
                                    ? "text-slate-400 cursor-not-allowed bg-slate-100 border border-transparent select-none"
                                    : "bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white hover:shadow-lg hover:-translate-y-0.5 cursor-pointer shadow-md border-transparent"
                                }`}
                              >
                                <FolderOpen className="h-3 w-3" />
                                <span>{isActive ? "ACTIVE" : "LOAD"}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {result.recruiterNotes && (
            <div className="border-t border-slate-200/80 pt-5 mt-4">
              <span className="font-mono text-[10px] text-slate-500 tracking-widest font-extrabold block mb-2 uppercase">RECRUITING ADVISORY NOTES:</span>
              <p className="text-slate-600 text-sm leading-relaxed select-text font-medium bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
                {result.recruiterNotes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* AI-powered raw optimized Boolean search strings */}
      {(!mode || mode === "blueprints") && (
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
              <h3 className="font-mono text-[10px] uppercase tracking-widest font-extrabold text-slate-700">
                AI-Generated Boolean Strings
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setUseHighLevelIntelligence(!useHighLevelIntelligence)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-extrabold font-mono uppercase tracking-widest transition-all duration-300 border rounded-lg select-none shadow-sm cursor-pointer hover:shadow hover:-translate-y-0.5 active:scale-95"
                style={{
                  backgroundColor: useHighLevelIntelligence ? "#eef2ff" : "#f8fafc",
                  borderColor: useHighLevelIntelligence ? "#6366f1" : "#e2e8f0",
                  color: useHighLevelIntelligence ? "#4f46e5" : "#64748b",
                }}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${useHighLevelIntelligence ? 'bg-indigo-600 animate-pulse' : 'bg-slate-400'}`}></span>
                <span>Intelligence: {useHighLevelIntelligence ? "ON (Live Sync)" : "OFF (Static)"}</span>
              </button>
              <span className="text-[9px] font-mono bg-slate-50 border border-slate-200/80 text-slate-500 px-2.5 py-1 rounded-md font-bold uppercase hidden sm:inline-block tracking-widest">
                Rules Verified
              </span>
            </div>
          </div>
          
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            {useHighLevelIntelligence ? (
              <span>Highly optimized, interactive platform queries compiled in real-time using <strong className="text-slate-700">high-level skills intelligence</strong> and live checklist configuration. Any checklist checkmarks or synonym additions/deletions instantly rebuild these blueprints.</span>
            ) : (
              <span>Highly structured static Boolean queries specifically crafted to prioritize top keywords and avoid false positives on <span className="underline font-bold text-slate-700 capitalize">{targetPlatform}</span> search algorithms.</span>
            )}
          </p>

          <div className="grid grid-cols-1 gap-6">
            {/* Sourcing Platform Specific Boolean Strings */}
            {currentBlueprints.map((preset) => {
              const isCopied = copiedId === preset.id;
              return (
                <div key={preset.id} className="bg-white border border-slate-200/80 p-5 rounded-xl space-y-4 relative group transition-all duration-300 hover:border-indigo-200 hover:shadow-md">
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="flex flex-row items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <span className="font-sans font-bold">{preset.name}</span>
                        {result.portalBooleans && (
                          <span className="text-[9px] tracking-widest font-extrabold font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded uppercase">
                            AI GENERATED
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed max-w-3xl">
                        {preset.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(preset.query);
                            setCopiedId(preset.id);
                            setTimeout(() => setCopiedId(""), 2000);
                          } catch (err) {
                            alert("Failed to copy. Please select text manually.");
                          }
                        }}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 text-[10px] font-mono font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
                        title="Copy details"
                      >
                        {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        <span className={isCopied ? "text-emerald-700" : ""}>{isCopied ? "COPIED" : "COPY"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-5 font-mono text-[11px] leading-loose break-all select-all select-text shadow-inner overflow-x-auto">
                    {renderCodeWithHighlight(preset.query)}
                  </div>
                </div>
              );
            })}

            {/* Live custom compile fallback or secondary view */}
            {result.portalBooleans && (
              <div className="border border-indigo-100 p-5 rounded-xl space-y-4 relative group bg-indigo-50/10 hover:border-indigo-300 hover:shadow-md transition-all duration-300">
                <div className="flex flex-row items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-indigo-500" />
                      <span>Custom Refined Boolean String</span>
                      <span className="text-[9px] font-mono tracking-widest font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded uppercase">
                        DYNAMIC
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                      Re-compiles dynamically when configuring skills checklists.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(liveCompiledStrings[0].query);
                          setCopiedId("live-comprehensive");
                          setTimeout(() => setCopiedId(""), 2000);
                        } catch (err) {
                          alert("Failed to copy.");
                        }
                      }}
                      className="bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 text-[10px] font-mono font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 hover:shadow-sm"
                    >
                      {copiedId === "live-comprehensive" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span className={copiedId === "live-comprehensive" ? "text-emerald-700" : ""}>{copiedId === "live-comprehensive" ? "COPIED" : "COPY LIVE"}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-lg p-5 font-mono text-[11px] leading-loose break-all select-all select-text shadow-sm overflow-x-auto">
                  {renderCodeWithHighlight(liveCompiledStrings[0].query)}
                </div>
              </div>
            )}
          </div>

          {/* Global Sourcing Export Panel */}
          <div className="pt-6 border-t border-slate-200/80 flex flex-col md:flex-row justify-between gap-4 items-center">
            <span className="font-mono text-[10px] text-slate-500 font-medium uppercase tracking-widest select-none flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Compiled for target search platforms.</span>
            </span>
            <button
              onClick={handleCopyReport}
              className={`px-8 py-3 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all duration-300 shadow-sm
                ${reportCopied 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-inner' 
                  : 'bg-gradient-to-tr from-slate-900 to-slate-800 text-white hover:shadow-lg hover:-translate-y-0.5 border-transparent'
                }`}
            >
              <span>{reportCopied ? "MARKDOWN COPIED ✓" : "COPY FULL SOURCING REPORT"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
