'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Users,
  CreditCard,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  PlusCircle,
  Send,
  AlertTriangle,
  Activity,
  ChevronRight,
  X,
  Check,
  Loader2,
  Crown,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  User,
  Shield
} from 'lucide-react';

interface StatsData {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  activeSubscriptions: number;
  tierCounts: { free: number; creator: number; pro: number; scale: number };
  totalCreditsInCirculation: number;
  totalProjects: number;
  totalRenders: number;
  systemBalances: any[];
}

interface UserItem {
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
  projects_count?: number;
}

interface PaymentItem {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  created_at: string;
  metadata?: any;
  profiles?: {
    email: string;
    full_name: string | null;
    telegram_id: string | null;
  };
}

export default function AdminDashboardPage() {
  const locale = useLocale();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'payments' | 'system'>('overview');

  // Stats state
  const [stats, setStats] = useState<StatsData | null>(null);

  // Users state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [usersLoading, setUsersLoading] = useState(false);

  // Payments state
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // Modal / Drawer state
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [userDetailModal, setUserDetailModal] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [creditModalUser, setCreditModalUser] = useState<UserItem | null>(null);
  const [creditAmount, setCreditAmount] = useState('100');
  const [creditReason, setCreditReason] = useState('SuperAdmin Manual Bonus');
  const [submittingCredit, setSubmittingCredit] = useState(false);

  const [tierModalUser, setTierModalUser] = useState<UserItem | null>(null);
  const [selectedTier, setSelectedTier] = useState('pro');
  const [selectedSubStatus, setSelectedSubStatus] = useState('active');
  const [submittingTier, setSubmittingTier] = useState(false);

  const [tgModalUser, setTgModalUser] = useState<UserItem | null>(null);
  const [tgMessage, setTgMessage] = useState('');
  const [submittingTg, setSubmittingTg] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch initial stats & verify authorization
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.status === 401 || res.status === 403) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error('Failed to fetch stats');

      const data = await res.json();
      setStats(data);
      setAuthorized(true);
    } catch (err: any) {
      console.error('[Admin Page] Stats error:', err);
      setAuthorized(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch users list
  const fetchUsers = useCallback(async (page = 1) => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        search: searchQuery,
        tier: tierFilter,
        status: statusFilter,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch users');

      const data = await res.json();
      setUsers(data.users || []);
      setUsersTotal(data.total || 0);
      setUsersPage(data.page || 1);
      setUsersTotalPages(data.totalPages || 1);
    } catch (err: any) {
      showToast(err.message || 'Error loading users', 'error');
    } finally {
      setUsersLoading(false);
    }
  }, [searchQuery, tierFilter, statusFilter]);

  // Fetch payments list
  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const res = await fetch('/api/admin/payments?limit=50');
      if (!res.ok) throw new Error('Failed to fetch payments');
      const data = await res.json();
      setPayments(data.payments || []);
    } catch (err: any) {
      showToast(err.message || 'Error loading payments', 'error');
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (authorized) {
      if (activeTab === 'users') fetchUsers(1);
      if (activeTab === 'payments') fetchPayments();
    }
  }, [activeTab, authorized, fetchUsers, fetchPayments]);

  const handleOpenUserDetail = async (user: UserItem) => {
    setSelectedUser(user);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch details');
      const data = await res.json();
      setUserDetailModal(data);
    } catch (err: any) {
      showToast(err.message || 'Error', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleGrantCredits = async () => {
    if (!creditModalUser) return;
    const amount = parseInt(creditAmount, 10);
    if (isNaN(amount) || amount === 0) {
      showToast('Введите корректное число кредитов', 'error');
      return;
    }

    setSubmittingCredit(true);
    try {
      const res = await fetch(`/api/admin/users/${creditModalUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'grant_credits',
          amount,
          reason: creditReason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      showToast(data.message || 'Кредиты успешного зачислены!');
      setCreditModalUser(null);
      fetchUsers(usersPage);
      fetchStats();
    } catch (err: any) {
      showToast(err.message || 'Ошибка начисления', 'error');
    } finally {
      setSubmittingCredit(false);
    }
  };

  const handleUpdateTier = async () => {
    if (!tierModalUser) return;
    setSubmittingTier(true);
    try {
      const res = await fetch(`/api/admin/users/${tierModalUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_tier',
          tier: selectedTier,
          subscription_status: selectedSubStatus
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      showToast(data.message || 'Тариф успешно обновлен!');
      setTierModalUser(null);
      fetchUsers(usersPage);
      fetchStats();
    } catch (err: any) {
      showToast(err.message || 'Ошибка обновления тарифа', 'error');
    } finally {
      setSubmittingTier(false);
    }
  };

  const handleSendTgMessage = async () => {
    if (!tgModalUser || !tgMessage.trim()) return;
    setSubmittingTg(true);
    try {
      const res = await fetch(`/api/admin/users/${tgModalUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_telegram_dm',
          message: tgMessage.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      showToast('Сообщение отправлено в Telegram!');
      setTgModalUser(null);
      setTgMessage('');
    } catch (err: any) {
      showToast(err.message || 'Ошибка отправки', 'error');
    } finally {
      setSubmittingTg(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-white/40">
          Проверка прав суперадминистратора...
        </p>
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-xl font-black text-white">Доступ ограничен</h2>
        <p className="text-xs text-white/50 max-w-xs leading-relaxed font-medium">
          Панель доступна только суперадминистратору системного уровня (Telegram ID: 260669598).
        </p>
        <button
          onClick={() => router.push('/app/ideas')}
          className="px-6 py-3 rounded-2xl bg-white/10 text-white text-xs font-black uppercase tracking-wider hover:bg-white/20 transition-all"
        >
          ← Вернуться в приложение
        </button>
      </div>
    );
  }

  const statusColor = (s: string) => s === 'critical' ? 'text-red-400 border-red-500/30 bg-red-500/10' : s === 'warning' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';

  const tierBadgeStyle = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'pro': return 'bg-purple-500/10 border-purple-500/30 text-purple-300';
      case 'scale': return 'bg-amber-500/10 border-amber-500/30 text-amber-300';
      case 'creator': return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300';
      default: return 'bg-white/5 border-white/10 text-white/50';
    }
  };

  return (
    <div className="space-y-6 pb-28 max-w-5xl mx-auto px-3 sm:px-6 safe-top">
      {/* Toast alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-[max(3.5rem,calc(env(safe-area-inset-top,0px)+1rem))] right-5 z-50 px-4 py-3 rounded-2xl border text-xs font-black uppercase tracking-wider shadow-2xl backdrop-blur-xl ${
              toast.type === 'error' ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SuperAdmin Header */}
      <div className="relative rounded-[2.5rem] p-6 bg-gradient-to-br from-[#121026] via-[#0b0c16] to-black border border-white/10 shadow-2xl overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 shadow-lg shadow-purple-500/20">
              <div className="w-full h-full rounded-[14px] bg-black/80 flex items-center justify-center text-purple-400">
                <Crown size={26} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[8px] font-black uppercase tracking-widest">
                  SUPERADMIN CONTROL CENTER
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                Панель Управления
              </h1>
              <p className="text-[11px] text-white/40 font-medium">
                Полный контроль пользователей, транзакций и ресурсов ИИ
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              fetchStats();
              if (activeTab === 'users') fetchUsers(usersPage);
              if (activeTab === 'payments') fetchPayments();
              showToast('Данные обновлены');
            }}
            className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all shadow-md"
            title="Обновить"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Mobile Navigation Touch Tabs */}
        <div className="flex items-center gap-1.5 mt-6 p-1.5 rounded-2xl bg-black/60 border border-white/5 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Обзор', icon: Activity },
            { id: 'users', label: 'Пользователи', icon: Users, badge: stats?.totalUsers },
            { id: 'payments', label: 'Оплаты', icon: CreditCard },
            { id: 'system', label: 'Статус АПИ', icon: Cpu }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-[10.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all select-none whitespace-nowrap ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[8px] ${isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* --- TAB 1: OVERVIEW --- */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-3xl bg-[#0c0c16]/90 border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-white/40">
                <span className="text-[10px] font-black uppercase tracking-wider">Всего юзеров</span>
                <Users size={16} className="text-purple-400" />
              </div>
              <div className="text-2xl font-black text-white">{stats.totalUsers}</div>
              <div className="text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                <TrendingUp size={10} /> +{stats.newUsersToday} сегодня
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-[#0c0c16]/90 border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-white/40">
                <span className="text-[10px] font-black uppercase tracking-wider">Активные платники</span>
                <Crown size={16} className="text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400">{stats.activeSubscriptions}</div>
              <div className="text-[9px] font-medium text-white/40">
                Creator / Pro / Scale
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-[#0c0c16]/90 border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-white/40">
                <span className="text-[10px] font-black uppercase tracking-wider">Кредиты в системе</span>
                <Sparkles size={16} className="text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-cyan-400">{stats.totalCreditsInCirculation.toLocaleString()}</div>
              <div className="text-[9px] font-medium text-white/40">
                Общий суммарный баланс
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-[#0c0c16]/90 border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-white/40">
                <span className="text-[10px] font-black uppercase tracking-wider">Рендеров выполнено</span>
                <Layers size={16} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400">{stats.totalRenders}</div>
              <div className="text-[9px] font-medium text-white/40">
                Из {stats.totalProjects} проектов
              </div>
            </div>
          </div>

          {/* Tier Distribution Breakdown */}
          <div className="p-6 rounded-[2rem] bg-[#0c0c16]/90 border border-white/5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/60 flex items-center gap-2">
              <Layers size={14} className="text-purple-400" /> Распределение пользователей по тарифам
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'FREE', count: stats.tierCounts.free, color: 'from-gray-600 to-gray-400' },
                { label: 'CREATOR', count: stats.tierCounts.creator, color: 'from-cyan-500 to-blue-500' },
                { label: 'PRO', count: stats.tierCounts.pro, color: 'from-purple-500 to-indigo-500' },
                { label: 'SCALE', count: stats.tierCounts.scale, color: 'from-amber-500 to-yellow-500' }
              ].map(item => (
                <div key={item.label} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-black tracking-widest text-white/40">{item.label}</span>
                    <span className="text-sm font-black text-white">{item.count}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${item.color}`}
                      style={{ width: `${Math.min(100, (item.count / (stats.totalUsers || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System API Balance Overview */}
          <div className="p-6 rounded-[2rem] bg-[#0c0c16]/90 border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-white/60 flex items-center gap-2">
                <Cpu size={14} className="text-cyan-400" /> Состояние ИИ-Провайдеров
              </h3>
              <button
                onClick={() => setActiveTab('system')}
                className="text-[9.5px] font-black uppercase text-purple-400 hover:underline flex items-center gap-1"
              >
                Все детали <ArrowUpRight size={10} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stats.systemBalances.map((res: any, idx: number) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-black text-white block">{res.provider}</span>
                    <span className="text-[9.5px] text-white/40 font-mono">
                      Остаток: {typeof res.remaining === 'number' ? res.remaining.toLocaleString() : res.remaining} {res.unit}
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase border ${statusColor(res.status)}`}>
                    {res.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: USERS --- */}
      {activeTab === 'users' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Search & Filter Bar */}
          <div className="p-4 rounded-[2rem] bg-[#0c0c16]/90 border border-white/5 space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery((e.currentTarget as any).value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchUsers(1)}
                placeholder="Поиск по email, имени или Telegram ID..."
                className="w-full bg-white/[0.04] border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 transition-all"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider mr-1">Тариф:</span>
              {['all', 'free', 'creator', 'pro', 'scale'].map(t => (
                <button
                  key={t}
                  onClick={() => { setTierFilter(t); }}
                  className={`px-3 py-1 rounded-xl text-[9.5px] font-black uppercase tracking-wider border transition-all ${
                    tierFilter === t
                      ? 'bg-purple-600 border-purple-500 text-white'
                      : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* User List Cards */}
          {usersLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="animate-spin text-purple-400" size={24} />
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-white/40 text-xs font-medium">
              Пользователи не найдены
            </div>
          ) : (
            <div className="space-y-3">
              {users.map(u => (
                <div
                  key={u.id}
                  className="p-4 rounded-3xl bg-[#0c0c16]/90 border border-white/5 hover:border-white/15 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User size={18} className="text-purple-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-white truncate max-w-[180px] sm:max-w-[280px]">
                            {u.full_name || 'Творец'}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${tierBadgeStyle(u.tier)}`}>
                            {u.tier || 'free'}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/40 font-mono truncate">{u.email}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-cyan-400">{u.credits_balance} CR</div>
                      <div className="text-[9px] text-white/30 font-medium">
                        {u.projects_count || 0} проектов
                      </div>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[9px] text-white/30">
                    <div className="flex items-center gap-2">
                      <Calendar size={10} />
                      <span>Рег: {new Date(u.created_at).toLocaleDateString()}</span>
                      {u.telegram_id && (
                        <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 font-mono">
                          TG: {u.telegram_id}
                        </span>
                      )}
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCreditModalUser(u)}
                        className="px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 text-[9px] font-black uppercase tracking-wider transition-all"
                        title="Начислить кредиты"
                      >
                        + CR
                      </button>

                      <button
                        onClick={() => {
                          setTierModalUser(u);
                          setSelectedTier(u.tier || 'pro');
                          setSelectedSubStatus(u.subscription_status || 'active');
                        }}
                        className="px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 text-[9px] font-black uppercase tracking-wider transition-all"
                        title="Изменить тариф"
                      >
                        Тариф
                      </button>

                      {u.telegram_id && (
                        <button
                          onClick={() => setTgModalUser(u)}
                          className="p-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 transition-all"
                          title="Написать в Telegram"
                        >
                          <Send size={11} />
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenUserDetail(u)}
                        className="p-1.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                        title="Полные детали"
                      >
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination controls */}
              <div className="flex items-center justify-between pt-4">
                <span className="text-[10px] text-white/40 font-medium">
                  Страница {usersPage} из {usersTotalPages} ({usersTotal} пользователей)
                </span>

                <div className="flex gap-2">
                  <button
                    disabled={usersPage <= 1}
                    onClick={() => fetchUsers(usersPage - 1)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-[10px] font-black uppercase disabled:opacity-30"
                  >
                    ← Назад
                  </button>
                  <button
                    disabled={usersPage >= usersTotalPages}
                    onClick={() => fetchUsers(usersPage + 1)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-[10px] font-black uppercase disabled:opacity-30"
                  >
                    Вперед →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 3: PAYMENTS LOG --- */}
      {activeTab === 'payments' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="p-6 rounded-[2rem] bg-[#0c0c16]/90 border border-white/5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/60 flex items-center gap-2">
              <CreditCard size={14} className="text-emerald-400" /> Журнал оплат и пополнений
            </h3>

            {paymentsLoading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="animate-spin text-purple-400" size={20} />
              </div>
            ) : payments.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-6">Записи транзакций отсутствуют</p>
            ) : (
              <div className="space-y-2">
                {payments.map(p => (
                  <div key={p.id} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{p.profiles?.full_name || p.profiles?.email || 'Пользователь'}</span>
                        <span className="text-[9px] font-mono text-white/30">({p.profiles?.email})</span>
                      </div>
                      <div className="text-[9.5px] text-white/40">
                        {new Date(p.created_at).toLocaleString()} · {p.transaction_type}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-400">+{p.amount} CR</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 4: SYSTEM STATUS --- */}
      {activeTab === 'system' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="p-6 rounded-[2rem] bg-[#0c0c16]/90 border border-white/5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/60 flex items-center gap-2">
              <Cpu size={14} className="text-purple-400" /> Мониторинг ресурсов и квот
            </h3>

            <div className="space-y-3">
              {(stats?.systemBalances || []).map((res: any, idx: number) => (
                <div key={idx} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-white">{res.provider}</h4>
                    <p className="text-xs text-white/40 font-mono mt-0.5">
                      Остаток: {typeof res.remaining === 'number' ? res.remaining.toLocaleString() : res.remaining} {res.unit}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase border ${statusColor(res.status)}`}>
                      {res.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: GRANT CREDITS --- */}
      <AnimatePresence>
        {creditModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-[2rem] bg-[#0d0e1b] border border-white/10 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={16} className="text-cyan-400" /> Начислить кредиты
                </h3>
                <button onClick={() => setCreditModalUser(null)} className="text-white/40 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 text-xs text-white/60 space-y-1">
                <div className="font-bold text-white">{creditModalUser.full_name || 'Пользователь'}</div>
                <div className="text-[10px] font-mono">{creditModalUser.email}</div>
                <div className="text-[10px] text-cyan-400">Текущий баланс: {creditModalUser.credits_balance} CR</div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">
                    Количество кредитов (+/-)
                  </label>
                  <input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount((e.currentTarget as any).value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">
                    Причина / Примечание
                  </label>
                  <input
                    type="text"
                    value={creditReason}
                    onChange={(e) => setCreditReason((e.currentTarget as any).value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setCreditModalUser(null)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-xs font-black uppercase"
                >
                  Отмена
                </button>
                <button
                  onClick={handleGrantCredits}
                  disabled={submittingCredit}
                  className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase flex items-center justify-center gap-1.5"
                >
                  {submittingCredit ? <Loader2 size={14} className="animate-spin" /> : 'Начислить'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL: CHANGE TIER --- */}
      <AnimatePresence>
        {tierModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-[2rem] bg-[#0d0e1b] border border-white/10 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Crown size={16} className="text-purple-400" /> Изменить Тариф Подписки
                </h3>
                <button onClick={() => setTierModalUser(null)} className="text-white/40 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 text-xs text-white/60 space-y-1">
                <div className="font-bold text-white">{tierModalUser.full_name || 'Пользователь'}</div>
                <div className="text-[10px] font-mono">{tierModalUser.email}</div>
                <div className="text-[10px] text-purple-400">Текущий тариф: {tierModalUser.tier || 'free'}</div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">
                    Новый Тариф
                  </label>
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier((e.currentTarget as any).value)}
                    className="w-full bg-[#121426] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500/50"
                  >
                    <option value="free">FREE</option>
                    <option value="creator">CREATOR</option>
                    <option value="pro">PRO</option>
                    <option value="scale">SCALE</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">
                    Статус подписки
                  </label>
                  <select
                    value={selectedSubStatus}
                    onChange={(e) => setSelectedSubStatus((e.currentTarget as any).value)}
                    className="w-full bg-[#121426] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500/50"
                  >
                    <option value="active">Active (Активна)</option>
                    <option value="expired">Expired (Истекла)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setTierModalUser(null)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-xs font-black uppercase"
                >
                  Отмена
                </button>
                <button
                  onClick={handleUpdateTier}
                  disabled={submittingTier}
                  className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase flex items-center justify-center gap-1.5"
                >
                  {submittingTier ? <Loader2 size={14} className="animate-spin" /> : 'Сохранить'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL: TELEGRAM DM --- */}
      <AnimatePresence>
        {tgModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-[2rem] bg-[#0d0e1b] border border-white/10 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Send size={16} className="text-blue-400" /> Отправить DM в Telegram
                </h3>
                <button onClick={() => setTgModalUser(null)} className="text-white/40 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 text-xs text-white/60 space-y-1">
                <div className="font-bold text-white">{tgModalUser.full_name || 'Пользователь'}</div>
                <div className="text-[10px] text-blue-400">TG Chat ID: {tgModalUser.telegram_id}</div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">
                  Текст сообщения (Markdown)
                </label>
                <textarea
                  value={tgMessage}
                  onChange={(e) => setTgMessage((e.currentTarget as any).value)}
                  rows={4}
                  placeholder="Здравствуйте! Администратор начислил вам бонус..."
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500/50 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setTgModalUser(null)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-xs font-black uppercase"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSendTgMessage}
                  disabled={submittingTg || !tgMessage.trim()}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase flex items-center justify-center gap-1.5"
                >
                  {submittingTg ? <Loader2 size={14} className="animate-spin" /> : 'Отправить'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- DRAWER / MODAL: USER DETAIL --- */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-t-[2.5rem] sm:rounded-[2.5rem] bg-[#0c0d1a] border border-white/10 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-black text-lg">
                    {selectedUser.full_name ? selectedUser.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">{selectedUser.full_name || 'Пользователь'}</h3>
                    <p className="text-xs text-white/40 font-mono">{selectedUser.email}</p>
                  </div>
                </div>

                <button onClick={() => { setSelectedUser(null); setUserDetailModal(null); }} className="text-white/40 hover:text-white p-2">
                  <X size={20} />
                </button>
              </div>

              {loadingDetail ? (
                <div className="py-12 flex justify-center">
                  <Loader2 size={24} className="animate-spin text-purple-400" />
                </div>
              ) : userDetailModal ? (
                <div className="space-y-6">
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                      <span className="text-[9px] font-bold text-white/30 uppercase block">Баланс</span>
                      <span className="text-lg font-black text-cyan-400">{userDetailModal.profile?.credits_balance || 0} CR</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                      <span className="text-[9px] font-bold text-white/30 uppercase block">Тариф</span>
                      <span className="text-lg font-black text-purple-300 uppercase">{userDetailModal.profile?.tier || 'free'}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                      <span className="text-[9px] font-bold text-white/30 uppercase block">Проекты</span>
                      <span className="text-lg font-black text-white">{userDetailModal.projects?.length || 0}</span>
                    </div>
                  </div>

                  {/* Profile Metadata */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-white/40">UUID:</span>
                      <span className="font-mono text-white/70">{selectedUser.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Telegram ID:</span>
                      <span className="font-mono text-blue-400">{selectedUser.telegram_id || 'Не подключен'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Дата регистрации:</span>
                      <span className="text-white/70">{new Date(selectedUser.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Recent Projects */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase text-white/50 tracking-wider">
                      Последние проекты ({userDetailModal.projects?.length || 0})
                    </h4>
                    {userDetailModal.projects?.length === 0 ? (
                      <p className="text-xs text-white/30 italic">Нет проектов</p>
                    ) : (
                      <div className="space-y-1.5">
                        {userDetailModal.projects.map((p: any) => (
                          <div key={p.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                            <span className="font-medium text-white truncate max-w-[240px]">{p.title}</span>
                            <span className="text-[10px] text-purple-300 font-mono">{p.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
