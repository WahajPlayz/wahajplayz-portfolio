import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, collection, onSnapshot, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FAQItem, RoadmapProject, AppUser, JoinRequest } from '../types';
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
  role: Role;
  authLoading: boolean;
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
  approveRequest: (discordId: string, assignRole: 'admin' | 'member', projectIds: string[]) => Promise<void>;
  rejectRequest: (discordId: string) => Promise<void>;
  updateUserRole: (discordId: string, newRole: 'admin' | 'member') => Promise<void>;
  updateUserProjects: (discordId: string, projectIds: string[]) => Promise<void>;
  removeUser: (discordId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

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
  const [role, setRole] = useState<Role>(null);
  const [authLoading, setAuthLoading] = useState(() => !!localStorage.getItem('discord_token'));

  // Users & Requests from Firestore
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);

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
      setRole(null);
      return;
    }

    setAuthLoading(true);

    fetchDiscordUser(discordToken).then(async (user) => {
      setDiscordUser(user);

      const isOwnerAccount = user.id === OWNER_DISCORD_ID || user.username === OWNER_DISCORD_ID;
      if (isOwnerAccount) {
        // Owner: ensure Firestore doc exists with owner role
        await setDoc(doc(db, 'discord_users', user.id), {
          discordId: user.id,
          username: user.global_name || user.username,
          avatar: user.avatar,
          role: 'owner',
          projectIds: [],
          createdAt: Date.now(),
        }, { merge: true });
        setRole('owner');
      } else {
        // Check Firestore for existing approved user
        const userSnap = await getDoc(doc(db, 'discord_users', user.id));
        if (userSnap.exists()) {
          setRole((userSnap.data() as AppUser).role);
        } else {
          // New user: create a pending request (if not already pending/rejected)
          const reqSnap = await getDoc(doc(db, 'requests', user.id));
          if (!reqSnap.exists()) {
            await setDoc(doc(db, 'requests', user.id), {
              discordId: user.id,
              username: user.global_name || user.username,
              avatar: user.avatar,
              status: 'pending',
              createdAt: Date.now(),
            });
          }
          setRole(reqSnap.exists() && reqSnap.data().status === 'approved' ? (userSnap.data() as AppUser)?.role ?? 'pending' : 'pending');
        }
      }
      setAuthLoading(false);
    }).catch(() => {
      localStorage.removeItem('discord_token');
      localStorage.removeItem('discord_token_expires');
      setDiscordToken(null);
      setDiscordUser(null);
      setRole(null);
      setAuthLoading(false);
    });
  }, [discordToken]);

  // Step 3: Watch for role changes from Firestore (e.g., when owner approves request)
  useEffect(() => {
    if (!discordUser || role === 'owner') return;
    const unsubscribe = onSnapshot(doc(db, 'discord_users', discordUser.id), (snap) => {
      if (snap.exists()) {
        setRole((snap.data() as AppUser).role);
      }
    });
    return unsubscribe;
  }, [discordUser?.id, role]);

  // Firestore real-time listeners
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'discord_users'),
      (snap) => setAppUsers(snap.docs.map(d => d.data() as AppUser)),
      (error) => console.error('Firestore users error:', error)
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'requests'),
      (snap) => setRequests(snap.docs.map(d => d.data() as JoinRequest).filter(r => r.status === 'pending')),
      (error) => console.error('Firestore requests error:', error)
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'wahaj_data', 'roadmap'),
      (snap) => {
        if (snap.exists()) {
          setRoadmapProjects(snap.data().projects ?? INITIAL_ROADMAP);
        } else {
          setDoc(doc(db, 'wahaj_data', 'roadmap'), { projects: INITIAL_ROADMAP });
        }
      },
      (error) => console.error('Firestore roadmap error:', error)
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    localStorage.setItem('wahaj_faq', JSON.stringify(faqData));
  }, [faqData]);

  // Auth functions
  const discordLogin = () => redirectToDiscordOAuth();

  const discordLogout = () => {
    localStorage.removeItem('discord_token');
    localStorage.removeItem('discord_token_expires');
    setDiscordToken(null);
    setDiscordUser(null);
    setRole(null);
    setIsAdminOpen(false);
    setIsMemberPanelOpen(false);
  };

  // Panel functions
  const openMemberPanel = () => {
    if (role === 'owner' || role === 'admin') {
      setIsAdminOpen(true);
    } else {
      setIsMemberPanelOpen(true);
    }
  };

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
  const approveRequest = async (discordId: string, assignRole: 'admin' | 'member', projectIds: string[]) => {
    const req = requests.find(r => r.discordId === discordId);
    if (!req) return;
    await setDoc(doc(db, 'discord_users', discordId), {
      discordId,
      username: req.username,
      avatar: req.avatar,
      role: assignRole,
      projectIds,
      createdAt: Date.now(),
    });
    await setDoc(doc(db, 'requests', discordId), { ...req, status: 'approved' });
  };

  const rejectRequest = async (discordId: string) => {
    const req = requests.find(r => r.discordId === discordId);
    if (!req) return;
    await setDoc(doc(db, 'requests', discordId), { ...req, status: 'rejected' });
  };

  const updateUserRole = async (discordId: string, newRole: 'admin' | 'member') => {
    const user = appUsers.find(u => u.discordId === discordId);
    if (!user) return;
    await setDoc(doc(db, 'discord_users', discordId), { ...user, role: newRole });
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
      role,
      authLoading,
      discordLogin,
      discordLogout,
      isAdminOpen,
      openAdmin: () => setIsAdminOpen(true),
      closeAdmin: () => setIsAdminOpen(false),
      isMemberPanelOpen,
      openMemberPanel,
      closeMemberPanel: () => setIsMemberPanelOpen(false),
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
