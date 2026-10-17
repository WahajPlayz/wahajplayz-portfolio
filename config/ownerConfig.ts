export interface Attachment {
  id: string; filename: string; url: string; fileType: string;
  sizeLabel: string; displayLabel: string;
}

export type SocialPlatform = 'youtube' | 'tiktok' | 'discord' | 'instagram' | 'x' | 'twitch' | 'github' | 'website';

export interface SocialLink {
  id: string;
  label: string;
  url: string;
  platform: SocialPlatform;
  enabled: boolean;
}

export interface Post {
  id: string; title: string; pinned: boolean; excerpt: string;
  content: string; coverImage: string;
  tags: string[]; publishedAt: string;
  attachments: Attachment[];
}

export interface AdminPermissions {
  roadmap: boolean;
  faq: boolean;
  members: boolean;
  requests: boolean;
  posts: boolean;
  social: boolean;
  store: boolean;
}

export const defaultAdminPermissions: AdminPermissions = {
  roadmap: true, faq: true, members: true, requests: true,
  posts: true, social: true, store: true,
};

export const defaultSocialLinks: SocialLink[] = [
  {
    id: 'social-youtube',
    label: 'YouTube',
    url: 'https://www.youtube.com/@WahajPlayz20',
    platform: 'youtube',
    enabled: true,
  },
  {
    id: 'social-tiktok',
    label: 'TikTok',
    url: 'https://www.tiktok.com/@wahajplayzgames',
    platform: 'tiktok',
    enabled: true,
  },
  {
    id: 'social-discord',
    label: 'Discord',
    url: 'https://discord.com/invite/JMgSaKj6st',
    platform: 'discord',
    enabled: true,
  },
];

export interface OwnerConfig {
  posts: Post[];
  socialLinks: SocialLink[];
  adminPermissions: AdminPermissions;
}

export const ownerConfig: OwnerConfig = {
  posts: [
    {
      id: 'post-1',
      title: 'Welcome to the Community!',
      pinned: true,
      excerpt: "Thanks for being here. Here's what to expect from this space and what's coming next.",
      content: "<p>Welcome! I'm so glad you're here. This is where I'll share updates, devlogs, and exclusive content with the community.</p><p>Stay tuned for more updates!</p>",
      coverImage: '',
      tags: ['welcome', 'announcement'],
      publishedAt: '2025-03-18',
      attachments: [],
    },
  ],
  socialLinks: defaultSocialLinks,
  adminPermissions: defaultAdminPermissions,
};
