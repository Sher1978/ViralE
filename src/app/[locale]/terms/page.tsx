'use client';

import React from 'react';
import { ArrowLeft, Scale, Shield, FileText } from 'lucide-react';
import { useRouter } from '@/navigation';

export default function TermsPage() {
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
            <Scale size={28} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Terms of Service & User Agreement</h1>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-400/80 mt-1">
              Viral Studio / virale.uno · Legal Service Terms
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-10 text-sm text-white/70 leading-relaxed font-medium">
          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">1. Acceptance of Terms</h2>
            <p>
              By creating an account, registering via Google or Telegram, or accessing the website <strong>virale.uno</strong> and associated application services provided by Viral Studio, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree, you must immediately cease accessing the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">2. Description of Service</h2>
            <p>
              Viral Studio is an artificial intelligence automated content creation platform. Our services include Digital DNA profiling, AI teleprompter recording, faceless video rendering, HeyGen avatar synthesis, B-roll neuro-editing, and automated multi-platform social media publishing.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">3. Merchant of Record & Billing</h2>
            <p>
              All customer subscriptions, credit package transactions, invoice processing, tax calculations, and localized payment processing are conducted by our authorized Merchant of Record, <strong>Paddle.com Market Ltd</strong> (or Tribute for specific regional messenger payments). Paddle is responsible for billing inquiries and payment compliance.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">4. Intellectual Property & Content Ownership</h2>
            <p>
              <strong>Your Content:</strong> You retain full ownership, copyright, and distribution rights to all raw media uploaded and final video/script outputs synthesized through your account. Viral Studio claims no ownership over your generated content.
            </p>
            <p>
              <strong>Platform IP:</strong> All software code, algorithms, visual layouts, trademarks, and proprietary AI prompts remain the exclusive intellectual property of Viral Studio.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">5. Acceptable Use & AI Safety Policy</h2>
            <p>
              You agree not to use the platform to generate, edit, or distribute:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/60">
              <li>Unlawful, fraudulent, defamatory, or hate speech materials.</li>
              <li>Unauthorized deepfakes, impersonations without consent, or misleading political misinformation.</li>
              <li>Malicious code, automated scraping bots, or attempts to reverse engineer system prompt logic.</li>
            </ul>
            <p className="text-xs text-red-400/80 font-semibold mt-2">
              Violation of the Acceptable Use Policy results in immediate account termination without refund and permanent IP/Telegram blocking.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">6. AI Disclaimer & Limitation of Liability</h2>
            <p>
              The service is provided &quot;as is&quot; and &quot;as available&quot;. While our algorithms achieve high fidelity, artificial intelligence outputs may occasionally contain inaccuracies. Viral Studio is not liable for indirect, incidental, or consequential damages resulting from AI-generated scripts, video rendering delays, or third-party social media platform algorithm changes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">7. Account Termination & Data Purge</h2>
            <p>
              You may terminate your account at any time using the self-service <strong>Delete Account (GDPR Art. 17)</strong> feature in your Profile settings. Upon confirmation, all your data will be permanently purged in accordance with our Privacy Policy.
            </p>
          </section>

          <section className="space-y-3 border-t border-white/10 pt-8 text-xs text-white/40">
            <p>
              Governing Legal Jurisdiction: Individual Entrepreneur &quot;Sher&quot;, Tbilisi, Georgia.
            </p>
            <p>
              Official Contact: billing@virale.uno | Last Updated: September 6, 2026.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
