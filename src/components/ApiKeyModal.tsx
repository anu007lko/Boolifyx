import React, { useState } from "react";
import { X, Key, ExternalLink, Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

interface ApiKeyModalProps {
  onClose: () => void;
  currentKey: string;
  onKeySave: (key: string) => void;
}

export default function ApiKeyModal({ onClose, currentKey, onKeySave }: ApiKeyModalProps) {
  const [apiKeyInput, setApiKeyInput] = useState(currentKey);
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedKey = apiKeyInput.trim();
    if (!trimmedKey) {
      setErrorMsg("Please enter a valid Gemini API key.");
      return;
    }

    setIsValidating(true);
    try {
      const response = await fetch("/api/validate-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey: trimmedKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to validate API key. Please double check the key characters.");
      }

      // If valid, save it
      onKeySave(trimmedKey);
      setSuccessMsg("API Key successfully validated and connected!");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("API key validation failed:", err);
      setErrorMsg(err.message || "Invalid API key or network error while validating. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleDisconnect = () => {
    if (confirm("Are you sure you want to disconnect and remove your Gemini API key from this browser?")) {
      onKeySave("");
      setApiKeyInput("");
      setSuccessMsg("API key disconnected successfully.");
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in shadow-2xl">
      <div 
        id="api-key-modal-container"
        className="bg-white max-w-lg w-full rounded-2xl border border-slate-100 overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Gemini API Configuration</h2>
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Sourcing Engine BYOK</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-150 p-2 rounded-full transition-all border border-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 bg-white">
          <p className="text-xs text-slate-600 leading-relaxed">
            Boolifyx generates high-accuracy, zero-noise Boolean queries. Connect your custom Google Gemini API Key to bypass public rate limits and run queries seamlessly.
          </p>

          {/* Setup Link */}
          <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/60 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-slate-900">Get a Free Gemini Developer Key</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Gemini API offers a generous free tier for developers. Generate your key instantly in Google AI Studio.
              </p>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                referrerPolicy="no-referrer"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors pt-1"
              >
                <span>Get Gemini Key from Google AI Studio</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2 animate-fade-in font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-start gap-2 animate-fade-in font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold font-mono tracking-wider text-slate-500 uppercase mb-1.5">
                Gemini API Key
              </label>
              <div className="relative flex items-center">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste your AIzaSy... key here"
                  disabled={isValidating}
                  className="w-full pr-11 border text-sm border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-mono placeholder-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-3">
              {currentKey ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-4 py-2.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors border border-rose-100/50"
                >
                  Disconnect API Key
                </button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isValidating || !apiKeyInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-100 hover:shadow-indigo-200 disabled:shadow-none transition-all flex items-center gap-2"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Validating key...</span>
                    </>
                  ) : (
                    <span>Validate & Save</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
