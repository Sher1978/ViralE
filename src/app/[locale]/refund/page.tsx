'use client';

import React from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useRouter } from '@/navigation';

export default function RefundPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F0E8] font-sans selection:bg-purple-500/30 py-20 px-5 md:px-10 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full bg-purple-500/5 filter blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-cyan-500/5 filter blur-[80px] pointer-events-none" />

      <div className="max-w-3xl mx-auto space-y-10 relative z-10">
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-white/40 hover:text-white text-xs font-black uppercase tracking-widest transition-colors"
        >
          <ArrowLeft size={16} /> На главную
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 border-b border-white/10 pb-8">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <RefreshCw size={24} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight">Refund Policy</h1>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/30 mt-1">Правила возврата средств</p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8 text-sm text-white/70 leading-relaxed font-medium">
          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">1. Core Policy</h2>
            <p>
              We want you to be fully satisfied with the premium video automation capabilities of Viral Studio. Because our rendering engine, AI script synthesis, and custom video avatar features consume high-performance GPU resources immediately upon generation, we offer refunds under the specific guidelines detailed below.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">2. Eligible Subscription Refunds</h2>
            <p>
              We provide a full <strong>14-day refund window</strong> for billing cycles if:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/60">
              <li>The account has not synthesized, generated, or rendered any AI video credits or custom avatars during the billing period.</li>
              <li>A payment was charged automatically on a recurring cycle and you contact support within 48 hours of renewal to cancel and refund.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">3. Non-Refundable Items</h2>
            <p>
              Due to substantial cloud GPU processing fees charged by our AI API pipelines:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/60">
              <li>Synthesized AI avatars, voice cloned audio clips, and final rendered videos are non-refundable once the synthesis has initiated.</li>
              <li>Subscription tiers where credit generation has already been consumed are not eligible for a prorated refund.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">4. Secure Processing via Paddle</h2>
            <p>
              All refund requests are processed securely through <strong>Paddle</strong>, our Merchant of Record. Approved refunds are returned back to your original payment method (Credit Card, PayPal, Apple Pay) within 5 to 10 business days depending on your bank's clear times.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">5. How to Request a Refund</h2>
            <p>
              To request a refund, please contact our dedicated billing and customer operations team directly by sending an email to <span className="text-purple-400">billing@virale.uno</span> with your account registration email and Paddle transaction receipt ID. We answer all refund inquiries within 24 hours.
            </p>
          </section>

          <section className="space-y-3 border-t border-white/10 pt-8">
            <p className="text-xs text-white/40">
              Last updated: May 31, 2026. Viral Studio / virale.uno.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
