import React from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface AnalysisProgressBarProps {
  progress: number;
  message: string;
  status: "idle" | "running" | "success" | "error";
}

export const AnalysisProgressBar: React.FC<AnalysisProgressBarProps> = ({
  progress,
  message,
  status,
}) => {
  if (status === "idle") return null;

  // Color mappings based on current status
  const barColors = {
    running: "bg-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.5)]",
    success: "bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.5)]",
    error: "bg-rose-600 shadow-[0_0_8px_rgba(244,63,94,0.5)]",
    idle: "bg-slate-400",
  };

  const bgColors = {
    running: "bg-indigo-50 border-indigo-100",
    success: "bg-emerald-50 border-emerald-100",
    error: "bg-rose-50 border-rose-100",
    idle: "bg-slate-50 border-slate-200",
  };

  const textColors = {
    running: "text-indigo-900",
    success: "text-emerald-950",
    error: "text-rose-950",
    idle: "text-slate-800",
  };

  const subtextColors = {
    running: "text-indigo-600/90",
    success: "text-emerald-700 font-semibold",
    error: "text-rose-700 font-semibold",
    idle: "text-slate-500",
  };

  return (
    <div
      className={`border rounded-xl p-4 transition-all duration-300 ${bgColors[status]} shadow-sm select-none animate-fade-in`}
      id="analysis-progress-indicator"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {status === "running" && (
            <Loader2 className="h-4 w-4 text-indigo-500 animate-spin shrink-0" />
          )}
          {status === "success" && (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          )}
          {status === "error" && (
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          <span className={`font-mono uppercase tracking-widest text-[10px] font-bold ${textColors[status]}`}>
            {status === "running" ? "Manufacturing Analysis in Progress" : ""}
            {status === "success" ? "Analysis Succeeded" : ""}
            {status === "error" ? "Analysis Encountered An Issue" : ""}
          </span>
        </div>
        <span className={`font-mono text-xs font-bold ${subtextColors[status]}`}>
          {progress}%
        </span>
      </div>

      {/* Outer track */}
      <div className="w-full bg-slate-200/70 h-2.5 rounded-full overflow-hidden mb-2 relative">
        {/* Inner animate progress bar */}
        <div
          id="progress-bar-fill"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-live="polite"
          className={`h-full rounded-full transition-all duration-300 ease-out ${barColors[status]}`}
          style={{ width: `${progress}%` }}
        />
        {status === "running" && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1.5s_infinite] -translate-x-full"></div>
        )}
      </div>

      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider font-semibold">
        <span className={subtextColors[status]}>{message}</span>
        {status === "running" && (
          <span className="text-indigo-400 font-normal animate-pulse">Running Prompter...</span>
        )}
      </div>
    </div>
  );
};
