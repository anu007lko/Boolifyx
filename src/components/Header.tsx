import { useState } from "react";
import { Info, LogOut, Shield, Key } from "lucide-react";
import { useAuth } from "./AuthProvider";
import AdminPanelModal from "./AdminPanelModal";

interface HeaderProps {
  apiKey: string;
  onKeyChange: (key: string) => void;
  onOpenKeyModal: () => void;
}

export default function Header({ apiKey, onKeyChange, onOpenKeyModal }: HeaderProps) {
  const { user, isAdmin, logOut } = useAuth();
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  return (
    <header className="border-b border-slate-200/80 bg-white sticky top-0 z-50 px-8 py-5 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-row items-center justify-between gap-4">
        {/* Brand Logo and Title */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-serif italic text-xl shadow-md shrink-0">
            B
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Boolifyx
              </h1>
              <span className="bg-indigo-50 text-indigo-700 text-[10px] tracking-widest font-mono uppercase px-2 py-0.5 rounded-md border border-indigo-100 font-bold">
                v2.0 PRO
              </span>
              <span className="text-xs text-slate-500">
                (by Tarun Srivastava)
              </span>
            </div>
            <div className="flex flex-row items-center gap-2 mt-1.5">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold">
                AI Sourcing Assistant & Boolean Generator
              </p>
            </div>
          </div>
        </div>

        {/* User / Admin controls */}
        {user && (
          <div className="flex items-center gap-4">
            
            {/* Bring Your Own Key (BYOK) Status Badge / Controller */}
            <button
              onClick={onOpenKeyModal}
              className={`flex items-center gap-2 text-xs font-bold tracking-wide py-2 px-3 rounded-lg border transition-all cursor-pointer ${
                apiKey
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/80 hover:border-emerald-300"
                  : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100/80 hover:border-amber-300"
              }`}
              title={apiKey ? "Gemini API connected from client settings" : "Click to connect your Gemini API Key manually"}
            >
              {apiKey ? (
                <div className="flex items-center gap-1.5 font-semibold">
                  <span className="flex h-2 w-2 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <Key className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="hidden sm:inline-block">API Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 font-semibold">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shrink-0"></span>
                  <Key className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="hidden sm:inline-block font-medium">Set Gemini Key</span>
                </div>
              )}
            </button>
            
            {isAdmin && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="flex items-center gap-2 text-xs font-bold tracking-wide bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-3 rounded-lg transition-colors border border-slate-200"
              >
                <Shield className="w-4 h-4 text-indigo-600" />
                <span>Admin</span>
              </button>
            )}
            
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <span className="text-xs font-medium text-slate-600 hidden sm:inline-block">
                {user.email}
              </span>
              <button
                onClick={logOut}
                className="text-slate-400 hover:text-rose-600 transition-colors bg-slate-50 hover:bg-rose-50 p-2 rounded-full border border-transparent hover:border-rose-100"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {showAdminPanel && (
        <AdminPanelModal onClose={() => setShowAdminPanel(false)} />
      )}
    </header>
  );
}
