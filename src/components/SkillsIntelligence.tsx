import React, { useState } from "react";
import { JDAnalysisResult, SkillItem } from "../types";
import { ToggleLeft, Plus, X, Briefcase, Code, BrainCircuit, Trash2, Sliders, CheckSquare, Square } from "lucide-react";
import QueryViewer from "./QueryViewer";

interface SkillsIntelligenceProps {
  result: JDAnalysisResult;
  onUpdateResult: (updated: JDAnalysisResult) => void;
  targetPlatform: "xray" | "linkedin" | "jobdiva";
  setTargetPlatform: (platform: "xray" | "linkedin" | "jobdiva") => void;
}

export default function SkillsIntelligence({
  result,
  onUpdateResult,
  targetPlatform,
  setTargetPlatform,
}: SkillsIntelligenceProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newMandatoryWord, setNewMandatoryWord] = useState("");
  const [newMandatoryCat, setNewMandatoryCat] = useState("Technology");
  const [newPreferredWord, setNewPreferredWord] = useState("");
  const [newPreferredCat, setNewPreferredCat] = useState("Optional");
  const [newExcludeWord, setNewExcludeWord] = useState("");

  // Handler for adding a job title synonym
  const handleAddTitle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const clean = newTitle.trim();
    if (!result.jobTitles.includes(clean)) {
      onUpdateResult({
        ...result,
        jobTitles: [...result.jobTitles, clean],
      });
    }
    setNewTitle("");
  };

  // Handler for deleting a job title
  const handleRemoveTitle = (title: string) => {
    onUpdateResult({
      ...result,
      jobTitles: result.jobTitles.filter((t) => t !== title),
    });
  };

  // Handler for sorting a skills toggle
  const handleToggleSkill = (skillId: string, isMandatory: boolean) => {
    const listKey = isMandatory ? "mandatorySkills" : "preferredSkills";
    const updatedSkills = result[listKey].map((skill) =>
      skill.id === skillId ? { ...skill, enabled: !skill.enabled } : skill
    );

    onUpdateResult({
      ...result,
      [listKey]: updatedSkills,
    });
  };

  // Handler for adding a new skill item to Mandatory
  const handleAddMandatory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMandatoryWord.trim()) return;
    const cleanWord = newMandatoryWord.trim();
    const newSkill: SkillItem = {
      id: `custom-m-${Date.now()}`,
      keyword: cleanWord,
      synonyms: [cleanWord],
      category: newMandatoryCat,
      enabled: true,
    };
    onUpdateResult({
      ...result,
      mandatorySkills: [...result.mandatorySkills, newSkill],
    });
    setNewMandatoryWord("");
  };

  // Handler for adding a new skill item to Preferred
  const handleAddPreferred = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPreferredWord.trim()) return;
    const cleanWord = newPreferredWord.trim();
    const newSkill: SkillItem = {
      id: `custom-p-${Date.now()}`,
      keyword: cleanWord,
      synonyms: [cleanWord],
      category: newPreferredCat,
      enabled: true,
    };
    onUpdateResult({
      ...result,
      preferredSkills: [...result.preferredSkills, newSkill],
    });
    setNewPreferredWord("");
  };

  // Deleting a full skill
  const handleDeleteSkill = (skillId: string, isMandatory: boolean) => {
    const listKey = isMandatory ? "mandatorySkills" : "preferredSkills";
    onUpdateResult({
      ...result,
      [listKey]: result[listKey].filter((skill) => skill.id !== skillId),
    });
  };

  // Adding dynamic synonym to a skill
  const handleAddSynonym = (skillId: string, isMandatory: boolean, synWord: string) => {
    if (!synWord.trim()) return;
    const clean = synWord.trim();
    const listKey = isMandatory ? "mandatorySkills" : "preferredSkills";

    const updatedSkills = result[listKey].map((skill) => {
      if (skill.id === skillId) {
        const exist = skill.synonyms.map(s => s.toLowerCase());
        if (!exist.includes(clean.toLowerCase())) {
          return { ...skill, synonyms: [...skill.synonyms, clean] };
        }
      }
      return skill;
    });

    onUpdateResult({
      ...result,
      [listKey]: updatedSkills,
    });
  };

  // Removing synonym
  const handleRemoveSynonym = (skillId: string, isMandatory: boolean, synToRemove: string) => {
    const listKey = isMandatory ? "mandatorySkills" : "preferredSkills";
    const updatedSkills = result[listKey].map((skill) => {
      if (skill.id === skillId) {
        return {
          ...skill,
          synonyms: skill.synonyms.filter((s) => s !== synToRemove),
        };
      }
      return skill;
    });

    onUpdateResult({
      ...result,
      [listKey]: updatedSkills,
    });
  };

  // Excluded Sourcing Words
  const handleAddExclude = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExcludeWord.trim()) return;
    const clean = newExcludeWord.trim();
    if (!result.excludedKeywords.includes(clean)) {
      onUpdateResult({
        ...result,
        excludedKeywords: [...result.excludedKeywords, clean],
      });
    }
    setNewExcludeWord("");
  };

  const handleRemoveExclude = (word: string) => {
    onUpdateResult({
      ...result,
      excludedKeywords: result.excludedKeywords.filter((w) => w !== word),
    });
  };

  return (
    <div className="space-y-6">
      {/* Extracted job title synonyms tracker */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/80">
          <h3 className="font-mono uppercase tracking-widest text-[10px] font-bold text-slate-700 flex items-center gap-1.5">
            <Briefcase className="h-4 w-4 text-indigo-500" />
            <span>Target Job Titles (OR Boolean)</span>
          </h3>
          <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100 font-mono font-bold uppercase tracking-widest">
            {result.jobTitles.length} Titles
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {result.jobTitles.map((title) => (
            <span
              key={title}
              className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-700 font-medium px-3 py-1.5 text-xs border border-slate-200/80 rounded-lg"
            >
              <span>"{title}"</span>
              <button
                onClick={() => handleRemoveTitle(title)}
                className="text-slate-400 hover:text-rose-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          {result.jobTitles.length === 0 && (
            <span className="text-sm text-slate-400 italic">No job titles configured. Search will lack title filters incompiled queries.</span>
          )}
        </div>

        <form onSubmit={handleAddTitle} className="flex gap-3 mt-5">
          <input
            type="text"
            className="flex-1 bg-white border border-slate-200/80 rounded-xl text-sm px-4 py-2 text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 placeholder-slate-400"
            placeholder="Add job title synonym (e.g. Lead Developer)..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <button
            type="submit"
            className="bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white text-[10px] font-bold uppercase tracking-widest px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
          >
            Add Title
          </button>
        </form>
      </div>

      {/* Mandatory skills category workspace */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200/80">
          <h3 className="font-mono uppercase tracking-widest text-[10px] font-bold text-slate-700 flex items-center gap-1.5">
            <Code className="h-4 w-4 text-indigo-500" />
            <span>Must-Have Skills (Required)</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium italic">Check to activate or deactivate parameters</span>
        </div>

        <div className="space-y-3.5 mb-5 max-h-[480px] overflow-y-auto pr-1">
          {result.mandatorySkills.map((skill) => (
            <div
              key={skill.id}
              className={`p-4 border rounded-xl transition-all duration-300 relative overflow-hidden ${
                skill.enabled
                  ? "bg-white border-slate-200/80"
                  : "bg-slate-50 border-slate-100 opacity-60"
              }`}
            >
              {skill.enabled && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
              )}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleSkill(skill.id, true)}
                    className="transition-colors focus:outline-none"
                    title={skill.enabled ? "Disable this skill block" : "Enable this skill block"}
                  >
                    {skill.enabled ? (
                      <CheckSquare className="h-5 w-5 text-indigo-500" />
                    ) : (
                      <Square className="h-5 w-5 text-slate-300" />
                    )}
                  </button>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 tracking-wide flex items-center gap-2">
                      {skill.keyword}
                      <span className="font-mono text-[9px] text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md uppercase tracking-wider font-semibold">
                        {skill.category}
                      </span>
                    </h4>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteSkill(skill.id, true)}
                  className="text-slate-300 hover:text-rose-600 p-1 transition-colors"
                  title="Delete skill item completely"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Synonym variants list */}
              {skill.enabled && (
                <div className="mt-3 text-sm pl-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[9px] text-slate-400 mr-1 uppercase font-bold tracking-widest">Synonyms:</span>
                    {skill.synonyms.map((syn) => (
                      <span
                        key={syn}
                        className="inline-flex items-center gap-1 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 border border-slate-200/80 rounded-md font-medium"
                      >
                        {syn.includes(" ") ? `"${syn}"` : syn}
                        <button
                          onClick={() => handleRemoveSynonym(skill.id, true, syn)}
                          className="text-slate-400 hover:text-rose-600 font-extrabold ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    
                    {/* Inline synonym adder */}
                    <input
                      type="text"
                      placeholder="+ synonym"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const input = e.currentTarget;
                          handleAddSynonym(skill.id, true, input.value);
                          input.value = "";
                        }
                      }}
                      className="bg-white border border-slate-200/80 rounded-lg text-xs text-slate-800 px-2.5 py-1.5 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 w-28 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          {result.mandatorySkills.length === 0 && (
            <div className="text-sm text-slate-400 italic p-4 text-center bg-slate-50 border border-slate-200/80 rounded-xl">
              No mandatory skills extracted yet or specified manually.
            </div>
          )}
        </div>

        {/* Form to add a new custom mandatory skill */}
        <form onSubmit={handleAddMandatory} className="grid grid-cols-12 gap-3 bg-slate-50 p-4 border border-slate-200/80 rounded-xl">
          <div className="col-span-7">
            <input
              type="text"
              className="w-full bg-white border border-slate-200/80 text-sm px-4 py-2.5 text-slate-900 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-slate-400"
              placeholder="Custom skill name (e.g. AWS)..."
              value={newMandatoryWord}
              onChange={(e) => setNewMandatoryWord(e.target.value)}
            />
          </div>
          <div className="col-span-3">
            <select
              className="w-full bg-white border border-slate-200/80 text-[10px] uppercase font-bold tracking-widest px-3 py-3 rounded-xl text-slate-700 focus:outline-none focus:border-indigo-500 transition-all font-mono"
              value={newMandatoryCat}
              onChange={(e) => setNewMandatoryCat(e.target.value)}
            >
              <option value="Technology">Tech</option>
              <option value="Language">Language</option>
              <option value="Framework">Framework</option>
              <option value="Methodology">Process</option>
              <option value="General">General</option>
            </select>
          </div>
          <div className="col-span-2 flex justify-end">
            <button
              type="submit"
              className="w-full text-[10px] py-2 bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold uppercase tracking-widest rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              Add
            </button>
          </div>
        </form>
      </div>

      {/* Preferred Skills / Secondary specifications */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] mt-6">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200/80">
          <h3 className="font-mono uppercase tracking-widest text-[10px] font-bold text-slate-700 flex items-center gap-1.5">
            <BrainCircuit className="h-4 w-4 text-indigo-500" />
            <span>Nice-to-Have Skills (Preferred / Bonus)</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium italic">Toggle checkboxes to incorporate into strategy modifiers</span>
        </div>

        <div className="space-y-3.5 mb-5 max-h-[300px] overflow-y-auto pr-1">
          {result.preferredSkills.map((skill) => (
            <div
              key={skill.id}
              className={`p-4 border rounded-xl transition-all duration-300 relative overflow-hidden ${
                skill.enabled
                  ? "bg-white border-slate-200/80"
                  : "bg-slate-50 border-slate-100 opacity-60"
              }`}
            >
              {skill.enabled && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
              )}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleSkill(skill.id, false)}
                    className="transition-colors focus:outline-none"
                  >
                    {skill.enabled ? (
                      <CheckSquare className="h-5 w-5 text-indigo-500" />
                    ) : (
                      <Square className="h-5 w-5 text-slate-300" />
                    )}
                  </button>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 tracking-wide flex items-center gap-2">
                      {skill.keyword}
                      <span className="font-mono text-[9px] text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md uppercase tracking-wider font-semibold">
                        {skill.category}
                      </span>
                    </h4>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteSkill(skill.id, false)}
                  className="text-slate-300 hover:text-rose-600 p-1 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Synonym variants list */}
              {skill.enabled && (
                <div className="mt-3 text-sm pl-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[9px] text-slate-400 mr-1 uppercase font-bold tracking-widest">Synonyms:</span>
                    {skill.synonyms.map((syn) => (
                      <span
                        key={syn}
                        className="inline-flex items-center gap-1 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 border border-slate-200/80 rounded-md font-medium"
                      >
                        {syn.includes(" ") ? `"${syn}"` : syn}
                        <button
                          onClick={() => handleRemoveSynonym(skill.id, false, syn)}
                          className="text-slate-400 hover:text-rose-600 font-extrabold ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    
                    <input
                      type="text"
                      placeholder="+ synonym"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const input = e.currentTarget;
                          handleAddSynonym(skill.id, false, input.value);
                          input.value = "";
                        }
                      }}
                      className="bg-white border border-slate-200/80 rounded-lg text-xs text-slate-800 px-2.5 py-1.5 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 w-28 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          {result.preferredSkills.length === 0 && (
            <div className="text-sm text-slate-400 italic p-4 text-center bg-slate-50 border border-slate-200/80 rounded-xl">
              No preferred/secondary skills extracted or specified.
            </div>
          )}
        </div>

        {/* Form to add preferred */}
        <form onSubmit={handleAddPreferred} className="grid grid-cols-12 gap-3 bg-slate-50 p-4 border border-slate-200/80 rounded-xl">
          <div className="col-span-7">
            <input
              type="text"
              className="w-full bg-white border border-slate-200/80 text-sm px-4 py-2.5 text-slate-900 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-slate-400"
              placeholder="Preferred/Cert (e.g. Docker)..."
              value={newPreferredWord}
              onChange={(e) => setNewPreferredWord(e.target.value)}
            />
          </div>
          <div className="col-span-3">
            <select
              className="w-full bg-white border border-slate-200/80 text-[10px] uppercase font-bold tracking-widest px-3 py-3 rounded-xl text-slate-700 focus:outline-none focus:border-indigo-500 transition-all font-mono"
              value={newPreferredCat}
              onChange={(e) => setNewPreferredCat(e.target.value)}
            >
              <option value="Education">Degree</option>
              <option value="Certification">Cert</option>
              <option value="Infrastructure">Infra</option>
              <option value="General">General</option>
            </select>
          </div>
          <div className="col-span-2 flex justify-end">
            <button
              type="submit"
              className="w-full text-[10px] py-2 bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold uppercase tracking-widest rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              Add
            </button>
          </div>
        </form>
      </div>

      {/* Excluded Sourcing Terms (NOT group) */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] mt-6">
        <h3 className="font-mono uppercase tracking-widest text-[10px] font-bold text-slate-700 mb-4 flex items-center gap-1.5">
          <Trash2 className="h-4 w-4 text-indigo-500" />
          <span>Excluded Terms (NOT Boolean)</span>
        </h3>

        <div className="flex flex-wrap gap-2 mb-4">
          {result.excludedKeywords.map((word) => (
            <span
              key={word}
              className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-700 font-medium px-3 py-1.5 text-xs border border-slate-200/80 rounded-lg"
            >
              <span>"{word}"</span>
              <button
                onClick={() => handleRemoveExclude(word)}
                className="text-slate-400 hover:text-rose-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          {result.excludedKeywords.length === 0 && (
            <span className="text-sm text-slate-400 italic">No exclusions configured. Sourcing strings will lack NOT terms.</span>
          )}
        </div>

        <form onSubmit={handleAddExclude} className="flex gap-3 font-sans">
          <input
            type="text"
            className="flex-1 bg-white border border-slate-200/80 rounded-xl text-sm px-4 py-2 text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 placeholder-slate-400"
            placeholder="Add exclusion keyword (e.g. intern, junior, contract)..."
            value={newExcludeWord}
            onChange={(e) => setNewExcludeWord(e.target.value)}
          />
          <button
            type="submit"
            className="bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white text-[10px] font-bold uppercase tracking-widest px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
          >
            Exclude Term
          </button>
        </form>
      </div>
    </div>
  );
}
