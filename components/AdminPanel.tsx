import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useSupportData } from '../context/SupportContext';
import { useStore } from '../context/StoreContext';
import { StoreProduct, StoreConfig, COUNTRIES } from '../config/storeConfig';
import { Tier, AdminPermissions } from '../config/ownerConfig';
import { X, Plus, Trash2, Check, Crown, Save, FolderPlus, Layers, Type, Users, ChevronUp, ChevronDown, LogOut, Shield, UserCheck, UserX, Clock, Pencil, ShoppingBag, Search, MessageSquare, Send, Gamepad2, Sparkles, Wrench, Zap, Code } from 'lucide-react';
import { ensureAuth, getAuthToken, supabase, FUNCTIONS_URL } from '../lib/supabase';
import { uploadToGitHub } from '../lib/githubStorage';
import { OWNER_DISCORD_ID } from '../lib/discord';

const blankTier = (): Tier => ({
  id: 'tier-' + Date.now(),
  name: '', icon: '⭐', description: '',
  imageUrl: '',
  accentColour: '#a855f7', isPopular: false, memberCount: 0,
  monthlyPrice: 0, yearlyPrice: 0, lifetimePrice: 0, lifetimeEnabled: true,
  stripeMonthlyUrl: '', stripeYearlyUrl: '', stripeLifetimeUrl: '',
  discordRoleIds: [], lifetimeDiscordRoleIds: [],
  benefits: [], lifetimeExtraBenefits: [],
});


// Resize + compress images before upload. Skips non-images and already-small files.
const compressImage = (file: File, maxDim = 1920, quality = 0.82): Promise<File> =>
  new Promise((resolve) => {
    if (!file.type.startsWith('image/')) { resolve(file); return; }
    const isPng = file.type === 'image/png';
    const outMime = isPng ? 'image/png' : 'image/jpeg';
    const outExt = isPng ? '.png' : '.jpg';
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim && file.size < 300_000) { resolve(file); return; }
      if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
      else { width = Math.round(width * maxDim / height); height = maxDim; }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      if (isPng) ctx.clearRect(0, 0, width, height); // preserve transparency
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, outExt), { type: outMime }));
        },
        outMime,
        isPng ? undefined : quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });

const STORAGE_RULES_SNIPPET = `-- Supabase Storage: set bucket policies in the Supabase dashboard
-- Public read, authenticated write (anon key counts as authenticated for RLS)
-- Enable RLS on storage.objects and add policies as needed.`;

const FIRESTORE_RULES_SNIPPET = `-- Supabase RLS policies (run in SQL editor or via migrations):
-- support_config: public read, anon/service write
-- discord_users: anon read/write (for portal sync)
-- memberships: user read (auth.uid = user_id), service write
-- digital_purchases: user read (auth.uid = user_id), service write
-- contact_messages: service write (API), anon read for admin
-- donations: public read, service write`;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return fallback;
};

const formatUploadProgress = (bytesTransferred: number, totalBytes: number) => {
  const percent = totalBytes > 0 ? Math.round((bytesTransferred / totalBytes) * 100) : 0;
  const transferredMb = (bytesTransferred / 1024 / 1024).toFixed(1);
  const totalMb = (totalBytes / 1024 / 1024).toFixed(1);
  return `${percent}% (${transferredMb} MB / ${totalMb} MB)`;
};

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
const OWNER_SESSION_KEY = 'wahaj_owner_verified';
const permissionOrder: (keyof AdminPermissions)[] = ['roadmap', 'faq', 'members', 'requests', 'goal', 'membership', 'posts', 'donation', 'store'];
const permissionLabels: Record<keyof AdminPermissions, { title: string; description: string }> = {
  roadmap: { title: 'Roadmap & Projects', description: 'Edit roadmap projects, sections, and task progress.' },
  faq: { title: 'FAQ Manager', description: 'Create and remove FAQ entries.' },
  members: { title: 'Members', description: 'View members and manage their assigned projects.' },
  requests: { title: 'Requests', description: 'Approve or reject incoming team portal requests.' },
  goal: { title: 'Goal Bar', description: 'Change the support goal, milestones, and copy.' },
  membership: { title: 'Membership', description: 'Edit tiers, pricing, and membership page content.' },
  posts: { title: 'Posts', description: 'Create, edit, and publish member or public posts.' },
  donation: { title: 'Donations', description: 'Manage donation settings and donate page content.' },
  store: { title: 'Store', description: 'Manage storefront products and digital delivery assets.' },
};

const AdminPanel: React.FC = () => {
  const {
    isAdminOpen,
    closeAdmin,
    discordUser,
    currentAppUser,
    role,
    authLoading,
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
    approveRequest,
    rejectRequest,
    updateUserRole,
    updateAdminPermissions,
    updateUserProjects,
    removeUser,
  } = useData();

  const [activeTab, setActiveTab] = useState<'roadmap' | 'faq' | 'members' | 'requests' | 'goal' | 'membership' | 'posts' | 'donation' | 'store' | 'orders' | 'permissions'>('roadmap');
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

  // Renaming projects / sections / steps
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renamingSectionKey, setRenamingSectionKey] = useState<string | null>(null); // `${projectId}-${sectionId}`
  const [renamingSectionValue, setRenamingSectionValue] = useState('');
  const [editingStepKey, setEditingStepKey] = useState<string | null>(null); // `${projectId}-${sectionId}-${stepId}`
  const [editingStepValue, setEditingStepValue] = useState('');

  // Password-based owner login (alternative to Discord)
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [localAuth, setLocalAuth] = useState(false);

  const handlePasswordLogin = () => {
    const secret = import.meta.env.VITE_ADMIN_PASSWORD;
    if (secret && passwordInput === secret) {
      setLocalAuth(true);
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password.');
      setPasswordInput('');
    }
  };

  // Support data
  const { config, saveMembership, savePosts, saveGoals, saveDonation, savePageContent, saveAdminPermissions } = useSupportData();
  const [approveAdminPermissions, setApproveAdminPermissions] = useState<AdminPermissions>(config.adminPermissions);

  // Store data
  const { config: storeConfig, saveStore } = useStore();
  const [storeData, setStoreData] = useState<StoreConfig>(storeConfig);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const [countrySearch, setCountrySearch] = useState('');
  useEffect(() => { setStoreData(storeConfig); }, [storeConfig]);
  const blankProduct = (): StoreProduct => ({
    id: 'prod-' + Date.now(),
    name: '', description: '', price: 0, salePercent: 0,
    type: 'digital', category: '', coverImage: '', stripeUrl: '',
    digitalFileUrl: '', digitalFileName: '',
    stock: null, enabled: true, featured: false, tags: [],
    shippingCountryMode: 'all-except-blocked', blockedCountries: [], allowedCountries: [], customFields: [],
  });
  const setP = (patch: Partial<StoreProduct>) => setEditingProduct(ep => ep ? { ...ep, ...patch } : ep);

  // Membership editor
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [tierDraft, setTierDraft] = useState<Tier | null>(null);
  const [membershipDraft, setMembershipDraft] = useState(config.membership);
  const [newBenefit, setNewBenefit] = useState('');
  const [newLifetimeBenefit, setNewLifetimeBenefit] = useState('');
  const [membershipSaving, setMembershipSaving] = useState(false);
  const [membershipUploadError, setMembershipUploadError] = useState('');
  const [membershipUploadStatus, setMembershipUploadStatus] = useState('');
  const [roadmapUploadStatus, setRoadmapUploadStatus] = useState<Record<string, string>>({});

  // Posts editor
  type PostDraft = typeof config.posts[0];
  const blankPost = (): PostDraft => ({
    id: 'post-' + Date.now(),
    title: '', pinned: false, excerpt: '', content: '',
    coverImage: '', visibility: 'public', allowedTiers: [],
    tags: [], publishedAt: new Date().toISOString().slice(0, 10), attachments: [],
  });
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postDraft, setPostDraft] = useState<PostDraft | null>(null);
  const [newTag, setNewTag] = useState('');
  const [postSaving, setPostSaving] = useState(false);
  const [postUploadError, setPostUploadError] = useState('');
  const [postUploadStatus, setPostUploadStatus] = useState('');

  // Goal editor
  const [goalsDraft, setGoalsDraft] = useState(config.goals ?? []);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalSaving, setGoalSaving] = useState(false);
  const [newMilestoneAmount, setNewMilestoneAmount] = useState('');
  const [newMilestoneLabel, setNewMilestoneLabel] = useState('');

  // Page content editors
  const [membershipPageDraft, setMembershipPageDraft] = useState(config.membershipPage);
  const [donatePageDraft, setDonatePageDraft] = useState(config.donatePage);
  const [pageContentSaving, setPageContentSaving] = useState(false);

  // Donate editor
  const [donateDraft, setDonateDraft] = useState(config.donation);
  const [newPresetAmount, setNewPresetAmount] = useState('');
  const [donateSaving, setDonateSaving] = useState(false);
  const [storeUploadError, setStoreUploadError] = useState('');
  const [storeUploadSuccess, setStoreUploadSuccess] = useState('');
  const [storeUploadStatus, setStoreUploadStatus] = useState('');
  // Orders & Messages tab state
  const [adminConvs, setAdminConvs] = useState<{id:string;orderId:string;buyerName:string;buyerEmail:string;productNames:string[];lastMessage:string;lastMessageAt:number;unreadOwner:number}[]>([]);
  const [adminConvsLoading, setAdminConvsLoading] = useState(false);
  const [adminActiveConv, setAdminActiveConv] = useState<typeof adminConvs[0]|null>(null);
  const [adminMessages, setAdminMessages] = useState<{id:string;text:string;senderRole:string;senderName:string;createdAt:number}[]>([]);
  const [adminReply, setAdminReply] = useState('');
  const [adminSending, setAdminSending] = useState(false);
  const ADMIN_API = FUNCTIONS_URL;
  // Fan contact messages
  const [contactMsgs, setContactMsgs] = useState<{id:string;name:string;email:string;subject:string;message:string;createdAt:number;read:boolean}[]>([]);
  const [contactLoading, setContactLoading] = useState(false);
  const [activeContactMsg, setActiveContactMsg] = useState<typeof contactMsgs[0]|null>(null);
  const [ordersSubTab, setOrdersSubTab] = useState<'orders'|'contact'>('orders');
  // Donor conversations state
  const [donorConvos, setDonorConvos] = useState<{id:string;transactionId:string;donorName:string;donorEmail:string|null;amountGBP:number;message:string;createdAt:number;replied:boolean;lastReplyAt:number|null}[]>([]);
  const [donorConvosLoading, setDonorConvosLoading] = useState(false);
  const [expandedDonorId, setExpandedDonorId] = useState<string|null>(null);
  const [donorReplyText, setDonorReplyText] = useState<Record<string,string>>({});
  const [donorReplying, setDonorReplying] = useState<string|null>(null);

  const loadAdminConvs = async () => {
    setAdminConvsLoading(true);
    try {
      await ensureAuth();
      const token = (await getAuthToken()) || '';
      const res = await fetch(`${ADMIN_API}/messages-conversations?all=true`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setAdminConvs(data.conversations || []);
    } finally { setAdminConvsLoading(false); }
  };

  const openAdminConv = async (conv: typeof adminConvs[0]) => {
    setAdminActiveConv(conv);
    setAdminMessages([]);
    try {
      const token = (await getAuthToken()) || '';
      const res = await fetch(`${ADMIN_API}/messages-thread?conversationId=${conv.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setAdminMessages(data.messages || []);
      // Mark as read for owner
      await fetch(`${ADMIN_API}/messages-conversations`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: conv.id, role: 'owner' }),
      });
      setAdminConvs(c => c.map(x => x.id === conv.id ? { ...x, unreadOwner: 0 } : x));
    } catch { /* ignore */ }
  };

  const sendAdminReply = async () => {
    if (!adminReply.trim() || !adminActiveConv || adminSending) return;
    setAdminSending(true);
    try {
      const token = (await getAuthToken()) || '';
      await fetch(`${ADMIN_API}/messages-send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: adminActiveConv.id, text: adminReply.trim(), senderRole: 'owner' }),
      });
      setAdminMessages(m => [...m, { id: Date.now().toString(), text: adminReply.trim(), senderRole: 'owner', senderName: 'WahajPlayz', createdAt: Date.now() }]);
      setAdminReply('');
    } finally { setAdminSending(false); }
  };

  const loadContactMsgs = async () => {
    setContactLoading(true);
    try {
      const { data } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });
      setContactMsgs((data || []) as any[]);
    } finally { setContactLoading(false); }
  };

  const markContactRead = async (msg: typeof contactMsgs[0]) => {
    if (msg.read) return;
    try {
      await supabase.from('contact_messages').update({ read: true }).eq('id', msg.id);
      setContactMsgs(m => m.map(x => x.id === msg.id ? { ...x, read: true } : x));
    } catch { /* ignore */ }
  };

  const loadDonorConvos = async () => {
    setDonorConvosLoading(true);
    try {
      await ensureAuth();
      const token = (await getAuthToken()) || '';
      const res = await fetch(`${ADMIN_API}/donations-list`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setDonorConvos(data.conversations || []);
    } finally { setDonorConvosLoading(false); }
  };

  const sendDonorReply = async (convId: string) => {
    const text = donorReplyText[convId]?.trim();
    if (!text) return;
    setDonorReplying(convId);
    try {
      await ensureAuth();
      const token = (await getAuthToken()) || '';
      await fetch(`${ADMIN_API}/donations-reply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId, text }),
      });
      setDonorConvos(prev => prev.map(c => c.id === convId ? { ...c, replied: true, lastReplyAt: Date.now() } : c));
      setDonorReplyText(prev => ({ ...prev, [convId]: '' }));
      setExpandedDonorId(null);
    } finally { setDonorReplying(null); }
  };

  const [rulesCopied, setRulesCopied] = useState(false);
  const [rulesCopiedFirestore, setRulesCopiedFirestore] = useState(false);
  const [permsSaving, setPermsSaving] = useState(false);
  const [defaultAdminPermsDraft, setDefaultAdminPermsDraft] = useState<AdminPermissions>(config.adminPermissions);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeStatus, setPurgeStatus] = useState('');
  const [purgeError, setPurgeError] = useState('');

  useEffect(() => { setGoalsDraft(config.goals ?? []); }, [config.goals]);
  useEffect(() => { setMembershipDraft(config.membership); }, [config.membership]);
  useEffect(() => { setMembershipPageDraft(config.membershipPage); }, [config.membershipPage]);
  useEffect(() => { setDonatePageDraft(config.donatePage); }, [config.donatePage]);
  useEffect(() => { setDonateDraft(config.donation); }, [config.donation]);
  useEffect(() => { setDefaultAdminPermsDraft(config.adminPermissions); }, [config.adminPermissions]);
  useEffect(() => {
    if (approveRole === 'admin') {
      setApproveAdminPermissions(config.adminPermissions);
    }
  }, [approveRole, config.adminPermissions]);

  // Ensure Supabase auth is set so DB writes pass security rules
  useEffect(() => { if (isAdminOpen) ensureAuth(); }, [isAdminOpen]);

  const uploadAsset = async (
    folder: string,
    file: File,
    onProgress?: (snapshot: { bytesTransferred: number; totalBytes: number }) => void,
    onStageChange?: (status: string) => void
  ): Promise<{ url: string; path: string }> => {
    onStageChange?.(`Uploading ${formatUploadProgress(0, file.size)}`);
    const { url, path } = await uploadToGitHub(file, folder, (percent) => {
      onProgress?.({ bytesTransferred: Math.round((percent / 100) * file.size), totalBytes: file.size });
      onStageChange?.(`Uploading ${percent}%`);
    });
    onStageChange?.('Upload complete.');
    return { url, path };
  };

  const copyStorageRules = async () => {
    try {
      await navigator.clipboard.writeText(STORAGE_RULES_SNIPPET + '\n\n' + FIRESTORE_RULES_SNIPPET);
      setRulesCopied(true);
      window.setTimeout(() => setRulesCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy rules:', error);
    }
  };

  if (!isAdminOpen) return null;

  const isOwnerAccount = discordUser?.id === OWNER_DISCORD_ID || discordUser?.username === OWNER_DISCORD_ID;
  const ownerSessionVerified = localStorage.getItem(OWNER_SESSION_KEY) === '1';
  const isOwner = role === 'owner' || isOwnerAccount || ownerSessionVerified || localAuth;
  const isAuthenticated = role === 'owner' || role === 'admin' || isOwnerAccount || ownerSessionVerified || localAuth;
  const effectiveAdminPermissions = currentAppUser?.adminPermissions ?? config.adminPermissions;
  const canAccessTab = (tab: keyof AdminPermissions) => isOwner || effectiveAdminPermissions[tab] !== false;
  const visiblePrimaryTabs = permissionOrder.filter(tab => canAccessTab(tab));

  useEffect(() => {
    if (activeTab === 'permissions' && !isOwner) {
      setActiveTab(visiblePrimaryTabs[0] ?? 'roadmap');
      return;
    }
    if (activeTab !== 'permissions' && activeTab !== 'orders' && !visiblePrimaryTabs.includes(activeTab as keyof AdminPermissions)) {
      setActiveTab(visiblePrimaryTabs[0] ?? 'roadmap');
    }
  }, [activeTab, isOwner, visiblePrimaryTabs]);

  if (authLoading && !localAuth) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-neutral-900 w-full max-w-md rounded-2xl border border-purple-500/30 shadow-2xl p-8 text-center">
          <Crown size={40} className="text-yellow-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-1">Checking Discord Access</h2>
          <p className="text-gray-500 text-sm mb-6">Verifying whether this Discord account is owner or admin.</p>
          <div className="w-10 h-10 mx-auto rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  // Not authenticated — show password login
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-neutral-900 w-full max-w-md rounded-2xl border border-purple-500/30 shadow-2xl p-8">
          <div className="text-center mb-6">
            <Crown size={40} className="text-yellow-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-white mb-1">Owner Panel</h2>
            <p className="text-gray-500 text-sm">Enter your admin password to continue.</p>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              value={passwordInput}
              onChange={e => { setPasswordInput(e.target.value); setPasswordError(''); }}
              onKeyDown={e => e.key === 'Enter' && handlePasswordLogin()}
              placeholder="Admin password"
              className="w-full px-4 py-3 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500 transition-colors"
              autoFocus
            />
            {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
            <button
              onClick={handlePasswordLogin}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold transition-colors"
            >
              Unlock Panel
            </button>
            <p className="text-center text-gray-600 text-xs">
              Or sign in with Discord via the Team Portal
            </p>
          </div>
          <button onClick={closeAdmin} className="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors"><X size={20} /></button>
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
    await approveRequest(discordId, approveRole, approveProjectIds, approveRole === 'admin' ? approveAdminPermissions : undefined);
    setApprovingId(null);
    setApproveRole('member');
    setApproveProjectIds([]);
    setApproveAdminPermissions(config.adminPermissions);
  };

  const toggleApproveProject = (pid: string) => {
    setApproveProjectIds(prev => prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]);
  };

  const togglePermission = (permissions: AdminPermissions, key: keyof AdminPermissions) => ({
    ...permissions,
    [key]: !permissions[key],
  });

  const purgeTeamMembers = async () => {
    if (!window.confirm('Remove all non-owner Team Portal members and clear all join requests?')) return;
    setPurgeLoading(true);
    setPurgeStatus('');
    setPurgeError('');

    try {
      const response = await fetch(`${FUNCTIONS_URL}/purge-team-members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminPassword: localAuth ? passwordInput || import.meta.env.VITE_ADMIN_PASSWORD || '' : '',
          discordToken: localStorage.getItem('discord_token') || '',
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to purge team members.');
      }

      setPurgeStatus(`Removed ${data.removedUsers ?? 0} team members and ${data.removedRequests ?? 0} requests.`);
    } catch (error) {
      setPurgeError(error instanceof Error ? error.message : 'Failed to purge team members.');
    } finally {
      setPurgeLoading(false);
    }
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
            {(() => {
              return (
                <div className="flex space-x-2 mb-6 border-b border-white/10 pb-2 flex-wrap gap-y-2">
                  {(['roadmap', 'faq', 'members', 'requests'] as const).filter(tab => canAccessTab(tab)).map(tab => (
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
                  {(['goal', 'membership', 'posts', 'donation'] as const).filter(tab => canAccessTab(tab)).map(tab => (
                    <button
                      key={tab}
                      onClick={() => { setActiveTab(tab); if (tab === 'donation') loadDonorConvos(); }}
                      className={`px-4 py-2 rounded-lg transition-colors font-medium capitalize ${activeTab === tab ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      {tab === 'goal' ? 'Goal Bar' : tab === 'membership' ? 'Membership' : tab === 'posts' ? 'Posts' : 'Donations'}
                    </button>
                  ))}
                  {canAccessTab('store') && (
                    <button
                      onClick={() => setActiveTab('store')}
                      className={`px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-1.5 ${activeTab === 'store' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      <ShoppingBag size={14} />Store
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => { setActiveTab('orders'); loadAdminConvs(); loadContactMsgs(); }}
                      className={`px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-1.5 ${activeTab === 'orders' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      <MessageSquare size={14} /> Orders & Messages
                      {(adminConvs.reduce((s,c)=>s+c.unreadOwner,0) + contactMsgs.filter(m=>!m.read).length) > 0 && (
                        <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">{adminConvs.reduce((s,c)=>s+c.unreadOwner,0) + contactMsgs.filter(m=>!m.read).length}</span>
                      )}
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => setActiveTab('permissions')}
                      className={`px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-1.5 ${activeTab === 'permissions' ? 'bg-yellow-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      <Shield size={14} /> Permissions
                    </button>
                  )}
                </div>
              );
            })()}

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
                        {/* Project meta: image, description, status */}
                        <div className="grid grid-cols-1 gap-3 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex items-start gap-4">
                            {project.imageUrl && (
                              <img src={project.imageUrl} alt="" className="w-20 h-14 object-cover rounded flex-shrink-0 border border-white/10" />
                            )}
                            <div className="flex-1 space-y-2">
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block">Cover image</label>
                                <div className="flex gap-2 items-center">
                                  <label className="cursor-pointer px-3 py-1.5 text-xs font-orbitron tracking-wider text-purple-400 border border-purple-500/40 hover:border-purple-400 transition-colors">
                                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      setRoadmapUploadStatus(s => ({ ...s, [project.id]: 'Compressing…' }));
                                      try {
                                        const compressed = await compressImage(file);
                                        setRoadmapUploadStatus(s => ({ ...s, [project.id]: 'Uploading…' }));
                                        const result = await uploadAsset('roadmap', compressed, (snap) => {
                                          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
                                          setRoadmapUploadStatus(s => ({ ...s, [project.id]: `Uploading ${pct}%` }));
                                        });
                                        if (result?.url) {
                                          updateProject(project.id, { imageUrl: result.url });
                                          setRoadmapUploadStatus(s => ({ ...s, [project.id]: 'Done!' }));
                                          setTimeout(() => setRoadmapUploadStatus(s => { const n = { ...s }; delete n[project.id]; return n; }), 2000);
                                        }
                                      } catch (err) {
                                        setRoadmapUploadStatus(s => ({ ...s, [project.id]: 'Upload failed.' }));
                                      }
                                      e.currentTarget.value = '';
                                    }} />
                                    Upload Image
                                  </label>
                                  {project.imageUrl && (
                                    <button className="text-xs text-red-400 hover:text-red-300" onClick={() => updateProject(project.id, { imageUrl: '' })}>Remove</button>
                                  )}
                                  {roadmapUploadStatus[project.id] && (
                                    <span className="text-xs text-amber-300 font-mono">{roadmapUploadStatus[project.id]}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">Short description</label>
                              <input
                                value={project.description || ''}
                                onChange={e => updateProject(project.id, { description: e.target.value })}
                                className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500 text-sm"
                                placeholder="e.g. A 2D platformer built in Unity"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">Status</label>
                              <select
                                value={project.status || 'active'}
                                onChange={e => updateProject(project.id, { status: e.target.value as any })}
                                className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500 text-sm"
                              >
                                <option value="active">Active</option>
                                <option value="planned">Planned</option>
                                <option value="completed">Completed</option>
                                <option value="on-hold">On Hold</option>
                              </select>
                            </div>
                            <div className="col-span-2">
                              <label className="text-xs text-gray-500 mb-1 block">Icon</label>
                              <div className="flex gap-2">
                                {(['gamepad', 'sparkles', 'wrench', 'zap', 'code'] as const).map(icon => (
                                  <button
                                    key={icon}
                                    onClick={() => updateProject(project.id, { iconType: icon })}
                                    className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs transition-all"
                                    style={{
                                      background: project.iconType === icon ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)',
                                      border: `1px solid ${project.iconType === icon ? 'rgba(168,85,247,0.6)' : 'rgba(255,255,255,0.08)'}`,
                                      color: project.iconType === icon ? '#d8b4fe' : '#6b7280',
                                    }}
                                    title={icon}
                                  >
                                    {icon === 'gamepad' && <Gamepad2 size={16} />}
                                    {icon === 'sparkles' && <Sparkles size={16} />}
                                    {icon === 'wrench' && <Wrench size={16} />}
                                    {icon === 'zap' && <Zap size={16} />}
                                    {icon === 'code' && <Code size={16} />}
                                    <span className="capitalize">{icon}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {project.sections.map((section, secIdx) => {
                          const sectionIds = project.sections.map(s => s.id);
                          return (
                            <div key={section.id} className="bg-white/5 rounded-xl p-4 border border-white/5">
                              <div className="flex justify-between items-center mb-4">
                                {renamingSectionKey === `${project.id}-${section.id}` ? (
                                  <form
                                    className="flex-1 flex gap-2 mr-2"
                                    onSubmit={(e) => { e.preventDefault(); if (renamingSectionValue.trim()) renameSection(project.id, section.id, renamingSectionValue.trim()); setRenamingSectionKey(null); }}
                                  >
                                    <input
                                      autoFocus
                                      type="text"
                                      value={renamingSectionValue}
                                      onChange={e => setRenamingSectionValue(e.target.value)}
                                      onKeyDown={e => e.key === 'Escape' && setRenamingSectionKey(null)}
                                      className="flex-1 px-2 py-1 rounded bg-black border border-blue-500/60 outline-none text-white text-sm font-bold"
                                    />
                                    <button type="submit" className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold">Save</button>
                                    <button type="button" onClick={() => setRenamingSectionKey(null)} className="px-2 py-1 bg-neutral-700 text-white rounded text-xs">Cancel</button>
                                  </form>
                                ) : (
                                  <h4
                                    className="font-bold text-gray-300 flex items-center gap-2 uppercase tracking-tighter text-sm cursor-pointer group/sec"
                                    onClick={() => { setRenamingSectionKey(`${project.id}-${section.id}`); setRenamingSectionValue(section.title); }}
                                    title="Click to rename"
                                  >
                                    <Layers size={14} className="text-blue-400" />{section.title}
                                    <Pencil size={11} className="text-gray-700 group-hover/sec:text-blue-400 transition-colors" />
                                  </h4>
                                )}
                                {renamingSectionKey !== `${project.id}-${section.id}` && (
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => reorderSections(project.id, moveInArray(sectionIds, section.id, 'up'))} disabled={secIdx === 0} className="p-1 text-gray-500 hover:text-white disabled:opacity-20"><ChevronUp size={14} /></button>
                                    <button onClick={() => reorderSections(project.id, moveInArray(sectionIds, section.id, 'down'))} disabled={secIdx === project.sections.length - 1} className="p-1 text-gray-500 hover:text-white disabled:opacity-20"><ChevronDown size={14} /></button>
                                    <button onClick={() => removeSection(project.id, section.id)} className="p-1.5 text-red-400 hover:text-red-300 ml-1"><Trash2 size={14} /></button>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2 mb-4">
                                {section.steps.map((step, stepIdx) => {
                                  const stepIds = section.steps.map(s => s.id);
                                  const stepKey = `${project.id}-${section.id}-${step.id}`;
                                  return (
                                    <div key={step.id} className="flex items-center gap-2 p-2 rounded bg-black/20 group">
                                      <button onClick={() => toggleStep(project.id, section.id, step.id)} className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${step.isCompleted ? 'bg-purple-500 border-purple-500' : 'border-gray-600'}`}>
                                        {step.isCompleted && <Check size={12} className="text-white" />}
                                      </button>
                                      {editingStepKey === stepKey ? (
                                        <form className="flex-1 flex gap-1" onSubmit={e => { e.preventDefault(); if (editingStepValue.trim()) renameStep(project.id, section.id, step.id, editingStepValue.trim()); setEditingStepKey(null); }}>
                                          <input
                                            autoFocus
                                            type="text"
                                            value={editingStepValue}
                                            onChange={e => setEditingStepValue(e.target.value)}
                                            onKeyDown={e => e.key === 'Escape' && setEditingStepKey(null)}
                                            className="flex-1 px-2 py-0.5 rounded bg-black border border-purple-500/60 outline-none text-white text-sm"
                                          />
                                          <button type="submit" className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold">Save</button>
                                          <button type="button" onClick={() => setEditingStepKey(null)} className="px-2 py-0.5 bg-neutral-700 text-white rounded text-xs">✕</button>
                                        </form>
                                      ) : (
                                        <span
                                          className={`flex-1 text-sm cursor-pointer ${step.isCompleted ? 'text-gray-500 line-through' : 'text-gray-300'}`}
                                          onDoubleClick={() => { setEditingStepKey(stepKey); setEditingStepValue(step.text); }}
                                          title="Double-click to edit"
                                        >{step.text}</span>
                                      )}
                                      {editingStepKey !== stepKey && (
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => { setEditingStepKey(stepKey); setEditingStepValue(step.text); }} className="p-1 text-gray-600 hover:text-purple-400 transition-colors"><Pencil size={11} /></button>
                                          <button onClick={() => reorderSteps(project.id, section.id, moveInArray(stepIds, step.id, 'up'))} disabled={stepIdx === 0} className="p-1 text-gray-500 hover:text-white disabled:opacity-20"><ChevronUp size={12} /></button>
                                          <button onClick={() => reorderSteps(project.id, section.id, moveInArray(stepIds, step.id, 'down'))} disabled={stepIdx === section.steps.length - 1} className="p-1 text-gray-500 hover:text-white disabled:opacity-20"><ChevronDown size={12} /></button>
                                          <button onClick={() => removeStep(project.id, section.id, step.id)} className="p-1 text-red-500 hover:bg-red-500/10 rounded"><Trash2 size={14} /></button>
                                        </div>
                                      )}
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
                          {isOwner && user.role === 'admin' && (
                            <div className="mt-5">
                              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Admin Access</p>
                              <div className="grid md:grid-cols-2 gap-2">
                                {permissionOrder.map(permission => {
                                  const userPermissions = user.adminPermissions ?? config.adminPermissions;
                                  return (
                                    <label key={permission} className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={userPermissions[permission]}
                                        onChange={() => updateAdminPermissions(user.discordId, togglePermission(userPermissions, permission))}
                                        className="mt-0.5 w-4 h-4 accent-yellow-500"
                                      />
                                      <span>
                                        <span className="block text-sm text-white">{permissionLabels[permission].title}</span>
                                        <span className="block text-xs text-gray-500">{permissionLabels[permission].description}</span>
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
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
                            onClick={() => {
                              setApprovingId(approvingId === req.discordId ? null : req.discordId);
                              setApproveRole('member');
                              setApproveProjectIds([]);
                              setApproveAdminPermissions(config.adminPermissions);
                            }}
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
                          {isOwner && approveRole === 'admin' && (
                            <div>
                              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Admin Access:</p>
                              <div className="grid md:grid-cols-2 gap-2">
                                {permissionOrder.map(permission => (
                                  <label key={permission} className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={approveAdminPermissions[permission]}
                                      onChange={() => setApproveAdminPermissions(prev => togglePermission(prev, permission))}
                                      className="mt-0.5 w-4 h-4 accent-yellow-500"
                                    />
                                    <span>
                                      <span className="block text-sm text-white">{permissionLabels[permission].title}</span>
                                      <span className="block text-xs text-gray-500">{permissionLabels[permission].description}</span>
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
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

            {/* ── GOAL BAR TAB ── */}
            {activeTab === 'goal' && (() => {
              const currencyMap: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', AUD: 'A$', CAD: 'C$', JPY: '¥', CHF: 'Fr' };
              const editingGoal = editingGoalId ? goalsDraft.find(g => g.id === editingGoalId) ?? null : null;
              const setG = (patch: Partial<typeof goalsDraft[0]>) =>
                setGoalsDraft(prev => prev.map(g => g.id === editingGoalId ? { ...g, ...patch } : g));

              const saveAll = async () => {
                setGoalSaving(true);
                await saveGoals(goalsDraft);
                setGoalSaving(false);
                setEditingGoalId(null);
              };

              const addGoal = () => {
                const newGoal = {
                  id: 'goal-' + Date.now(),
                  title: 'New Goal',
                  enabled: true,
                  type: 'monthly' as const,
                  currency: '£',
                  currencyCode: 'GBP',
                  target: 500,
                  raised: 0,
                  description: '',
                  milestones: [],
                };
                setGoalsDraft(prev => [...prev, newGoal]);
                setEditingGoalId(newGoal.id);
              };

              const deleteGoal = (id: string) => {
                setGoalsDraft(prev => prev.filter(g => g.id !== id));
                if (editingGoalId === id) setEditingGoalId(null);
              };

              const addMilestone = () => {
                if (!editingGoal) return;
                const amt = parseFloat(newMilestoneAmount);
                if (!amt || !newMilestoneLabel.trim()) return;
                const sorted = [...editingGoal.milestones, { amount: amt, label: newMilestoneLabel.trim() }]
                  .sort((a, b) => a.amount - b.amount);
                setG({ milestones: sorted });
                setNewMilestoneAmount('');
                setNewMilestoneLabel('');
              };

              return (
                <div className="space-y-4 pb-12">
                  <div className="flex justify-between items-center">
                    <p className="text-white font-bold">Goals ({goalsDraft.length})</p>
                    <div className="flex gap-2">
                      <button onClick={addGoal} className="flex items-center gap-1.5 px-3 py-2 bg-purple-600/80 hover:bg-purple-600 text-white rounded-lg text-sm font-bold transition-colors">
                        <Plus size={14} /> Add Goal
                      </button>
                      <button onClick={saveAll} disabled={goalSaving} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-lg text-sm font-bold transition-colors">
                        <Save size={14} /> {goalSaving ? 'Saving…' : 'Save All'}
                      </button>
                    </div>
                  </div>

                  {/* Goal list */}
                  {!editingGoalId && (
                    <div className="space-y-2">
                      {goalsDraft.length === 0 && <p className="text-gray-500 text-sm font-mono text-center py-8">No goals yet. Click Add Goal.</p>}
                      {goalsDraft.map(g => {
                        const pct = g.target > 0 ? Math.min(100, Math.round((g.raised / g.target) * 100)) : 0;
                        return (
                          <div key={g.id} className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <input type="checkbox" checked={g.enabled} onChange={e => { setGoalsDraft(prev => prev.map(x => x.id === g.id ? { ...x, enabled: e.target.checked } : x)); }} className="w-4 h-4 accent-purple-500 flex-shrink-0" />
                                <span className="font-bold text-white text-sm truncate">{g.title}</span>
                                <span className="text-xs font-mono text-gray-500 flex-shrink-0">{g.currency}{g.raised} / {g.currency}{g.target} · {pct}%</span>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => setEditingGoalId(g.id)} className="p-1.5 text-gray-500 hover:text-white transition-colors"><Pencil size={13} /></button>
                                <button onClick={() => deleteGoal(g.id)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#00d4ff,#a855f7)' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Goal editor */}
                  {editingGoal && (
                    <div className="space-y-4 p-4 rounded-xl bg-black/20 border border-purple-500/20">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-white">Editing: {editingGoal.title}</p>
                        <button onClick={() => setEditingGoalId(null)} className="text-gray-500 hover:text-white"><X size={15} /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="text-xs text-gray-400 mb-1 block">Goal title</label>
                          <input value={editingGoal.title} onChange={e => setG({ title: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500" placeholder="e.g. Monthly Goal" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Type</label>
                          <select value={editingGoal.type} onChange={e => setG({ type: e.target.value as 'monthly' | 'one-time' })} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500">
                            <option value="monthly">Monthly</option>
                            <option value="one-time">One-time</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Currency</label>
                          <select value={editingGoal.currencyCode} onChange={e => setG({ currencyCode: e.target.value, currency: currencyMap[e.target.value] || e.target.value })} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500">
                            <option value="GBP">GBP (£)</option>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="AUD">AUD (A$)</option>
                            <option value="CAD">CAD (C$)</option>
                            <option value="JPY">JPY (¥)</option>
                            <option value="CHF">CHF (Fr)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Amount raised</label>
                          <input type="number" min={0} value={editingGoal.raised} onChange={e => setG({ raised: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Target amount</label>
                          <input type="number" min={1} value={editingGoal.target} onChange={e => setG({ target: parseFloat(e.target.value) || 1 })} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500" />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-gray-400 mb-1 block">Description</label>
                          <input value={editingGoal.description} onChange={e => setG({ description: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500" placeholder="e.g. Help keep this going" />
                        </div>
                        <div className="col-span-2 flex items-center gap-2">
                          <input type="checkbox" checked={editingGoal.enabled} onChange={e => setG({ enabled: e.target.checked })} className="w-4 h-4 accent-purple-500" id="goal-enabled" />
                          <label htmlFor="goal-enabled" className="text-gray-300 text-sm cursor-pointer">Show on site</label>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Milestones</p>
                        <div className="space-y-2 mb-2">
                          {editingGoal.milestones.map((m, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-black/20 border border-white/5">
                              <span className="text-white text-sm font-mono">{editingGoal.currency}{m.amount}</span>
                              <span className="flex-1 text-gray-400 text-sm">— {m.label}</span>
                              <button onClick={() => setG({ milestones: editingGoal.milestones.filter((_, j) => j !== i) })} className="text-red-400 hover:text-red-300"><X size={14} /></button>
                            </div>
                          ))}
                          {editingGoal.milestones.length === 0 && <p className="text-gray-600 text-sm">No milestones yet.</p>}
                        </div>
                        <div className="flex gap-2">
                          <input type="number" value={newMilestoneAmount} onChange={e => setNewMilestoneAmount(e.target.value)} className="w-28 px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500" placeholder="Amount" />
                          <input value={newMilestoneLabel} onChange={e => setNewMilestoneLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMilestone()} className="flex-1 px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500" placeholder="Label (e.g. Hosting covered)" />
                          <button onClick={addMilestone} className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg"><Plus size={14} /></button>
                        </div>
                      </div>
                      <button onClick={saveAll} disabled={goalSaving} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-lg text-sm font-bold transition-colors">
                        <Save size={14} /> {goalSaving ? 'Saving…' : 'Save All Goals'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── MEMBERSHIP TAB ── */}

            {activeTab === 'membership' && (() => {
              const tiers = membershipDraft.tiers;

              const startEdit = (tier: Tier) => {
                setTierDraft({ ...tier, benefits: [...tier.benefits], lifetimeExtraBenefits: [...tier.lifetimeExtraBenefits] });
                setEditingTierId(tier.id);
                setNewBenefit('');
                setNewLifetimeBenefit('');
                setMembershipUploadError('');
              };

              const startAdd = () => {
                const t = blankTier();
                setTierDraft(t);
                setEditingTierId(t.id);
                setNewBenefit('');
                setNewLifetimeBenefit('');
                setMembershipUploadError('');
              };

              const cancelEdit = () => {
                setEditingTierId(null);
                setTierDraft(null);
                setMembershipUploadError('');
                setMembershipUploadStatus('');
              };

              const saveTier = async () => {
                if (!tierDraft) return;
                setMembershipSaving(true);
                setMembershipUploadError('');
                try {
                  const existing = tiers.find(t => t.id === tierDraft.id);
                  const updated = existing
                    ? tiers.map(t => t.id === tierDraft.id ? tierDraft : t)
                    : [...tiers, tierDraft];
                  const nextMembership = { ...membershipDraft, tiers: updated };
                  setMembershipDraft(nextMembership);
                  await saveMembership(nextMembership);
                  cancelEdit();
                } catch (error) {
                  console.error('Failed to save membership tier:', error);
                  setMembershipUploadError(getErrorMessage(error, 'Failed to save this membership tier.'));
                } finally {
                  setMembershipSaving(false);
                }
              };

              const deleteTier = async (id: string) => {
                setMembershipSaving(true);
                setMembershipUploadError('');
                const nextMembership = { ...membershipDraft, tiers: tiers.filter(t => t.id !== id) };
                const previousMembership = membershipDraft;
                setMembershipDraft(nextMembership);
                try {
                  await saveMembership(nextMembership);
                  if (editingTierId === id) cancelEdit();
                } catch (error) {
                  setMembershipDraft(previousMembership);
                  console.error('Failed to delete membership tier:', error);
                  setMembershipUploadError(getErrorMessage(error, 'Failed to delete this membership tier.'));
                } finally {
                  setMembershipSaving(false);
                }
              };

              const d = tierDraft;
              const set = (patch: Partial<Tier>) => setTierDraft(prev => prev ? { ...prev, ...patch } : prev);

              return (
                <div className="space-y-4 pb-12">
                  {/* Page headline editor */}
                  {!editingTierId && (
                    <div className="bg-black/30 rounded-xl border border-white/5 p-4 mb-4">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Membership Page Header</p>
                      <div className="space-y-2 mb-3">
                        <input
                          value={membershipPageDraft.headline}
                          onChange={e => setMembershipPageDraft(p => ({ ...p, headline: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500"
                          placeholder="Page headline"
                        />
                        <textarea
                          value={membershipPageDraft.subheading}
                          onChange={e => setMembershipPageDraft(p => ({ ...p, subheading: e.target.value }))}
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500 resize-none"
                          placeholder="Subheading"
                        />
                      </div>
                        <button
                          onClick={async () => { setPageContentSaving(true); await savePageContent('membershipPage', membershipPageDraft); setPageContentSaving(false); }}
                        disabled={pageContentSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-lg text-sm font-bold transition-colors"
                      >
                        <Save size={13} /> {pageContentSaving ? 'Saving…' : 'Save Header'}
                      </button>
                    </div>
                  )}

                  {/* Tier list */}
                  {!editingTierId && (
                    <>
                      <div className="flex justify-between items-center">
                        <p className="text-white font-bold">Membership Tiers ({tiers.length})</p>
                        <button onClick={startAdd} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition-colors">
                          <Plus size={14} /> Add Tier
                        </button>
                      </div>
                      {membershipUploadError && (
                        <p className="text-sm text-red-400">{membershipUploadError}</p>
                      )}
                      {membershipSaving && (
                        <p className="text-sm text-amber-300">Saving membership changes...</p>
                      )}
                      {tiers.length === 0 && (
                        <p className="text-gray-500 text-sm">No tiers yet. Add one above.</p>
                      )}
                      {tiers.map(tier => (
                        <div key={tier.id} className="flex items-center justify-between p-4 rounded-xl bg-black/30 border border-white/5">
                          <div className="flex items-center gap-3">
                            {tier.imageUrl ? (
                              <img src={tier.imageUrl} alt={tier.name || 'Tier image'} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-white/10" />
                            ) : (
                              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: tier.accentColour }} />
                            )}
                            <div>
                              <p className="text-white font-semibold">{tier.icon} {tier.name || <span className="text-gray-500 italic">Unnamed</span>}</p>
                              <p className="text-gray-500 text-xs">${tier.monthlyPrice}/mo · ${tier.yearlyPrice}/yr · ${tier.lifetimePrice} lifetime{tier.isPopular ? ' · ⭐ Popular' : ''}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => startEdit(tier)} className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors flex items-center gap-1">
                              <Pencil size={12} /> Edit
                            </button>
                            <button onClick={() => deleteTier(tier.id)} className="px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors flex items-center gap-1">
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Tier editor */}
                  {editingTierId && d && (
                    <div className="space-y-5 bg-black/30 rounded-2xl border border-purple-500/20 p-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-white font-bold text-lg">{tiers.find(t => t.id === d.id) ? 'Edit Tier' : 'New Tier'}</h3>
                        <button onClick={cancelEdit} className="text-gray-500 hover:text-white"><X size={18} /></button>
                      </div>

                      {/* Basic info */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Icon (emoji)</label>
                          <input value={d.icon} onChange={e => set({ icon: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white text-lg focus:border-purple-500" maxLength={4} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Tier Name</label>
                          <input value={d.name} onChange={e => set({ name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500" placeholder="e.g. Supporter" />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Description</label>
                        <input value={d.description} onChange={e => set({ description: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500" placeholder="Short description of this tier" />
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 mb-2 block">Tier Image (optional)</label>
                        {d.imageUrl && (
                          <div className="relative mb-3 w-fit">
                            <img src={d.imageUrl} alt={d.name || 'Tier image'} className="w-20 h-20 rounded-xl object-cover border border-white/10" />
                            <button onClick={() => set({ imageUrl: '' })} className="absolute top-2 right-2 p-1 bg-black/70 text-red-400 rounded">
                              <X size={12} />
                            </button>
                          </div>
                        )}
                        <label className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg cursor-pointer text-sm transition-colors w-fit">
                          <input type="file" accept="image/*" className="hidden" onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file || !d) return;
                            setMembershipUploadError('');
                            setMembershipUploadStatus('Compressing image...');
                            const fileToUpload = await compressImage(file);
                            setMembershipUploadStatus('Authenticating with Firebase Storage...');
                            try {
                              const { url, path } = await uploadAsset(
                                `membership/${d.id}`,
                                fileToUpload,
                                (snapshot) => {
                                  setMembershipUploadStatus(`Uploading tier image: ${formatUploadProgress(snapshot.bytesTransferred, snapshot.totalBytes)}`);
                                },
                                setMembershipUploadStatus
                              );
                              set({ imageUrl: url });
                              setMembershipUploadStatus('Tier image upload completed.');
                            } catch (error) {
                              console.error('Tier image upload failed:', error);
                              setMembershipUploadError(getErrorMessage(error, 'Tier image upload failed. Check Firebase Storage rules and bucket settings.'));
                            } finally {
                              e.currentTarget.value = '';
                            }
                          }} />
                          Upload Tier Image
                        </label>
                        {membershipUploadStatus && <p className="text-amber-300 text-xs mt-2">{membershipUploadStatus}</p>}
                        {membershipUploadError && <p className="text-red-400 text-xs mt-2">{membershipUploadError}</p>}
                        <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <p className="text-[11px] uppercase tracking-wider text-gray-400">Firebase Rules</p>
                            <button onClick={copyStorageRules} className="px-2 py-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/20 transition-colors">
                              {rulesCopied ? 'Copied!' : 'Copy Both'}
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">Enable Anonymous auth, then set these in Firebase Console:</p>
                          <p className="text-[11px] text-gray-500 uppercase tracking-wider mt-2 mb-1">Storage Rules</p>
                          <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 text-[11px] leading-relaxed text-cyan-300 whitespace-pre-wrap">{STORAGE_RULES_SNIPPET}</pre>
                          <p className="text-[11px] text-gray-500 uppercase tracking-wider mt-3 mb-1">Firestore Rules</p>
                          <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 text-[11px] leading-relaxed text-purple-300 whitespace-pre-wrap">{FIRESTORE_RULES_SNIPPET}</pre>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Accent Colour</label>
                          <div className="flex gap-2 items-center">
                            <input type="color" value={d.accentColour} onChange={e => set({ accentColour: e.target.value })} className="w-10 h-10 rounded cursor-pointer bg-transparent border-0" />
                            <input value={d.accentColour} onChange={e => set({ accentColour: e.target.value })} className="flex-1 px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500 font-mono text-sm" />
                          </div>
                        </div>
                        <div className="flex items-end pb-1">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={d.isPopular} onChange={e => set({ isPopular: e.target.checked })} className="w-4 h-4 accent-purple-500" />
                            <span className="text-gray-300 text-sm">Mark as Popular</span>
                          </label>
                        </div>
                      </div>

                      {/* Prices */}
                      <div>
                        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Pricing</p>
                        <div className="grid grid-cols-3 gap-3">
                          {[['Monthly (' + (config.goals?.[0]?.currency || '£') + ')', 'monthlyPrice'], ['Yearly (' + (config.goals?.[0]?.currency || '£') + ')', 'yearlyPrice'], ['Lifetime (' + (config.goals?.[0]?.currency || '£') + ')', 'lifetimePrice']].map(([label, key]) => (
                            <div key={key}>
                              <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                              <input type="number" min={0} value={(d as any)[key]} onChange={e => set({ [key]: parseFloat(e.target.value) || 0 } as any)} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500" />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Store discount */}
                      <div>
                        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Store Discount</p>
                        <div className="flex items-center gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">% off all store products <span className="text-gray-600">(0 = no discount)</span></label>
                            <input type="number" min={0} max={99} step={1}
                              value={d.storeDiscountPercent ?? 0}
                              onChange={e => set({ storeDiscountPercent: Math.min(99, Math.max(0, parseInt(e.target.value) || 0)) })}
                              className="w-32 px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500" />
                          </div>
                          {(d.storeDiscountPercent ?? 0) > 0 && (
                            <p className="text-xs text-purple-400 mt-5">Members on this tier get {d.storeDiscountPercent}% off at checkout</p>
                          )}
                        </div>
                      </div>

                      {/* Checkout mode */}
                      <div>
                        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Stripe Checkout</p>
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <p className="text-sm text-gray-200">Memberships now use dynamic Stripe Checkout Sessions.</p>
                          <p className="text-xs text-gray-500 mt-1">Monthly, yearly, and lifetime purchases inherit the buyer&apos;s selected currency automatically. No Stripe Payment Links are required here anymore.</p>
                        </div>
                      </div>

                      {/* Benefits */}
                      <div>
                        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Benefits</p>
                        <div className="space-y-1 mb-2">
                          {d.benefits.map((b, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/20 border border-white/5">
                              <span className="flex-1 text-sm text-gray-200">{b.icon} {b.text}</span>
                              <button onClick={() => set({ benefits: d.benefits.filter((_, j) => j !== i) })} className="text-red-400 hover:text-red-300"><X size={14} /></button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input value={newBenefit} onChange={e => setNewBenefit(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newBenefit.trim()) { set({ benefits: [...d.benefits, { icon: '✅', text: newBenefit.trim(), highlighted: false }] }); setNewBenefit(''); } }} className="flex-1 px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white text-sm focus:border-purple-500" placeholder="Add benefit (press Enter)" />
                          <button onClick={() => { if (newBenefit.trim()) { set({ benefits: [...d.benefits, { icon: '✅', text: newBenefit.trim(), highlighted: false }] }); setNewBenefit(''); } }} className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg"><Plus size={14} /></button>
                        </div>
                      </div>

                      {/* Lifetime extra benefits */}
                      <div>
                        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Lifetime-only Extras</p>
                        <div className="space-y-1 mb-2">
                          {d.lifetimeExtraBenefits.map((b, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/20 border border-white/5">
                              <span className="flex-1 text-sm text-gray-200">{b.icon} {b.text}</span>
                              <button onClick={() => set({ lifetimeExtraBenefits: d.lifetimeExtraBenefits.filter((_, j) => j !== i) })} className="text-red-400 hover:text-red-300"><X size={14} /></button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input value={newLifetimeBenefit} onChange={e => setNewLifetimeBenefit(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newLifetimeBenefit.trim()) { set({ lifetimeExtraBenefits: [...d.lifetimeExtraBenefits, { icon: '🏆', text: newLifetimeBenefit.trim(), highlighted: true }] }); setNewLifetimeBenefit(''); } }} className="flex-1 px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white text-sm focus:border-purple-500" placeholder="Add lifetime extra (press Enter)" />
                          <button onClick={() => { if (newLifetimeBenefit.trim()) { set({ lifetimeExtraBenefits: [...d.lifetimeExtraBenefits, { icon: '🏆', text: newLifetimeBenefit.trim(), highlighted: true }] }); setNewLifetimeBenefit(''); } }} className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg"><Plus size={14} /></button>
                        </div>
                      </div>

                      {/* Save */}
                      <div className="flex gap-3 pt-2">
                        <button onClick={saveTier} disabled={membershipSaving || !d.name.trim()} className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-lg font-bold transition-colors">
                          <Save size={14} /> {membershipSaving ? 'Saving...' : 'Save Tier'}
                        </button>
                        <button onClick={cancelEdit} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg transition-colors">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── POSTS TAB ── */}
            {activeTab === 'posts' && (() => {
              const posts = config.posts;
              const pd = postDraft;
              const setP = (patch: Partial<PostDraft>) => setPostDraft(prev => prev ? { ...prev, ...patch } : prev);

              const startEditPost = (post: PostDraft) => {
                setPostDraft({ ...post, tags: [...post.tags] });
                setEditingPostId(post.id);
                setNewTag('');
                setPostUploadError('');
              };
              const startAddPost = () => {
                const p = blankPost();
                setPostDraft(p);
                setEditingPostId(p.id);
                setNewTag('');
                setPostUploadError('');
              };
              const cancelPost = () => { setEditingPostId(null); setPostDraft(null); setPostUploadError(''); };

              const savePost = async () => {
                if (!pd) return;
                setPostSaving(true);
                const existing = posts.find(p => p.id === pd.id);
                const updated = existing ? posts.map(p => p.id === pd.id ? pd : p) : [...posts, pd];
                await savePosts(updated);
                setPostSaving(false);
                cancelPost();
              };

              const deletePost = async (id: string) => {
                if (!confirm('Delete this post?')) return;
                await savePosts(posts.filter(p => p.id !== id));
              };

              const addTag = () => {
                const t = newTag.trim().replace(/^#/, '');
                if (t && pd && !pd.tags.includes(t)) { setP({ tags: [...pd.tags, t] }); setNewTag(''); }
              };

              return (
                <div className="space-y-4 pb-12">
                  {!editingPostId && (
                    <>
                      <div className="flex justify-between items-center">
                        <p className="text-white font-bold">Posts ({posts.length})</p>
                        <button onClick={startAddPost} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition-colors">
                          <Plus size={14} /> New Post
                        </button>
                      </div>
                      {posts.length === 0 && <p className="text-gray-500 text-sm">No posts yet.</p>}
                      {[...posts].sort((a, b) => {
                        if (a.pinned && !b.pinned) return -1;
                        if (!a.pinned && b.pinned) return 1;
                        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
                      }).map(post => (
                        <div key={post.id} className="flex items-center justify-between p-4 rounded-xl bg-black/30 border border-white/5 gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              {post.pinned && <span className="text-cyan-400 text-xs">📌</span>}
                              <span className={`text-xs px-2 py-0.5 rounded-full ${post.visibility === 'public' ? 'bg-green-500/20 text-green-400' : post.visibility === 'tier-specific' ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'}`}>{post.visibility === 'tier-specific' ? `tiers (${(post.allowedTiers || []).length})` : post.visibility}</span>
                              <span className="text-gray-600 text-xs">{post.publishedAt}</span>
                            </div>
                            <p className="text-white font-semibold truncate">{post.title || <span className="text-gray-500 italic">Untitled</span>}</p>
                            <p className="text-gray-500 text-xs truncate">{post.excerpt}</p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => startEditPost(post)} className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors flex items-center gap-1"><Pencil size={12} /> Edit</button>
                            <button onClick={() => deletePost(post.id)} className="px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors flex items-center gap-1"><Trash2 size={12} /> Delete</button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {editingPostId && pd && (
                    <div className="space-y-5 bg-black/30 rounded-2xl border border-purple-500/20 p-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-white font-bold text-lg">{posts.find(p => p.id === pd.id) ? 'Edit Post' : 'New Post'}</h3>
                        <button onClick={cancelPost} className="text-gray-500 hover:text-white"><X size={18} /></button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="text-xs text-gray-400 mb-1 block">Title</label>
                          <input value={pd.title} onChange={e => setP({ title: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500" placeholder="Post title" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Visibility</label>
                          <select value={pd.visibility} onChange={e => {
                            const v = e.target.value as PostDraft['visibility'];
                            setP({ visibility: v, allowedTiers: v !== 'tier-specific' ? [] : pd.allowedTiers });
                          }} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500">
                            <option value="public">Public</option>
                            <option value="members">Members only</option>
                            <option value="tier-specific">Specific tiers</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Publish Date</label>
                          <input type="date" value={pd.publishedAt} onChange={e => setP({ publishedAt: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500" />
                        </div>
                        {pd.visibility === 'tier-specific' && (
                          <div className="col-span-2">
                            <label className="text-xs text-gray-400 mb-2 block uppercase tracking-wider">Which tiers can read this?</label>
                            {config.membership.tiers.length === 0 ? (
                              <p className="text-xs text-gray-500">No tiers yet — create tiers in the Membership tab first.</p>
                            ) : (
                              <div className="space-y-1">
                                {config.membership.tiers.map(tier => (
                                  <label key={tier.id} className="flex items-center gap-3 cursor-pointer select-none p-2 rounded-lg hover:bg-white/5 transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={(pd.allowedTiers || []).includes(tier.id)}
                                      onChange={e => {
                                        const next = e.target.checked
                                          ? [...(pd.allowedTiers || []), tier.id]
                                          : (pd.allowedTiers || []).filter(id => id !== tier.id);
                                        setP({ allowedTiers: next });
                                      }}
                                      className="w-4 h-4 accent-purple-500 flex-shrink-0"
                                    />
                                    <span className="text-sm text-gray-200">{tier.icon} {tier.name}</span>
                                    <span className="text-xs text-gray-500 ml-auto">{tier.monthlyPrice > 0 ? `£${tier.monthlyPrice}/mo` : 'Free'}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Excerpt (short preview)</label>
                        <input value={pd.excerpt} onChange={e => setP({ excerpt: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500" placeholder="One-line summary shown in cards" />
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Content</label>
                        <textarea value={pd.content} onChange={e => setP({ content: e.target.value })} rows={8} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-purple-500 font-mono text-sm resize-y" placeholder="Full post content..." />
                      </div>

                      {/* Cover Image */}
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block uppercase tracking-wider">Cover Image</label>
                        {pd.coverImage && (
                          <div className="relative mb-2">
                            <img src={pd.coverImage} alt="cover" className="w-full h-32 object-cover rounded-lg" />
                            <button onClick={() => setP({ coverImage: '' })} className="absolute top-2 right-2 p-1 bg-black/70 text-red-400 rounded"><X size={14} /></button>
                          </div>
                        )}
                        <label className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg cursor-pointer text-sm transition-colors w-fit">
                          <input type="file" accept="image/*" className="hidden" onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file || !pd) return;
                            setPostUploadError('');
                            setPostUploadStatus('Compressing image...');
                            const fileToUpload = await compressImage(file);
                            setPostUploadStatus('Authenticating with Firebase Storage...');
                            try {
                              const { url, path } = await uploadAsset(
                                `posts/${pd.id}/cover`,
                                fileToUpload,
                                (snapshot) => {
                                  setPostUploadStatus(`Uploading cover image: ${formatUploadProgress(snapshot.bytesTransferred, snapshot.totalBytes)}`);
                                },
                                setPostUploadStatus
                              );
                              setP({ coverImage: url });
                              setPostUploadStatus('Post cover upload completed.');
                            } catch (error) {
                              console.error('Post cover upload failed:', error);
                              setPostUploadError(getErrorMessage(error, 'Post cover upload failed. Check Firebase Storage rules and bucket settings.'));
                            } finally {
                              e.currentTarget.value = '';
                            }
                          }} />
                          📷 Upload Cover Image
                        </label>
                        {postUploadStatus && <p className="text-amber-300 text-xs mt-2">{postUploadStatus}</p>}
                        {postUploadError && <p className="text-red-400 text-xs mt-2">{postUploadError}</p>}
                      </div>

                      {/* File Attachments */}
                      <div>
                        <label className="text-xs text-gray-400 mb-2 block uppercase tracking-wider">File Attachments</label>
                        <div className="space-y-1 mb-2">
                          {(pd.attachments || []).map((att, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/20 border border-white/5">
                              <span className="text-xs font-mono text-gray-300 flex-1 truncate">{att.filename}</span>
                              <span className="text-xs text-gray-500">{att.sizeLabel}</span>
                              <button onClick={() => setP({ attachments: pd.attachments.filter((_, j) => j !== i) })} className="text-red-400 hover:text-red-300"><X size={12} /></button>
                            </div>
                          ))}
                        </div>
                        <label className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg cursor-pointer text-sm transition-colors w-fit">
                          <input type="file" className="hidden" onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file || !pd) return;
                            setPostUploadError('');
                            setPostUploadStatus('Authenticating with Firebase Storage...');
                            try {
                              const { url, path } = await uploadAsset(
                                `posts/${pd.id}/files`,
                                file,
                                (snapshot) => {
                                  setPostUploadStatus(`Uploading attachment: ${formatUploadProgress(snapshot.bytesTransferred, snapshot.totalBytes)}`);
                                },
                                setPostUploadStatus
                              );
                              const newAtt = {
                                id: 'att-' + Date.now(),
                                filename: file.name,
                                url,
                                fileType: file.name.split('.').pop() || 'file',
                                sizeLabel: (file.size / 1024 / 1024).toFixed(1) + ' MB',
                                displayLabel: file.name,
                                minimumTier: '',
                              };
                              setP({ attachments: [...(pd.attachments || []), newAtt] });
                              setPostUploadStatus('Attachment upload completed.');
                            } catch (error) {
                              console.error('Post attachment upload failed:', error);
                              setPostUploadError(getErrorMessage(error, 'Post attachment upload failed. Check Firebase Storage rules and bucket settings.'));
                            } finally {
                              e.currentTarget.value = '';
                            }
                          }} />
                          📎 Upload File (any type)
                        </label>
                        <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <p className="text-[11px] uppercase tracking-wider text-gray-400">Firebase Rules</p>
                            <button onClick={copyStorageRules} className="px-2 py-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/20 transition-colors">
                              {rulesCopied ? 'Copied!' : 'Copy Both'}
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">Enable Anonymous auth, then set these in Firebase Console:</p>
                          <p className="text-[11px] text-gray-500 uppercase tracking-wider mt-2 mb-1">Storage Rules</p>
                          <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 text-[11px] leading-relaxed text-cyan-300 whitespace-pre-wrap">{STORAGE_RULES_SNIPPET}</pre>
                          <p className="text-[11px] text-gray-500 uppercase tracking-wider mt-3 mb-1">Firestore Rules</p>
                          <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 text-[11px] leading-relaxed text-purple-300 whitespace-pre-wrap">{FIRESTORE_RULES_SNIPPET}</pre>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input type="checkbox" checked={pd.pinned} onChange={e => setP({ pinned: e.target.checked })} className="w-4 h-4 accent-purple-500" />
                          <span className="text-gray-300 text-sm">📌 Pin this post</span>
                        </label>
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 mb-2 block uppercase tracking-wider">Tags</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {pd.tags.map(tag => (
                            <span key={tag} className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs">
                              #{tag}
                              <button onClick={() => setP({ tags: pd.tags.filter(t => t !== tag) })} className="text-purple-400 hover:text-red-400 ml-0.5"><X size={10} /></button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} className="flex-1 px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white text-sm focus:border-purple-500" placeholder="Add tag (press Enter)" />
                          <button onClick={addTag} className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg"><Plus size={14} /></button>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button onClick={savePost} disabled={postSaving || !pd.title.trim()} className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-lg font-bold transition-colors">
                          <Save size={14} /> {postSaving ? 'Saving...' : 'Save Post'}
                        </button>
                        <button onClick={cancelPost} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg transition-colors">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── DONATION TAB ── */}
            {activeTab === 'donation' && (() => {
              const dd = donateDraft;
              const setD = (patch: Partial<typeof dd>) => setDonateDraft(prev => ({ ...prev, ...patch }));

              return (
                <div className="space-y-6 pb-12">
                  {/* Donor Messages */}
                  <div className="bg-black/30 rounded-xl border border-white/5 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-bold">Donor Messages</p>
                      <button onClick={loadDonorConvos} className="font-mono text-xs text-gray-500 hover:text-cyan-400 transition-colors">↻ Refresh</button>
                    </div>
                    {donorConvosLoading ? (
                      <p className="font-mono text-xs text-gray-600 text-center py-6">Loading…</p>
                    ) : donorConvos.length === 0 ? (
                      <p className="font-mono text-xs text-gray-600 text-center py-6">No donations yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {donorConvos.map(conv => {
                          const isExpanded = expandedDonorId === conv.id;
                          return (
                            <div key={conv.id} className="rounded-xl border border-white/8 bg-black/20 overflow-hidden">
                              {/* Donor summary row */}
                              <div className="flex items-center gap-3 p-3">
                                <div className="w-9 h-9 rounded-full bg-cyan-500/15 flex items-center justify-center flex-shrink-0 text-base">
                                  {conv.donorName?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-white text-sm font-bold truncate">{conv.donorName || 'Anonymous'}</span>
                                    <span className="text-cyan-400 text-xs font-mono font-bold">£{Number(conv.amountGBP || 0).toFixed(2)}</span>
                                    {conv.replied && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 font-mono">replied</span>}
                                  </div>
                                  {conv.donorEmail && <p className="text-xs text-gray-500 truncate">{conv.donorEmail}</p>}
                                  <p className="text-[11px] text-gray-600">{new Date(conv.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                </div>
                                {conv.message && (
                                  <button
                                    onClick={() => setExpandedDonorId(isExpanded ? null : conv.id)}
                                    className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-bold transition-colors"
                                  >
                                    {isExpanded ? 'Close' : 'Reply'}
                                  </button>
                                )}
                              </div>
                              {/* Message + reply area */}
                              {isExpanded && (
                                <div className="border-t border-white/5 p-3 space-y-3">
                                  {conv.message && (
                                    <div className="rounded-lg bg-white/5 border border-white/8 px-3 py-2 text-sm text-gray-300 italic">
                                      "{conv.message}"
                                    </div>
                                  )}
                                  <div className="space-y-2">
                                    <textarea
                                      value={donorReplyText[conv.id] || ''}
                                      onChange={e => setDonorReplyText(prev => ({ ...prev, [conv.id]: e.target.value }))}
                                      rows={3}
                                      placeholder="Write a reply… (will be emailed to the donor)"
                                      className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white text-sm focus:border-cyan-500 resize-none placeholder-gray-600"
                                    />
                                    <button
                                      onClick={() => sendDonorReply(conv.id)}
                                      disabled={donorReplying === conv.id || !donorReplyText[conv.id]?.trim()}
                                      className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-lg text-sm font-bold transition-colors"
                                    >
                                      <Send size={13} /> {donorReplying === conv.id ? 'Sending…' : 'Send Reply'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Donate page header editor */}
                  <div className="bg-black/30 rounded-xl border border-white/5 p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Donate Page Header</p>
                    <div className="space-y-2 mb-3">
                      <input
                        value={donatePageDraft.headline}
                        onChange={e => setDonatePageDraft(p => ({ ...p, headline: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-cyan-500"
                        placeholder="Page headline"
                      />
                      <textarea
                        value={donatePageDraft.subheading}
                        onChange={e => setDonatePageDraft(p => ({ ...p, subheading: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-cyan-500 resize-none"
                        placeholder="Subheading"
                      />
                    </div>
                    <button
                      onClick={async () => { setPageContentSaving(true); await savePageContent('donatePage', donatePageDraft); setPageContentSaving(false); }}
                      disabled={pageContentSaving}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-lg text-sm font-bold transition-colors"
                    >
                      <Save size={13} /> {pageContentSaving ? 'Saving…' : 'Save Header'}
                    </button>
                  </div>

                  {/* Donation panel settings */}
                  <div className="bg-black/30 rounded-xl border border-white/5 p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-white font-bold">Donation Panel Settings</p>
                      <button
                        onClick={async () => { setDonateSaving(true); await saveDonation(donateDraft); setDonateSaving(false); }}
                        disabled={donateSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-lg text-sm font-bold transition-colors"
                      >
                        <Save size={13} /> {donateSaving ? 'Saving…' : 'Save Changes'}
                      </button>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Heading</label>
                      <input value={dd.heading} onChange={e => setD({ heading: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-cyan-500" placeholder="Buy Me a Coffee ☕" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Subheading</label>
                      <input value={dd.subheading} onChange={e => setD({ subheading: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-cyan-500" placeholder="No pressure. Every bit helps keep this going." />
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Stripe Checkout</p>
                      <p className="text-sm text-gray-200 mt-2">Donations now use dynamic Stripe Checkout Sessions.</p>
                      <p className="text-xs text-gray-500 mt-1">Supporters will be charged in the currency they pick on the site, so there is no single Stripe URL to paste here anymore.</p>
                    </div>

                    {/* Preset amounts */}
                    <div>
                      <label className="text-xs text-gray-400 mb-2 block uppercase tracking-wider">Preset Amounts</label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {dd.presetAmounts.map((amt, i) => (
                          <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-sm font-mono">
                            £{amt}
                            <button onClick={() => setD({ presetAmounts: dd.presetAmounts.filter((_, j) => j !== i) })} className="text-cyan-500 hover:text-red-400 ml-0.5"><X size={12} /></button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={1}
                          value={newPresetAmount}
                          onChange={e => setNewPresetAmount(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const n = parseFloat(newPresetAmount);
                              if (n > 0) { setD({ presetAmounts: [...dd.presetAmounts, n].sort((a, b) => a - b) }); setNewPresetAmount(''); }
                            }
                          }}
                          className="w-32 px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-cyan-500"
                          placeholder="Amount"
                        />
                        <button
                          onClick={() => {
                            const n = parseFloat(newPresetAmount);
                            if (n > 0) { setD({ presetAmounts: [...dd.presetAmounts, n].sort((a, b) => a - b) }); setNewPresetAmount(''); }
                          }}
                          className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {activeTab === 'permissions' && isOwner && (
              <div className="space-y-6 pb-12">
                <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Shield size={18} className="text-yellow-400" /> Default Admin Access
                  </h3>
                  <p className="text-sm text-gray-400 mt-2">
                    These defaults are applied when you approve or promote a new admin. Existing admins can be adjusted below.
                  </p>
                  <div className="grid md:grid-cols-2 gap-3 mt-4">
                    {permissionOrder.map(permission => (
                      <label key={permission} className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={defaultAdminPermsDraft[permission]}
                          onChange={() => setDefaultAdminPermsDraft(prev => togglePermission(prev, permission))}
                          className="mt-0.5 w-4 h-4 accent-yellow-500"
                        />
                        <span>
                          <span className="block text-sm text-white">{permissionLabels[permission].title}</span>
                          <span className="block text-xs text-gray-500">{permissionLabels[permission].description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={async () => {
                      setPermsSaving(true);
                      try {
                        await saveAdminPermissions(defaultAdminPermsDraft);
                      } finally {
                        setPermsSaving(false);
                      }
                    }}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-bold transition-colors disabled:opacity-50"
                    disabled={permsSaving}
                  >
                    <Save size={13} /> {permsSaving ? 'Saving...' : 'Save Default Permissions'}
                  </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <h3 className="text-lg font-bold text-white">Admin Overrides</h3>
                  <p className="text-sm text-gray-400 mt-2">
                    Use this to decide exactly what each admin can access in the portal.
                  </p>
                  <div className="mt-4 space-y-4">
                    {appUsers.filter(user => user.role === 'admin').length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No admins yet. Approve a request as admin first.</p>
                    ) : (
                      appUsers.filter(user => user.role === 'admin').map(user => {
                        const userPermissions = user.adminPermissions ?? config.adminPermissions;
                        return (
                          <div key={user.discordId} className="rounded-xl border border-white/10 bg-black/30 p-4">
                            <div className="flex items-center gap-3 mb-4">
                              {user.avatar
                                ? <img src={buildAvatarUrl(user.discordId, user.avatar)!} alt={user.username} className="w-10 h-10 rounded-full border border-white/10" />
                                : <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">{user.username[0].toUpperCase()}</div>}
                              <div>
                                <p className="text-white font-bold">{user.username}</p>
                                <p className="text-xs text-gray-500">{user.discordId}</p>
                              </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-2">
                              {permissionOrder.map(permission => (
                                <label key={permission} className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={userPermissions[permission]}
                                    onChange={() => updateAdminPermissions(user.discordId, togglePermission(userPermissions, permission))}
                                    className="mt-0.5 w-4 h-4 accent-yellow-500"
                                  />
                                  <span>
                                    <span className="block text-sm text-white">{permissionLabels[permission].title}</span>
                                    <span className="block text-xs text-gray-500">{permissionLabels[permission].description}</span>
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                  <h3 className="text-lg font-bold text-white">Danger Zone</h3>
                  <p className="text-sm text-gray-400 mt-2">
                    This removes all non-owner Team Portal members and clears every pending or previous join request.
                  </p>
                  {purgeStatus && <p className="mt-4 text-sm text-emerald-400">{purgeStatus}</p>}
                  {purgeError && <p className="mt-4 text-sm text-red-400">{purgeError}</p>}
                  <button
                    onClick={() => { void purgeTeamMembers(); }}
                    disabled={purgeLoading}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-2 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/25 disabled:opacity-50"
                  >
                    <Trash2 size={14} /> {purgeLoading ? 'Purging Team Members...' : 'Remove All Team Members'}
                  </button>
                </div>
              </div>
            )}

            {/* ── STORE TAB ── */}
            {activeTab === 'store' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-orbitron font-bold text-lg text-white">Store Manager</h3>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={storeData.enabled} onChange={e => setStoreData(s => ({ ...s, enabled: e.target.checked }))} className="w-4 h-4 accent-cyan-500" />
                    <span className="text-gray-300 text-sm">Store enabled</span>
                  </label>
                </div>

                {/* Page content */}
                <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Store Page Headlines</p>
                  <input value={storeData.storePage.headline} onChange={e => setStoreData(s => ({ ...s, storePage: { ...s.storePage, headline: e.target.value } }))} placeholder="Page headline" className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-cyan-500" />
                  <input value={storeData.storePage.subheading} onChange={e => setStoreData(s => ({ ...s, storePage: { ...s.storePage, subheading: e.target.value } }))} placeholder="Page subheading" className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-cyan-500" />
                  <input value={storeData.heading} onChange={e => setStoreData(s => ({ ...s, heading: e.target.value }))} placeholder="Section heading (e.g. Shop)" className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-cyan-500" />
                  <input value={storeData.subheading} onChange={e => setStoreData(s => ({ ...s, subheading: e.target.value }))} placeholder="Section subheading" className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-cyan-500" />
                  <button onClick={() => saveStore(storeData)} className="px-4 py-2 rounded-lg font-orbitron text-xs font-bold tracking-widest uppercase transition-all" style={{ background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.4)', color: '#00d4ff' }}>
                    <Save size={12} className="inline mr-1.5" />Save Headlines
                  </button>
                </div>

                {/* Discounts */}
                <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Discounts</p>
                  <p className="text-xs text-gray-400">Membership discounts are set per tier in the <span className="text-purple-400">Membership</span> tab — each tier can have its own store discount %. The best discount across all of a buyer's active tiers is applied at checkout.</p>
                  <p className="text-xs text-gray-500 mt-1">Coupon codes: create them in <span className="text-cyan-500">Stripe Dashboard → Coupons</span>. Buyers can enter them on the Stripe checkout page automatically.</p>
                  <button onClick={() => saveStore(storeData)} className="px-4 py-2 rounded-lg font-orbitron text-xs font-bold tracking-widest uppercase transition-all" style={{ background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.4)', color: '#00d4ff' }}>
                    <Save size={12} className="inline mr-1.5" />Save Discount Settings
                  </button>
                </div>

                {/* Product editor or list */}
                {editingProduct ? (
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <div>
                        <p className="font-orbitron font-bold text-base text-white">{editingProduct.id.startsWith('prod-new') ? '+ New Product' : 'Edit Product'}</p>
                        {!editingProduct.id.startsWith('prod-new') && <p className="font-mono text-xs text-gray-600 mt-0.5">{editingProduct.id}</p>}
                      </div>
                      <button onClick={() => { setEditingProduct(null); setStoreUploadError(''); setStoreUploadSuccess(''); setStoreUploadStatus(''); }} className="text-gray-500 hover:text-white p-1"><X size={16} /></button>
                    </div>

                    {/* Upload status bar */}
                    {(storeUploadStatus || storeUploadError || storeUploadSuccess) && (
                      <div className="px-3 py-2 rounded-lg font-mono text-xs" style={{ background: storeUploadError ? 'rgba(239,68,68,0.1)' : storeUploadSuccess ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${storeUploadError ? 'rgba(239,68,68,0.3)' : storeUploadSuccess ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`, color: storeUploadError ? '#f87171' : storeUploadSuccess ? '#4ade80' : '#fbbf24' }}>
                        {storeUploadError || storeUploadSuccess || storeUploadStatus}
                      </div>
                    )}

                    {/* ── SECTION 1: BASICS ── */}
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,212,255,0.2)' }}>
                      <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'rgba(0,212,255,0.08)', borderBottom: '1px solid rgba(0,212,255,0.15)' }}>
                        <span className="font-orbitron font-black text-xs" style={{ color: '#00d4ff' }}>01</span>
                        <p className="font-orbitron font-bold text-xs tracking-widest text-white uppercase">Basics</p>
                        <p className="font-mono text-xs text-gray-600 ml-auto">Name · Description · Category · Status</p>
                      </div>
                      <div className="p-4 space-y-3" style={{ background: 'rgba(0,0,0,0.25)' }}>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Product Name</label>
                          <input value={editingProduct.name} onChange={e => setP({ name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-cyan-500 text-sm" placeholder="e.g. Mecha Overdrive Art Pack" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Description</label>
                          <textarea value={editingProduct.description} onChange={e => setP({ description: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-cyan-500 resize-none text-sm" placeholder="Short product description" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">Type</label>
                            <select value={editingProduct.type} onChange={e => setP({ type: e.target.value as 'digital' | 'physical' })} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-cyan-500 text-sm">
                              <option value="digital">Digital</option>
                              <option value="physical">Physical</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">Category</label>
                            <select value={editingProduct.category} onChange={e => setP({ category: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-cyan-500 text-sm">
                              <option value="">— None —</option>
                              {storeData.categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Tags <span className="text-gray-600">(comma separated)</span></label>
                          <input value={editingProduct.tags.join(', ')} onChange={e => setP({ tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-cyan-500 font-mono text-xs" placeholder="game-asset, art, download" />
                        </div>
                        <div className="flex gap-6 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={editingProduct.enabled} onChange={e => setP({ enabled: e.target.checked })} className="w-4 h-4 accent-cyan-500" />
                            <span className="text-sm text-gray-300">Enabled</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={editingProduct.featured} onChange={e => setP({ featured: e.target.checked })} className="w-4 h-4 accent-yellow-500" />
                            <span className="text-sm text-gray-300">Featured <span className="text-gray-600 text-xs">(shown on homepage)</span></span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* ── SECTION 2: PRICING ── */}
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(251,191,36,0.25)' }}>
                      <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'rgba(251,191,36,0.08)', borderBottom: '1px solid rgba(251,191,36,0.15)' }}>
                        <span className="font-orbitron font-black text-xs" style={{ color: '#fbbf24' }}>02</span>
                        <p className="font-orbitron font-bold text-xs tracking-widest text-white uppercase">Pricing</p>
                        <p className="font-mono text-xs text-gray-600 ml-auto">Price · Sale · Stock</p>
                      </div>
                      <div className="p-4 grid grid-cols-3 gap-3" style={{ background: 'rgba(0,0,0,0.25)' }}>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Price ({(config.goals?.[0]?.currency || '£')})</label>
                          <input type="number" min={0} step={0.01} value={editingProduct.price} onChange={e => setP({ price: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-yellow-500 text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Sale % off <span className="text-gray-600">(0 = no sale)</span></label>
                          <input type="number" min={0} max={99} step={1} value={editingProduct.salePercent ?? 0} onChange={e => setP({ salePercent: Math.min(99, Math.max(0, parseInt(e.target.value) || 0)) })} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-yellow-500 text-sm" placeholder="e.g. 20 for 20% off" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Stock <span className="text-gray-600">(blank = ∞)</span></label>
                          <input type="number" min={0} value={editingProduct.stock ?? ''} onChange={e => setP({ stock: e.target.value === '' ? null : parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-yellow-500 text-sm" placeholder="∞" />
                        </div>
                      </div>
                    </div>

                    {/* ── SECTION 3: IMAGES ── */}
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(168,85,247,0.25)' }}>
                      <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'rgba(168,85,247,0.08)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
                        <span className="font-orbitron font-black text-xs" style={{ color: '#a855f7' }}>03</span>
                        <p className="font-orbitron font-bold text-xs tracking-widest text-white uppercase">Images</p>
                        <p className="font-mono text-xs text-gray-600 ml-auto">Cover photo + all angles</p>
                      </div>
                      <div className="p-4 space-y-4" style={{ background: 'rgba(0,0,0,0.25)' }}>
                        {/* Cover */}
                        <div>
                          <p className="text-xs text-gray-400 mb-2 font-orbitron tracking-wider">COVER IMAGE <span className="text-gray-600 font-mono normal-case tracking-normal">(main product photo)</span></p>
                          <div className="flex items-start gap-3">
                            <label className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg cursor-pointer text-xs transition-colors shrink-0">
                              <input type="file" accept="image/*" className="hidden" onChange={async e => {
                                const file = e.target.files?.[0]; if (!file) return;
                                setStoreUploadError(''); setStoreUploadSuccess('');
                                setStoreUploadStatus(`Compressing ${file.name}...`);
                                try {
                                  const compressed = await compressImage(file);
                                  const { url } = await uploadAsset(`store/${editingProduct.id}/cover`, compressed,
                                    (snap) => setStoreUploadStatus(`Uploading cover: ${formatUploadProgress(snap.bytesTransferred, snap.totalBytes)}`),
                                    (s) => setStoreUploadStatus(s)
                                  );
                                  setP({ coverImage: url });
                                  setStoreUploadSuccess('Cover image uploaded.');
                                } catch (err) { setStoreUploadError(getErrorMessage(err, 'Cover upload failed.')); }
                                finally { e.currentTarget.value = ''; }
                              }} />
                              Upload Cover
                            </label>
                            {editingProduct.coverImage && <img src={editingProduct.coverImage} className="h-16 w-20 object-cover rounded-lg border border-white/10" alt="cover" />}
                          </div>
                        </div>
                        {/* Gallery */}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                          <p className="text-xs text-gray-400 mb-2 font-orbitron tracking-wider">GALLERY <span className="text-gray-600 font-mono normal-case tracking-normal">(extra angles — select multiple files at once)</span></p>
                          <label className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg cursor-pointer text-xs transition-colors w-fit mb-3">
                            <input type="file" accept="image/*" multiple className="hidden" onChange={async e => {
                              const files = Array.from(e.target.files || []); if (!files.length) return;
                              setStoreUploadError(''); setStoreUploadSuccess('');
                              for (const file of files) {
                                try {
                                  setStoreUploadStatus(`Compressing ${file.name}...`);
                                  const compressed = await compressImage(file);
                                  const { url } = await uploadAsset(`store/${editingProduct.id}/gallery`, compressed,
                                    (snap) => setStoreUploadStatus(`Uploading ${file.name}: ${formatUploadProgress(snap.bytesTransferred, snap.totalBytes)}`),
                                    (s) => setStoreUploadStatus(s)
                                  );
                                  setP({ galleryImages: [...(editingProduct.galleryImages || []), url] });
                                } catch (err) { setStoreUploadError(getErrorMessage(err, 'Gallery upload failed.')); }
                              }
                              setStoreUploadSuccess('Gallery images uploaded.');
                              e.currentTarget.value = '';
                            }} />
                            Upload Gallery Images
                          </label>
                          {(editingProduct.galleryImages || []).length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {editingProduct.galleryImages!.map((img, idx) => (
                                <div key={img} className="relative group">
                                  <img src={img} className="h-16 w-16 object-cover rounded-lg border border-white/10" alt={`${idx + 1}`} />
                                  <span className="absolute bottom-0 left-0 right-0 text-center font-mono text-[9px] text-gray-400 bg-black/60 rounded-b-lg">{idx + 1}</span>
                                  <button onClick={() => setP({ galleryImages: editingProduct.galleryImages!.filter((_, j) => j !== idx) })}
                                    className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="font-mono text-xs text-gray-700">No gallery images yet.</p>
                          )}
                        </div>
                        {/* Firebase rules tip */}
                        <div className="rounded-lg border border-white/8 bg-black/20 p-3">
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <p className="text-[11px] uppercase tracking-wider text-gray-500">Firebase Rules needed for uploads</p>
                            <button onClick={copyStorageRules} className="px-2 py-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/20 transition-colors">{rulesCopied ? 'Copied!' : 'Copy Both'}</button>
                          </div>
                          <pre className="overflow-x-auto rounded bg-black/40 p-2 text-[10px] leading-relaxed text-cyan-300 whitespace-pre-wrap">{STORAGE_RULES_SNIPPET}</pre>
                          <pre className="overflow-x-auto rounded bg-black/40 p-2 text-[10px] leading-relaxed text-purple-300 whitespace-pre-wrap mt-2">{FIRESTORE_RULES_SNIPPET}</pre>
                        </div>
                      </div>
                    </div>

                    {/* ── SECTION 4: COLOURS ── */}
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(236,72,153,0.25)' }}>
                      <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'rgba(236,72,153,0.08)', borderBottom: '1px solid rgba(236,72,153,0.15)' }}>
                        <span className="font-orbitron font-black text-xs" style={{ color: '#ec4899' }}>04</span>
                        <p className="font-orbitron font-bold text-xs tracking-widest text-white uppercase">Colours</p>
                        <p className="font-mono text-xs text-gray-600 ml-auto">Link each colour to a gallery photo</p>
                      </div>
                      <div className="p-4 space-y-2" style={{ background: 'rgba(0,0,0,0.25)' }}>
                        {(editingProduct.colorOptions || []).length === 0 && (
                          <p className="font-mono text-xs text-gray-600">No colours added. Click + Add Colour below.</p>
                        )}
                        {(editingProduct.colorOptions || []).map((color, ci) => {
                          const allImages = [editingProduct.coverImage, ...(editingProduct.galleryImages || [])].filter(Boolean);
                          return (
                            <div key={color.id} className="rounded-lg p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                              <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-full flex-shrink-0 border-2 border-white/20" style={{ backgroundColor: color.hex }} />
                                <input value={color.label}
                                  onChange={e => setP({ colorOptions: editingProduct.colorOptions!.map((c,i) => i===ci ? {...c, label: e.target.value} : c) })}
                                  placeholder="Colour name (e.g. Crimson Red)"
                                  className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white text-sm outline-none focus:border-pink-500" />
                                <div className="flex items-center gap-1 shrink-0">
                                  <label className="text-xs text-gray-600 font-mono">hex</label>
                                  <input type="color" value={color.hex}
                                    onChange={e => setP({ colorOptions: editingProduct.colorOptions!.map((c,i) => i===ci ? {...c, hex: e.target.value} : c) })}
                                    className="w-9 h-9 rounded-lg cursor-pointer border border-white/20 outline-none p-0.5 bg-transparent" title="Pick colour" />
                                </div>
                                <button onClick={() => setP({ colorOptions: editingProduct.colorOptions!.filter((_,i) => i !== ci) })}
                                  className="text-gray-600 hover:text-red-400 shrink-0 p-1"><X size={14} /></button>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-gray-600 font-mono shrink-0">→ shows image:</p>
                                <select value={color.imageUrl || ''}
                                  onChange={e => setP({ colorOptions: editingProduct.colorOptions!.map((c,i) => i===ci ? {...c, imageUrl: e.target.value || undefined} : c) })}
                                  className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-black/50 border border-white/10 text-gray-300 text-xs outline-none focus:border-pink-500">
                                  <option value="">None (use cover)</option>
                                  {allImages.map((img, idx) => (
                                    <option key={img} value={img}>Image {idx + 1}{idx === 0 ? ' — Cover' : ''}</option>
                                  ))}
                                </select>
                                {color.imageUrl && <img src={color.imageUrl} className="h-8 w-8 object-cover rounded-lg shrink-0 border border-white/10" alt="" />}
                              </div>
                            </div>
                          );
                        })}
                        <button onClick={() => setP({ colorOptions: [...(editingProduct.colorOptions || []), { id: `col-${Date.now()}`, label: '', hex: '#ffffff' }] })}
                          className="flex items-center gap-1.5 text-xs font-mono transition-colors mt-1" style={{ color: '#ec4899' }}>
                          <Plus size={12} /> Add Colour
                        </button>
                      </div>
                    </div>

                    {/* ── SECTION 5: VARIANTS ── */}
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(245,158,11,0.25)' }}>
                      <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid rgba(245,158,11,0.15)' }}>
                        <span className="font-orbitron font-black text-xs" style={{ color: '#f59e0b' }}>05</span>
                        <p className="font-orbitron font-bold text-xs tracking-widest text-white uppercase">Variants</p>
                        <p className="font-mono text-xs text-gray-600 ml-auto">Type options · Size options</p>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3" style={{ background: 'rgba(0,0,0,0.25)' }}>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block font-orbitron tracking-wider">TYPE OPTIONS <span className="text-gray-600 font-mono normal-case tracking-normal text-[10px]">comma separated, leave blank to hide</span></label>
                          <input value={(editingProduct.typeOptions || []).join(', ')}
                            onChange={e => setP({ typeOptions: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                            placeholder="e.g. Refill, With Spool"
                            className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-amber-500 font-mono text-xs" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block font-orbitron tracking-wider">SIZE OPTIONS <span className="text-gray-600 font-mono normal-case tracking-normal text-[10px]">comma separated, leave blank to hide</span></label>
                          <input value={(editingProduct.sizeOptions || []).join(', ')}
                            onChange={e => setP({ sizeOptions: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                            placeholder="e.g. Small, Medium, Large"
                            className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-amber-500 font-mono text-xs" />
                        </div>
                      </div>
                    </div>

                    {/* ── SECTION 6: PERSONALIZATION ── */}
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(34,197,94,0.25)' }}>
                      <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'rgba(34,197,94,0.08)', borderBottom: '1px solid rgba(34,197,94,0.15)' }}>
                        <span className="font-orbitron font-black text-xs" style={{ color: '#22c55e' }}>06</span>
                        <p className="font-orbitron font-bold text-xs tracking-widest text-white uppercase">Personalization</p>
                        <p className="font-mono text-xs text-gray-600 ml-auto">Custom questions for the buyer</p>
                      </div>
                      <div className="p-4 space-y-2" style={{ background: 'rgba(0,0,0,0.25)' }}>
                        <p className="font-mono text-xs text-gray-600 mb-3">Ask buyers questions before checkout — e.g. "What name should we print?" or "Pick a style".</p>
                        {(editingProduct.customFields || []).map((field, fi) => (
                          <div key={field.id} className="rounded-lg p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div className="flex items-center gap-2">
                              <input value={field.label} onChange={e => setP({ customFields: (editingProduct.customFields||[]).map((f,i) => i===fi ? {...f, label: e.target.value} : f) })}
                                placeholder="Question text (e.g. What is your name?)"
                                className="flex-1 px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 outline-none text-white text-sm font-mono focus:border-green-500" />
                              <select value={field.type} onChange={e => setP({ customFields: (editingProduct.customFields||[]).map((f,i) => i===fi ? {...f, type: e.target.value as 'text'|'select'|'color-picker', options: e.target.value==='text'||e.target.value==='color-picker' ? undefined : f.options} : f) })}
                                className="px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 outline-none text-white text-xs focus:border-green-500">
                                <option value="text">Text input</option>
                                <option value="select">Dropdown</option>
                                <option value="color-picker">Colour picker</option>
                              </select>
                              <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer shrink-0">
                                <input type="checkbox" checked={field.required} onChange={e => setP({ customFields: (editingProduct.customFields||[]).map((f,i) => i===fi ? {...f, required: e.target.checked} : f) })} className="accent-green-500" />
                                Required
                              </label>
                              <button onClick={() => setP({ customFields: (editingProduct.customFields||[]).filter((_,i) => i!==fi) })} className="text-gray-600 hover:text-red-400 p-1"><X size={14} /></button>
                            </div>
                            {field.type === 'select' && (
                              <input value={(field.options||[]).join(', ')} onChange={e => setP({ customFields: (editingProduct.customFields||[]).map((f,i) => i===fi ? {...f, options: e.target.value.split(',').map(o=>o.trim()).filter(Boolean)} : f) })}
                                placeholder="Dropdown options (comma separated, e.g. Matte, Glossy, Satin)"
                                className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 outline-none text-white text-xs font-mono focus:border-green-500" />
                            )}
                            {field.type === 'color-picker' && (
                              <div className="space-y-2">
                                <p className="text-xs text-gray-500 font-mono">Your available colours — buyers will click a swatch to choose:</p>
                                {(field.colorSwatches||[]).map((swatch, si) => (
                                  <div key={si} className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full flex-shrink-0 border border-white/20" style={{ backgroundColor: swatch.hex }} />
                                    <input value={swatch.name} onChange={e => setP({ customFields: (editingProduct.customFields||[]).map((f,i) => i===fi ? {...f, colorSwatches: (f.colorSwatches||[]).map((s,j) => j===si ? {...s, name: e.target.value} : s)} : f) })}
                                      placeholder="Colour name (e.g. Cherry Red)"
                                      className="flex-1 px-2 py-1 rounded-lg bg-black/50 border border-white/10 text-white text-xs font-mono outline-none focus:border-green-500" />
                                    <input type="color" value={swatch.hex} onChange={e => setP({ customFields: (editingProduct.customFields||[]).map((f,i) => i===fi ? {...f, colorSwatches: (f.colorSwatches||[]).map((s,j) => j===si ? {...s, hex: e.target.value} : s)} : f) })}
                                      className="w-8 h-8 rounded-lg cursor-pointer border border-white/20 bg-transparent p-0.5 flex-shrink-0" />
                                    <button onClick={() => setP({ customFields: (editingProduct.customFields||[]).map((f,i) => i===fi ? {...f, colorSwatches: (f.colorSwatches||[]).filter((_,j) => j!==si)} : f) })}
                                      className="text-gray-600 hover:text-red-400 flex-shrink-0"><X size={12} /></button>
                                  </div>
                                ))}
                                <button onClick={() => setP({ customFields: (editingProduct.customFields||[]).map((f,i) => i===fi ? {...f, colorSwatches: [...(f.colorSwatches||[]), { name: '', hex: '#ffffff' }]} : f) })}
                                  className="text-xs font-mono text-green-400 hover:text-green-300 flex items-center gap-1">
                                  <Plus size={10} /> Add Colour
                                </button>
                              </div>
                            )}
                            {field.type !== 'color-picker' && (
                              <input value={field.placeholder||''} onChange={e => setP({ customFields: (editingProduct.customFields||[]).map((f,i) => i===fi ? {...f, placeholder: e.target.value} : f) })}
                                placeholder="Placeholder hint for buyer (optional)"
                                className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 outline-none text-gray-400 text-xs font-mono focus:border-green-500" />
                            )}
                          </div>
                        ))}
                        <button onClick={() => setP({ customFields: [...(editingProduct.customFields||[]), { id: `cf-${Date.now()}`, label: '', type: 'text', required: false, placeholder: '' }] })}
                          className="flex items-center gap-1.5 text-xs font-mono transition-colors" style={{ color: '#22c55e' }}>
                          <Plus size={12} /> Add Question
                        </button>
                      </div>
                    </div>

                    {/* ── SECTION 7: DELIVERY ── */}
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(99,102,241,0.25)' }}>
                      <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'rgba(99,102,241,0.08)', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
                        <span className="font-orbitron font-black text-xs" style={{ color: '#818cf8' }}>07</span>
                        <p className="font-orbitron font-bold text-xs tracking-widest text-white uppercase">Delivery</p>
                        <p className="font-mono text-xs text-gray-600 ml-auto">{editingProduct.type === 'digital' ? 'Digital file upload' : 'Shipping restrictions'}</p>
                      </div>
                      <div className="p-4 space-y-3" style={{ background: 'rgba(0,0,0,0.25)' }}>
                        {editingProduct.type === 'digital' ? (
                          <>
                            <div className="rounded-lg p-3 font-mono text-xs text-gray-500 space-y-1" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                              <p className="text-indigo-300 font-bold">How digital delivery works</p>
                              <p>Upload your file below. After a successful Stripe purchase, the buyer is automatically redirected to a secure download page — no manual steps needed.</p>
                            </div>
                            <label className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg cursor-pointer text-sm transition-colors w-fit">
                              <input type="file" className="hidden" onChange={async e => {
                                const file = e.target.files?.[0]; if (!file) return;
                                setStoreUploadError(''); setStoreUploadSuccess('');
                                setStoreUploadStatus(`Uploading ${file.name}...`);
                                try {
                                  const { url, path } = await uploadAsset(`store/${editingProduct.id}/digital`, file,
                                    (snap) => setStoreUploadStatus(`Uploading ${file.name}: ${formatUploadProgress(snap.bytesTransferred, snap.totalBytes)}`),
                                    (s) => setStoreUploadStatus(`${s} ${file.name}`.trim())
                                  );
                                  setP({ digitalFileUrl: url, digitalFilePath: path, digitalFileName: file.name });
                                  setStoreUploadSuccess(`File uploaded: ${file.name}`);
                                } catch (err) {
                                  setStoreUploadError(getErrorMessage(err, 'Digital file upload failed.'));
                                } finally { e.currentTarget.value = ''; }
                              }} />
                              Upload Digital File
                            </label>
                            {editingProduct.digitalFileName && (
                              <div className="flex items-center gap-3">
                                <p className="font-mono text-xs text-cyan-300">📎 {editingProduct.digitalFileName}</p>
                                {editingProduct.digitalFileUrl && (
                                  <a href={editingProduct.digitalFileUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-indigo-400 hover:text-indigo-300 underline">Test Download</a>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="grid gap-3 md:grid-cols-2">
                              <button
                                onClick={() => setP({ shippingCountryMode: 'all-except-blocked' })}
                                className="rounded-lg px-3 py-2 text-left transition-colors"
                                style={editingProduct.shippingCountryMode !== 'only-selected'
                                  ? { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5' }
                                  : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}
                              >
                                <p className="font-orbitron text-xs font-bold tracking-widest uppercase">Block Selected Countries</p>
                                <p className="mt-1 font-mono text-[11px]">Ship worldwide except the countries you add below.</p>
                              </button>
                              <button
                                onClick={() => setP({ shippingCountryMode: 'only-selected' })}
                                className="rounded-lg px-3 py-2 text-left transition-colors"
                                style={editingProduct.shippingCountryMode === 'only-selected'
                                  ? { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', color: '#86efac' }
                                  : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}
                              >
                                <p className="font-orbitron text-xs font-bold tracking-widest uppercase">Only Ship To Selected Countries</p>
                                <p className="mt-1 font-mono text-[11px]">Pick the countries you do ship to instead of blocking them one by one.</p>
                              </button>
                            </div>
                            <p className="font-mono text-xs text-gray-500">
                              {editingProduct.shippingCountryMode === 'only-selected'
                                ? 'Customers outside your selected shipping countries will see "Not available in your region" and cannot purchase.'
                                : 'Customers in blocked countries will see "Not available in your region" and cannot purchase.'}
                            </p>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {(editingProduct.shippingCountryMode === 'only-selected'
                                ? (editingProduct.allowedCountries || [])
                                : editingProduct.blockedCountries
                              ).map(code => {
                                const c = COUNTRIES.find(x => x.code === code);
                                return (
                                  <span
                                    key={code}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono"
                                    style={editingProduct.shippingCountryMode === 'only-selected'
                                      ? { background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }
                                      : { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
                                  >
                                    {c?.name || code}
                                    <button
                                      onClick={() => setP(editingProduct.shippingCountryMode === 'only-selected'
                                        ? { allowedCountries: (editingProduct.allowedCountries || []).filter(x => x !== code) }
                                        : { blockedCountries: editingProduct.blockedCountries.filter(x => x !== code) })}
                                      className="hover:text-white"
                                    >
                                      <X size={10} />
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-mono text-gray-600">
                              <span>
                                {editingProduct.shippingCountryMode === 'only-selected'
                                  ? `${(editingProduct.allowedCountries || []).length} shipping countr${(editingProduct.allowedCountries || []).length === 1 ? 'y' : 'ies'} selected`
                                  : `${editingProduct.blockedCountries.length} blocked countr${editingProduct.blockedCountries.length === 1 ? 'y' : 'ies'}`}
                              </span>
                              <button
                                onClick={() => setP(editingProduct.shippingCountryMode === 'only-selected'
                                  ? { allowedCountries: [] }
                                  : { blockedCountries: [] })}
                                className="transition-colors hover:text-white"
                              >
                                Clear List
                              </button>
                            </div>
                            <div className="relative">
                              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                              <input value={countrySearch} onChange={e => setCountrySearch(e.target.value)} placeholder={editingProduct.shippingCountryMode === 'only-selected' ? 'Search country to allow...' : 'Search country to block...'}
                                className="w-full pl-8 pr-4 py-2 rounded-lg bg-black/50 border border-white/10 outline-none text-white focus:border-red-500/50 text-xs font-mono" />
                            </div>
                            {countrySearch && (
                              <div className="max-h-36 overflow-y-auto rounded-lg border border-white/10 bg-black/80">
                                {COUNTRIES.filter(c => {
                                  const matches = c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.toLowerCase().includes(countrySearch.toLowerCase());
                                  const selected = editingProduct.shippingCountryMode === 'only-selected'
                                    ? (editingProduct.allowedCountries || []).includes(c.code)
                                    : editingProduct.blockedCountries.includes(c.code);
                                  return matches && !selected;
                                }).slice(0, 10).map(c => (
                                  <button key={c.code} onClick={() => {
                                    setP(editingProduct.shippingCountryMode === 'only-selected'
                                      ? { allowedCountries: [...(editingProduct.allowedCountries || []), c.code] }
                                      : { blockedCountries: [...editingProduct.blockedCountries, c.code] });
                                    setCountrySearch('');
                                  }}
                                    className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/5 font-mono flex items-center justify-between">
                                    <span>{c.name}</span><span className="text-gray-600">{c.code}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Save / Cancel */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => {
                          const existing = storeData.products.findIndex(p => p.id === editingProduct.id);
                          let updatedProducts: StoreProduct[];
                          if (existing >= 0) updatedProducts = storeData.products.map(p => p.id === editingProduct.id ? editingProduct : p);
                          else updatedProducts = [...storeData.products, editingProduct];
                          const updated = { ...storeData, products: updatedProducts };
                          setStoreData(updated);
                          saveStore(updated);
                          setEditingProduct(null);
                          setStoreUploadError(''); setStoreUploadSuccess(''); setStoreUploadStatus('');
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-3 font-orbitron font-bold text-xs tracking-widest uppercase transition-all hover:scale-[1.02]"
                        style={{ background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.4)', color: '#00d4ff', clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
                      >
                        <Save size={13} /> Save Product
                      </button>
                      <button onClick={() => { setEditingProduct(null); setStoreUploadError(''); setStoreUploadSuccess(''); setStoreUploadStatus(''); }}
                        className="px-5 py-3 font-orbitron text-xs text-gray-500 border border-white/10 hover:border-white/20 hover:text-white transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Products ({storeData.products.length})</p>
                      <button
                        onClick={() => { setEditingProduct({ ...blankProduct(), id: 'prod-new-' + Date.now() }); setStoreUploadError(''); setStoreUploadSuccess(''); setStoreUploadStatus(''); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 font-orbitron text-xs font-bold tracking-widest uppercase transition-all"
                        style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff' }}
                      >
                        <Plus size={12} />Add Product
                      </button>
                    </div>
                    {storeData.products.length === 0 && (
                      <p className="text-gray-600 text-sm font-mono text-center py-8">No products yet. Click Add Product to get started.</p>
                    )}
                    {storeData.products.map(product => (
                      <div key={product.id} className="flex items-center gap-3 p-3 rounded-lg bg-black/20 border border-white/5">
                        {product.coverImage ? <img src={product.coverImage} className="w-10 h-10 object-cover rounded flex-shrink-0" alt="" /> : <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded bg-white/5"><ShoppingBag size={16} className="text-gray-600" /></div>}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-white truncate">{product.name || 'Unnamed Product'}</p>
                          <div className="flex items-center gap-2 text-xs font-mono">
                            <span style={{ color: product.type === 'digital' ? '#a855f7' : '#00d4ff' }}>{product.type}</span>
                            <span className="text-gray-600">{(config.goals?.[0]?.currency || '£')}{product.price}</span>
                            {!product.enabled && <span className="text-red-500">hidden</span>}
                            {product.featured && <span className="text-yellow-500">★ featured</span>}
                            {product.type === 'physical' && (
                              product.shippingCountryMode === 'only-selected'
                                ? ((product.allowedCountries?.length || 0) > 0 && <span className="text-green-400">{product.allowedCountries?.length} allowed</span>)
                                : (product.blockedCountries.length > 0 && <span className="text-orange-500">{product.blockedCountries.length} blocked</span>)
                            )}
                          </div>
                        </div>
                        <button onClick={() => { setEditingProduct(product); setStoreUploadError(''); setStoreUploadSuccess(''); setStoreUploadStatus(''); }} className="p-1.5 text-gray-500 hover:text-white transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => {
                          const updated = { ...storeData, products: storeData.products.filter(p => p.id !== product.id) };
                          setStoreData(updated);
                          saveStore(updated);
                        }} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── ORDERS & MESSAGES TAB ── */}
            {activeTab === 'orders' && isOwner && (
              <div className="h-[620px] flex flex-col gap-0" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.3)' }}>
                  <div className="flex gap-1">
                    <button onClick={() => setOrdersSubTab('orders')} className={`font-orbitron font-bold text-xs px-3 py-1.5 transition-colors ${ordersSubTab==='orders' ? 'text-white bg-white/10' : 'text-gray-500 hover:text-white'}`}>Order Msgs</button>
                    <button onClick={() => { setOrdersSubTab('contact'); if(contactMsgs.length===0) loadContactMsgs(); }} className={`font-orbitron font-bold text-xs px-3 py-1.5 transition-colors flex items-center gap-1.5 ${ordersSubTab==='contact' ? 'text-white bg-white/10' : 'text-gray-500 hover:text-white'}`}>
                      Fan Messages
                      {contactMsgs.filter(m=>!m.read).length > 0 && <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{contactMsgs.filter(m=>!m.read).length}</span>}
                    </button>
                  </div>
                  <button onClick={() => ordersSubTab==='orders' ? loadAdminConvs() : loadContactMsgs()} className="font-mono text-xs text-gray-500 hover:text-cyan-400 transition-colors">↻ Refresh</button>
                </div>
                {ordersSubTab === 'orders' && (
                <div className="flex flex-1 min-h-0 overflow-hidden">
                  {/* Conversation list */}
                  <div className="w-64 flex-shrink-0 overflow-y-auto" style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>
                    {adminConvsLoading ? (
                      <p className="font-mono text-xs text-gray-600 text-center py-8">Loading...</p>
                    ) : adminConvs.length === 0 ? (
                      <p className="font-mono text-xs text-gray-600 text-center py-8">No conversations yet.</p>
                    ) : adminConvs.map(conv => (
                      <button key={conv.id} onClick={() => openAdminConv(conv)}
                        className="w-full text-left p-3 transition-colors hover:bg-white/5"
                        style={{ background: adminActiveConv?.id === conv.id ? 'rgba(0,212,255,0.08)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="flex items-start justify-between gap-1 mb-0.5">
                          <p className="font-orbitron font-bold text-xs text-white truncate">{conv.buyerName || conv.buyerEmail || 'Buyer'}</p>
                          {conv.unreadOwner > 0 && (
                            <span className="flex-shrink-0 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: '#ef4444', color: '#fff' }}>{conv.unreadOwner}</span>
                          )}
                        </div>
                        <p className="font-mono text-[10px] text-gray-500 truncate">{conv.productNames?.[0] || 'Order'}</p>
                        <p className="font-mono text-[10px] text-gray-700 truncate mt-0.5">{conv.lastMessage || 'No messages'}</p>
                      </button>
                    ))}
                  </div>
                  {/* Thread */}
                  {adminActiveConv ? (
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.2)' }}>
                        <p className="font-orbitron font-bold text-xs text-white">{adminActiveConv.buyerName || adminActiveConv.buyerEmail}</p>
                        <p className="font-mono text-[10px] text-gray-600 mt-0.5">{adminActiveConv.productNames?.[0]} · Order #{adminActiveConv.orderId.slice(-8)}</p>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {adminMessages.map(m => (
                          <div key={m.id} className={`flex ${m.senderRole === 'owner' ? 'justify-end' : 'justify-start'}`}>
                            <div className="max-w-[75%]">
                              <p className="font-mono text-[10px] mb-1" style={{ color: m.senderRole === 'owner' ? '#a855f7' : '#00d4ff', textAlign: m.senderRole === 'owner' ? 'right' : 'left' }}>{m.senderName}</p>
                              <div className="px-3 py-2 font-mono text-xs leading-relaxed"
                                style={m.senderRole === 'owner'
                                  ? { background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', color: '#e5e7eb' }
                                  : { background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#e5e7eb' }}>
                                {m.text}
                              </div>
                              <p className="font-mono text-[10px] text-gray-700 mt-0.5" style={{ textAlign: m.senderRole === 'owner' ? 'right' : 'left' }}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-2 flex gap-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                        <input value={adminReply} onChange={e => setAdminReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendAdminReply()}
                          placeholder="Reply as WahajPlayz..." className="flex-1 px-3 py-1.5 bg-black/40 border border-white/10 text-white font-mono text-xs outline-none focus:border-cyan-500/50" />
                        <button onClick={sendAdminReply} disabled={!adminReply.trim() || adminSending}
                          className="px-3 py-1.5 flex items-center gap-1.5 font-orbitron font-bold text-xs tracking-wider transition-all hover:scale-105 disabled:opacity-40"
                          style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', color: '#a855f7' }}>
                          <Send size={11} /> {adminSending ? '...' : 'Send'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="font-mono text-xs text-gray-600">Select a conversation</p>
                    </div>
                  )}
                </div>
                )}

                {/* ── Fan Messages sub-tab ── */}
                {ordersSubTab === 'contact' && (
                  <div className="flex flex-1 min-h-0">
                    {/* Contact list */}
                    <div className="w-64 flex-shrink-0 overflow-y-auto" style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>
                      {contactLoading ? (
                        <p className="font-mono text-xs text-gray-600 text-center py-8">Loading...</p>
                      ) : contactMsgs.length === 0 ? (
                        <p className="font-mono text-xs text-gray-600 text-center py-8">No fan messages yet.</p>
                      ) : contactMsgs.map(msg => (
                        <button key={msg.id} onClick={() => { setActiveContactMsg(msg); markContactRead(msg); }}
                          className="w-full text-left p-3 transition-colors hover:bg-white/5"
                          style={{ background: activeContactMsg?.id === msg.id ? 'rgba(168,85,247,0.08)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <div className="flex items-start justify-between gap-1 mb-0.5">
                            <p className="font-orbitron font-bold text-xs text-white truncate">{msg.name}</p>
                            {!msg.read && <span className="flex-shrink-0 w-2 h-2 rounded-full mt-1" style={{ background: '#a855f7' }} />}
                          </div>
                          <p className="font-mono text-[10px] text-gray-500 truncate">{msg.subject || msg.message}</p>
                          <p className="font-mono text-[10px] text-gray-700 mt-0.5">{new Date(msg.createdAt).toLocaleDateString()}</p>
                        </button>
                      ))}
                    </div>
                    {/* Contact detail */}
                    {activeContactMsg ? (
                      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-4 space-y-3">
                        <div className="pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                          <p className="font-orbitron font-bold text-sm text-white mb-0.5">{activeContactMsg.name}</p>
                          <a href={`mailto:${activeContactMsg.email}`} className="font-mono text-xs hover:text-cyan-400 transition-colors" style={{ color: '#00d4ff' }}>{activeContactMsg.email}</a>
                          {activeContactMsg.subject && <p className="font-mono text-xs text-gray-400 mt-1">Re: {activeContactMsg.subject}</p>}
                          <p className="font-mono text-[10px] text-gray-700 mt-1">{new Date(activeContactMsg.createdAt).toLocaleString()}</p>
                        </div>
                        <p className="font-mono text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{activeContactMsg.message}</p>
                        <a href={`mailto:${activeContactMsg.email}?subject=Re: ${encodeURIComponent(activeContactMsg.subject || 'Your message')}`}
                          className="inline-flex items-center gap-2 font-orbitron font-bold text-xs tracking-widest uppercase px-4 py-2 transition-all hover:scale-105 self-start"
                          style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.35)', color: '#a855f7' }}>
                          <Send size={11} /> Reply via Email
                        </a>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <p className="font-mono text-xs text-gray-600">Select a message</p>
                      </div>
                    )}
                  </div>
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
