'use client';

import React from 'react';
import { ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react';
import { useRouter } from '@/navigation';

export default function RefundPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F0E8] font-sans selection:bg-purple-500/30 py-20 px-5 md:px-10 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-purple-500/5 filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-cyan-500/5 filter blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-10 relative z-10">
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-white/40 hover:text-white text-xs font-black uppercase tracking-widest transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} /> Return to Main Page
        </button>

        {/* Header */}
        <div className="flex items-center gap-5 border-b border-white/10 pb-8">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <RefreshCw size={28} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Refund & Cancellation Policy</h1>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-400/80 mt-1">
              Viral Studio / virale.uno · Merchant Refund Terms
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-10 text-sm text-white/70 leading-relaxed font-medium">
          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">1. Overview</h2>
            <p>
              We want you to be completely confident in the AI content creation capabilities of Viral Studio. Because our rendering engine, ElevenLabs voice cloning, HeyGen avatars, and Fal.ai GPU pipelines consume real-time high-performance cloud resources upon generation, refunds are granted according to the fair criteria below.
            </p>
          </section>

          <section className="space-y-3 border-l-2 border-purple-500/50 pl-5">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">2. 14-Day Subscription Refund Policy</h2>
            <p>
              We provide a <strong>full 14-day refund guarantee</strong> for subscription purchases under the following conditions:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/70">
              <li>You request a refund within 14 calendar days of the initial subscription transaction date.</li>
              <li>Your account has <strong>not consumed AI video credits</strong> or performed custom avatar renderings during the current billing cycle.</li>
              <li>For automatic recurring renewals, you notify customer support within 48 hours of charge.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">3. Non-Refundable Scenarios</h2>
            <p>
              To prevent abuse of cloud computing resources:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/60">
              <li>Individual credit top-up packages where credit generation has already commenced are non-refundable.</li>
              <li>Synthesized AI avatars, custom voice models, and rendered MP4 video downloads cannot be refunded once processing is completed.</li>
              <li>Accounts terminated due to violations of our Acceptable Use Policy forfeit eligibility for refunds.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">4. Secure Processing via Paddle</h2>
            <p>
              All subscription order refunds are executed through our Merchant of Record, <strong>Paddle.com</strong>. Upon approval, funds are returned directly to your original payment method (Visa, Mastercard, PayPal, Apple Pay) within 5 to 10 business days.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">5. How to Request a Refund</h2>
            <p>
              To request a refund, please send an email to <span className="text-purple-400 font-mono font-bold">billing@virale.uno</span> with:
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-white/70">
              <li>Your account login email or Telegram handle.</li>
              <li>Your Paddle order transaction receipt ID.</li>
            </ol>
            <p className="text-xs text-white/50 mt-2">
              Our support team reviews and resolves all billing and refund requests within 24 hours.
            </p>
          </section>

          <section className="space-y-3 border-t border-white/10 pt-8 text-xs text-white/40">
            <p>
              Viral Studio / virale.uno · Merchant of Record: Paddle.com Market Ltd.
            </p>
            <p>
              Last Updated: September 6, 2026.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
