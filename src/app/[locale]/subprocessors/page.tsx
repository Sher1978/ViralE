import { getTranslations } from 'next-intl/server';
import { ShieldCheck, Server, Cpu, Database, CreditCard, Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  return {
    title: 'Data Subprocessors Registry | ViralEngine Legal Transparency',
    description: 'Complete list of third-party infrastructure and AI data processors compliant with GDPR Art. 28.',
  };
}

export default async function SubprocessorsPage({ params: { locale } }: { params: { locale: string } }) {
  const isRu = locale === 'ru';

  const subprocessors = [
    {
      name: 'Supabase Inc.',
      category: isRu ? 'База данных и аутентификация' : 'Database & User Authentication',
      location: 'EU (Frankfurt) / US',
      purpose: isRu ? 'Хранение профилей, сессий пользователей и настроек проектов.' : 'Secure storage of user profiles, auth credentials, and project metadata.',
      compliance: 'GDPR Compliant, SOC2 Type II, TLS 1.3 & Row-Level Security (RLS)',
      icon: Database,
    },
    {
      name: 'Google LLC (Gemini API)',
      category: isRu ? 'ИИ Сценарии и генерация промптов' : 'AI Scripting & Vision Prompting',
      location: 'US / Global',
      purpose: isRu ? 'Генерация структуры вирусных сценариев, заголовков и промптов.' : 'Generating script blueprints, viral titles, and visual thumbnail prompts.',
      compliance: 'GDPR Compliant, Zero Data Retention for Model Training',
      icon: Cpu,
    },
    {
      name: 'OpenAI LLC / Groq Inc.',
      category: isRu ? 'Языковые модели ИИ' : 'AI Language Processing',
      location: 'US / Global',
      purpose: isRu ? 'Оптимизация и обработка нейро-маркетинговых текстов.' : 'High-speed script refinement and tone-of-voice alignment.',
      compliance: 'Stateless API Processing, Zero-Retention Enterprise Terms',
      icon: Server,
    },
    {
      name: 'ElevenLabs Inc.',
      category: isRu ? 'ИИ Синтез речи' : 'AI Voice Synthesis',
      location: 'US / EU',
      purpose: isRu ? 'Генерация профессионального дубляжа и синтетического голоса.' : 'Generating lifelike voiceovers for video scripts.',
      compliance: 'GDPR Compliant, Voice Safety & Verification Protocols',
      icon: Cpu,
    },
    {
      name: 'Stripe Inc. / Tribute / Paddle',
      category: isRu ? 'Эквайринг и Merchant of Record' : 'Payments & Merchant of Record',
      location: 'US / EU / Global',
      purpose: isRu ? 'Обработка подписок, биллинга и счетов (без хранения номеров карт на нашем сервере).' : 'Secure processing of subscriptions and payment invoices.',
      compliance: 'PCI-DSS Level 1, GDPR Compliant, Fraud Protection',
      icon: CreditCard,
    },
    {
      name: 'Cloudflare Inc. (R2 Storage)',
      category: isRu ? 'Зашифрованное хранилище медиа' : 'Encrypted Object Storage & CDN',
      location: 'Global Edge Network',
      purpose: isRu ? 'Хранение отрендеренных видео, аудиотреков и логотипов.' : 'Secure global CDN delivery of rendered video and audio assets.',
      compliance: 'AES-256 Encryption at Rest, GDPR Compliant',
      icon: Lock,
    },
    {
      name: 'Telegram Messenger LLP',
      category: isRu ? 'Аутентификация и уведомления' : 'Bot Authentication & Messaging',
      location: 'EU / Global',
      purpose: isRu ? 'Авторизация через Telegram Bot и доставка системных уведомлений.' : 'Secure Telegram login authentication and subscription alerts.',
      compliance: 'Encrypted Telegram Bot API & Blocklist Sync',
      icon: Server,
    },
  ];

  return (
    <div className="min-h-screen bg-[#07070A] text-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Navigation */}
        <Link
          href={`/${locale}/auth`}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-purple-400 transition-colors bg-white/5 px-4 py-2 rounded-xl border border-white/10"
        >
          <ArrowLeft size={14} /> {isRu ? 'Назад к входу' : 'Back to Login'}
        </Link>

        {/* Title Header */}
        <div className="space-y-4 border-b border-white/10 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck size={16} /> GDPR Article 28 Compliance
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {isRu ? 'Реестр обработчиков данных (Subprocessors)' : 'Data Subprocessors Registry'}
          </h1>
          <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
            {isRu
              ? 'В соответствии со статьей 28 GDPR и Законом Украины № 2297-VI ниже приведен полный список сторонних компаний и облачных сервисов, используемых ViralEngine для обеспечения безопасной работы платформы.'
              : 'Pursuant to Article 28 of the GDPR and Law of Ukraine No. 2297-VI, below is the official registry of third-party sub-processors engaged by ViralEngine to process personal data.'}
          </p>
        </div>

        {/* Grid List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subprocessors.map((sub, idx) => {
            const Icon = sub.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 hover:border-purple-500/40 transition-all hover:bg-white/[0.05]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">{sub.name}</h3>
                    <span className="text-[11px] text-purple-400 font-semibold">{sub.category}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-gray-300">
                  <div>
                    <span className="text-gray-500 font-medium">{isRu ? 'Назначение: ' : 'Purpose: '}</span>
                    <span>{sub.purpose}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">{isRu ? 'Локация: ' : 'Location: '}</span>
                    <span className="text-gray-300 font-semibold">{sub.location}</span>
                  </div>
                  <div className="pt-1">
                    <span className="inline-block px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-[10px]">
                      {sub.compliance}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="p-6 rounded-2xl bg-purple-500/5 border border-purple-500/20 text-xs text-gray-400 space-y-2">
          <h4 className="font-bold text-white text-sm">{isRu ? 'Обновления и права пользователей' : 'Updates & Rights'}</h4>
          <p>
            {isRu
              ? 'Настоящий реестр регулярно обновляется. Все обработчики данных связаны официальными соглашениями (DPA). Вы имеете право отозвать согласие или запросить удаление данных в любое время через профиль или письмо на '
              : 'This registry is updated regularly as infrastructure evolves. All sub-processors operate under Data Processing Agreements (DPAs). You can exercise your right to erasure at any time via '}
            <strong className="text-purple-300">billing@virale.uno</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
