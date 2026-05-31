'use client';

import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { useRouter } from '@/navigation';

export default function PrivacyPage() {
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
            <Shield size={24} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight">Privacy Policy</h1>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/30 mt-1">Политика конфиденциальности</p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8 text-sm text-white/70 leading-relaxed font-medium">
          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">1. Information We Collect</h2>
            <p>
              We collect information necessary to provide and optimize the Viral Studio content creation services. This includes:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/60">
              <li>Account details (name, email address, profile photo).</li>
              <li>Billing information processed securely through Paddle (our Merchant of Record). We do not store raw credit card details on our servers.</li>
              <li>Content and files uploaded (such as raw video/audio recordings and scripts).</li>
              <li>Technical usage data (IP address, browser type, device information, operating system).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">2. How We Use Your Information</h2>
            <p>
              We use the collected information to:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/60">
              <li>Manage and sync your content creation sessions and IndexedDB local drafts.</li>
              <li>Process AI video synthesis, voiceovers, script generation, and faceless visual styles.</li>
              <li>Secure your account access and prevent fraudulent transactions.</li>
              <li>Improve app performance, interface response, and dynamic layout compatibility.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">3. Third-Party Data Processing</h2>
            <p>
              In order to provide AI processing and secure payment checkouts, we integrate with trusted third-party providers:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/60">
              <li><strong>Paddle:</strong> Handles all subscriptions, licensing transactions, tax calculations, and secure payments as our Merchant of Record.</li>
              <li><strong>AI Providers (Fal.ai, Anthropic, HeyGen):</strong> Used solely to process script rendering, image synthesis, and avatar logic under strict data handling agreements.</li>
              <li><strong>Supabase:</strong> Cloud database provider used to sync profile versions and local workspace states securely.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">4. Data Storage and Security</h2>
            <p>
              All raw uploaded media data and project drafts are cached locally in your secure browser environment using IndexedDB (MediaBuffer) and synchronized with our Supabase encrypted database. We implement rigorous industry-standard measures to prevent unauthorized data loss, alteration, or unauthorized access.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">5. Cookies</h2>
            <p>
              We use functional cookies and session tokens to keep you securely authenticated and preserve your studio configuration preferences.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">6. Your Rights</h2>
            <p>
              You have the right to access, request rectification, or complete deletion of all personal data and uploaded video materials. For data deletion requests, contact our dedicated support team at <span className="text-purple-400">billing@virale.uno</span>.
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
