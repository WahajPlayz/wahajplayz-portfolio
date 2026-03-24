import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, collection, onSnapshot, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db, ensureStorageAuth } from '../lib/firebase';
import { FAQItem, RoadmapProject, AppUser, JoinRequest } from '../types';
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
  openAdmin: () => void;
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
  addSection: (projectId: string, title: string) => void;
  removeSection: (projectId: string, sectionId: string) => void;
  addStep: (projectId: string, sectionId: string, text: string) => void;
  removeStep: (projectId: string, sectionId: string, stepId: string) => void;
  toggleStep: (projectId: string, sectionId: string, stepId: string) => void;
  reorderProjects: (ids: string[]) => void;
  reorderSections: (projectId: string, ids: string[]) => void;
  reorderSteps: (projectId: string, sectionId: string, ids: string[]) => void;
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

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [faqData, setFaqData] = useState<FAQItem[]>(() => {
    try { const s = localStorage.getItem('wahaj_faq'); return s ? JSON.parse(s) : INITIAL_FAQ; } catch { return INITIAL_FAQ; }
  });

  const [roadmapProjects, setRoadmapProjects] = useState<RoadmapProject[]>(() => {
    try { const s = localStorage.getItem('wahaj_roadmap_v2'); return s ? JSON.parse(s) : INITIAL_ROADMAP; } catch { return INITIAL_ROADMAP; }
  });

  const [isAdminOpen, setIsAdminOpen] = useState(false);
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
  const [firebaseUser, setFirebaseUser] = useState<User | null>(auth.currentUser);
  const [firebaseAuthReady, setFirebaseAuthReady] = useState(false);

  // Users & Requests from Firestore
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const isOwnerAccount = discordUser?.id === OWNER_DISCORD_ID || discordUser?.username === OWNER_DISCORD_ID;

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setFirebaseAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!discordToken || !firebaseAuthReady || firebaseUser) return;
    ensureStorageAuth().catch((error) => {
      console.error('Failed to establish Firebase auth for Discord portal:', error);
    });
  }, [discordToken, firebaseAuthReady, firebaseUser]);

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

    if (!firebaseAuthReady) {
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
          if (!firebaseUser) await ensureStorageAuth();
          await setDoc(doc(db, 'discord_users', user.id), {
            discordId: user.id,
            username: user.global_name || user.username,
            avatar: user.avatar,
            role: 'owner',
            projectIds: [],
            createdAt: Date.now(),
          }, { merge: true });
        } catch (error) {
          console.error('Failed to sync owner user record:', error);
        }
        setAuthLoading(false);
        return;
      }

      const syncUser = async () => {
        // Always ensure Firebase anonymous auth before Firestore operations
        await ensureStorageAuth();
        const userSnap = await getDoc(doc(db, 'discord_users', user.id));
        if (userSnap.exists()) {
          const appUser = userSnap.data() as AppUser;
          setCurrentAppUser(appUser);
          setRole(appUser.role);
          setPortalSyncError('');
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
          await setDoc(doc(db, 'discord_users', user.id), pendingUser, { merge: true });
          setCurrentAppUser(pendingUser);
          setRole('pending');
          setPortalSyncError('');
        }
      };

      try {
        await syncUser();
      } catch {
        // Retry once with a fresh auth token
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
  }, [discordToken, firebaseAuthReady, firebaseUser]);

  // Step 3: Watch for role changes from Firestore (e.g., when owner approves request)
  useEffect(() => {
    if (!discordUser || role === 'owner') return;
    const unsubscribe = onSnapshot(doc(db, 'discord_users', discordUser.id), (snap) => {
      if (snap.exists()) {
        const appUser = snap.data() as AppUser;
        setCurrentAppUser(appUser);
        setRole(appUser.role);
        setPortalSyncError('');
      } else {
        setCurrentAppUser(null);
        setRole('pending');
        setPortalSyncError('');
      }
    });
    return unsubscribe;
  }, [discordUser?.id, role]);

  useEffect(() => {
    if ((role === 'owner' || role === 'admin' || isOwnerAccount) && isMemberPanelOpen) {
      setIsMemberPanelOpen(false);
      setIsAdminOpen(true);
    }
  }, [role, isMemberPanelOpen, isOwnerAccount]);

  // Firestore real-time listeners
  useEffect(() => {
    if (!firebaseUser || (role !== 'owner' && role !== 'admin')) {
      setAppUsers([]);
      return;
    }
    const unsubscribe = onSnapshot(
      collection(db, 'discord_users'),
      (snap) => setAppUsers(snap.docs.map(d => d.data() as AppUser)),
      (error) => console.error('Firestore users error:', error)
    );
    return unsubscribe;
  }, [firebaseUser, role]);

  useEffect(() => {
    if (!firebaseUser || (role !== 'owner' && role !== 'admin')) {
      setRequests([]);
      return;
    }
    const unsubscribe = onSnapshot(
      collection(db, 'discord_users'),
      (snap) => setRequests(
        snap.docs
          .map(d => d.data() as AppUser)
          .filter(user => user.role === 'pending')
          .map(user => ({
            discordId: user.discordId,
            username: user.username,
            avatar: user.avatar,
            status: 'pending',
            createdAt: user.createdAt,
          }))
      ),
      (error) => console.error('Firestore requests error:', error)
    );
    return unsubscribe;
  }, [firebaseUser, role]);

  useEffect(() => {
    let cancelled = false;

    getDoc(doc(db, 'wahaj_data', 'roadmap'))
      .then((snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          setRoadmapProjects(snap.data().projects ?? INITIAL_ROADMAP);
        }
      })
      .catch((error) => console.error('Firestore roadmap load error:', error));

    return () => {
      cancelled = true;
    };
  }, []);

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
  const openAdmin = () => {
    setIsMemberPanelOpen(false);
    setIsAdminOpen(true);
  };

  const closeAdmin = () => setIsAdminOpen(false);

  const openMemberPanel = () => {
    if (role === 'owner' || role === 'admin' || isOwnerAccount || localStorage.getItem(OWNER_SESSION_KEY) === '1') {
      openAdmin();
    } else {
      setIsAdminOpen(false);
      setIsMemberPanelOpen(true);
    }
  };

  const closeMemberPanel = () => setIsMemberPanelOpen(false);

  // Roadmap helpers
  const saveRoadmap = (updated: RoadmapProject[]) => {
    setRoadmapProjects(updated);
    setDoc(doc(db, 'wahaj_data', 'roadmap'), { projects: updated }).catch(console.error);
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

  // User & Request management
  const approveRequest = async (discordId: string, assignRole: 'admin' | 'member', projectIds: string[], adminPermissions?: AdminPermissions) => {
    const pendingUser = appUsers.find(u => u.discordId === discordId && u.role === 'pending');
    if (!pendingUser) return;
    await setDoc(doc(db, 'discord_users', discordId), {
      discordId,
      username: pendingUser.username,
      avatar: pendingUser.avatar,
      role: assignRole,
      projectIds,
      ...(assignRole === 'admin' ? { adminPermissions: adminPermissions ?? { ...defaultAdminPermissions } } : {}),
      createdAt: pendingUser.createdAt || Date.now(),
    }, { merge: true });
  };

  const rejectRequest = async (discordId: string) => {
    await deleteDoc(doc(db, 'discord_users', discordId));
  };

  const updateUserRole = async (discordId: string, newRole: 'admin' | 'member') => {
    const user = appUsers.find(u => u.discordId === discordId);
    if (!user) return;
    const nextUser = {
      ...user,
      role: newRole,
      ...(newRole === 'admin' ? { adminPermissions: user.adminPermissions ?? { ...defaultAdminPermissions } } : {}),
    };
    if (newRole !== 'admin' && 'adminPermissions' in nextUser) {
      delete (nextUser as AppUser & { adminPermissions?: AdminPermissions }).adminPermissions;
    }
    await setDoc(doc(db, 'discord_users', discordId), nextUser);
  };

  const updateAdminPermissions = async (discordId: string, permissions: AdminPermissions) => {
    const user = appUsers.find(u => u.discordId === discordId);
    if (!user || user.role !== 'admin') return;
    await setDoc(doc(db, 'discord_users', discordId), { ...user, adminPermissions: permissions });
  };

  const updateUserProjects = async (discordId: string, projectIds: string[]) => {
    const user = appUsers.find(u => u.discordId === discordId);
    if (!user) return;
    await setDoc(doc(db, 'discord_users', discordId), { ...user, projectIds });
  };

  const removeUser = async (discordId: string) => {
    await deleteDoc(doc(db, 'discord_users', discordId));
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
      addSection,
      removeSection,
      addStep,
      removeStep,
      toggleStep,
      reorderProjects,
      reorderSections,
      reorderSteps,
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
