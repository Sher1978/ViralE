'use client';

import React from 'react';
import { ArrowLeft, Shield, Scale, Lock, FileText, CheckCircle2 } from 'lucide-react';
import { useRouter } from '@/navigation';

export default function PrivacyPage() {
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
            <Shield size={28} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Privacy Policy & Personal Data Protection</h1>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-400/80 mt-1">
              Compliant with the Law of Ukraine &quot;On Protection of Personal Data&quot; No. 2297-VI
            </p>
          </div>
        </div>

        {/* Legal Preamble */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
            <Scale size={18} /> Legal Basis & Scope
          </div>
          <p className="text-xs text-white/70 leading-relaxed font-medium">
            This Privacy Policy sets out the procedure for collecting, processing, storing, and protecting personal data by 
            <strong> Viral Studio / virale.uno</strong> (hereinafter referred to as the &quot;Controller&quot;). This policy is formulated in strict accordance 
            with the <strong>Law of Ukraine &quot;On Protection of Personal Data&quot; dated June 1, 2010, No. 2297-VI</strong> (as amended) and applicable international 
            data protection regulations (GDPR).
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-10 text-sm text-white/70 leading-relaxed font-medium">
          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-wide text-white flex items-center gap-2">
              <span className="text-purple-400">1.</span> Personal Data Controller
            </h2>
            <p>
              The owner and controller of personal data collected through the service is <strong>Viral Studio (virale.uno)</strong>.
              For all matters regarding personal data processing, consent withdrawal, or exercising your rights as a data subject under Article 8 of the Law of Ukraine No. 2297-VI, please contact our dedicated Data Protection Officer at:
            </p>
            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs font-mono text-purple-300">
              Email: billing@virale.uno | Support Telegram: @Viralengin_bot
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-wide text-white flex items-center gap-2">
              <span className="text-purple-400">2.</span> Categories of Collected Personal Data
            </h2>
            <p>
              Under Article 6 of the Law of Ukraine &quot;On Protection of Personal Data&quot;, we process only personal data that is adequate, relevant, and necessary for specified processing purposes:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/60">
              <li><strong>Identification & Account Data:</strong> Full name, email address, profile picture URL, unique user ID.</li>
              <li><strong>Social & Messenger Identifiers:</strong> Unique Telegram ID and Telegram username for authentication and video delivery.</li>
              <li><strong>Technical & System Data:</strong> IP address, device model, operating system version, browser parameters, session cookies, and local IndexedDB cache metadata.</li>
              <li><strong>Uploaded Media & Inputs:</strong> User-provided video recordings, voice samples, script inputs, and Digital DNA content generation preferences.</li>
              <li><strong>Billing Metadata:</strong> Subscription status, credit transaction logs, and payment metadata. <em>Note: Raw payment card numbers are processed exclusively by our PCI-DSS certified Merchant of Record (Paddle / Tribute).</em></li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-wide text-white flex items-center gap-2">
              <span className="text-purple-400">3.</span> Purposes of Personal Data Processing
            </h2>
            <p>
              Personal data is collected and processed for the following legitimate purposes:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/60">
              <li>Providing and maintaining access to the Viral Studio AI content generation platform.</li>
              <li>User authentication, account security, fraud prevention, and session synchronization across web and mobile (PWA).</li>
              <li>Processing AI video synthesis, voice generation, avatar rendering, and script customization.</li>
              <li>Delivering rendered video materials, scripts, and status alerts directly via our official Telegram bot.</li>
              <li>Processing paid subscriptions, credit balance management, and customer support communications.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-4 border-l-2 border-purple-500/50 pl-5">
            <h2 className="text-lg font-black uppercase tracking-wide text-white flex items-center gap-2">
              <span className="text-purple-400">4.</span> Rights of the Data Subject (Article 8 of Law No. 2297-VI)
            </h2>
            <p className="text-white/90 font-semibold">
              In accordance with Article 8 of the Law of Ukraine &quot;On Protection of Personal Data&quot;, as a data subject, you have the right:
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-white/70">
              <li>To know about the sources of collection, location of your personal data, location of the controller or processor, or to issue a corresponding mandate for obtaining this information.</li>
              <li>To receive information about the conditions for granting access to personal data, including information about third parties to whom your personal data is transferred.</li>
              <li>To access your personal data.</li>
              <li>To receive a response regarding whether your personal data is being processed, as well as to receive the contents of such personal data no later than thirty calendar days from the date of receipt of the request.</li>
              <li>To submit a reasoned demand to the controller objecting to the processing of your personal data.</li>
              <li>To submit a reasoned demand regarding the modification or destruction of your personal data by any controller if these data are processed unlawfully or are inaccurate.</li>
              <li>To protect your personal data from unlawful processing and accidental loss, destruction, or damage due to intentional concealment or failure to provide data.</li>
              <li>To file complaints regarding the processing of your personal data to the Ukrainian Parliament Commissioner for Human Rights (Ombudsman) or to a court.</li>
              <li>To apply legal remedies in case of violation of legislation on personal data protection.</li>
              <li>To withdraw consent to the processing of personal data at any time.</li>
            </ol>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-wide text-white flex items-center gap-2">
              <span className="text-purple-400">5.</span> Third-Party Data Transfers & Security
            </h2>
            <p>
              We do not sell, rent, or trade your personal data. Data may be shared strictly with authorized infrastructure processors necessary to provide the service:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/60">
              <li><strong>Supabase Inc.:</strong> Encrypted cloud database and authentication provider.</li>
              <li><strong>AI Synthesis Partners (Fal.ai, Anthropic, HeyGen, Groq):</strong> Used solely for script generation, image synthesis, and avatar rendering under strict confidentiality terms.</li>
              <li><strong>Paddle / Tribute:</strong> PCI-DSS compliant payment processing partners.</li>
            </ul>
            <p className="text-xs text-white/50 mt-2">
              We implement industry-standard encryption protocols (TLS/HTTPS), strict access controls, and automated rate-limiting to protect your data against unauthorized access or disclosure.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-wide text-white flex items-center gap-2">
              <span className="text-purple-400">6.</span> Consent & Data Retention
            </h2>
            <p>
              By registering an account, checking the explicit consent box during registration, or connecting your Telegram profile, you grant your free, informed, and explicit consent to the processing of your personal data as outlined in this Policy.
            </p>
            <p>
              Personal data is stored for the duration of your active account registration. Upon receipt of an account deletion request or consent revocation sent to <strong>billing@virale.uno</strong>, all associated user data and uploaded media assets will be permanently purged within 14 calendar days.
            </p>
          </section>

          {/* Footer Metadata */}
          <section className="space-y-3 border-t border-white/10 pt-8 text-xs text-white/40">
            <p>
              Official Document Version: 2.0 (English Edition) | Effective Date: September 6, 2026.
            </p>
            <p>
              Viral Studio / virale.uno · Formatted under the Law of Ukraine &quot;On Protection of Personal Data&quot; No. 2297-VI.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
