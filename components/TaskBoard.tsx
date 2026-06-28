import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Check, MoreHorizontal, Trash2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import type { TeamTask, TaskColumn, AppUser } from '../types';
import TaskCardModal from './TaskCardModal';

interface TaskBoardProps {
  projectId: string;
  tasks: TeamTask[];
  assigneeOptions: AppUser[];
  loading: boolean;
}

const COLOR_PALETTE = [
  '#64748b', // slate
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#10b981', // emerald
  '#a855f7', // purple
  '#ec4899', // pink
  '#ef4444', // red
  '#3b82f6', // blue
  '#84cc16', // lime
  '#f97316', // orange
];

const DEFAULT_COLUMNS: { title: string; color: string }[] = [
  { title: 'Todo',        color: '#64748b' },
  { title: 'In Progress', color: '#06b6d4' },
  { title: 'Blocked',     color: '#f59e0b' },
  { title: 'Done',        color: '#10b981' },
];

interface TaskCardProps {
  task: TeamTask;
  assigneeOptions: AppUser[];
  onClick: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, assigneeOptions, onClick }) => {
  const assigneeName = assigneeOptions.find(u => u.discordId === task.assigneeDiscordId)?.username;
  const clItems = task.checklists.flatMap(cl => cl.items);
  const clDone = clItems.filter(it => it.isCompleted).length;
  const clTotal = clItems.length;

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-lg border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] hover:border-indigo-500/30 hover:-translate-y-0.5 transition-all p-3 space-y-2"
    >
      <p className="text-sm font-semibold text-white line-clamp-2 leading-snug">{task.title}</p>
      {task.description && (
        <p className="text-xs text-gray-500 truncate">{task.description}</p>
      )}
      {(assigneeName || clTotal > 0) && (
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {assigneeName ? (
            <span className="text-[11px] rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-gray-400 truncate max-w-[120px]">
              {assigneeName}
            </span>
          ) : <span />}
          {clTotal > 0 && (
            <span className={`flex items-center gap-1 text-[11px] font-medium flex-shrink-0 ${clDone === clTotal ? 'text-emerald-400' : 'text-gray-500'}`}>
              <Check size={11} /> {clDone}/{clTotal}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

interface KanbanColumnProps {
  column: TaskColumn;
  tasks: TeamTask[];
  projectId: string;
  assigneeOptions: AppUser[];
  onCardClick: (task: TeamTask) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, tasks, projectId, assigneeOptions, onCardClick }) => {
  const { addTeamTask, updateTaskColumn, removeTaskColumn } = useData();
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(column.title);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setTitleDraft(column.title); }, [column.title]);

  const openMenu = () => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  };
  const closeMenu = () => setMenuPos(null);

  useEffect(() => {
    if (!menuPos) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current?.contains(e.target as Node)) return;
      if (triggerRef.current?.contains(e.target as Node)) return;
      closeMenu();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuPos]);

  const confirmAdd = async () => {
    const t = newTitle.trim();
    if (!t) return;
    await addTeamTask({ projectId, title: t, columnId: column.id });
    setNewTitle('');
    setAdding(false);
  };

  const saveTitle = () => {
    const t = titleDraft.trim();
    setEditingTitle(false);
    if (t && t !== column.title) updateTaskColumn(column.id, { title: t });
    else setTitleDraft(column.title);
  };

  const changeColor = (color: string) => {
    updateTaskColumn(column.id, { color });
    closeMenu();
  };

  const deleteColumn = () => {
    if (tasks.length > 0 && !window.confirm(`Delete "${column.title}"? This will also remove its ${tasks.length} card${tasks.length === 1 ? '' : 's'}.`)) return;
    removeTaskColumn(column.id);
    closeMenu();
  };

  return (
    <div
      className="flex flex-col w-[280px] flex-shrink-0 rounded-xl border-t-2 bg-black/30"
      style={{ borderTopColor: column.color }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: column.color }} />
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => {
                if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
                if (e.key === 'Escape') { setTitleDraft(column.title); setEditingTitle(false); }
              }}
              className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[12px] font-bold uppercase tracking-[0.18em] text-white outline-none"
            />
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="text-[12px] font-bold uppercase tracking-[0.18em] text-gray-300 hover:text-white truncate text-left"
            >
              {column.title}
            </button>
          )}
          <span className="text-[10px] font-semibold text-gray-500 flex-shrink-0">
            {tasks.length}
          </span>
        </div>
        <button
          ref={triggerRef}
          onClick={() => menuPos ? closeMenu() : openMenu()}
          className="p-1 text-gray-500 hover:text-white transition-colors"
        >
          <MoreHorizontal size={14} />
        </button>
        {menuPos && createPortal(
          <div
            ref={popupRef}
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
            className="z-[200] w-52 rounded-lg border border-white/10 bg-[#1a1c24] shadow-2xl p-3 space-y-3"
          >
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Color</p>
              <div className="grid grid-cols-5 gap-1.5">
                {COLOR_PALETTE.map(c => (
                  <button
                    key={c}
                    onClick={() => changeColor(c)}
                    className={`w-7 h-7 rounded-md border transition-all ${column.color === c ? 'border-white scale-110' : 'border-white/10 hover:scale-105'}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div className="border-t border-white/5 pt-2">
              <button
                onClick={deleteColumn}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={12} /> Delete list
              </button>
            </div>
          </div>,
          document.body
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 max-h-[calc(100vh-280px)]">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            assigneeOptions={assigneeOptions}
            onClick={() => onCardClick(task)}
          />
        ))}
      </div>

      {/* Add card */}
      <div className="px-2 pb-2 pt-1">
        {adding ? (
          <div className="space-y-1.5">
            <textarea
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirmAdd(); }
                if (e.key === 'Escape') { setAdding(false); setNewTitle(''); }
              }}
              placeholder="Card title..."
              rows={2}
              className="w-full rounded-lg border border-indigo-500/40 bg-black/40 px-3 py-2 text-sm text-white outline-none resize-none placeholder-gray-600"
            />
            <div className="flex gap-1.5">
              <button
                onClick={confirmAdd}
                className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold text-white transition-colors"
              >
                Add card
              </button>
              <button
                onClick={() => { setAdding(false); setNewTitle(''); }}
                className="p-1.5 text-gray-500 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors text-xs"
          >
            <Plus size={13} /> Add a card
          </button>
        )}
      </div>
    </div>
  );
};

interface AddListProps {
  projectId: string;
  nextSortOrder: number;
}

const AddList: React.FC<AddListProps> = ({ projectId, nextSortOrder }) => {
  const { addTaskColumn } = useData();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');

  const confirmAdd = async () => {
    const t = title.trim();
    if (!t) return;
    await addTaskColumn({ projectId, title: t, sortOrder: nextSortOrder });
    setTitle('');
    setAdding(false);
  };

  return (
    <div className="w-[280px] flex-shrink-0">
      {adding ? (
        <div className="rounded-xl border border-white/10 bg-black/30 p-2 space-y-1.5">
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') confirmAdd();
              if (e.key === 'Escape') { setAdding(false); setTitle(''); }
            }}
            placeholder="List title..."
            className="w-full rounded-lg border border-indigo-500/40 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder-gray-600"
          />
          <div className="flex gap-1.5">
            <button
              onClick={confirmAdd}
              className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold text-white transition-colors"
            >
              Add list
            </button>
            <button
              onClick={() => { setAdding(false); setTitle(''); }}
              className="p-1.5 text-gray-500 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 text-gray-400 hover:text-white transition-all text-sm font-medium"
        >
          <Plus size={15} /> Add another list
        </button>
      )}
    </div>
  );
};

const TaskBoard: React.FC<TaskBoardProps> = ({ projectId, tasks, assigneeOptions, loading }) => {
  const { taskColumns, addTaskColumn } = useData();
  const [selectedTask, setSelectedTask] = useState<TeamTask | null>(null);
  const seedingRef = useRef(false);

  const projectColumns = useMemo(
    () => taskColumns.filter(c => c.projectId === projectId).sort((a, b) => a.sortOrder - b.sortOrder),
    [taskColumns, projectId]
  );

  // Auto-seed default columns if this project has none
  useEffect(() => {
    if (loading) return;
    if (projectColumns.length > 0) return;
    if (seedingRef.current) return;
    seedingRef.current = true;
    (async () => {
      try {
        for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
          const c = DEFAULT_COLUMNS[i];
          await addTaskColumn({ projectId, title: c.title, color: c.color, sortOrder: i });
        }
      } catch (err) {
        console.error('Failed to seed default columns:', err);
        seedingRef.current = false;
      }
    })();
  }, [projectColumns.length, projectId, loading, addTaskColumn]);

  const latestSelected = selectedTask
    ? tasks.find(t => t.id === selectedTask.id) ?? selectedTask
    : null;

  const nextSortOrder = projectColumns.length > 0
    ? Math.max(...projectColumns.map(c => c.sortOrder)) + 1
    : 0;

  if (loading) {
    return (
      <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-8 text-sm text-gray-500 text-center">
        Loading tasks...
      </div>
    );
  }

  return (
    <>
      {latestSelected && (
        <TaskCardModal
          task={latestSelected}
          projectColumns={projectColumns}
          assigneeOptions={assigneeOptions}
          onClose={() => setSelectedTask(null)}
        />
      )}

      <div className="flex gap-3 overflow-x-auto pb-3 px-1">
        {projectColumns.map(col => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={tasks.filter(t => t.columnId === col.id)}
            projectId={projectId}
            assigneeOptions={assigneeOptions}
            onCardClick={setSelectedTask}
          />
        ))}
        <AddList projectId={projectId} nextSortOrder={nextSortOrder} />
      </div>
    </>
  );
};

export default TaskBoard;
