import React, { useState, useEffect } from 'react';
import { X, UserPlus, Shield, Trash2, UserX, Activity, Flame, CheckCircle, AlertTriangle, Play, RefreshCw, Layers } from 'lucide-react';
import { collection, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from './AuthProvider';

interface AdminPanelModalProps {
  onClose: () => void;
}

interface AllowedUser {
  email: string;
}

export default function AdminPanelModal({ onClose }: AdminPanelModalProps) {
  const { user } = useAuth();
  
  // Tab control state
  const [activeTab, setActiveTab] = useState<'users' | 'diagnostics'>('users');

  // Tab 1: User management states
  const [emailInput, setEmailInput] = useState('');
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Tab 2: Diagnostic States
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [healthError, setHealthError] = useState('');
  
  // Tab 2: Stress Test States
  const [stressConcurrency, setStressConcurrency] = useState(3);
  const [stressTesting, setStressTesting] = useState(false);
  const [stressResults, setStressResults] = useState<any>(null);
  const [stressError, setStressError] = useState('');

  // Fetch users collection
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'allowedUsers'));
      const fetched: AllowedUser[] = [];
      snapshot.forEach((doc) => {
        fetched.push(doc.data() as AllowedUser);
      });
      setUsers(fetched);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.LIST, 'allowedUsers');
      } catch (nestedErr: any) {
        setErrorMsg(nestedErr.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchModelHealth();
  }, []);

  // Fetch standard model status & zero-hallucination accuracy checks
  const fetchModelHealth = async () => {
    setHealthLoading(true);
    setHealthError('');
    try {
      const apiKeyVal = localStorage.getItem("user_gemini_api_key") || "";
      const headers: Record<string, string> = {};
      if (apiKeyVal) {
        headers["x-gemini-key"] = apiKeyVal;
      }
      
      const res = await fetch("/api/model-health", { headers });
      if (!res.ok) {
        throw new Error(`Health response code: ${res.status}`);
      }
      const data = await res.json();
      setHealthData(data);
    } catch (err: any) {
      console.error("Model health error:", err);
      setHealthError(err.message || "Failed to retrieve engine metrics.");
    } finally {
      setHealthLoading(false);
    }
  };

  // Run bulk parallel stress test loops
  const handleRunStressTest = async () => {
    setStressTesting(true);
    setStressError('');
    setStressResults(null);
    try {
      const apiKeyVal = localStorage.getItem("user_gemini_api_key") || "";
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (apiKeyVal) {
        headers["x-gemini-key"] = apiKeyVal;
      }
      
      const res = await fetch("/api/stress-test-batch", {
        method: "POST",
        headers,
        body: JSON.stringify({ concurrency: stressConcurrency })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Stress test failure code: ${res.status}`);
      }
      
      const data = await res.json();
      setStressResults(data);
    } catch (err: any) {
      console.error("Stress testing error:", err);
      setStressError(err.message || "Concurrent threads run encountered an obstacle.");
    } finally {
      setStressTesting(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const typed = emailInput.trim();
    if (!typed) return;

    try {
      const path = `allowedUsers/${typed}`;
      await setDoc(doc(db, path), { email: typed });
      setEmailInput('');
      fetchUsers();
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, `allowedUsers/${typed}`);
      } catch (nestedErr: any) {
        setErrorMsg(nestedErr.message);
      }
    }
  };

  const handleRemoveUser = async (email: string) => {
    if (!confirm(`Revoke access for ${email}?`)) return;
    setErrorMsg('');
    try {
      const path = `allowedUsers/${email}`;
      await deleteDoc(doc(db, path));
      fetchUsers();
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, `allowedUsers/${email}`);
      } catch (nestedErr: any) {
        setErrorMsg(nestedErr.message);
      }
    }
  };

  const handleRemoveAllOtherUsers = async () => {
    if (!confirm('Are you sure you want to revoke access for ALL other users? This cannot be undone.')) return;
    setErrorMsg('');
    setLoading(true);
    try {
      const promises = users
        .filter(u => u.email !== user?.email)
        .map(u => deleteDoc(doc(db, `allowedUsers/${u.email}`)));
      await Promise.all(promises);
      fetchUsers();
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, 'allowedUsers/*');
      } catch (nestedErr: any) {
        setErrorMsg(nestedErr.message);
      }
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white max-w-2xl w-full rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Block */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Admin Control Center</h2>
              <p className="text-xs font-mono uppercase tracking-widest text-slate-500">System Configuration & Security</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-200 p-2 rounded-full transition-colors border border-slate-200 shadow-sm cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection Row */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 px-4 text-xs font-bold font-mono tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'border-indigo-600 text-indigo-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            User Access System
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`py-3 px-4 text-xs font-bold font-mono tracking-wider uppercase border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'diagnostics'
                ? 'border-indigo-600 text-indigo-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-indigo-600" />
            Engine Diagnostics & Stress Test
          </button>
        </div>

        {/* Modal Main Body Content */}
        <div className="p-6 flex-1 overflow-auto bg-white">
          
          {/* USER TAB CONTENT */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-mono">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleAddUser}>
                <label className="block text-xs font-bold font-mono tracking-widest text-slate-500 uppercase mb-2">
                  Provision New Recruiter Account
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="recruiter@company.com"
                    className="flex-1 border text-sm border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800 placeholder-slate-400"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Authorize</span>
                  </button>
                </div>
              </form>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-bold font-mono tracking-widest text-slate-500 uppercase">
                    Provisioned Staff Accounts ({users.length})
                  </label>
                  {users.length > 1 && (
                    <button
                      onClick={handleRemoveAllOtherUsers}
                      disabled={loading}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      Revoke All Others
                    </button>
                  )}
                </div>
                
                {loading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin mx-auto"></div>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                    <p className="text-sm text-slate-500">No custom authorized accounts configured. Fallbacks operational.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-[30vh] overflow-y-auto">
                    {users.map((u) => (
                      <div key={u.email} className="flex flex-row items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                        <span className="text-sm font-medium text-slate-850">{u.email}</span>
                        <button
                          onClick={() => handleRemoveUser(u.email)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-md transition-colors cursor-pointer"
                          title="Revoke and cancel credentials"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DIAGNOSTICS & STRESS TAB CONTENT */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-6">
              
              {/* Engine Health Summary and Zero Hallucination check */}
              <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Primary Core Status Diagnostics</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Automated validation of instruction compliance</p>
                  </div>
                  <button
                    onClick={fetchModelHealth}
                    disabled={healthLoading}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-white border border-slate-200 hover:bg-slate-50 py-1.5 px-3 rounded-lg shadow-sm cursor-pointer transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                    Refresh Engine
                  </button>
                </div>

                {healthLoading ? (
                  <div className="py-6 text-center">
                    <div className="w-6 h-6 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin mx-auto mb-2"></div>
                    <span className="text-xs text-slate-500">Evaluating Gemini 2.5 Flash safety and delay...</span>
                  </div>
                ) : healthError ? (
                  <div className="p-3 bg-rose-50 border border-rose-250 text-rose-700 rounded-xl text-xs font-mono">
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Diagnostic Connection Issue:
                    </div>
                    {healthError}
                  </div>
                ) : healthData ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm space-y-2">
                      <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">Targeted Model</div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-sm font-bold text-slate-850 font-mono">{healthData.engine}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">V2.5 Pro standard generation engine</div>
                    </div>

                    <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm space-y-2">
                      <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold font-bold">Latency Score</div>
                      <div className="text-sm font-bold text-indigo-650 font-mono">
                        {healthData.latencyMs} <span className="text-xs font-normal text-slate-550">ms</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">Real-time connection verification time</div>
                    </div>

                    <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm space-y-2">
                      <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">Zero-Confabulation Check</div>
                      <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>{healthData.confabulationCheck}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">Ensures no fabricated entities or answers</div>
                    </div>

                    <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm space-y-2">
                      <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">Instruction Tracking Output</div>
                      <div className="text-xs font-mono bg-slate-50 border border-slate-200 px-2 py-1 rounded truncate text-slate-700" title={healthData.responseSample}>
                        "{healthData.responseSample}"
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">Strict compliant word-limit filter</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-550">Launch health diagnostic scan above.</p>
                )}
              </div>

              {/* Stress testing control module */}
              <div className="p-5 border border-indigo-100 rounded-2xl bg-gradient-to-br from-indigo-50/20 to-white space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Recruiter Concurrency Stress Suite
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Simulate multiple parallel recruiting queries to measure API key recovery speed, backoff execution, and robustness.
                  </p>
                </div>

                <div className="flex flex-row items-center justify-between gap-4 p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-750">Test Threads (Concurrency Count)</span>
                    <p className="text-[10px] text-slate-400">Number of simultaneous API queries to execute</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex border border-slate-200 rounded-lg overflow-hidden divide-x divide-slate-200">
                      {[1, 2, 3, 4, 5, 6].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setStressConcurrency(num)}
                          disabled={stressTesting}
                          className={`px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer ${
                            stressConcurrency === num
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleRunStressTest}
                      disabled={stressTesting}
                      className="bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all hover:-translate-y-0.5"
                    >
                      {stressTesting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Stressing...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Fire Test Loops</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {stressError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-mono">
                    {stressError}
                  </div>
                )}

                {stressTesting && (
                  <div className="p-6 bg-white border border-dashed border-indigo-200 rounded-xl text-center space-y-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center mx-auto text-indigo-600 animate-pulse">
                      <Flame className="w-4 h-4 animate-bounce" />
                    </div>
                    <h4 className="text-xs font-bold text-indigo-750 animate-pulse font-mono uppercase tracking-widest">Running Active Concurrency Tests</h4>
                    <p className="text-[10px] text-slate-450 max-w-sm mx-auto">
                      Executing {stressConcurrency} asynchronous queries concurrently. Evaluating rate limit recovery timers and instruction loyalty.
                    </p>
                  </div>
                )}

                {stressResults && (
                  <div className="space-y-4 animate-fade-in">
                    
                    {/* Aggregated metrics widget */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-indigo-50/50 border border-indigo-100/50 p-3 rounded-xl shadow-sm text-center">
                        <div className="text-[8px] font-mono uppercase tracking-wider text-indigo-500 font-bold">Success Rate</div>
                        <div className="text-base font-bold text-slate-800 font-mono mt-1">
                          {Math.round((stressResults.completedSucceeded / stressResults.concurrencyRequested) * 100)}%
                        </div>
                      </div>

                      <div className="bg-indigo-50/50 border border-indigo-100/50 p-3 rounded-xl shadow-sm text-center">
                        <div className="text-[8px] font-mono uppercase tracking-wider text-indigo-500 font-bold">Total Duration</div>
                        <div className="text-base font-bold text-slate-800 font-mono mt-1">
                          {stressResults.totalSequenceDurationMs} <span className="text-[10px] font-normal text-slate-450">ms</span>
                        </div>
                      </div>

                      <div className="bg-indigo-50/50 border border-indigo-100/50 p-3 rounded-xl shadow-sm text-center">
                        <div className="text-[8px] font-mono uppercase tracking-wider text-indigo-500 font-bold">Avg Latency</div>
                        <div className="text-base font-bold text-slate-800 font-mono mt-1">
                          {stressResults.averageLatenciesMs} <span className="text-[10px] font-normal text-slate-450">ms</span>
                        </div>
                      </div>

                      <div className="bg-indigo-50/50 border border-indigo-100/50 p-3 rounded-xl shadow-sm text-center">
                        <div className="text-[8px] font-mono uppercase tracking-wider text-indigo-500 font-bold">Status Check</div>
                        <div className="text-xs font-bold text-emerald-600 font-mono mt-2 uppercase tracking-wide">
                          {stressResults.completedFailed === 0 ? 'Optimal (0 Err)' : `${stressResults.completedFailed} Latent Hits`}
                        </div>
                      </div>
                    </div>

                    {/* Detailed grid output of thread executions */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white max-h-[25vh] overflow-y-auto">
                      {stressResults.stressResults?.map((res: any) => (
                        <div key={res.threadId} className="p-3 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 hover:bg-slate-50/80 transition-colors font-mono">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="bg-slate-100 border border-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded font-extrabold uppercase">
                                Thread #{res.threadId}
                              </span>
                              <span className="text-slate-800 font-bold truncate max-w-xs block text-xs" title={res.prompt}>
                                "{res.prompt}"
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Response: <span className="text-indigo-650 font-semibold">"{res.output || res.error || "Empty response"}"</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 sm:self-center">
                            <div className="text-[10px] text-slate-450">
                              {res.latencyMs}ms
                            </div>
                            {res.success ? (
                              <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] px-2 py-0.5 rounded-md font-bold uppercase shrink-0">
                                Pass
                              </span>
                            ) : (
                              <span className="bg-rose-50 border border-rose-200 text-rose-700 text-[9px] px-2 py-0.5 rounded-md font-bold uppercase shrink-0">
                                Fail
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                )}

              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
