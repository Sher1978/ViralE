'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Copy, 
  Check, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Wallet, 
  ArrowUpRight, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  HelpCircle,
  Clock,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useLocale } from 'next-intl';

interface PartnerStats {
  referralCode: string;
  referralUrl: string;
  totalReferredCount: number;
  totalEarnedUsd: number;
  partnerBalanceUsd: number;
  hasPaidPackage: boolean;
  userTier: string;
  withdrawalEligible: boolean;
  minWithdrawalAmount: number;
  botUsername: string;
  earningsHistory: Array<{
    id: string;
    earned_amount_usd: number;
    payment_amount_usd: number;
    payment_provider: string;
    created_at: string;
  }>;
  payoutHistory: Array<{
    id: string;
    amount_usd: number;
    payout_method: string;
    status: string;
    created_at: string;
  }>;
}

export function PartnerScreen() {
  const locale = useLocale();
  const isRu = locale === 'ru';

  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [payoutDetails, setPayoutDetails] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'usdt_trc20' | 'card'>('usdt_trc20');
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/partner/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load partner stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleCopyLink = () => {
    if (!stats?.referralUrl) return;
    try {
      const globalObj = typeof globalThis !== 'undefined' ? (globalThis as any) : null;
      if (globalObj?.window?.navigator?.clipboard) {
        globalObj.window.navigator.clipboard.writeText(stats.referralUrl);
      } else if (typeof navigator !== 'undefined' && (navigator as any).clipboard) {
        (navigator as any).clipboard.writeText(stats.referralUrl);
      }
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRequestPayout = async () => {
    setPayoutError(null);
    setPayoutSuccessMsg(null);
    setRequestingPayout(true);

    try {
      const res = await fetch('/api/partner/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payoutMethod,
          payoutDetails: payoutDetails.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setPayoutError(data.error || 'Failed to submit payout request');
        return;
      }

      setPayoutSuccessMsg(data.message);
      fetchStats();

      // Open Telegram bot deep link in new tab or direct window redirect
      if (data.telegramDeepLink) {
        setTimeout(() => {
          const globalObj = typeof globalThis !== 'undefined' ? (globalThis as any) : null;
          if (globalObj?.window) {
            globalObj.window.open(data.telegramDeepLink, '_blank');
          }
        }, 1200);
      }
    } catch (err: any) {
      setPayoutError(err.message || 'Error submitting payout request');
    } finally {
      setRequestingPayout(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
          {isRu ? 'Загрузка партнёрского баланса...' : 'Loading partner statistics...'}
        </p>
      </div>
    );
  }

  const balance = stats?.partnerBalanceUsd || 0;
  const progressPct = Math.min(100, Math.round((balance / 100) * 100));
  const remainingNeeded = Math.max(0, 100 - balance);
  const isEligible = Boolean(stats?.withdrawalEligible);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Top Banner */}
      <div className="relative rounded-[2.5rem] bg-gradient-to-r from-purple-900/40 via-indigo-950/60 to-black border border-purple-500/20 p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[9px] font-black uppercase tracking-widest">
            <Sparkles size={12} className="text-purple-400 animate-pulse" />
            <span>{isRu ? 'Партнёрская программа 30%' : '30% Affiliate Program'}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter text-white leading-tight">
            {isRu ? 'Зарабатывайте 30% с каждой оплаты' : 'Earn 30% On Every Payment'}
          </h2>

          <p className="text-xs text-white/60 leading-relaxed font-medium">
            {isRu 
              ? 'Приглашайте авторов, экспертов и блогеров в Viral Studio. Каждая покупка подписки или кредитов зачисляет 30% комиссии напрямую на ваш партнёрский счёт в USD!'
              : 'Invite creators, experts, and influencers to Viral Studio. Every subscription or credit purchase credits 30% commission directly to your USD partner account!'}
          </p>
        </div>
      </div>

      {/* Referral Link Box */}
      <div className="rounded-[2rem] bg-white/[0.03] border border-white/10 p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black italic uppercase tracking-wider text-white flex items-center gap-2">
            <ExternalLink size={16} className="text-purple-400" />
            <span>{isRu ? 'Ваша реферальная ссылка' : 'Your Referral Link'}</span>
          </h3>
          <span className="text-[10px] font-mono text-purple-400/80 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 font-bold">
            {stats?.referralCode || 'ref_code'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full flex-1 px-4 py-3.5 rounded-2xl bg-black/60 border border-white/15 text-white/90 font-mono text-xs overflow-x-auto shadow-inner select-all">
            {stats?.referralUrl || 'https://www.virale.uno/?ref=...'}
          </div>

          <button
            onClick={handleCopyLink}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
          >
            {copied ? (
              <>
                <Check size={16} className="text-emerald-300" />
                <span>{isRu ? 'Скопировано!' : 'Copied!'}</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>{isRu ? 'Скопировать ссылку' : 'Copy Link'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Total Referred */}
        <div className="rounded-[2rem] bg-white/[0.03] border border-white/10 p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
              {isRu ? 'Привлечено авторов' : 'Referred Creators'}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Users size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black italic tracking-tight text-white">
              {stats?.totalReferredCount || 0}
            </div>
            <p className="text-[10px] text-white/30 font-medium mt-1">
              {isRu ? 'Пользователей зарегистрировано по вашей ссылке' : 'Registered users via your link'}
            </p>
          </div>
        </div>

        {/* Card 2: Total Earned */}
        <div className="rounded-[2rem] bg-white/[0.03] border border-white/10 p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
              {isRu ? 'Заработано всего' : 'Lifetime Earnings'}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black italic tracking-tight text-emerald-400">
              ${(stats?.totalEarnedUsd || 0).toFixed(2)} <span className="text-xs text-emerald-400/60 font-bold">USD</span>
            </div>
            <p className="text-[10px] text-white/30 font-medium mt-1">
              {isRu ? 'Начислено 30% со всех оплат рефералов' : '30% commission from all purchases'}
            </p>
          </div>
        </div>

        {/* Card 3: Partner Balance */}
        <div className="rounded-[2rem] bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/30 p-6 flex flex-col justify-between space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">
              {isRu ? 'Партнёрский баланс' : 'Current Balance'}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Wallet size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black italic tracking-tight text-white">
              ${balance.toFixed(2)} <span className="text-xs text-purple-300/60 font-bold">USD</span>
            </div>
            <p className="text-[10px] text-purple-300/50 font-medium mt-1">
              {isRu ? 'Доступно к выводу средств' : 'Available for withdrawal'}
            </p>
          </div>
        </div>
      </div>

      {/* How It Works (Simple Plain Language Guide) */}
      <div className="rounded-[2.5rem] bg-white/[0.02] border border-white/10 p-6 sm:p-8 space-y-6">
        <h3 className="text-lg font-black italic uppercase tracking-tight text-white flex items-center gap-2">
          <HelpCircle size={20} className="text-purple-400" />
          <span>{isRu ? 'Как зарабатывать на реферальной системе?' : 'How to Earn Money with Affiliates'}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 text-xs font-black flex items-center justify-center border border-purple-500/30">
              1
            </div>
            <h4 className="text-xs font-black uppercase text-white tracking-wider">
              {isRu ? '1. Скопируйте ссылку' : '1. Copy Your Link'}
            </h4>
            <p className="text-[11px] text-white/50 leading-relaxed font-medium">
              {isRu 
                ? 'Каждому пользователю создается персональный реферальный код. Скопируйте ссылку выше.'
                : 'Every creator receives a custom referral link. Copy your personal link above.'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 text-xs font-black flex items-center justify-center border border-purple-500/30">
              2
            </div>
            <h4 className="text-xs font-black uppercase text-white tracking-wider">
              {isRu ? '2. Поделитесь ссылкой' : '2. Share With Audience'}
            </h4>
            <p className="text-[11px] text-white/50 leading-relaxed font-medium">
              {isRu
                ? 'Делитесь ссылкой с коллегами, блогерами, в социальных сетях или описаниях к роликам.'
                : 'Share your link with colleagues, influencers, in social media or video descriptions.'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 text-xs font-black flex items-center justify-center border border-purple-500/30">
              3
            </div>
            <h4 className="text-xs font-black uppercase text-white tracking-wider">
              {isRu ? '3. Получайте 30%' : '3. Earn 30% Commission'}
            </h4>
            <p className="text-[11px] text-white/50 leading-relaxed font-medium">
              {isRu
                ? 'Каждая покупка подписки или кредитов рефералом моментально зачисляет 30% на ваш баланс.'
                : 'Each subscription or top-up purchase by your referral instantly credits 30% to your balance.'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 text-xs font-black flex items-center justify-center border border-purple-500/30">
              4
            </div>
            <h4 className="text-xs font-black uppercase text-white tracking-wider">
              {isRu ? '4. Запросите вывод' : '4. Request Payout'}
            </h4>
            <p className="text-[11px] text-white/50 leading-relaxed font-medium">
              {isRu
                ? 'Выводите деньги при накоплении от $100 USD и наличии любого активного платного тарифа.'
                : 'Request payouts once you reach $100 USD with any active paid subscription.'}
            </p>
          </div>
        </div>
      </div>

      {/* Withdrawal Request Section */}
      <div className="rounded-[2.5rem] bg-white/[0.03] border border-white/10 p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black italic uppercase tracking-tight text-white flex items-center gap-2">
              <DollarSign size={20} className="text-emerald-400" />
              <span>{isRu ? 'Вывод партнёрских средств' : 'Payout Request'}</span>
            </h3>
            <p className="text-xs text-white/40 font-medium mt-1">
              {isRu 
                ? 'Условия вывода: партнерский баланс ≥ $100 USD и активный платный пакет'
                : 'Payout conditions: partner balance ≥ $100 USD and active paid package'}
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-black uppercase text-white/40 tracking-wider">
              {isRu ? 'Прогресс до вывода' : 'Payout Progress'}
            </span>
            <div className="text-base font-black italic text-purple-300">
              {progressPct}% ({balance.toFixed(2)} / 100 USD)
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/10">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 transition-all duration-700 shadow-[0_0_15px_rgba(168,85,247,0.5)]"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Rules Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
            balance >= 100 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' 
              : 'bg-white/5 border-white/10 text-white/50'
          }`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
              balance >= 100 ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white/40'
            }`}>
              {balance >= 100 ? '✓' : '1'}
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider">
                {isRu ? 'Баланс от $100 USD' : 'Balance ≥ $100 USD'}
              </div>
              <div className="text-[10px] opacity-75">
                {balance >= 100 
                  ? (isRu ? 'Условие выполнено' : 'Condition met') 
                  : (isRu ? `Осталось накопить $${remainingNeeded.toFixed(2)} USD` : `Remaining: $${remainingNeeded.toFixed(2)} USD`)}
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
            stats?.hasPaidPackage 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' 
              : 'bg-white/5 border-white/10 text-white/50'
          }`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
              stats?.hasPaidPackage ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white/40'
            }`}>
              {stats?.hasPaidPackage ? '✓' : '2'}
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider">
                {isRu ? 'Активный платный тариф' : 'Active Paid Package'}
              </div>
              <div className="text-[10px] opacity-75">
                {stats?.hasPaidPackage 
                  ? (isRu ? `Тариф ${(stats?.userTier || '').toUpperCase()} активен` : `Plan ${stats?.userTier.toUpperCase()} active`) 
                  : (isRu ? 'Необходим тариф Creator или Pro' : 'Creator or Pro subscription required')}
              </div>
            </div>
          </div>
        </div>

        {/* Payout Input & Telegram Redirect Button */}
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-white/60 mb-2">
                {isRu ? 'Способ вывода' : 'Payout Method'}
              </label>
              <select
                value={payoutMethod}
                onChange={(e: any) => setPayoutMethod(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-black/60 border border-white/15 text-white text-xs font-bold outline-none focus:border-purple-500"
              >
                <option value="usdt_trc20">USDT (TRC-20)</option>
                <option value="card">{isRu ? 'Банковская карта (РФ / СНГ / Int)' : 'Bank Card'}</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-white/60 mb-2">
                {isRu ? 'Реквизиты вывода (Кошелёк / Карта)' : 'Payout Details (Wallet / Card)'}
              </label>
              <input
                type="text"
                value={payoutDetails}
                onChange={(e: any) => setPayoutDetails(e.target.value)}
                placeholder={payoutMethod === 'usdt_trc20' ? 'TJxxx... (TRC-20 Address)' : '4400 0000 0000 0000'}
                className="w-full px-4 py-3 rounded-2xl bg-black/60 border border-white/15 text-white text-xs outline-none focus:border-purple-500 font-mono"
              />
            </div>
          </div>

          <AnimatePresence>
            {payoutError && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium flex items-center gap-2"
              >
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <span>{payoutError}</span>
              </motion.div>
            )}

            {payoutSuccessMsg && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs font-medium flex items-center gap-2"
              >
                <Check size={16} className="text-emerald-400 shrink-0" />
                <span>{payoutSuccessMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleRequestPayout}
            disabled={!isEligible || requestingPayout}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
          >
            {requestingPayout ? (
              <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            ) : (
              <>
                <Send size={16} />
                <span>{isRu ? 'Запросить вывод (в Telegram-бот)' : 'Request Payout (Open Telegram Bot)'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Referral Earnings History Table */}
      <div className="rounded-[2.5rem] bg-white/[0.02] border border-white/10 p-6 sm:p-8 space-y-4">
        <h3 className="text-sm font-black italic uppercase tracking-wider text-white flex items-center gap-2">
          <Clock size={16} className="text-purple-400" />
          <span>{isRu ? 'История реферальных начислений' : 'Referral Earnings History'}</span>
        </h3>

        {(!stats?.earningsHistory || stats.earningsHistory.length === 0) ? (
          <div className="py-12 text-center text-white/30 text-xs font-black uppercase tracking-widest">
            {isRu ? 'История пока пуста. Поделитесь ссылкой, чтобы получить первые 30%!' : 'No earnings yet. Share your link to earn your first 30%!'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-white/40 uppercase tracking-widest text-[9px]">
                  <th className="py-3 px-4">Дата</th>
                  <th className="py-3 px-4">Провайдер</th>
                  <th className="py-3 px-4">Оплата реферала</th>
                  <th className="py-3 px-4 text-right">Начислено 30%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {stats.earningsHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 text-white/70">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 uppercase text-[10px] font-black text-purple-300">
                      {item.payment_provider}
                    </td>
                    <td className="py-3.5 px-4 text-white/80">
                      ${Number(item.payment_amount_usd).toFixed(2)} USD
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-400 font-bold">
                      +${Number(item.earned_amount_usd).toFixed(2)} USD
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
