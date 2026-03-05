import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { X, Plus, Trash2, Check, Crown, Save, FolderPlus, Layers, Type, Users, ChevronUp, ChevronDown, LogOut, Shield, UserCheck, UserX, Clock, Pencil } from 'lucide-react';

const moveInArray = (ids: string[], id: string, direction: 'up' | 'down') => {
  const idx = ids.indexOf(id);
  if (direction === 'up' && idx <= 0) return ids;
  if (direction === 'down' && idx >= ids.length - 1) return ids;
  const next = [...ids];
  const swap = direction === 'up' ? idx - 1 : idx + 1;
  [next[idx], next[swap]] = [next[swap], next[idx]];
  return next;
};

const buildAvatarUrl = (discordId: string, avatar: string | null) =>
  avatar ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=128` : null;

const AdminPanel: React.FC = () => {
  const {
    isAdminOpen,
    closeAdmin,
    discordUser,
    role,
    discordLogout,
    faqData,
    roadmapProjects,
    appUsers,
    requests,
    addFAQ,
    removeFAQ,
    addProject,
    removeProject,
    renameProject,
    addSection,
    removeSection,
    addStep,
    removeStep,
    toggleStep,
    reorderProjects,
    reorderSections,
    reorderSteps,
    approveRequest,
    rejectRequest,
    updateUserRole,
    updateUserProjects,
    removeUser,
  } = useData();

  const [activeTab, setActiveTab] = useState<'roadmap' | 'faq' | 'members' | 'requests'>('roadmap');
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');
  const [newProjTitle, setNewProjTitle] = useState('');
  const [newSectionInputs, setNewSectionInputs] = useState<{ [key: string]: string }>({});
  const [newStepInputs, setNewStepInputs] = useState<{ [key: string]: string }>({});

  // Approve request state
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approveRole, setApproveRole] = useState<'admin' | 'member'>('member');
  const [approveProjectIds, setApproveProjectIds] = useState<string[]>([]);

  // Editing member projects
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Renaming projects
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  if (!isAdminOpen) return null;

  const isOwner = role === 'owner';
  const isAuthenticated = role === 'owner' || role === 'admin';

  // Not authenticated - show access denied
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-neutral-900 w-full max-w-md rounded-2xl border border-red-500/30 shadow-2xl p-8 text-center">
          <Shield size={40} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 text-sm mb-6">You must be signed in as an Owner or Admin to access this panel.</p>
          <p className="text-gray-500 text-xs mb-6">Use the Team Portal button to sign in with Discord.</p>
          <button onClick={closeAdmin} className="px-6 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors">Close</button>
        </div>
      </div>
    );
  }

  const displayName = discordUser?.global_name || discordUser?.username || '';
  const avatarUrl = discordUser ? buildAvatarUrl(discordUser.id, discordUser.avatar) : null;

  const handleCreateProject = () => {
    if (newProjTitle.trim()) { addProject(newProjTitle, 'code'); setNewProjTitle(''); }
  };

  const handleCreateSection = (projectId: string) => {
    const title = newSectionInputs[projectId];
    if (title?.trim()) { addSection(projectId, title); setNewSectionInputs(prev => ({ ...prev, [projectId]: '' })); }
  };

  const handleCreateStep = (projectId: string, sectionId: string) => {
    const key = `${projectId}-${sectionId}`;
    const text = newStepInputs[key];
    if (text?.trim()) { addStep(projectId, sectionId, text); setNewStepInputs(prev => ({ ...prev, [key]: '' })); }
  };

  const handleApprove = async (discordId: string) => {
    await approveRequest(discordId, approveRole, approveProjectIds);
    setApprovingId(null);
    setApproveRole('member');
    setApproveProjectIds([]);
  };

  const toggleApproveProject = (pid: string) => {
    setApproveProjectIds(prev => prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]);
  };

  const toggleUserProject = (discordId: string, pid: string) => {
    const user = appUsers.find(u => u.discordId === discordId);
    if (!user) return;
    const updated = user.projectIds.includes(pid) ? user.projectIds.filter(id => id !== pid) : [...user.projectIds, pid];
    updateUserProjects(discordId, updated);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 w-full max-w-5xl max-h-[90vh] rounded-2xl border border-purple-500/30 shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-neutral-950">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              {isOwner
                ? <><Crown size={20} className="text-yellow-400" /> Owner Panel</>
                : <><Shield size={20} className="text-purple-500" /> Admin Panel</>
              }
            </h2>
            {avatarUrl && <img src={avatarUrl} alt={displayName} className="w-7 h-7 rounded-full border border-white/20" />}
            <span className="text-sm text-gray-400">{displayName}</span>
            {requests.length > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs">
                <Clock size={10} /> {requests.length} pending
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={discordLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <LogOut size={14} /> Sign out
            </button>
            <button onClick={closeAdmin} className="text-gray-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="h-full flex flex-col">
            {/* Tabs */}
            <div className="flex space-x-2 mb-6 border-b border-white/10 pb-2 flex-wrap gap-y-2">
              {(['roadmap', 'faq', 'members', 'requests'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg transition-colors font-medium capitalize relative ${activeTab === tab ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  {tab === 'roadmap' ? 'Roadmap & Projects' : tab === 'faq' ? 'FAQ Manager' : tab === 'members' ? (
                    <span className="flex items-center gap-1"><Users size={14} /> Members</span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} /> Requests
                      {requests.length > 0 && <span className="w-5 h-5 rounded-full bg-yellow-500 text-black text-xs font-bold flex items-center justify-center">{requests.length}</span>}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── ROADMAP TAB ── */}
            {activeTab === 'roadmap' && (
              <div className="space-y-12 pb-12">
                <div className="bg-purple-600/10 p-4 rounded-xl border border-purple-500/20 flex gap-4">
                  <input type="text" value={newProjTitle} onChange={(e) => setNewProjTitle(e.target.value)} placeholder="New Project Name" className="flex-1 px-4 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500" onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()} />
                  <button onClick={handleCreateProject} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center gap-2 font-bold">
                    <FolderPlus size={18} /> New Project
                  </button>
                </div>

                {roadmapProjects.map((project, projIdx) => {
                  const projectIds = roadmapProjects.map(p => p.id);
                  return (
                    <div key={project.id} className="bg-black/30 rounded-2xl border border-white/5 overflow-hidden">
                      <div className="p-4 bg-white/5 flex justify-between items-center gap-3">
                        {renamingProjectId === project.id ? (
                          <form
                            className="flex-1 flex gap-2"
                            onSubmit={(e) => { e.preventDefault(); if (renameValue.trim()) { renameProject(project.id, renameValue.trim()); } setRenamingProjectId(null); }}
                          >
                            <input
                              autoFocus
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => e.key === 'Escape' && setRenamingProjectId(null)}
                              className="flex-1 px-3 py-1.5 rounded-lg bg-black border border-purple-500/60 outline-none text-white text-xl font-black italic"
                            />
                            <button type="submit" className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold">Save</button>
                            <button type="button" onClick={() => setRenamingProjectId(null)} className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg text-sm">Cancel</button>
                          </form>
                        ) : (
                          <h3
                            className="text-xl font-black italic text-white flex items-center gap-3 cursor-pointer group/title"
                            onClick={() => { setRenamingProjectId(project.id); setRenameValue(project.title); }}
                            title="Click to rename"
                          >
                            <Type size={18} className="text-purple-400" />
                            {project.title}
                            <Pencil size={14} className="text-gray-600 group-hover/title:text-purple-400 transition-colors" />
                          </h3>
                        )}
                        {renamingProjectId !== project.id && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => reorderProjects(moveInArray(projectIds, project.id, 'up'))} disabled={projIdx === 0} className="p-1.5 text-gray-400 hover:text-white disabled:opacity-20"><ChevronUp size={16} /></button>
                            <button onClick={() => reorderProjects(moveInArray(projectIds, project.id, 'down'))} disabled={projIdx === roadmapProjects.length - 1} className="p-1.5 text-gray-400 hover:text-white disabled:opacity-20"><ChevronDown size={16} /></button>
                            <button onClick={() => removeProject(project.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg ml-2"><Trash2 size={18} /></button>
                          </div>
                        )}
                      </div>
                      <div className="p-6 space-y-6">
                        {project.sections.map((section, secIdx) => {
                          const sectionIds = project.sections.map(s => s.id);
                          return (
                            <div key={section.id} className="bg-white/5 rounded-xl p-4 border border-white/5">
                              <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-gray-300 flex items-center gap-2 uppercase tracking-tighter text-sm">
                                  <Layers size={14} className="text-blue-400" />{section.title}
                                </h4>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => reorderSections(project.id, moveInArray(sectionIds, section.id, 'up'))} disabled={secIdx === 0} className="p-1 text-gray-500 hover:text-white disabled:opacity-20"><ChevronUp size={14} /></button>
                                  <button onClick={() => reorderSections(project.id, moveInArray(sectionIds, section.id, 'down'))} disabled={secIdx === project.sections.length - 1} className="p-1 text-gray-500 hover:text-white disabled:opacity-20"><ChevronDown size={14} /></button>
                                  <button onClick={() => removeSection(project.id, section.id)} className="p-1.5 text-red-400 hover:text-red-300 ml-1"><Trash2 size={14} /></button>
                                </div>
                              </div>
                              <div className="space-y-2 mb-4">
                                {section.steps.map((step, stepIdx) => {
                                  const stepIds = section.steps.map(s => s.id);
                                  return (
                                    <div key={step.id} className="flex items-center gap-2 p-2 rounded bg-black/20 group">
                                      <button onClick={() => toggleStep(project.id, section.id, step.id)} className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${step.isCompleted ? 'bg-purple-500 border-purple-500' : 'border-gray-600'}`}>
                                        {step.isCompleted && <Check size={12} className="text-white" />}
                                      </button>
                                      <span className={`flex-1 text-sm ${step.isCompleted ? 'text-gray-500 line-through' : 'text-gray-300'}`}>{step.text}</span>
                                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => reorderSteps(project.id, section.id, moveInArray(stepIds, step.id, 'up'))} disabled={stepIdx === 0} className="p-1 text-gray-500 hover:text-white disabled:opacity-20"><ChevronUp size={12} /></button>
                                        <button onClick={() => reorderSteps(project.id, section.id, moveInArray(stepIds, step.id, 'down'))} disabled={stepIdx === section.steps.length - 1} className="p-1 text-gray-500 hover:text-white disabled:opacity-20"><ChevronDown size={12} /></button>
                                        <button onClick={() => removeStep(project.id, section.id, step.id)} className="p-1 text-red-500 hover:bg-red-500/10 rounded"><Trash2 size={14} /></button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="flex gap-2">
                                <input type="text" value={newStepInputs[`${project.id}-${section.id}`] || ''} onChange={(e) => setNewStepInputs({ ...newStepInputs, [`${project.id}-${section.id}`]: e.target.value })} placeholder="New step..." className="flex-1 px-3 py-1.5 rounded bg-black/50 border border-white/10 outline-none text-xs text-white" onKeyDown={(e) => e.key === 'Enter' && handleCreateStep(project.id, section.id)} />
                                <button onClick={() => handleCreateStep(project.id, section.id)} className="p-1.5 bg-blue-600 rounded text-white"><Plus size={16} /></button>
                              </div>
                            </div>
                          );
                        })}
                        <div className="flex gap-2 pt-4 border-t border-white/5">
                          <input type="text" value={newSectionInputs[project.id] || ''} onChange={(e) => setNewSectionInputs({ ...newSectionInputs, [project.id]: e.target.value })} placeholder="Add new section title..." className="flex-1 px-4 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-sm text-white" onKeyDown={(e) => e.key === 'Enter' && handleCreateSection(project.id)} />
                          <button onClick={() => handleCreateSection(project.id)} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-bold flex items-center gap-2">
                            <Plus size={16} /> New Section
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── FAQ TAB ── */}
            {activeTab === 'faq' && (
              <div className="space-y-6">
                <div className="bg-black/30 p-6 rounded-xl border border-white/5">
                  <h3 className="text-lg font-bold text-white mb-4">Add New FAQ</h3>
                  <div className="space-y-4">
                    <input type="text" value={newFaqQ} onChange={(e) => setNewFaqQ(e.target.value)} placeholder="Question" className="w-full px-4 py-2 rounded-lg bg-black border border-white/10 outline-none text-white focus:border-purple-500" />
                    <textarea value={newFaqA} onChange={(e) => setNewFaqA(e.target.value)} placeholder="Answer" className="w-full px-4 py-2 rounded-lg bg-black border border-white/10 outline-none text-white h-24" />
                    <button onClick={() => { if (newFaqQ && newFaqA) { addFAQ(newFaqQ, newFaqA); setNewFaqQ(''); setNewFaqA(''); } }} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2">
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
                      <button onClick={() => removeFAQ(faq.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg h-fit"><Trash2 size={18} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── MEMBERS TAB ── */}
            {activeTab === 'members' && (
              <div className="space-y-6 pb-12">
                {appUsers.filter(u => u.role !== 'owner').length === 0 ? (
                  <p className="text-center text-gray-600 py-8 italic">No team members yet. Approve requests to add members.</p>
                ) : (
                  appUsers.filter(u => u.role !== 'owner').map(user => (
                    <div key={user.discordId} className="bg-black/30 rounded-xl border border-white/5 overflow-hidden">
                      <div className="p-4 flex justify-between items-center bg-white/5">
                        <div className="flex items-center gap-3">
                          {user.avatar
                            ? <img src={buildAvatarUrl(user.discordId, user.avatar)!} alt={user.username} className="w-9 h-9 rounded-full" />
                            : <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">{user.username[0].toUpperCase()}</div>
                          }
                          <div>
                            <span className="font-bold text-white">{user.username}</span>
                            <span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${user.role === 'admin' ? 'bg-purple-600/30 border border-purple-500/40 text-purple-300' : 'bg-white/5 border border-white/10 text-gray-400'}`}>
                              {user.role === 'admin' ? <><Shield size={10} /> Admin</> : 'Member'}
                            </span>
                            <p className="text-xs text-gray-600">ID: {user.discordId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOwner && (
                            <button
                              onClick={() => updateUserRole(user.discordId, user.role === 'admin' ? 'member' : 'admin')}
                              className={`px-2 py-1 text-xs rounded-lg border transition-colors ${user.role === 'admin' ? 'bg-purple-600/20 border-purple-500/40 text-purple-300 hover:bg-purple-600/40' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                            >
                              <Shield size={12} className="inline mr-1" />{user.role === 'admin' ? 'Revoke Admin' : 'Grant Admin'}
                            </button>
                          )}
                          <button onClick={() => setEditingUserId(editingUserId === user.discordId ? null : user.discordId)} className="px-3 py-1 text-xs rounded-lg bg-neutral-700 hover:bg-neutral-600 text-gray-300 transition-colors">
                            {editingUserId === user.discordId ? 'Done' : 'Edit Projects'}
                          </button>
                          <button onClick={() => removeUser(user.discordId)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 size={16} /></button>
                        </div>
                      </div>
                      {editingUserId === user.discordId && (
                        <div className="p-4 border-t border-white/5">
                          <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Assigned Projects</p>
                          <div className="flex flex-wrap gap-2">
                            {roadmapProjects.map(p => (
                              <button key={p.id} onClick={() => toggleUserProject(user.discordId, p.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${user.projectIds.includes(p.id) ? 'bg-purple-600 border-purple-500 text-white' : 'bg-black/30 border-white/10 text-gray-400 hover:text-white'}`}>
                                {user.projectIds.includes(p.id) && <Check size={12} className="inline mr-1" />}{p.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {editingUserId !== user.discordId && (
                        <div className="px-4 pb-3 pt-2 flex flex-wrap gap-2">
                          {user.projectIds.length === 0
                            ? <span className="text-xs text-gray-600 italic">No projects assigned</span>
                            : user.projectIds.map(pid => {
                                const proj = roadmapProjects.find(p => p.id === pid);
                                return proj ? <span key={pid} className="px-2 py-0.5 rounded bg-purple-600/20 text-purple-300 text-xs border border-purple-500/20">{proj.title}</span> : null;
                              })}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── REQUESTS TAB ── */}
            {activeTab === 'requests' && (
              <div className="space-y-6 pb-12">
                {requests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-600">
                    <UserCheck size={48} className="mb-4 opacity-30" />
                    <p className="italic">No pending join requests.</p>
                  </div>
                ) : (
                  requests.map(req => (
                    <div key={req.discordId} className="bg-black/30 rounded-xl border border-yellow-500/20 overflow-hidden">
                      <div className="p-4 flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          {req.avatar
                            ? <img src={buildAvatarUrl(req.discordId, req.avatar)!} alt={req.username} className="w-12 h-12 rounded-full border-2 border-yellow-500/30" />
                            : <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">{req.username[0].toUpperCase()}</div>
                          }
                          <div>
                            <p className="font-bold text-white text-lg">{req.username}</p>
                            <p className="text-xs text-gray-500">Discord ID: {req.discordId}</p>
                            <p className="text-xs text-gray-600">Requested: {new Date(req.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setApprovingId(approvingId === req.discordId ? null : req.discordId); setApproveRole('member'); setApproveProjectIds([]); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-lg bg-green-600/20 border border-green-500/40 text-green-300 hover:bg-green-600/40 transition-colors"
                          >
                            <UserCheck size={14} /> Accept
                          </button>
                          <button
                            onClick={() => rejectRequest(req.discordId)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-lg bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600/40 transition-colors"
                          >
                            <UserX size={14} /> Reject
                          </button>
                        </div>
                      </div>

                      {/* Approve form */}
                      {approvingId === req.discordId && (
                        <div className="border-t border-yellow-500/20 p-4 bg-white/2 space-y-4">
                          <div className="flex items-center gap-4">
                            <p className="text-xs text-gray-400 uppercase tracking-wider">Role:</p>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" name={`role-${req.discordId}`} value="member" checked={approveRole === 'member'} onChange={() => setApproveRole('member')} className="accent-purple-500" />
                              <span className="text-sm text-gray-300">Member</span>
                            </label>
                            {isOwner && (
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name={`role-${req.discordId}`} value="admin" checked={approveRole === 'admin'} onChange={() => setApproveRole('admin')} className="accent-purple-500" />
                                <span className="text-sm text-gray-300 flex items-center gap-1"><Shield size={12} className="text-purple-400" /> Admin</span>
                              </label>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Assign Projects:</p>
                            <div className="flex flex-wrap gap-2">
                              {roadmapProjects.map(p => (
                                <button key={p.id} onClick={() => toggleApproveProject(p.id)} className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${approveProjectIds.includes(p.id) ? 'bg-purple-600 border-purple-500 text-white' : 'bg-black/30 border-white/10 text-gray-400 hover:text-white'}`}>
                                  {approveProjectIds.includes(p.id) && <Check size={12} className="inline mr-1" />}{p.title}
                                </button>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => handleApprove(req.discordId)}
                            className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold flex items-center gap-2 transition-colors"
                          >
                            <UserCheck size={16} /> Confirm Approval
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
