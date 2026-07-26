import { supabaseAdmin } from '@/lib/supabase';
import { addCredits } from '@/lib/credits';
import { monitoringService } from '@/lib/services/monitoringService';

const ADMIN_TELEGRAM_IDS = ['260669598'];
const ADMIN_EMAILS = ['0451611@gmail.com'];

export function isSuperAdmin(user?: { id?: string; email?: string | null; telegram_id?: string | number | null } | null): boolean {
  if (!user) return false;

  if (user.telegram_id && ADMIN_TELEGRAM_IDS.includes(String(user.telegram_id))) {
    return true;
  }

  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return true;
  }

  const envAdminTg = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (envAdminTg && user.telegram_id && String(user.telegram_id) === String(envAdminTg)) {
    return true;
  }

  return false;
}

export async function isUserAdminByAuth(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, telegram_id, tier')
      .eq('id', userId)
      .single();

    if (!profile) return false;
    if (profile.tier === 'superadmin' || (profile as any).role === 'superadmin') return true;
    return isSuperAdmin(profile);
  } catch (err) {
    console.error('[Admin Check] Error verifying admin role:', err);
    return false;
  }
}

export interface UserGrowthPoint {
  date: string;
  dateIso: string;
  count: number;
}

export interface AdminStatsOverview {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  activeSubscriptions: number;
  tierCounts: {
    free: number;
    creator: number;
    pro: number;
    scale: number;
  };
  totalCreditsInCirculation: number;
  totalProjects: number;
  totalRenders: number;
  totalAvatarsGenerated: number;
  totalImagesGenerated: number;
  totalScriptsGenerated: number;
  systemBalances: any[];
  userGrowthTimeline: UserGrowthPoint[];
}

export async function getAdminOverviewStats(): Promise<AdminStatsOverview> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Fetch total users & new signups count
  const { count: totalUsers } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true });

  const { count: newUsersToday } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', todayStart);

  const { count: newUsersThisWeek } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', weekStart);

  // 1.5 Fetch registration timeline for the past 14 days
  const fourteenDaysAgo = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const { data: recentProfiles } = await supabaseAdmin
    .from('profiles')
    .select('created_at')
    .gte('created_at', fourteenDaysAgo.toISOString());

  const monthsRu = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  const userGrowthTimeline: UserGrowthPoint[] = [];

  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStr = `${d.getDate()} ${monthsRu[d.getMonth()]}`;
    const dateIso = d.toISOString().split('T')[0];

    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    const count = (recentProfiles || []).filter((p: any) => {
      if (!p.created_at) return false;
      const t = new Date(p.created_at).getTime();
      return t >= dayStart && t < dayEnd;
    }).length;

    userGrowthTimeline.push({
      date: dayStr,
      dateIso,
      count
    });
  }

  // 2. Fetch Tier breakdown & Active subs
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('tier, subscription_status, credits_balance');

  const tierCounts = {
    free: 0,
    creator: 0,
    pro: 0,
    scale: 0,
  };

  let activeSubscriptions = 0;
  let totalCreditsInCirculation = 0;

  (profiles || []).forEach((p: any) => {
    const tier = (p.tier || 'free').toLowerCase();
    if (tier in tierCounts) {
      (tierCounts as any)[tier]++;
    } else {
      tierCounts.free++;
    }

    if (tier !== 'free' && p.subscription_status === 'active') {
      activeSubscriptions++;
    }

    totalCreditsInCirculation += (p.credits_balance || 0);
  });

  // 3. Fetch Total Projects, Renders, and Heavy Operations Breakdown
  const { count: totalProjects } = await supabaseAdmin
    .from('projects')
    .select('id', { count: 'exact', head: true });

  const { count: totalRenders } = await supabaseAdmin
    .from('render_jobs')
    .select('id', { count: 'exact', head: true });

  const { count: totalAvatarsGenerated } = await supabaseAdmin
    .from('credits_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('transaction_type', 'HEYGEN_GENERATE');

  const { count: totalImagesGenerated } = await supabaseAdmin
    .from('credits_transactions')
    .select('id', { count: 'exact', head: true })
    .in('transaction_type', ['FAL_IMAGE', 'FAL_TIMELINE', 'STORYBOARD_GEN']);

  const { count: totalScriptsGenerated } = await supabaseAdmin
    .from('credits_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('transaction_type', 'SCRIPT_GEN');

  // 4. API System Balances
  let systemBalances: any[] = [];
  try {
    systemBalances = await monitoringService.getFullSystemReport();
  } catch (err) {
    console.warn('[AdminStats] Failed to fetch system balances:', err);
  }

  return {
    totalUsers: totalUsers || 0,
    newUsersToday: newUsersToday || 0,
    newUsersThisWeek: newUsersThisWeek || 0,
    activeSubscriptions,
    tierCounts,
    totalCreditsInCirculation,
    totalProjects: totalProjects || 0,
    totalRenders: totalRenders || 0,
    totalAvatarsGenerated: totalAvatarsGenerated || 0,
    totalImagesGenerated: totalImagesGenerated || 0,
    totalScriptsGenerated: totalScriptsGenerated || 0,
    systemBalances,
    userGrowthTimeline,
  };
}

export interface AdminUserListItem {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  telegram_id: string | null;
  credits_balance: number;
  tier: string;
  subscription_status: string;
  subscription_expires_at: string | null;
  created_at: string;
  updated_at: string;
  projects_count?: number;
  heavy_ops?: {
    avatars: number;
    images: number;
    scripts: number;
  };
}

export async function getAdminUsersList(options: {
  page?: number;
  limit?: number;
  search?: string;
  tier?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact' });

  if (options.tier && options.tier !== 'all') {
    query = query.eq('tier', options.tier);
  }

  if (options.status && options.status !== 'all') {
    query = query.eq('subscription_status', options.status);
  }

  if (options.search && options.search.trim()) {
    const s = `%${options.search.trim()}%`;
    query = query.or(`email.ilike.${s},full_name.ilike.${s},telegram_id.ilike.${s},id.eq.${options.search.trim()}`);
  }

  const sortColumn = options.sortBy || 'created_at';
  const ascending = options.sortOrder === 'asc';

  query = query.order(sortColumn, { ascending }).range(offset, offset + limit - 1);

  const { data: users, count, error } = await query;

  if (error) {
    console.error('[AdminUsers] Fetch failed:', error);
    throw error;
  }

  // Enrich with projects count & heavy operations breakdown
  const enrichedUsers: AdminUserListItem[] = await Promise.all(
    (users || []).map(async (u: any) => {
      const { count: projCount } = await supabaseAdmin
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', u.id);

      const { count: avatarCount } = await supabaseAdmin
        .from('credits_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', u.id)
        .eq('transaction_type', 'HEYGEN_GENERATE');

      const { count: imageCount } = await supabaseAdmin
        .from('credits_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', u.id)
        .in('transaction_type', ['FAL_IMAGE', 'FAL_TIMELINE', 'STORYBOARD_GEN']);

      const { count: scriptCount } = await supabaseAdmin
        .from('credits_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', u.id)
        .eq('transaction_type', 'SCRIPT_GEN');

      return {
        ...u,
        projects_count: projCount || 0,
        heavy_ops: {
          avatars: avatarCount || 0,
          images: imageCount || 0,
          scripts: scriptCount || 0
        }
      };
    })
  );

  return {
    users: enrichedUsers,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function getAdminUserDetail(userId: string) {
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileErr || !profile) {
    throw new Error('USER_NOT_FOUND');
  }

  // Fetch recent projects
  const { data: projects } = await supabaseAdmin
    .from('projects')
    .select('id, title, status, input_source, created_at, final_video_url')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch recent transactions
  const { data: transactions } = await supabaseAdmin
    .from('credits_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  // Count user heavy operations
  const { count: avatars } = await supabaseAdmin
    .from('credits_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('transaction_type', 'HEYGEN_GENERATE');

  const { count: images } = await supabaseAdmin
    .from('credits_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('transaction_type', ['FAL_IMAGE', 'FAL_TIMELINE', 'STORYBOARD_GEN']);

  const { count: scripts } = await supabaseAdmin
    .from('credits_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('transaction_type', 'SCRIPT_GEN');

  return {
    profile,
    projects: projects || [],
    transactions: transactions || [],
    heavyOps: {
      avatars: avatars || 0,
      images: images || 0,
      scripts: scripts || 0
    }
  };
}

export async function adminGrantCredits(userId: string, amount: number, reason: string = 'admin_grant') {
  if (!userId || isNaN(amount) || amount === 0) {
    throw new Error('INVALID_PARAMS');
  }

  await addCredits(supabaseAdmin, userId, amount, 'admin_grant', {
    reason,
    granted_by: 'superadmin',
    granted_at: new Date().toISOString(),
  });

  return true;
}

export async function adminUpdateUserTier(userId: string, tier: string, subscription_status: string = 'active') {
  const validTiers = ['free', 'creator', 'pro', 'scale'];
  if (!validTiers.includes(tier)) {
    throw new Error('INVALID_TIER');
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      tier,
      subscription_status,
      subscription_expires_at: tier === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;
  return true;
}

export async function getAdminPaymentsLog(limit: number = 50) {
  const { data: transactions, error } = await supabaseAdmin
    .from('credits_transactions')
    .select('*, profiles(email, full_name, telegram_id)')
    .gte('amount', 0)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[AdminPayments] Error fetching payments:', error);
    throw error;
  }

  return transactions || [];
}
