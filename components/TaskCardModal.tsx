import React, { useState } from 'react';
import { X, Trash2, Plus, Check } from 'lucide-react';
import { useData } from '../context/DataContext';
import type { TeamTask, TaskChecklist, TaskChecklistItem, TaskColumn, AppUser } from '../types';

function nanoid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

interface Props {
  task: TeamTask;
  projectColumns: TaskColumn[];
  assigneeOptions: AppUser[];
  onClose: () => void;
}

const TaskCardModal: React.FC<Props> = ({ task, projectColumns, assigneeOptions, onClose }) => {
  const { updateTeamTask, removeTeamTask } = useData();

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [columnId, setColumnId] = useState<string | null>(task.columnId);
  const [assigneeDiscordId, setAssigneeDiscordId] = useState<string>(task.assigneeDiscordId ?? '');
  const [checklists, setChecklists] = useState<TaskChecklist[]>(task.checklists);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [showNewChecklist, setShowNewChecklist] = useState(false);
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});

  const saveTitle = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) updateTeamTask(task.id, { title: trimmed });
  };

  const saveDescription = () => {
    if (description !== task.description) updateTeamTask(task.id, { description });
  };

  const changeColumn = (id: string) => {
    setColumnId(id);
    updateTeamTask(task.id, { columnId: id });
  };

  const changeAssignee = (id: string) => {
    setAssigneeDiscordId(id);
    updateTeamTask(task.id, { assigneeDiscordId: id || null });
  };

  const saveChecklists = (next: TaskChecklist[]) => {
    setChecklists(next);
    updateTeamTask(task.id, { checklists: next });
  };

  const addChecklist = () => {
    const t = newChecklistTitle.trim();
    if (!t) return;
    saveChecklists([...checklists, { id: nanoid(), title: t, items: [] }]);
    setNewChecklistTitle('');
    setShowNewChecklist(false);
  };

  const removeChecklist = (clId: string) => {
    saveChecklists(checklists.filter(cl => cl.id !== clId));
  };

  const renameChecklist = (clId: string, newTitle: string) => {
    saveChecklists(checklists.map(cl => cl.id === clId ? { ...cl, title: newTitle } : cl));
  };

  const addItem = (clId: string) => {
    const text = (newItemTexts[clId] ?? '').trim();
    if (!text) return;
    const newItem: TaskChecklistItem = { id: nanoid(), text, isCompleted: false };
    saveChecklists(checklists.map(cl => cl.id === clId ? { ...cl, items: [...cl.items, newItem] } : cl));
    setNewItemTexts(prev => ({ ...prev, [clId]: '' }));
  };

  const toggleItem = (clId: string, itemId: string) => {
    saveChecklists(checklists.map(cl =>
      cl.id === clId
        ? { ...cl, items: cl.items.map(it => it.id === itemId ? { ...it, isCompleted: !it.isCompleted } : it) }
        : cl
    ));
  };

  const removeItem = (clId: string, itemId: string) => {
    saveChecklists(checklists.map(cl =>
      cl.id === clId ? { ...cl, items: cl.items.filter(it => it.id !== itemId) } : cl
    ));
  };

  const deleteCard = async () => {
    await removeTeamTask(task.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl my-8 bg-[#13141a] rounded-2xl border border-white/10 shadow-2xl">

        {/* Header */}
        <div className="flex items-start gap-3 p-6 pb-4 border-b border-white/5">
          <input
            className="flex-1 bg-transparent text-xl font-bold text-white outline-none placeholder-gray-600 min-w-0"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
          />
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors flex-shrink-0 mt-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Column selector */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500 mb-2">List</p>
            <div className="flex flex-wrap gap-2">
              {projectColumns.map(col => {
                const active = columnId === col.id;
                return (
                  <button
                    key={col.id}
                    onClick={() => changeColumn(col.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all ${active ? 'border-white/40 bg-white/10 text-white' : 'border-white/10 text-gray-400 hover:bg-white/5 hover:text-white'}`}
                    style={active ? { borderColor: col.color, background: `${col.color}25` } : {}}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                    {col.title}
                  </button>
                );
              })}
              {projectColumns.length === 0 && (
                <p className="text-xs text-gray-500 italic">No lists yet for this project.</p>
              )}
            </div>
          </div>

          {/* Assignee */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500 mb-2">Assignee</p>
            <select
              value={assigneeDiscordId}
              onChange={e => changeAssignee(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
            >
              <option value="">Unassigned</option>
              {assigneeOptions.map(u => (
                <option key={u.discordId} value={u.discordId}>{u.username}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500 mb-2">Description</p>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              onBlur={saveDescription}
              placeholder="Add a description..."
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500 resize-none placeholder-gray-600"
            />
          </div>

          {/* Checklists */}
          {checklists.length > 0 && (
            <div className="space-y-5">
              {checklists.map(cl => {
                const done = cl.items.filter(it => it.isCompleted).length;
                const total = cl.items.length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;

                return (
                  <div key={cl.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        className="flex-1 bg-transparent text-sm font-bold text-gray-200 outline-none"
                        defaultValue={cl.title}
                        onBlur={e => renameChecklist(cl.id, e.target.value.trim() || cl.title)}
                      />
                      <span className="text-xs text-gray-500 flex-shrink-0">{done}/{total}</span>
                      <button onClick={() => removeChecklist(cl.id)} className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Progress bar */}
                    {total > 0 && (
                      <div className="h-1.5 bg-white/5 rounded-full mb-3 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%`, background: 'var(--cyan)' }}
                        />
                      </div>
                    )}

                    {/* Items */}
                    <div className="space-y-1.5 mb-2">
                      {cl.items.map(item => (
                        <div key={item.id} className="flex items-center gap-2.5 group px-1">
                          <button
                            onClick={() => toggleItem(cl.id, item.id)}
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${item.isCompleted ? 'bg-[var(--cyan)] border-[var(--cyan)]' : 'border-gray-600 hover:border-[var(--cyan)]'}`}
                          >
                            {item.isCompleted && <Check size={10} className="text-black" />}
                          </button>
                          <span className={`flex-1 text-sm ${item.isCompleted ? 'text-gray-600 line-through' : 'text-gray-300'}`}>
                            {item.text}
                          </span>
                          <button
                            onClick={() => removeItem(cl.id, item.id)}
                            className="text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add item */}
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        value={newItemTexts[cl.id] ?? ''}
                        onChange={e => setNewItemTexts(prev => ({ ...prev, [cl.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && addItem(cl.id)}
                        placeholder="Add an item..."
                        className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500 placeholder-gray-600"
                      />
                      <button
                        onClick={() => addItem(cl.id)}
                        className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add checklist */}
          {showNewChecklist ? (
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={newChecklistTitle}
                onChange={e => setNewChecklistTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addChecklist(); if (e.key === 'Escape') setShowNewChecklist(false); }}
                placeholder="Checklist title..."
                className="flex-1 rounded-lg border border-indigo-500/50 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder-gray-600"
              />
              <button onClick={addChecklist} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold text-white transition-colors">Add</button>
              <button onClick={() => setShowNewChecklist(false)} className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-400 transition-colors">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewChecklist(true)}
              className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Plus size={15} /> Add checklist
            </button>
          )}

          {/* Delete */}
          <div className="pt-4 border-t border-white/5">
            <button
              onClick={deleteCard}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 size={14} /> Delete card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCardModal;
