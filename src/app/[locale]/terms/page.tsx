'use client';

import React from 'react';
import { ArrowLeft, Scale } from 'lucide-react';
import { useRouter } from '@/navigation';

export default function TermsPage() {
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
            <Scale size={24} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight">Terms of Service</h1>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/30 mt-1">Пользовательское соглашение</p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8 text-sm text-white/70 leading-relaxed font-medium">
          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the website <span className="text-purple-400">virale.uno</span> and the content generation services provided by Viral Studio, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use our app.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">2. Description of Service</h2>
            <p>
              Viral Studio is a professional online content automation SaaS platform that allows users to record, script, synthesize, and edit viral AI videos, reels, and shorts using specialized camera teleprompters, digital avatar syntheses, and rendering engines.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">3. Paddle Merchant of Record</h2>
            <p>
              Our order processing and subscription payments are conducted securely by our Merchant of Record, <strong>Paddle.com</strong> Market Ltd (and its affiliates). Paddle handles payment options, invoice billing, localized compliance, global tax calculations, and standard customer support inquiries related to your purchases.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">4. User Accounts and Content ownership</h2>
            <p>
              You represent that all details submitted are accurate. You maintain full ownership, licensing rights, copyright, and distribution control over all raw media uploaded and final video outputs synthesized inside the Viral Studio platform. We do not claim rights to your produced content.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">5. Acceptable Use Policy</h2>
            <p>
              You agree not to use the platform to generate illegal, hateful, defamatory, or copyright-infringing materials. Violation of this acceptable use policy may result in immediate account termination without refund.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">6. Limitation of Liability</h2>
            <p>
              Viral Studio and its services are provided "as is". We are not liable for any direct, indirect, incidental, or consequential damages resulting from your video generation, rendering speed variations, or service downtime.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">7. Governing Law & Company Information</h2>
            <p>
              These Terms of Service shall be governed by and construed in accordance with the laws of Georgia. 
              The legal provider of services is <strong>Individual Entrepreneur "Sher"</strong>, registered in Tbilisi, Georgia. 
              For any legal or compliance issues, please contact us directly at <span className="text-purple-400">billing@virale.uno</span>.
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
