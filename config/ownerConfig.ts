export interface Milestone { amount: number; label: string; }
export interface GoalItem {
  id: string; title: string; enabled: boolean;
  type: 'monthly' | 'one-time';
  currency: string; currencyCode: string;
  target: number; raised: number; description: string;
  milestones: Milestone[];
}
export interface Benefit { icon: string; text: string; highlighted: boolean; }
export interface Attachment {
  id: string; filename: string; url: string; fileType: string;
  sizeLabel: string; displayLabel: string; minimumTier: string;
}
export interface Post {
  id: string; title: string; pinned: boolean; excerpt: string;
  content: string; coverImage: string;
  visibility: 'public' | 'members' | 'tier-specific';
  allowedTiers: string[]; tags: string[]; publishedAt: string;
  attachments: Attachment[];
}
export interface Tier {
  id: string; name: string; icon: string; description: string;
  imageUrl?: string;
  accentColour: string; isPopular: boolean; memberCount: number;
  monthlyPrice: number; yearlyPrice: number;
  lifetimePrice: number; lifetimeEnabled: boolean;
  stripeMonthlyUrl?: string; stripeYearlyUrl?: string; stripeLifetimeUrl?: string;
  discordRoleIds: string[]; lifetimeDiscordRoleIds: string[];
  benefits: Benefit[]; lifetimeExtraBenefits: Benefit[];
  storeDiscountPercent?: number;
}
export interface AdminPermissions {
  roadmap: boolean;
  faq: boolean;
  members: boolean;
  requests: boolean;
  goal: boolean;
  membership: boolean;
  posts: boolean;
  donation: boolean;
  store: boolean;
}

export const defaultAdminPermissions: AdminPermissions = {
  roadmap: true, faq: true, members: true, requests: true,
  goal: true, membership: true, posts: true, donation: true, store: true,
};

export interface OwnerConfig {
  goals: GoalItem[];
  /** @deprecated use goals */
  goal?: never;
  membership: {
    heading: string; subheading: string;
    yearlyDiscountPercent: number; tiers: Tier[];
  };
  donation: {
    heading: string; subheading: string;
    presetAmounts: number[]; stripeUrl?: string; discordRoleIds: string[];
  };
  posts: Post[];
  membershipPage: { headline: string; subheading: string; };
  donatePage: { headline: string; subheading: string; };
  adminPermissions: AdminPermissions;
}

export const ownerConfig: OwnerConfig = {
  goals: [
    {
      id: 'goal-default',
      title: 'Monthly Goal',
      enabled: true,
      type: 'monthly',
      currency: '£',
      currencyCode: 'GBP',
      target: 500,
      raised: 340,
      description: 'Help keep this going — every bit counts.',
      milestones: [
        { amount: 100, label: 'Hosting covered' },
        { amount: 250, label: 'New equipment' },
        { amount: 500, label: 'Full-time creation' },
      ],
    },
  ],
  membership: {
    heading: 'Choose How You Want to Be Part of This',
    subheading: 'Every tier gives you something real. No fluff.',
    yearlyDiscountPercent: 20,
    tiers: [
      {
        id: 'supporter',
        name: 'Supporter',
        icon: '🌟',
        description: 'For anyone who wants to show support and get closer to the journey.',
        imageUrl: '',
        accentColour: '#6366f1',
        isPopular: false,
        memberCount: 0,
        monthlyPrice: 5,
        yearlyPrice: 48,
        lifetimePrice: 99,
        lifetimeEnabled: true,
        stripeMonthlyUrl: '',
        stripeYearlyUrl: '',
        stripeLifetimeUrl: '',
        discordRoleIds: [],
        lifetimeDiscordRoleIds: [],
        benefits: [
          { icon: '💬', text: 'Members-only Discord channel', highlighted: false },
          { icon: '⭐', text: 'Name in credits', highlighted: true },
          { icon: '📣', text: 'Early update announcements', highlighted: false },
        ],
        lifetimeExtraBenefits: [
          { icon: '🏆', text: 'Permanent hall of fame', highlighted: true },
        ],
      },
      {
        id: 'creator',
        name: 'Creator',
        icon: '🎮',
        description: 'Go deeper into the development journey with exclusive content and voting rights.',
        imageUrl: '',
        accentColour: '#00d4ff',
        isPopular: true,
        memberCount: 0,
        monthlyPrice: 10,
        yearlyPrice: 96,
        lifetimePrice: 199,
        lifetimeEnabled: true,
        stripeMonthlyUrl: '',
        stripeYearlyUrl: '',
        stripeLifetimeUrl: '',
        discordRoleIds: [],
        lifetimeDiscordRoleIds: [],
        benefits: [
          { icon: '💬', text: 'Members-only Discord channel', highlighted: false },
          { icon: '⭐', text: 'Name in credits', highlighted: false },
          { icon: '🎁', text: 'Exclusive dev updates & builds', highlighted: true },
          { icon: '🎯', text: 'Vote on game features', highlighted: true },
          { icon: '📂', text: 'Download dev assets', highlighted: true },
        ],
        lifetimeExtraBenefits: [
          { icon: '🏆', text: 'Permanent hall of fame', highlighted: true },
          { icon: '🎖️', text: 'Founding member badge', highlighted: true },
        ],
      },
    ],
  },
  donation: {
    heading: 'Buy Me a Coffee ☕',
    subheading: 'No pressure. Every bit helps keep this going.',
    presetAmounts: [3, 5, 10, 25],
    stripeUrl: '',
    discordRoleIds: [],
  },
  posts: [
    {
      id: 'post-1',
      title: 'Welcome to the Community!',
      pinned: true,
      excerpt: "Thanks for being here. Here's what to expect from this space and what's coming next.",
      content: "<p>Welcome! I'm so glad you're here. This is where I'll share updates, devlogs, and exclusive content with the community.</p><p>Stay tuned for more updates!</p>",
      coverImage: '',
      visibility: 'public',
      allowedTiers: [],
      tags: ['welcome', 'announcement'],
      publishedAt: '2025-03-18',
      attachments: [],
    },
    {
      id: 'post-2',      title: 'Mecha Overdrive — Dev Update #1',
      pinned: false,
      excerpt: "First major update on core mechanics, combat systems, and what's coming next for Mecha Overdrive.",
      content: "<p>Here's the full breakdown of what I've been working on...</p>",
      coverImage: '',
      visibility: 'members',
      allowedTiers: [],
      tags: ['devlog', 'mecha-overdrive'],
      publishedAt: '2025-03-20',
      attachments: [
        {
          id: 'file-1',
          filename: 'mechaoverdrive-build-alpha.zip',
          url: '',
          fileType: 'zip',
          sizeLabel: '142 MB',
          displayLabel: 'Alpha Build v0.1',
          minimumTier: 'creator',
        },
      ],
    },
  ],
  membershipPage: {
    headline: 'Choose Your Membership',
    subheading: 'Support the mission and get exclusive access to dev content, builds, and community perks.',
  },
  donatePage: {
    headline: 'Support the Mission',
    subheading: 'Every donation, big or small, keeps development alive and helps me create more.',
  },
  adminPermissions: defaultAdminPermissions,
};
