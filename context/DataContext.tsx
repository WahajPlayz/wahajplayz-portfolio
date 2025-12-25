import React, { createContext, useContext, useState, useEffect } from 'react';
import { FAQItem, RoadmapProject, RoadmapSection, RoadmapStep } from '../types';

interface DataContextType {
  faqData: FAQItem[];
  roadmapProjects: RoadmapProject[];
  isAdminOpen: boolean;
  isAuthenticated: boolean;
  
  // Actions
  openAdmin: () => void;
  closeAdmin: () => void;
  login: (password: string) => boolean;
  logout: () => void;
  
  // FAQ Modifiers
  addFAQ: (question: string, answer: string) => void;
  removeFAQ: (id: string) => void;
  
  // Roadmap Modifiers
  addProject: (title: string, iconType: RoadmapProject['iconType']) => void;
  removeProject: (projectId: string) => void;
  addSection: (projectId: string, title: string) => void;
  removeSection: (projectId: string, sectionId: string) => void;
  addStep: (projectId: string, sectionId: string, text: string) => void;
  removeStep: (projectId: string, sectionId: string, stepId: string) => void;
  toggleStep: (projectId: string, sectionId: string, stepId: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const INITIAL_FAQ: FAQItem[] = [
  {
    id: '1',
    question: "What engine do you use for Mecha Overdrive?",
    answer: "I primarily use the Unity Engine for my development projects, utilizing C# for all gameplay programming and systems."
  }
];

const INITIAL_ROADMAP: RoadmapProject[] = [
  {
    id: 'mecha',
    title: "Mecha Overdrive",
    iconType: 'gamepad',
    color: "from-purple-500 to-indigo-500",
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
    title: "Monde Miraculous",
    iconType: 'sparkles',
    color: "from-pink-500 to-rose-500",
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
  const [faqData, setFaqData] = useState<FAQItem[]>(INITIAL_FAQ);
  const [roadmapProjects, setRoadmapProjects] = useState<RoadmapProject[]>(INITIAL_ROADMAP);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const savedFaq = localStorage.getItem('wahaj_faq');
    const savedRoadmap = localStorage.getItem('wahaj_roadmap_v2');
    const savedAuth = localStorage.getItem('wahaj_auth');

    if (savedFaq) setFaqData(JSON.parse(savedFaq));
    if (savedRoadmap) setRoadmapProjects(JSON.parse(savedRoadmap));
    if (savedAuth === 'true') setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('wahaj_faq', JSON.stringify(faqData));
  }, [faqData]);

  useEffect(() => {
    localStorage.setItem('wahaj_roadmap_v2', JSON.stringify(roadmapProjects));
  }, [roadmapProjects]);

  const login = (password: string) => {
    if (password === '.WahajPlayzWebsite109') {
      setIsAuthenticated(true);
      localStorage.setItem('wahaj_auth', 'true');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('wahaj_auth');
  };

  const addFAQ = (question: string, answer: string) => {
    setFaqData([...faqData, { id: Date.now().toString(), question, answer }]);
  };

  const removeFAQ = (id: string) => setFaqData(faqData.filter(f => f.id !== id));

  // Roadmap Actions
  const addProject = (title: string, iconType: RoadmapProject['iconType']) => {
    const colors = ["from-purple-500 to-blue-500", "from-pink-500 to-orange-500", "from-green-500 to-teal-500", "from-blue-500 to-indigo-500"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const newProject: RoadmapProject = {
      id: Date.now().toString(),
      title,
      iconType,
      color: randomColor,
      sections: []
    };
    setRoadmapProjects([...roadmapProjects, newProject]);
  };

  const removeProject = (projectId: string) => {
    setRoadmapProjects(roadmapProjects.filter(p => p.id !== projectId));
  };

  const addSection = (projectId: string, title: string) => {
    setRoadmapProjects(roadmapProjects.map(p => 
      p.id === projectId ? { 
        ...p, 
        sections: [...p.sections, { id: Date.now().toString(), title, steps: [] }] 
      } : p
    ));
  };

  const removeSection = (projectId: string, sectionId: string) => {
    setRoadmapProjects(roadmapProjects.map(p => 
      p.id === projectId ? { 
        ...p, 
        sections: p.sections.filter(s => s.id !== sectionId) 
      } : p
    ));
  };

  const addStep = (projectId: string, sectionId: string, text: string) => {
    setRoadmapProjects(roadmapProjects.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        sections: p.sections.map(s => 
          s.id === sectionId ? { 
            ...s, 
            steps: [...s.steps, { id: Date.now().toString(), text, isCompleted: false }] 
          } : s
        )
      };
    }));
  };

  const removeStep = (projectId: string, sectionId: string, stepId: string) => {
    setRoadmapProjects(roadmapProjects.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        sections: p.sections.map(s => 
          s.id === sectionId ? { ...s, steps: s.steps.filter(step => step.id !== stepId) } : s
        )
      };
    }));
  };

  const toggleStep = (projectId: string, sectionId: string, stepId: string) => {
    setRoadmapProjects(roadmapProjects.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        sections: p.sections.map(s => 
          s.id === sectionId ? { 
            ...s, 
            steps: s.steps.map(step => step.id === stepId ? { ...step, isCompleted: !step.isCompleted } : step) 
          } : s
        )
      };
    }));
  };

  return (
    <DataContext.Provider value={{
      faqData,
      roadmapProjects,
      isAdminOpen,
      isAuthenticated,
      openAdmin: () => setIsAdminOpen(true),
      closeAdmin: () => setIsAdminOpen(false),
      login,
      logout,
      addFAQ,
      removeFAQ,
      addProject,
      removeProject,
      addSection,
      removeSection,
      addStep,
      removeStep,
      toggleStep
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
