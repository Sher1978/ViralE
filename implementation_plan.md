# Viral Engine by Sherlock — План Дизайна (Mobile-First)

## Дизайн-система: "Mobile-First Command Center"

### Философия
Интерфейс — это **пульт управления контент-заводом** в твоем кармане. Основной фокус на **мобильное использование** (смартфон). Эстетика — пространство iOS 26/27: супер-гладкие углы (Radius 24px+), "стеклянные" слои (Glassmorphism), глубокий космос.

### Стоимость этапов (Кредиты)
- **Сценарий:** 5 кр.
- **Раскадровка (Storyboard):** 10 кр (за 10 кадров). Регенерация кадра — 1 кр.
- **Рендер (Production):** 50 кр (Видео + Тексты + Карусель).

## Экраны (Кратко)
1.  **Dashboard (Home)**: Bottom Tab Bar (`Dash`, `Ideas`, `Projects`, `Settings`). Крупный Input для темы/ссылки. 
2.  **Onboarding**: Чат с ИИ для "ДНК голоса", запись 30-сек селфи для аватара, привязка Telegram.
3.  **Script Lab**: Блочный редактор сценария. Каждый блок (Хук, Тело, CTA) можно править или просить ИИ "сделать ироничнее".
4.  **Storyboard (Mobile)**: Вертикальная лента сгенерированных кадров. Видишь результат до оплаты рендера.
5.  **Production Hub**: Анимированный статус "Завод работает". Прогресс аватара, анимации B-roll и озвучки.
6.  **Delivery**: Ссылка на Telegram-бота + Copy-ready тексты + Zip с каруселью.
7.  **Ideas Feed**: Ежедневные 3-5 инфоповодов от ИИ-стратега.
8.  **Billing**: Пополнение кредитов (Stripe) и выбор тарифа.

## Технический стек (подготовлен к запуску)
- **Frontend**: Next.js 14, Tailwind, Shadcn, Lucide Icons.
- **Backend**: Supabase (Auth/DB), Stripe API.
- **Render Worker**: Node.js + Express + FFmpeg (отдельный микросервис).
- **Delivery**: Telegram Bot API.

## Progress Tracker
- [x] UI: fix double arrow in auth page
- [x] Auth: Implement frictionless "bot-first" registration/login
- [/] Archiving: 3-day automated archival to Telegram
    - [x] Database migration for `telegram_id` and archive fields
    - [x] `archiveService` logic
    - [x] CRON endpoint for automation
    - [ ] Webhook setup (setWebhook)
- [ ] Final Verification & Deployment

---
**Следующее действие:** Создание проекта и развертывание БД.
