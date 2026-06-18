import React, { useState, useEffect, useRef } from "react";
import Header from "./components/Header";
import JDInputSection from "./components/JDInputSection";
import SkillsIntelligence from "./components/SkillsIntelligence";
import QueryViewer from "./components/QueryViewer";
import { JDAnalysisResult, SearchProfile, SkillItem } from "./types";
import { Sparkles, ArrowRight, BrainCircuit, AlertCircle, FileText, Sliders } from "lucide-react";

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<SearchProfile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string>("");

  // Automated progress bar simulation states
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [progressStatus, setProgressStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear timers on component unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  // Bring Your Own Key state and persistence managers
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem("user_gemini_api_key") || "";
    } catch {
      return "";
    }
  });

  const handleKeyChange = (newKey: string) => {
    try {
      if (newKey) {
        localStorage.setItem("user_gemini_api_key", newKey);
      } else {
        localStorage.removeItem("user_gemini_api_key");
      }
    } catch (e) {
      console.warn("Could not write API Key block:", e);
    }
    setApiKey(newKey);
  };
  
  // Rate limit cooldown state tracer
  const [cooldownRemaining, setCooldownRemaining] = useState<number | null>(null);

  // Cooldown countdown timer effect
  useEffect(() => {
    if (cooldownRemaining === null) return;
    if (cooldownRemaining <= 0) {
      setCooldownRemaining(null);
      return;
    }
    const timer = setTimeout(() => {
      setCooldownRemaining(cooldownRemaining - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldownRemaining]);

  // Custom interactive layout configurations
  const [targetPlatform, setTargetPlatform] = useState<"xray" | "linkedin" | "jobdiva">("linkedin");

  // Sync historical sourcing records on start
  useEffect(() => {
    try {
      const stored = localStorage.getItem("recruiter_boolean_history");
      if (stored) {
        const parsed = JSON.parse(stored) as SearchProfile[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitizedHistory = parsed.map(profile => ({
            ...profile,
            result: {
              ...profile.result,
              jobTitles: profile.result?.jobTitles || [],
              mandatorySkills: profile.result?.mandatorySkills || [],
              preferredSkills: profile.result?.preferredSkills || [],
              excludedKeywords: profile.result?.excludedKeywords || [],
              booleanStrings: profile.result?.booleanStrings || []
            }
          }));
          setHistory(sanitizedHistory);
          setCurrentProfileId(sanitizedHistory[0].id);
        }
      }
    } catch (e) {
      console.warn("Could not retrieve localStorage history records:", e);
    }
  }, []);

  // Save history records whenever they modify
  const saveHistory = (newHistory: SearchProfile[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem("recruiter_boolean_history", JSON.stringify(newHistory));
    } catch (e) {
      console.warn("Could not save history record profiles:", e);
    }
  };

  const handleSelectHistoryProfile = (id: string) => {
    setCurrentProfileId(id);
    setErrorMsg(null);
  };

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to delete all saved sourcing projects?")) {
      setHistory([]);
      setCurrentProfileId("");
      localStorage.removeItem("recruiter_boolean_history");
    }
  };

  // Analysis executor
  const handleAnalyzeJobDescription = async (jdText: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setCooldownRemaining(null);

    // Start progress timer
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }
    setProgress(0);
    setProgressStatus("running");
    setProgressMessage("Initializing analysis...");
    setIsExtracting(true);

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 94) {
          return prev;
        }
        const delta = Math.floor(Math.random() * 3) + 1;
        const nextVal = Math.min(prev + delta, 94);
        
        // Define dynamic progress message based on percentage boundaries
        if (nextVal < 15) {
          setProgressMessage("Initializing analysis...");
        } else if (nextVal < 35) {
          setProgressMessage("Parsing Job Description...");
        } else if (nextVal < 55) {
          setProgressMessage("Extracting Skills...");
        } else if (nextVal < 75) {
          setProgressMessage("Extracting Requirements...");
        } else if (nextVal < 90) {
          setProgressMessage("Building Boolean Query...");
        } else {
          setProgressMessage("Finalizing Results...");
        }
        
        return nextVal;
      });
    }, 150 + Math.floor(Math.random() * 100));

    try {
      const headersList: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (apiKey) {
        headersList["x-gemini-key"] = apiKey;
      }

      const response = await fetch("/api/analyze-jd", {
        method: "POST",
        headers: headersList,
        body: JSON.stringify({ jdText }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429 && data.rateLimited) {
          setCooldownRemaining(data.cooldownRemaining || 10);
        }
        throw new Error(data.error || "An error occurred while executing sourcing analysis.");
      }

      // Map parsed response to profile record
      const rawResult = data;
      const result: JDAnalysisResult = {
        ...rawResult,
        jobTitles: rawResult.jobTitles || [],
        mandatorySkills: rawResult.mandatorySkills || [],
        preferredSkills: rawResult.preferredSkills || [],
        excludedKeywords: rawResult.excludedKeywords || [],
        booleanStrings: rawResult.booleanStrings || []
      };
      
      const titleMatched = result.jobTitles?.[0] || "Sourcing Query Profile";
      const newProfile: SearchProfile = {
        id: `profile-${Date.now()}`,
        title: titleMatched,
        jdText: jdText,
        analyzedAt: new Date().toISOString(),
        result: result,
      };

      const updatedHistory = [newProfile, ...history.filter(h => h.title !== titleMatched)].slice(0, 30);
      saveHistory(updatedHistory);
      setCurrentProfileId(newProfile.id);

      // Handle Success Progress transitions
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setProgress(100);
      setProgressMessage("Analysis Complete");
      setProgressStatus("success");

      setTimeout(() => {
        setProgress(0);
        setProgressMessage("");
        setProgressStatus("idle");
        setIsExtracting(false);
      }, 1500);

    } catch (err: any) {
      console.error("Analysis API execution failure:", err);
      setErrorMsg(err.message || "Could not connect to the recruitment analyzer. Check backend connection.");

      // Handle Error Progress transitions
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setProgressMessage("Analysis Failed");
      setProgressStatus("error");

      setTimeout(() => {
        setProgress(0);
        setProgressMessage("");
        setProgressStatus("idle");
        setIsExtracting(false);
      }, 2500);
    } finally {
      setIsLoading(false);
    }
  };

  // Update specific results locally (e.g. customized synonym triggers or checkers)
  const handleUpdateResultLocal = (updatedResult: JDAnalysisResult) => {
    const updatedHistory = history.map((item) => {
      if (item.id === currentProfileId) {
        return {
          ...item,
          result: updatedResult,
        };
      }
      return item;
    });
    saveHistory(updatedHistory);
  };

  // Find currently active profile
  const activeProfile = history.find((p) => p.id === currentProfileId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Header apiKey={apiKey} onKeyChange={handleKeyChange} />

      {/* Main Container workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-12 gap-8">
        
        {/* Left Column (Input workspace) */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <JDInputSection
            onAnalyze={handleAnalyzeJobDescription}
            isLoading={isLoading}
            history={history}
            currentProfileId={currentProfileId}
            onSelectHistory={handleSelectHistoryProfile}
            onClearHistory={handleClearHistory}
            activeProfile={activeProfile}
            progress={progress}
            progressMessage={progressMessage}
            progressStatus={progressStatus}
            isExtracting={isExtracting}
          />
        </div>

        {/* Right / Center Columns (Live results panel) */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          {isLoading ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 flex flex-col items-center justify-center space-y-5 text-center min-h-[400px] shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] animate-pulse">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-slate-200/80 border-t-indigo-500 animate-spin"></div>
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="font-mono uppercase tracking-widest text-[10px] font-bold text-slate-900">
                  Analyzing Job Description
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed pb-2">
                  Extracting target job titles, core skills, and generating optimized boolean search strings...
                </p>
              </div>
            </div>
          ) : errorMsg ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 text-slate-800 space-y-4 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] select-none animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className={`h-5 w-5 shrink-0 ${cooldownRemaining !== null ? 'text-amber-500' : 'text-rose-600'}`} />
                  <h3 className="font-mono uppercase tracking-widest text-[10px] font-bold text-slate-900">
                    {cooldownRemaining !== null ? "Sourcing Cooldown Active" : "Intelligence Engine Exception"}
                  </h3>
                </div>
                {cooldownRemaining !== null && (
                  <div className="font-mono uppercase tracking-widest text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/50 py-1 px-2.5 rounded shadow-sm flex items-center gap-1.5 animate-pulse">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
                    <span>T- {cooldownRemaining}s LOCK</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-rose-700 leading-relaxed font-medium">
                {errorMsg}
              </p>
              {cooldownRemaining !== null ? (
                <div className="text-xs text-slate-500 leading-relaxed pt-1">
                  The in-memory cooldown prevents multiple fast-succession API invocations to protect rate limits. Submitting again is allowed once the countdown drops below zero.
                </div>
              ) : (
                <div className="text-xs text-slate-500 pt-1">
                  The AI provider is currently experiencing issues. Please try again in a few moments.
                </div>
              )}
            </div>
          ) : activeProfile ? (
            <div className="space-y-6 animate-fade-in">
              {activeProfile.result.fallbackUsed && (
                <div id="fallback-active-alert" className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-amber-900 flex items-start gap-3 shadow-[0_2px_10px_-3px_rgba(217,119,6,0.1)] animate-fade-in">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 leading-relaxed">
                    <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-amber-800">
                      Fallback Active: App Key Engaged
                    </h4>
                    <p className="text-xs text-amber-700/95 font-medium">
                      Your custom Gemini API Key hit rate boundaries or exhausting limitations. To prevent interruption, the system automatically fell back to the shared App API Key.
                    </p>
                  </div>
                </div>
              )}
              {/* Recruiter intelligence summary section */}
              <QueryViewer
                result={activeProfile.result}
                targetPlatform={targetPlatform}
                mode="summary"
                history={history}
                onSelectHistory={handleSelectHistoryProfile}
                activeProfileId={currentProfileId}
              />
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] p-12 text-center flex flex-col items-center justify-center space-y-6 min-h-[500px]">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-full">
                <FileText className="h-8 w-8 text-indigo-500" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="font-mono uppercase tracking-widest text-[10px] font-bold text-slate-900 flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  <span>Interactive Sourcing Workspace</span>
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Draft manual requirements, import a career mandate, or copy-paste a full career spec in the left panel to begin manufacturing precision recruiter Boolean queries.
                </p>
              </div>

              <div className="text-sm text-slate-700 bg-slate-50 p-4 border border-slate-200/80 rounded-xl max-w-sm text-left">
                <h4 className="font-mono uppercase tracking-widest text-[10px] font-bold text-slate-900 mb-2 block">Sourcing Logic Workflow:</h4>
                <ul className="space-y-1.5 list-disc list-inside text-sm text-slate-600">
                  <li>Formulates cluster job title synonym options.</li>
                  <li>Isolates mandatory coding, scripting, and methodologies.</li>
                  <li>Excludes non-essential management or entry terms.</li>
                  <li>Configures optimal formats for LinkedIn and ATS.</li>
                </ul>
              </div>
              
              <div className="animate-bounce mt-4">
                <ArrowRight className="h-5 w-5 text-indigo-400" />
              </div>
            </div>
          )}
        </div>

        {/* Sourcing Platform Configurations */}
        {activeProfile && !isLoading && !errorMsg && (
          <div className="col-span-12 animate-fade-in bg-white border border-slate-200/80 p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] mb-2 mt-2">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/80">
              <h3 className="font-mono uppercase tracking-widest text-[10px] font-bold text-slate-700 flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-indigo-500" />
                <span>Select Target Platform</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-medium italic">Adjust target platform Boolean syntax</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: "linkedin", label: "LinkedIn Recruiter (RPS)", desc: "Optimized complex nested OR matrices" },
                { id: "jobdiva", label: "JobDiva ATS", desc: "Native JobDiva syntax & hyphenated negations" },
                { id: "xray", label: "Google X-Ray (site:)", desc: "Optimized for site:linkedin.com/in/ indexing" }
              ].map((platform) => (
                <div
                  key={platform.id}
                  onClick={() => setTargetPlatform(platform.id as any)}
                  className={`border rounded-xl p-4 cursor-pointer transition-all duration-300 relative overflow-hidden group ${
                    targetPlatform === platform.id
                      ? "bg-indigo-50/50 border-indigo-200 shadow-sm"
                      : "bg-white border-slate-200 hover:border-indigo-100 hover:bg-slate-50"
                  }`}
                >
                  {targetPlatform === platform.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                  )}
                  <h4 className={`text-sm font-bold tracking-tight mb-1 flex items-center gap-2 ${
                    targetPlatform === platform.id ? "text-indigo-900" : "text-slate-700"
                  }`}>
                    {platform.label}
                    {targetPlatform === platform.id && (
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
                    )}
                  </h4>
                  <p className={`text-xs font-medium ${
                    targetPlatform === platform.id ? "text-indigo-700" : "text-slate-500"
                  }`}>
                    {platform.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic search query blueprints (Full Width) */}
        {activeProfile && !isLoading && !errorMsg && (
          <div className="col-span-12 animate-fade-in">
            <QueryViewer
              result={activeProfile.result}
              targetPlatform={targetPlatform}
              mode="blueprints"
            />
          </div>
        )}

        {/* Skills and Synonym Fine Tuning workspace (Full Width) */}
        {activeProfile && !isLoading && !errorMsg && (
          <div className="col-span-12 animate-fade-in">
            <SkillsIntelligence
              result={activeProfile.result}
              onUpdateResult={handleUpdateResultLocal}
              targetPlatform={targetPlatform}
              setTargetPlatform={setTargetPlatform}
            />
          </div>
        )}
      </main>

      {/* Sourcing footer */}
      <footer className="bg-slate-50 border-t border-slate-200/80 py-8 text-center">
        <p className="font-mono uppercase tracking-widest text-[10px] font-bold text-slate-500">© 2026 Boolean Search Query Generator. Sourcing Intelligence Teammate.</p>
        <p className="mt-2 text-xs text-slate-400">Enterprise Grade. Designed for Global Technical Recruiters & Sourcing Specialists.</p>
      </footer>
    </div>
  );
}
