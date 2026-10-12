import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, ensureAuth } from '../lib/supabase';
import { FAQItem, RoadmapProject, AppUser, JoinRequest, TeamTask, TaskChecklist, TaskColumn } from '../types';
import { AdminPermissions, defaultAdminPermissions } from '../config/ownerConfig';
import {
  DiscordUser,
  OWNER_DISCORD_ID,
  parseDiscordTokenFromHash,
  fetchDiscordUser,
  redirectToDiscordOAuth,
} from '../lib/discord';

type Role = 'owner' | 'admin' | 'member' | 'pending' | null;

interface DataContextType {
  // Auth
  discordUser: DiscordUser | null;
  currentAppUser: AppUser | null;
  role: Role;
  authLoading: boolean;
  portalSyncError: string;
  discordLogin: () => void;
  discordLogout: () => void;
  // Panel state
  isAdminOpen: boolean;
  adminForcePasswordGate: boolean;
  openAdmin: (options?: { forcePasswordGate?: boolean }) => void;
  closeAdmin: () => void;
  isMemberPanelOpen: boolean;
  openMemberPanel: () => void;
  closeMemberPanel: () => void;
  // FAQ
  faqData: FAQItem[];
  addFAQ: (question: string, answer: string) => void;
  removeFAQ: (id: string) => void;
  // Roadmap
  roadmapProjects: RoadmapProject[];
  addProject: (title: string, iconType: RoadmapProject['iconType']) => void;
  removeProject: (projectId: string) => void;
  renameProject: (projectId: string, newTitle: string) => void;
  updateProject: (projectId: string, patch: Partial<RoadmapProject>) => void;
  addSection: (projectId: string, title: string) => void;
  removeSection: (projectId: string, sectionId: string) => void;
  renameSection: (projectId: string, sectionId: string, newTitle: string) => void;
  addStep: (projectId: string, sectionId: string, text: string) => void;
  removeStep: (projectId: string, sectionId: string, stepId: string) => void;
  renameStep: (projectId: string, sectionId: string, stepId: string, newText: string) => void;
  toggleStep: (projectId: string, sectionId: string, stepId: string) => void;
  reorderProjects: (ids: string[]) => void;
  reorderSections: (projectId: string, ids: string[]) => void;
  reorderSteps: (projectId: string, sectionId: string, ids: string[]) => void;
  // Team tasks
  teamTasks: TeamTask[];
  teamTasksLoading: boolean;
  addTeamTask: (input: { projectId: string; title: string; description?: string; assigneeDiscordId?: string | null; columnId?: string | null; }) => Promise<void>;
  updateTeamTask: (taskId: string, patch: Partial<Pick<TeamTask, 'title' | 'description' | 'columnId' | 'assigneeDiscordId' | 'sortOrder' | 'checklists'>>) => Promise<void>;
  removeTeamTask: (taskId: string) => Promise<void>;
  // Task columns (Trello-style lists)
  taskColumns: TaskColumn[];
  addTaskColumn: (input: { projectId: string; title: string; color?: string; sortOrder?: number; }) => Promise<TaskColumn | null>;
  updateTaskColumn: (columnId: string, patch: Partial<Pick<TaskColumn, 'title' | 'color' | 'sortOrder'>>) => Promise<void>;
  removeTaskColumn: (columnId: string) => Promise<void>;
  // Users & Requests
  appUsers: AppUser[];
  requests: JoinRequest[];
  approveRequest: (discordId: string, assignRole: 'admin' | 'member', projectIds: string[], adminPermissions?: AdminPermissions) => Promise<void>;
  rejectRequest: (discordId: string) => Promise<void>;
  updateUserRole: (discordId: string, newRole: 'admin' | 'member') => Promise<void>;
  updateAdminPermissions: (discordId: string, permissions: AdminPermissions) => Promise<void>;
  updateUserProjects: (discordId: string, projectIds: string[]) => Promise<void>;
  removeUser: (discordId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);
const OWNER_SESSION_KEY = 'wahaj_owner_verified';

const INITIAL_FAQ: FAQItem[] = [
  {
    id: '1',
    question: 'What engine do you use for Mecha Overdrive?',
    answer: 'I primarily use the Unity Engine for my development projects, utilizing C# for all gameplay programming and systems.',
  }
];

const INITIAL_ROADMAP: RoadmapProject[] = [
  {
    id: 'mecha',
    title: 'Mecha Overdrive',
    iconType: 'gamepad',
    color: 'from-purple-500 to-indigo-500',
    sections: [
      {
        id: 's1',
        title: 'Core Development',
        steps: [
          { id: '1', text: 'Gray boxing', isCompleted: true },
          { id: '2', text: 'Modelling', isCompleted: true },
          { id: '3', text: 'Adding weapons', isCompleted: true },
          { id: '4', text: 'Animating', isCompleted: true },
          { id: '5', text: 'Coding it in game', isCompleted: false },
        ]
      },
      {
        id: 's2',
        title: 'Beta Phase',
        steps: [
          { id: '6', text: 'Beta testing', isCompleted: false },
          { id: '7', text: 'Releasing it', isCompleted: false },
        ]
      }
    ]
  },
  {
    id: 'monde',
    title: 'Monde Miraculous',
    iconType: 'sparkles',
    color: 'from-pink-500 to-rose-500',
    sections: [
      {
        id: 'ms1',
        title: 'Production',
        steps: [
          { id: 'm1', text: 'Models', isCompleted: true },
          { id: 'm2', text: 'Coding it in game', isCompleted: false },
          { id: 'm3', text: 'Function', isCompleted: false },
        ]
      }
    ]
  }
];

// Map Supabase snake_case row → AppUser camelCase
const rowToAppUser = (row: Record<string, unknown>): AppUser => ({
  discordId: row.discord_id as string,
  username: row.username as string,
  avatar: row.avatar as string | null,
  role: row.role as AppUser['role'],
  projectIds: (row.project_ids as string[]) ?? [],
  adminPermissions: row.admin_permissions as AdminPermissions | undefined,
  createdAt: row.created_at as number,
});

const rowToTeamTask = (row: Record<string, unknown>): TeamTask => ({
  id: row.id as string,
  projectId: row.project_id as string,
  columnId: (row.column_id as string | null) ?? null,
  title: row.title as string,
  description: (row.description as string | null) ?? '',
  assigneeDiscordId: (row.assignee_discord_id as string | null) ?? null,
  createdByDiscordId: (row.created_by_discord_id as string | null) ?? null,
  sortOrder: Number(row.sort_order ?? 0),
  checklists: (row.checklists as TaskChecklist[] | null) ?? [],
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

const rowToTaskColumn = (row: Record<string, unknown>): TaskColumn => ({
  id: row.id as string,
  projectId: row.project_id as string,
  title: row.title as string,
  color: (row.color as string | null) ?? '#64748b',
  sortOrder: Number(row.sort_order ?? 0),
  createdAt: row.created_at as string,
});

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [faqData, setFaqData] = useState<FAQItem[]>(() => {
    try { const s = localStorage.getItem('wahaj_faq'); return s ? JSON.parse(s) : INITIAL_FAQ; } catch { return INITIAL_FAQ; }
  });

  const [roadmapProjects, setRoadmapProjects] = useState<RoadmapProject[]>(() => {
    try { const s = localStorage.getItem('wahaj_roadmap_v2'); return s ? JSON.parse(s) : INITIAL_ROADMAP; } catch { return INITIAL_ROADMAP; }
  });

  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminForcePasswordGate, setAdminForcePasswordGate] = useState(false);
  const [isMemberPanelOpen, setIsMemberPanelOpen] = useState(false);

  // Auth state
  const [discordToken, setDiscordToken] = useState<string | null>(() => {
    const token = localStorage.getItem('discord_token');
    const expires = parseInt(localStorage.getItem('discord_token_expires') || '0');
    if (token && Date.now() < expires) return token;
    return null;
  });
  const [discordUser, setDiscordUser] = useState<DiscordUser | null>(null);
  const [currentAppUser, setCurrentAppUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [authLoading, setAuthLoading] = useState(() => !!localStorage.getItem('discord_token'));
  const [portalSyncError, setPortalSyncError] = useState('');
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [supabaseAuthReady, setSupabaseAuthReady] = useState(false);

  // Users & Requests from Supabase
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([]);
  const [teamTasksLoading, setTeamTasksLoading] = useState(true);
  const [taskColumns, setTaskColumns] = useState<TaskColumn[]>([]);
  const isOwnerAccount = discordUser?.id === OWNER_DISCORD_ID || discordUser?.username === OWNER_DISCORD_ID;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseSession(session);
      setSupabaseAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSupabaseSession(session);
      setSupabaseAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!discordToken || !supabaseAuthReady || supabaseSession) return;
    ensureAuth().catch((error) => {
      console.error('Failed to establish Supabase auth for Discord portal:', error);
    });
  }, [discordToken, supabaseAuthReady, supabaseSession]);

  // Step 1: Parse Discord token from URL hash on initial load
  useEffect(() => {
    const parsed = parseDiscordTokenFromHash();
    if (parsed) {
      localStorage.setItem('discord_token', parsed.token);
      localStorage.setItem('discord_token_expires', parsed.expiresAt.toString());
      setDiscordToken(parsed.token);
      setAuthLoading(true);
      // Auto-open Team Portal after Discord redirect
      setIsMemberPanelOpen(true);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // Step 2: Authenticate with Discord API whenever token changes
  useEffect(() => {
    if (!discordToken) {
      setAuthLoading(false);
      setDiscordUser(null);
      setCurrentAppUser(null);
      setRole(null);
      setPortalSyncError('');
      localStorage.removeItem(OWNER_SESSION_KEY);
      return;
    }

    if (!supabaseAuthReady) {
      setAuthLoading(true);
      return;
    }

    setAuthLoading(true);
    setPortalSyncError('');

    fetchDiscordUser(discordToken).then(async (user) => {
      setDiscordUser(user);

      const isOwnerLogin = user.id === OWNER_DISCORD_ID || user.username === OWNER_DISCORD_ID;
      if (isOwnerLogin) {
        localStorage.setItem(OWNER_SESSION_KEY, '1');
        setRole('owner');
        setCurrentAppUser({
          discordId: user.id,
          username: user.global_name || user.username,
          avatar: user.avatar,
          role: 'owner',
          projectIds: [],
          createdAt: Date.now(),
        });
        try {
          if (!supabaseSession) await ensureAuth();
          const linkedAuthId = supabaseSession?.user && !supabaseSession.user.is_anonymous
            ? supabaseSession.user.id
            : null;
          const ownerPayload: Record<string, unknown> = {
            discord_id: user.id,
            username: user.global_name || user.username,
            avatar: user.avatar,
            role: 'owner',
            project_ids: [],
            created_at: Date.now(),
          };
          if (linkedAuthId) ownerPayload.auth_user_id = linkedAuthId;
          await supabase.from('discord_users').upsert(ownerPayload);
        } catch (error) {
          console.error('Failed to sync owner user record:', error);
        }
        setAuthLoading(false);
        return;
      }

      localStorage.removeItem(OWNER_SESSION_KEY);

      const syncUser = async () => {
        // Always ensure Supabase auth before DB operations
        await ensureAuth();
        const { data: { session: liveSession } } = await supabase.auth.getSession();
        const linkedAuthId = liveSession?.user && !liveSession.user.is_anonymous
          ? liveSession.user.id
          : null;
        const { data: userRow } = await supabase
          .from('discord_users')
          .select('*')
          .eq('discord_id', user.id)
          .single();
        if (userRow) {
          const appUser = rowToAppUser(userRow as Record<string, unknown>);
          setCurrentAppUser(appUser);
          setRole(appUser.role);
          setPortalSyncError('');
          if (linkedAuthId && (userRow as Record<string, unknown>).auth_user_id !== linkedAuthId) {
            await supabase
              .from('discord_users')
              .update({ auth_user_id: linkedAuthId })
              .eq('discord_id', user.id);
          }
        } else {
          // New user — create a pending access request
          const pendingUser: AppUser = {
            discordId: user.id,
            username: user.global_name || user.username,
            avatar: user.avatar,
            role: 'pending',
            projectIds: [],
            createdAt: Date.now(),
          };
          const pendingPayload: Record<string, unknown> = {
            discord_id: user.id,
            username: pendingUser.username,
            avatar: pendingUser.avatar,
            role: 'pending',
            project_ids: [],
            created_at: pendingUser.createdAt,
          };
          if (linkedAuthId) pendingPayload.auth_user_id = linkedAuthId;
          await supabase.from('discord_users').upsert(pendingPayload);
          setCurrentAppUser(pendingUser);
          setRole('pending');
          setPortalSyncError('');
        }
      };

      try {
        await syncUser();
      } catch {
        // Retry once
        try {
          await syncUser();
        } catch (error) {
          console.error('Failed to sync Discord user role:', error);
          setCurrentAppUser(null);
          setRole(null);
          setPortalSyncError('Could not connect. Check your internet and try signing out and back in.');
        }
      }

      setAuthLoading(false);
    }).catch(() => {
      localStorage.removeItem('discord_token');
      localStorage.removeItem('discord_token_expires');
      localStorage.removeItem(OWNER_SESSION_KEY);
      setDiscordToken(null);
      setDiscordUser(null);
      setCurrentAppUser(null);
      setRole(null);
      setPortalSyncError('Discord sign-in could not be verified. Please try again.');
      setAuthLoading(false);
    });
  }, [discordToken, supabaseAuthReady, supabaseSession]);

  // Step 3: Watch for role changes from Supabase (e.g., when owner approves request)
  useEffect(() => {
    if (!discordUser || role === 'owner') return;
    const channel = supabase.channel(`discord-user-${discordUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discord_users', filter: `discord_id=eq.${discordUser.id}` },
        (payload) => {
          if (payload.new && Object.keys(payload.new).length > 0) {
            const appUser = rowToAppUser(payload.new as Record<string, unknown>);
            setCurrentAppUser(appUser);
            setRole(appUser.role);
            setPortalSyncError('');
          } else {
            setCurrentAppUser(null);
            setRole('pending');
            setPortalSyncError('');
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [discordUser?.id, role]);

  // Supabase real-time listeners for admin/owner user lists
  useEffect(() => {
    if (!supabaseSession || !role || role === 'pending') {
      setAppUsers([]);
      return;
    }
    // Initial load
    supabase.from('discord_users').select('*').then(({ data }) => {
      setAppUsers((data || []).map(row => rowToAppUser(row as Record<string, unknown>)));
    });

    const channel = supabase.channel('discord-users-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discord_users' },
        async () => {
          const { data } = await supabase.from('discord_users').select('*');
          setAppUsers((data || []).map(row => rowToAppUser(row as Record<string, unknown>)));
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabaseSession, role]);

  useEffect(() => {
    if (!supabaseSession || (role !== 'owner' && role !== 'admin')) {
      setRequests([]);
      return;
    }
    // Initial load
    supabase.from('discord_users').select('*').eq('role', 'pending').then(({ data }) => {
      setRequests((data || []).map(row => {
        const u = rowToAppUser(row as Record<string, unknown>);
        return {
          discordId: u.discordId,
          username: u.username,
          avatar: u.avatar,
          status: 'pending',
          createdAt: u.createdAt,
        };
      }));
    });

    const channel = supabase.channel('discord-users-pending')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discord_users' },
        async () => {
          const { data } = await supabase.from('discord_users').select('*').eq('role', 'pending');
          setRequests((data || []).map(row => {
            const u = rowToAppUser(row as Record<string, unknown>);
            return {
              discordId: u.discordId,
              username: u.username,
              avatar: u.avatar,
              status: 'pending',
              createdAt: u.createdAt,
            };
          }));
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabaseSession, role]);

  useEffect(() => {
    let cancelled = false;

    supabase.from('roadmap_config').select('projects').eq('id', 1).single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { console.error('Supabase roadmap load error:', error); return; }
        if (data?.projects) setRoadmapProjects(data.projects as RoadmapProject[]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const loadTeamTasks = async () => {
      setTeamTasksLoading(true);
      try {
        await ensureAuth();
        const { data, error } = await supabase
          .from('team_tasks')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });
        if (cancelled) return;
        if (error) {
          console.error('Supabase team tasks load error:', error);
          setTeamTasks([]);
          setTeamTasksLoading(false);
          return;
        }
        setTeamTasks((data || []).map(row => rowToTeamTask(row as Record<string, unknown>)));
        setTeamTasksLoading(false);

        channel = supabase.channel('team-tasks')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'team_tasks' }, async () => {
            const { data: nextData, error: nextError } = await supabase
              .from('team_tasks')
              .select('*')
              .order('sort_order', { ascending: true })
              .order('created_at', { ascending: true });
            if (cancelled || nextError) {
              if (nextError) console.error('Supabase team tasks refresh error:', nextError);
              return;
            }
            setTeamTasks((nextData || []).map(row => rowToTeamTask(row as Record<string, unknown>)));
          })
          .subscribe();
      } catch (error) {
        if (!cancelled) {
          console.error('Supabase team tasks auth/setup error:', error);
          setTeamTasks([]);
          setTeamTasksLoading(false);
        }
      }
    };

    if (supabaseAuthReady) loadTeamTasks();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabaseAuthReady]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const loadTaskColumns = async () => {
      try {
        await ensureAuth();
        const { data, error } = await supabase
          .from('task_columns')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });
        if (cancelled) return;
        if (error) {
          console.error('Supabase task columns load error:', error);
          setTaskColumns([]);
          return;
        }
        setTaskColumns((data || []).map(row => rowToTaskColumn(row as Record<string, unknown>)));

        channel = supabase.channel('task-columns')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'task_columns' }, async () => {
            const { data: nextData, error: nextError } = await supabase
              .from('task_columns')
              .select('*')
              .order('sort_order', { ascending: true })
              .order('created_at', { ascending: true });
            if (cancelled || nextError) {
              if (nextError) console.error('Supabase task columns refresh error:', nextError);
              return;
            }
            setTaskColumns((nextData || []).map(row => rowToTaskColumn(row as Record<string, unknown>)));
          })
          .subscribe();
      } catch (error) {
        if (!cancelled) {
          console.error('Supabase task columns auth/setup error:', error);
          setTaskColumns([]);
        }
      }
    };

    if (supabaseAuthReady) loadTaskColumns();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabaseAuthReady]);

  useEffect(() => {
    localStorage.setItem('wahaj_faq', JSON.stringify(faqData));
  }, [faqData]);

  // Auth functions
  const discordLogin = () => redirectToDiscordOAuth();

  const discordLogout = () => {
    localStorage.removeItem('discord_token');
    localStorage.removeItem('discord_token_expires');
    localStorage.removeItem(OWNER_SESSION_KEY);
    setDiscordToken(null);
    setDiscordUser(null);
    setCurrentAppUser(null);
    setRole(null);
    setPortalSyncError('');
    setIsAdminOpen(false);
    setIsMemberPanelOpen(false);
  };

  // Panel functions
  const openAdmin = (options?: { forcePasswordGate?: boolean }) => {
    setIsMemberPanelOpen(false);
    setAdminForcePasswordGate(Boolean(options?.forcePasswordGate));
    setIsAdminOpen(true);
  };

  const closeAdmin = () => {
    setIsAdminOpen(false);
    setAdminForcePasswordGate(false);
  };

  const openMemberPanel = () => {
    setIsAdminOpen(false);
    setAdminForcePasswordGate(false);
    setIsMemberPanelOpen(true);
  };

  const closeMemberPanel = () => setIsMemberPanelOpen(false);

  // Roadmap helpers
  const saveRoadmap = (updated: RoadmapProject[]) => {
    setRoadmapProjects(updated);
    (async () => {
      await ensureAuth();
      const { error } = await supabase.from('roadmap_config').update({ projects: updated }).eq('id', 1);
      if (error) console.error('saveRoadmap failed:', error);
    })();
  };

  // FAQ
  const addFAQ = (question: string, answer: string) => {
    setFaqData([...faqData, { id: Date.now().toString(), question, answer }]);
  };
  const removeFAQ = (id: string) => setFaqData(faqData.filter(f => f.id !== id));

  // Roadmap CRUD
  const addProject = (title: string, iconType: RoadmapProject['iconType']) => {
    const colors = ['from-purple-500 to-blue-500', 'from-pink-500 to-orange-500', 'from-green-500 to-teal-500', 'from-blue-500 to-indigo-500'];
    saveRoadmap([...roadmapProjects, { id: Date.now().toString(), title, iconType, color: colors[Math.floor(Math.random() * colors.length)], sections: [] }]);
  };

  const removeProject = (projectId: string) => saveRoadmap(roadmapProjects.filter(p => p.id !== projectId));

  const renameProject = (projectId: string, newTitle: string) => {
    saveRoadmap(roadmapProjects.map(p => p.id === projectId ? { ...p, title: newTitle } : p));
  };

  const updateProject = (projectId: string, patch: Partial<RoadmapProject>) => {
    saveRoadmap(roadmapProjects.map(p => p.id === projectId ? { ...p, ...patch } : p));
  };

  const addSection = (projectId: string, title: string) => {
    saveRoadmap(roadmapProjects.map(p =>
      p.id === projectId ? { ...p, sections: [...p.sections, { id: Date.now().toString(), title, steps: [] }] } : p
    ));
  };

  const removeSection = (projectId: string, sectionId: string) => {
    saveRoadmap(roadmapProjects.map(p =>
      p.id === projectId ? { ...p, sections: p.sections.filter(s => s.id !== sectionId) } : p
    ));
  };

  const renameSection = (projectId: string, sectionId: string, newTitle: string) => {
    saveRoadmap(roadmapProjects.map(p =>
      p.id === projectId ? { ...p, sections: p.sections.map(s => s.id === sectionId ? { ...s, title: newTitle } : s) } : p
    ));
  };

  const addStep = (projectId: string, sectionId: string, text: string) => {
    saveRoadmap(roadmapProjects.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, sections: p.sections.map(s =>
        s.id === sectionId ? { ...s, steps: [...s.steps, { id: Date.now().toString(), text, isCompleted: false }] } : s
      )};
    }));
  };

  const removeStep = (projectId: string, sectionId: string, stepId: string) => {
    saveRoadmap(roadmapProjects.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, sections: p.sections.map(s =>
        s.id === sectionId ? { ...s, steps: s.steps.filter(step => step.id !== stepId) } : s
      )};
    }));
  };

  const renameStep = (projectId: string, sectionId: string, stepId: string, newText: string) => {
    saveRoadmap(roadmapProjects.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, sections: p.sections.map(s =>
        s.id === sectionId ? { ...s, steps: s.steps.map(step =>
          step.id === stepId ? { ...step, text: newText } : step
        )} : s
      )};
    }));
  };

  const toggleStep = (projectId: string, sectionId: string, stepId: string) => {
    saveRoadmap(roadmapProjects.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, sections: p.sections.map(s =>
        s.id === sectionId ? { ...s, steps: s.steps.map(step =>
          step.id === stepId ? { ...step, isCompleted: !step.isCompleted } : step
        )} : s
      )};
    }));
  };

  const reorderProjects = (ids: string[]) => saveRoadmap(ids.map(id => roadmapProjects.find(p => p.id === id)!).filter(Boolean));

  const reorderSections = (projectId: string, ids: string[]) => {
    saveRoadmap(roadmapProjects.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, sections: ids.map(id => p.sections.find(s => s.id === id)!).filter(Boolean) };
    }));
  };

  const reorderSteps = (projectId: string, sectionId: string, ids: string[]) => {
    saveRoadmap(roadmapProjects.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, sections: p.sections.map(s => {
        if (s.id !== sectionId) return s;
        return { ...s, steps: ids.map(id => s.steps.find(st => st.id === id)!).filter(Boolean) };
      })};
    }));
  };

  const addTeamTask = async (input: { projectId: string; title: string; description?: string; assigneeDiscordId?: string | null; columnId?: string | null; }) => {
    await ensureAuth();
    const { error } = await supabase.from('team_tasks').insert({
      project_id: input.projectId,
      column_id: input.columnId ?? null,
      title: input.title.trim(),
      description: input.description?.trim() || '',
      assignee_discord_id: input.assigneeDiscordId || null,
      created_by_discord_id: discordUser?.id ?? null,
      sort_order: Date.now(),
    });
    if (error) throw error;
  };

  const updateTeamTask = async (taskId: string, patch: Partial<Pick<TeamTask, 'title' | 'description' | 'columnId' | 'assigneeDiscordId' | 'sortOrder' | 'checklists'>>) => {
    await ensureAuth();
    const updateData: Record<string, unknown> = {};
    if (patch.title !== undefined) updateData.title = patch.title.trim();
    if (patch.description !== undefined) updateData.description = patch.description.trim();
    if (patch.columnId !== undefined) updateData.column_id = patch.columnId;
    if (patch.assigneeDiscordId !== undefined) updateData.assignee_discord_id = patch.assigneeDiscordId;
    if (patch.sortOrder !== undefined) updateData.sort_order = patch.sortOrder;
    if (patch.checklists !== undefined) updateData.checklists = patch.checklists;
    const { error } = await supabase.from('team_tasks').update(updateData).eq('id', taskId);
    if (error) throw error;
  };

  const removeTeamTask = async (taskId: string) => {
    await ensureAuth();
    const { error } = await supabase.from('team_tasks').delete().eq('id', taskId);
    if (error) throw error;
  };

  const addTaskColumn = async (input: { projectId: string; title: string; color?: string; sortOrder?: number; }): Promise<TaskColumn | null> => {
    await ensureAuth();
    const { data, error } = await supabase.from('task_columns').insert({
      project_id: input.projectId,
      title: input.title.trim(),
      color: input.color ?? '#64748b',
      sort_order: input.sortOrder ?? Date.now(),
    }).select().single();
    if (error) throw error;
    return data ? rowToTaskColumn(data as Record<string, unknown>) : null;
  };

  const updateTaskColumn = async (columnId: string, patch: Partial<Pick<TaskColumn, 'title' | 'color' | 'sortOrder'>>) => {
    await ensureAuth();
    const updateData: Record<string, unknown> = {};
    if (patch.title !== undefined) updateData.title = patch.title.trim();
    if (patch.color !== undefined) updateData.color = patch.color;
    if (patch.sortOrder !== undefined) updateData.sort_order = patch.sortOrder;
    const { error } = await supabase.from('task_columns').update(updateData).eq('id', columnId);
    if (error) throw error;
  };

  const removeTaskColumn = async (columnId: string) => {
    await ensureAuth();
    const { error } = await supabase.from('task_columns').delete().eq('id', columnId);
    if (error) throw error;
  };

  // User & Request management
  const approveRequest = async (discordId: string, assignRole: 'admin' | 'member', projectIds: string[], adminPermissions?: AdminPermissions) => {
    const pendingUser = appUsers.find(u => u.discordId === discordId && u.role === 'pending');
    if (!pendingUser) return;
    await supabase.from('discord_users').upsert({
      discord_id: discordId,
      username: pendingUser.username,
      avatar: pendingUser.avatar,
      role: assignRole,
      project_ids: projectIds,
      ...(assignRole === 'admin' ? { admin_permissions: adminPermissions ?? { ...defaultAdminPermissions } } : {}),
      created_at: pendingUser.createdAt || Date.now(),
    });
  };

  const rejectRequest = async (discordId: string) => {
    await supabase.from('discord_users').delete().eq('discord_id', discordId);
  };

  const updateUserRole = async (discordId: string, newRole: 'admin' | 'member') => {
    const user = appUsers.find(u => u.discordId === discordId);
    if (!user) return;
    const updateData: Record<string, unknown> = {
      discord_id: discordId,
      username: user.username,
      avatar: user.avatar,
      role: newRole,
      project_ids: user.projectIds,
      created_at: user.createdAt,
    };
    if (newRole === 'admin') {
      updateData.admin_permissions = user.adminPermissions ?? { ...defaultAdminPermissions };
    } else {
      updateData.admin_permissions = null;
    }
    await supabase.from('discord_users').upsert(updateData);
  };

  const updateAdminPermissions = async (discordId: string, permissions: AdminPermissions) => {
    const user = appUsers.find(u => u.discordId === discordId);
    if (!user || user.role !== 'admin') return;
    await supabase.from('discord_users').update({ admin_permissions: permissions }).eq('discord_id', discordId);
  };

  const updateUserProjects = async (discordId: string, projectIds: string[]) => {
    const user = appUsers.find(u => u.discordId === discordId);
    if (!user) return;
    await supabase.from('discord_users').update({ project_ids: projectIds }).eq('discord_id', discordId);
  };

  const removeUser = async (discordId: string) => {
    await supabase.from('discord_users').delete().eq('discord_id', discordId);
  };

  return (
    <DataContext.Provider value={{
      discordUser,
      currentAppUser,
      role,
      authLoading,
      portalSyncError,
      discordLogin,
      discordLogout,
      isAdminOpen,
      adminForcePasswordGate,
      openAdmin,
      closeAdmin,
      isMemberPanelOpen,
      openMemberPanel,
      closeMemberPanel,
      faqData,
      addFAQ,
      removeFAQ,
      roadmapProjects,
      addProject,
      removeProject,
      renameProject,
      updateProject,
      addSection,
      removeSection,
      renameSection,
      addStep,
      removeStep,
      renameStep,
      toggleStep,
      reorderProjects,
      reorderSections,
      reorderSteps,
      teamTasks,
      teamTasksLoading,
      addTeamTask,
      updateTeamTask,
      removeTeamTask,
      taskColumns,
      addTaskColumn,
      updateTaskColumn,
      removeTaskColumn,
      appUsers,
      requests,
      approveRequest,
      rejectRequest,
      updateUserRole,
      updateAdminPermissions,
      updateUserProjects,
      removeUser,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
