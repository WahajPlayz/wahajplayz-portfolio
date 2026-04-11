import { ReactNode } from 'react';
import type { AdminPermissions } from './config/ownerConfig';

export interface Project {
  id: string;
  title: string;
  tag: string;
  description: string;
  imageUrl: string;
  link: string;
  buttonText: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface Skill {
  name: string;
  category: string;
  icon?: ReactNode;
}

export interface SocialLink {
  name: string;
  url: string;
  icon: ReactNode;
}

export interface RoadmapStep {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface RoadmapSection {
  id: string;
  title: string;
  steps: RoadmapStep[];
}

export interface RoadmapProject {
  id: string;
  title: string;
  iconType: 'gamepad' | 'sparkles' | 'wrench' | 'zap' | 'code';
  color: string;
  sections: RoadmapSection[];
  imageUrl?: string;
  description?: string;
  status?: 'active' | 'planned' | 'completed' | 'on-hold';
}

export interface AppUser {
  discordId: string;
  username: string;
  avatar: string | null;
  role: 'owner' | 'admin' | 'member' | 'pending';
  projectIds: string[];
  adminPermissions?: AdminPermissions;
  createdAt: number;
}

export interface JoinRequest {
  discordId: string;
  username: string;
  avatar: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}
