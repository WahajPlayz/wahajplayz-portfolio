import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { X, Plus, Trash2, Check, Lock, Save, FolderPlus, Layers, Type } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const { 
    isAdminOpen, 
    closeAdmin, 
    isAuthenticated, 
    login,
    faqData,
    roadmapProjects,
    addFAQ,
    removeFAQ,
    addProject,
    removeProject,
    addSection,
    removeSection,
    addStep,
    removeStep,
    toggleStep
  } = useData();

  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'roadmap' | 'faq'>('roadmap');
  
  // Local state for inputs
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');
  
  // Roadmap state
  const [newProjTitle, setNewProjTitle] = useState('');
  const [newSectionInputs, setNewSectionInputs] = useState<{[key: string]: string}>({});
  const [newStepInputs, setNewStepInputs] = useState<{[key: string]: string}>({});

  if (!isAdminOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!login(password)) alert('Incorrect password');
  };

  const handleCreateProject = () => {
    if (newProjTitle.trim()) {
      addProject(newProjTitle, 'code');
      setNewProjTitle('');
    }
  };

  const handleCreateSection = (projectId: string) => {
    const title = newSectionInputs[projectId];
    if (title?.trim()) {
      addSection(projectId, title);
      setNewSectionInputs(prev => ({ ...prev, [projectId]: '' }));
    }
  };

  const handleCreateStep = (projectId: string, sectionId: string) => {
    const key = `${projectId}-${sectionId}`;
    const text = newStepInputs[key];
    if (text?.trim()) {
      addStep(projectId, sectionId, text);
      setNewStepInputs(prev => ({ ...prev, [key]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 w-full max-w-5xl max-h-[90vh] rounded-2xl border border-purple-500/30 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-neutral-950">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Lock size={20} className="text-purple-500" />
            Admin Panel
          </h2>
          <button onClick={closeAdmin} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {!isAuthenticated ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-3 rounded-lg bg-black border border-white/10 focus:border-purple-500 outline-none text-white transition-all"
                />
                <button type="submit" className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold">
                  Unlock
                </button>
              </form>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Tabs */}
              <div className="flex space-x-4 mb-6 border-b border-white/10 pb-2">
                <button
                  onClick={() => setActiveTab('roadmap')}
                  className={`px-4 py-2 rounded-lg transition-colors font-medium ${activeTab === 'roadmap' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Roadmap & Projects
                </button>
                <button
                  onClick={() => setActiveTab('faq')}
                  className={`px-4 py-2 rounded-lg transition-colors font-medium ${activeTab === 'faq' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  FAQ Manager
                </button>
              </div>

              {activeTab === 'roadmap' && (
                <div className="space-y-12 pb-12">
                  {/* Create Project */}
                  <div className="bg-purple-600/10 p-4 rounded-xl border border-purple-500/20 flex gap-4">
                    <input
                      type="text"
                      value={newProjTitle}
                      onChange={(e) => setNewProjTitle(e.target.value)}
                      placeholder="New Project Name (e.g. Mecha Overdrive)"
                      className="flex-1 px-4 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500"
                    />
                    <button onClick={handleCreateProject} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center gap-2 font-bold">
                      <FolderPlus size={18} /> New Project
                    </button>
                  </div>

                  {/* List Projects */}
                  {roadmapProjects.map(project => (
                    <div key={project.id} className="bg-black/30 rounded-2xl border border-white/5 overflow-hidden">
                      {/* Project Bar */}
                      <div className="p-4 bg-white/5 flex justify-between items-center">
                        <h3 className="text-xl font-black italic text-white flex items-center gap-3">
                          <Type size={18} className="text-purple-400" />
                          {project.title}
                        </h3>
                        <button 
                          onClick={() => removeProject(project.id)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className="p-6 space-y-6">
                        {/* Sections in Project */}
                        {project.sections.map(section => (
                          <div key={section.id} className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="font-bold text-gray-300 flex items-center gap-2 uppercase tracking-tighter text-sm">
                                <Layers size={14} className="text-blue-400" />
                                {section.title}
                              </h4>
                              <button 
                                onClick={() => removeSection(project.id, section.id)}
                                className="p-1.5 text-red-400 hover:text-red-300"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            {/* Steps in Section */}
                            <div className="space-y-2 mb-4">
                              {section.steps.map(step => (
                                <div key={step.id} className="flex items-center gap-3 p-2 rounded bg-black/20 group">
                                  <button 
                                    onClick={() => toggleStep(project.id, section.id, step.id)}
                                    className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${step.isCompleted ? 'bg-purple-500 border-purple-500' : 'border-gray-600'}`}
                                  >
                                    {step.isCompleted && <Check size={12} className="text-white" />}
                                  </button>
                                  <span className={`flex-1 text-sm ${step.isCompleted ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                                    {step.text}
                                  </span>
                                  <button 
                                    onClick={() => removeStep(project.id, section.id, step.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-500/10 rounded"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>

                            {/* Add Step to Section */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newStepInputs[`${project.id}-${section.id}`] || ''}
                                onChange={(e) => setNewStepInputs({...newStepInputs, [`${project.id}-${section.id}`]: e.target.value})}
                                placeholder="New step..."
                                className="flex-1 px-3 py-1.5 rounded bg-black/50 border border-white/10 outline-none text-xs text-white"
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateStep(project.id, section.id)}
                              />
                              <button 
                                onClick={() => handleCreateStep(project.id, section.id)}
                                className="p-1.5 bg-blue-600 rounded text-white"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Add Section to Project */}
                        <div className="flex gap-2 pt-4 border-t border-white/5">
                          <input
                            type="text"
                            value={newSectionInputs[project.id] || ''}
                            onChange={(e) => setNewSectionInputs({...newSectionInputs, [project.id]: e.target.value})}
                            placeholder="Add new update/section title..."
                            className="flex-1 px-4 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-sm text-white"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateSection(project.id)}
                          />
                          <button 
                            onClick={() => handleCreateSection(project.id)}
                            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                          >
                            <Plus size={16} /> New Update Section
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'faq' && (
                <div className="space-y-6">
                  <div className="bg-black/30 p-6 rounded-xl border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-4">Add New FAQ</h3>
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={newFaqQ}
                        onChange={(e) => setNewFaqQ(e.target.value)}
                        placeholder="Question"
                        className="w-full px-4 py-2 rounded-lg bg-black border border-white/10 outline-none text-white focus:border-purple-500"
                      />
                      <textarea
                        value={newFaqA}
                        onChange={(e) => setNewFaqA(e.target.value)}
                        placeholder="Answer"
                        className="w-full px-4 py-2 rounded-lg bg-black border border-white/10 outline-none text-white h-24"
                      />
                      <button
                        onClick={() => { if(newFaqQ && newFaqA) { addFAQ(newFaqQ, newFaqA); setNewFaqQ(''); setNewFaqA(''); }}}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2"
                      >
                        <Save size={16} /> Save FAQ
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {faqData.map((faq) => (
                      <div key={faq.id} className="bg-neutral-800/30 p-4 rounded-xl border border-white/5 flex gap-4">
                        <div className="flex-1">
                          <h4 className="font-bold text-white">{faq.question}</h4>
                          <p className="text-sm text-gray-400">{faq.answer}</p>
                        </div>
                        <button onClick={() => removeFAQ(faq.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg h-fit">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
