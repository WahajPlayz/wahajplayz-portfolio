import React, { useEffect, useState } from 'react';
import { useData } from '../context/DataContext';
import { X, Check, Plus, Trash2, ChevronUp, ChevronDown, LogOut, Clock, Users } from 'lucide-react';
import { getDiscordAvatarUrl } from '../lib/discord';

const moveInArray = (ids: string[], id: string, direction: 'up' | 'down') => {
  const idx = ids.indexOf(id);
  if (direction === 'up' && idx <= 0) return ids;
  if (direction === 'down' && idx >= ids.length - 1) return ids;
  const next = [...ids];
  const swap = direction === 'up' ? idx - 1 : idx + 1;
  [next[idx], next[swap]] = [next[swap], next[idx]];
  return next;
};

const MemberPanel: React.FC = () => {
  const {
    isMemberPanelOpen,
    closeMemberPanel,
    openAdmin,
    discordUser,
    role,
    authLoading,
    discordLogin,
    discordLogout,
    roadmapProjects,
    appUsers,
    addSection,
    removeSection,
    addStep,
    removeStep,
    toggleStep,
    reorderSections,
    reorderSteps,
  } = useData();

  const [newSectionInputs, setNewSectionInputs] = useState<{ [key: string]: string }>({});
  const [newStepInputs, setNewStepInputs] = useState<{ [key: string]: string }>({});

  // When role becomes admin/owner while panel is open, switch to admin panel
  useEffect(() => {
    if ((role === 'owner' || role === 'admin') && isMemberPanelOpen) {
      closeMemberPanel();
      openAdmin();
    }
  }, [role, isMemberPanelOpen]);

  if (!isMemberPanelOpen) return null;

  const currentAppUser = appUsers.find(u => u.discordId === discordUser?.id);
  const accessibleProjects = roadmapProjects.filter(p => currentAppUser?.projectIds.includes(p.id) ?? false);

  const handleAddSection = (projectId: string) => {
    const title = newSectionInputs[projectId];
    if (title?.trim()) { addSection(projectId, title); setNewSectionInputs(prev => ({ ...prev, [projectId]: '' })); }
  };

  const handleAddStep = (projectId: string, sectionId: string) => {
    const key = `${projectId}-${sectionId}`;
    const text = newStepInputs[key];
    if (text?.trim()) { addStep(projectId, sectionId, text); setNewStepInputs(prev => ({ ...prev, [key]: '' })); }
  };

  const avatarUrl = discordUser ? getDiscordAvatarUrl(discordUser) : null;
  const displayName = discordUser?.global_name || discordUser?.username || '';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 w-full max-w-3xl max-h-[90vh] rounded-2xl border border-indigo-500/30 shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-neutral-950">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users size={20} className="text-indigo-400" />
            Team Portal
            {discordUser && avatarUrl && (
              <img src={avatarUrl} alt={displayName} className="w-7 h-7 rounded-full border border-white/20" />
            )}
            {discordUser && (
              <span className="text-sm font-normal text-gray-400">{displayName}</span>
            )}
          </h2>
          <div className="flex items-center gap-3">
            {discordUser && (
              <button
                onClick={discordLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <LogOut size={14} /> Sign out
              </button>
            )}
            <button onClick={closeMemberPanel} className="text-gray-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">

          {/* Loading */}
          {authLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <p className="text-gray-400 text-sm">Verifying your Discord account...</p>
            </div>
          )}

          {/* Not logged in */}
          {!authLoading && !discordUser && (
            <div className="flex flex-col items-center justify-center py-16 gap-6">
              <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#7289da">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z"/>
                </svg>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">Team Portal</h3>
                <p className="text-gray-400 text-sm max-w-sm">Sign in with your Discord account to access the team portal and manage your projects.</p>
              </div>
              <button
                onClick={discordLogin}
                className="flex items-center gap-3 px-8 py-3 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-lg transition-colors shadow-lg shadow-indigo-900/30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z"/>
                </svg>
                Sign in with Discord
              </button>
            </div>
          )}

          {/* Pending */}
          {!authLoading && discordUser && role === 'pending' && (
            <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
              {avatarUrl && <img src={avatarUrl} alt={displayName} className="w-20 h-20 rounded-full border-2 border-yellow-500/50" />}
              <div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock size={20} className="text-yellow-400" />
                  <h3 className="text-xl font-bold text-white">Request Pending</h3>
                </div>
                <p className="text-gray-400 text-sm max-w-sm">
                  Hi <strong className="text-white">{displayName}</strong>! Your join request has been submitted and is waiting for approval from the owner or an admin.
                </p>
                <p className="text-gray-600 text-xs mt-3">You'll be notified when your request is reviewed. Try signing in again after approval.</p>
                <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10 text-left">
                  <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Your Discord Info</p>
                  <p className="text-xs text-gray-400">Username: <span className="text-white font-mono">{discordUser.username}</span></p>
                  <p className="text-xs text-gray-400">Numeric ID: <span className="text-white font-mono select-all">{discordUser.id}</span></p>
                </div>
              </div>
              <button onClick={discordLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white bg-white/5 rounded-lg transition-colors">
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}

          {/* Member dashboard */}
          {!authLoading && discordUser && role === 'member' && (
            <div className="space-y-10 pb-8">
              {accessibleProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                  <Users size={48} className="mb-4 opacity-30" />
                  <p>You haven't been assigned to any projects yet.</p>
                  <p className="text-sm mt-1 opacity-60">Ask the owner to assign you to a project.</p>
                </div>
              ) : (
                accessibleProjects.map(project => (
                  <div key={project.id} className="bg-black/30 rounded-2xl border border-white/5 overflow-hidden">
                    <div className="p-5 bg-white/5 border-b border-white/5">
                      <h3 className="text-xl font-black italic text-white">{project.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {project.sections.reduce((a, s) => a + s.steps.filter(st => st.isCompleted).length, 0)} / {project.sections.reduce((a, s) => a + s.steps.length, 0)} steps complete
                      </p>
                    </div>
                    <div className="p-5 space-y-5">
                      {project.sections.map((section, secIdx) => {
                        const sectionIds = project.sections.map(s => s.id);
                        return (
                          <div key={section.id} className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-bold text-gray-300 text-sm uppercase tracking-widest">{section.title}</h4>
                              <div className="flex items-center gap-1">
                                <button onClick={() => reorderSections(project.id, moveInArray(sectionIds, section.id, 'up'))} disabled={secIdx === 0} className="p-1 text-gray-500 hover:text-white disabled:opacity-20"><ChevronUp size={14} /></button>
                                <button onClick={() => reorderSections(project.id, moveInArray(sectionIds, section.id, 'down'))} disabled={secIdx === project.sections.length - 1} className="p-1 text-gray-500 hover:text-white disabled:opacity-20"><ChevronDown size={14} /></button>
                                <button onClick={() => removeSection(project.id, section.id)} className="p-1.5 text-red-400 hover:text-red-300 ml-1"><Trash2 size={14} /></button>
                              </div>
                            </div>
                            <div className="space-y-2 mb-3">
                              {section.steps.map((step, stepIdx) => {
                                const stepIds = section.steps.map(s => s.id);
                                return (
                                  <div key={step.id} className="flex items-center gap-2 p-2 rounded bg-black/20 group">
                                    <button onClick={() => toggleStep(project.id, section.id, step.id)} className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${step.isCompleted ? 'bg-indigo-500 border-indigo-500' : 'border-gray-600 hover:border-indigo-400'}`}>
                                      {step.isCompleted && <Check size={12} className="text-white" />}
                                    </button>
                                    <span className={`flex-1 text-sm ${step.isCompleted ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{step.text}</span>
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => reorderSteps(project.id, section.id, moveInArray(stepIds, step.id, 'up'))} disabled={stepIdx === 0} className="p-1 text-gray-500 hover:text-white disabled:opacity-20"><ChevronUp size={12} /></button>
                                      <button onClick={() => reorderSteps(project.id, section.id, moveInArray(stepIds, step.id, 'down'))} disabled={stepIdx === section.steps.length - 1} className="p-1 text-gray-500 hover:text-white disabled:opacity-20"><ChevronDown size={12} /></button>
                                      <button onClick={() => removeStep(project.id, section.id, step.id)} className="p-1 text-red-500 hover:bg-red-500/10 rounded"><Trash2 size={12} /></button>
                                    </div>
                                  </div>
                                );
                              })}
                              {section.steps.length === 0 && <p className="text-xs text-gray-700 italic py-1">No steps yet.</p>}
                            </div>
                            <div className="flex gap-2">
                              <input type="text" value={newStepInputs[`${project.id}-${section.id}`] || ''} onChange={(e) => setNewStepInputs({ ...newStepInputs, [`${project.id}-${section.id}`]: e.target.value })} placeholder="Add step..." className="flex-1 px-3 py-1.5 rounded bg-black/50 border border-white/10 outline-none text-xs text-white focus:border-indigo-500" onKeyDown={(e) => e.key === 'Enter' && handleAddStep(project.id, section.id)} />
                              <button onClick={() => handleAddStep(project.id, section.id)} className="p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-white"><Plus size={16} /></button>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex gap-2 pt-2 border-t border-white/5">
                        <input type="text" value={newSectionInputs[project.id] || ''} onChange={(e) => setNewSectionInputs({ ...newSectionInputs, [project.id]: e.target.value })} placeholder="New section name..." className="flex-1 px-4 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-sm text-white focus:border-indigo-500" onKeyDown={(e) => e.key === 'Enter' && handleAddSection(project.id)} />
                        <button onClick={() => handleAddSection(project.id)} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={16} /> Add Section</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default MemberPanel;
