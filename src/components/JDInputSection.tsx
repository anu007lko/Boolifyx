import React, { useState, useEffect } from "react";
import { SearchProfile } from "../types";
import { Clipboard, CheckCircle2 } from "lucide-react";
import { AnalysisProgressBar } from "./AnalysisProgressBar";

interface JDInputSectionProps {
  onAnalyze: (jdText: string) => void;
  isLoading: boolean;
  history: SearchProfile[];
  currentProfileId: string;
  onSelectHistory: (id: string) => void;
  onClearHistory: () => void;
  activeProfile?: SearchProfile | null;
  progress: number;
  progressMessage: string;
  progressStatus: "idle" | "running" | "success" | "error";
  isExtracting: boolean;
}

export default function JDInputSection({
  onAnalyze,
  isLoading,
  history,
  currentProfileId,
  onSelectHistory,
  onClearHistory,
  activeProfile,
  progress,
  progressMessage,
  progressStatus,
  isExtracting,
}: JDInputSectionProps) {
  const [jdText, setJdText] = useState("");

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setJdText(text);
    } catch (err) {
      alert("Failed to read clipboard contents. Please paste with Ctrl+V (or Cmd+V) directly.");
    }
  };

  const currentLength = jdText.trim().length;

  return (
    <div className="space-y-6">
      {/* Search profiling input body */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
        <div className="flex items-center justify-between mb-4 border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
            <h2 className="font-mono uppercase tracking-widest text-[10px] font-bold text-slate-700">
              Analyze Job Description
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePaste}
              className="font-mono text-[10px] uppercase font-bold tracking-widest flex items-center gap-1 text-slate-700 hover:bg-slate-100 bg-white px-3 py-1.5 border border-slate-200/80 rounded-lg transition-all duration-300"
              title="Paste from clipboard"
              type="button"
            >
              <Clipboard className="h-3 w-3 text-indigo-500" />
              <span>Paste Sourced Text</span>
            </button>
            {jdText && (
              <button
                onClick={() => setJdText("")}
                className="font-mono text-[10px] uppercase font-bold tracking-widest text-rose-600 hover:text-white hover:bg-rose-600 px-3 py-1.5 border border-rose-200 rounded-lg transition-all duration-300"
                type="button"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <textarea
          className="w-full h-80 bg-white text-slate-800 p-4 border border-slate-200/80 rounded-xl text-sm leading-relaxed focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 resize-none placeholder-slate-400"
          placeholder="Paste the full Job Description here... We'll extract target job titles, core skills, and automatically generate optimized boolean search strings for you."
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
        />

        {progressStatus !== "idle" && (
          <div className="mt-4">
            <AnalysisProgressBar
              progress={progress}
              message={progressMessage}
              status={progressStatus}
            />
          </div>
        )}

        <div className="flex flex-row items-center justify-between gap-3 mt-4">
          <div className="space-y-1">
            <div className="font-mono text-slate-500 text-[10px] uppercase tracking-widest font-bold">
              Character Count:{" "}
              <span className={`${currentLength >= 20 ? "text-indigo-600" : "text-rose-600"}`}>
                {currentLength} chars
              </span>
              <span className="text-slate-400 font-medium"> (Min 20 required)</span>
            </div>
          </div>

          <button
            onClick={() => onAnalyze(jdText)}
            disabled={isExtracting || currentLength < 20}
            className={`px-6 py-3 text-xs font-bold transition-all duration-300 shrink-0 rounded-xl ${
              isExtracting || currentLength < 20
                ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                : "bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5"
            }`}
            type="button"
          >
            {isExtracting ? "Analyzing..." : "Manufacture Boolean Query"}
          </button>
        </div>
      </div>



      {/* Profile History */}
      {history.length > 0 && (
        <div className="bg-slate-50 border border-slate-200/80 p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/80">
            <h3 className="font-mono uppercase tracking-widest text-[10px] font-bold text-slate-700">
              Recent Searches ({history.length})
            </h3>
            <button
              onClick={onClearHistory}
              className="font-mono text-[10px] uppercase tracking-widest font-bold text-rose-600 hover:text-rose-700 transition"
            >
              Clear All
            </button>
          </div>

          {activeProfile && (
            <div className="mb-4 bg-white border border-indigo-500/30 rounded-xl p-4 shadow-sm space-y-3 relative group overflow-hidden">
              <div className="absolute top-0 right-0 bg-indigo-50 text-indigo-700 text-[8px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-bl-lg font-bold">
                ACTIVE
              </div>
              <div className="space-y-1">
                <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                  Active Search:
                </span>
                <h4 className="text-sm font-bold text-slate-900 leading-tight pr-10 truncate">
                  {activeProfile.title}
                </h4>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 font-mono text-[9px] text-slate-400">
                <span>
                  Sourced: {new Date(activeProfile.analyzedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          <div className="max-h-56 overflow-y-auto space-y-2 pr-2">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectHistory(item.id)}
                className={`w-full text-left p-3 text-sm flex items-center justify-between border rounded-xl transition-all duration-300 ${
                  currentProfileId === item.id
                    ? "bg-white text-indigo-700 border-indigo-500 shadow-sm font-semibold"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:shadow-md"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2
                    className={`h-4 w-4 shrink-0 transition-colors ${currentProfileId === item.id ? "text-indigo-500" : "text-slate-300"}`}
                  />
                  <span className="truncate">{item.title}</span>
                </div>
                <span className="font-mono text-[9px] text-slate-400 ml-2 shrink-0">
                  {new Date(item.analyzedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
