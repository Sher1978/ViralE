# Библия Проекта: Viral Engine by Sherlock

## Документ 02: Техническая Архитектура и Стек (Vibe Coding Edition)



### 1. Философия "Cost-Efficiency"

Мы строим систему по принципу **"Легкая голова, тяжелые руки"**:

* **Голова (Next.js + Gemini 1.5 Flash):** Почти бесплатные операции по управлению логикой, текстом и профилями.

* **Руки (Worker + FFmpeg):** Выполнение тяжелых задач по запросу.

* **Арбитраж API:** Дорогие модели (HeyGen) используются точечно, дешевые (Gemini/Flux) — для массовых итераций.



### 2. Технологический стек

* **Frontend:** Next.js 14 (App Router), Tailwind CSS, Shadcn UI.

* **Backend:** Next.js API Routes (Serverless) — для работы с пользователями и кредитами.

* **База данных:** Supabase (PostgreSQL) — хранение Master Prompt, истории проектов и баланса кредитов.

* **AI Orchestration:** LangChain или простой SDK для связки Gemini 1.5 Flash (Логика/Идеи/Правки).

* **Render Worker:** Node.js + FFmpeg на выделенном VPS (Railway/Render) — для финальной сборки.

* **Delivery:** Telegram Bot API (в качестве бесплатного CDN).



### 3. Схема взаимодействия (Data Flow)



#### 3.1. Модуль "Viral Strategist" (Interactive Co-Pilot)

* **Технология:** Gemini 1.5 Flash (Streaming via Edge Runtime).
* **Контекст (DNA):** При каждом запросе в `System Instruction` инжектируется "Цифровая Тень" пользователя (`digital_shadow_prompt`) и отраслевой контекст (`industry_context`).
* **Интерактивность:** Реализован как постоянный чат-ассистент в Studio. Позволяет в реальном времени обсуждать сценарий, генерировать хуки и применять изменения ("Apply to Script") напрямую в манифест проекта.
* **Доступ:** 24-часовой бесплатный триал при первом обращении, далее — подписка $19/мес.



#### 3.2. Модуль "Hybrid Render" (Видео)

Здесь происходит главный арбитраж стоимости через **Animation Dispatcher**:

1. **Storyboard (0.01$):** Генерация статичных кадров через Flux 1.1.

2. **A-Roll (0.20$):** Запрос к HeyGen API (Talking Head).

3. **B-Roll / Animation (3-Tier Logic):**
   - **LITE (0cr):** "As-is" анимация через Veo 1.0/Luma. Самая низкая себестоимость. Лимитированное движение.
   - **STANDARD (25cr):** Качественная анимация через Veo 3.1 / DeepShot. Сбалансированный реализм.
   - **PREMIUM (50cr):** Лучшая на рынке анимация через Seedance/Kling/HeyGen 3.0. Максимальный липсинк и экспрессия.
   - **AI Look Polish (+10cr):** Дополнительная прогонка через апскейлер/face-fixer для премиального лоска.

#### 3.3. Модуль "Avatar Hub" (Asset Management)
*   **Source:** Хранение в Supabase Storage (bucket: `media`).
*   **Metadata:** Все загруженные фото регистрируются в таблице `media_assets` для повторного использования.
*   **Prompt Bridge (Planned):** Инструмент для генерации идеальных промптов для внешних ИИ для создания исходных фото.

4. **Voiceover (0.10$):** ElevenLabs API (Turbo v2.5).



### 4. Архитектура "Zero-Storage" (Telegram Integration)

Мы исключаем из цепочки дорогие S3 хранилища:

1. **Render Worker** собирает видео локально в папку `/temp`.

2. Бот вызывает метод `sendVideo` и передает `stream` файла напрямую в Telegram API.

3. Как только Telegram подтверждает получение (`file_id`), файл удаляется с сервера Worker'а.

4. Пользователь видит видео в боте. Если ему нужно скачать его позже — он берет его из облака Telegram, а не с нашего сервера.



### 5. Структура БД (Основные сущности)



* **`users`**: `id`, `stripe_id`, `credits_balance`.

* **`user_profiles`**: `user_id`, `master_prompt`, `industry_context`, `avatar_config_json`.

* **`media_assets`**: `id`, `user_id`, `url`, `type` (image/avatar), `metadata` (JSON), `created_at`.

* **`ideation_feed`**: `id`, `user_id`, `topic_title`, `rationale`, `status` (new/used/dismissed).

* **`projects`**: `id`, `user_id`, `status` (ideation/scripting/storyboard/rendering/completed), `animation_tier`, `selected_media_id`.

* **`project_versions`**: `id`, `project_id`, `script_data` (JSON), `created_at`.

* **`feature_access`**: `user_id`, `feature_id` (e.g. `strategist_pilot`), `trial_started_at`, `is_subscribed`, `updated_at`.



### 6. Экономика API (усредненная на 60 сек)

| Компонент | Модель | Время Использования | Оценочная Стоимость |
| :--- | :--- | :--- | :--- |
| **Сценарий/Идеи** | Gemini 1.5 Flash | ~5000 токенов | $0.0005 |
| **Аватар (Хук)** | HeyGen | 6 секунд | $0.20 |
| **B-Roll (Standard)** | Veo 3.1 | 30 секунд | $1.00 |
| **Голос** | ElevenLabs | 150 слов | $0.15 |
| **Итого себестоимость** | | | **~$1.35** |

### 8. Код-Архитектура: Atomic Studio Standard

Для поддержания высокой скорости разработки (Vibe Coding) и стабильности интерфейса, принят стандарт модульности "Atomic Studio":

1. **Декомпозиция "God Objects":** Любой файл страницы или компонента, превышающий 800-1000 строк, подлежит обязательному дроблению.
   
2. **Локальные компоненты (`_components`):** Тяжелые UI-узлы (Teleprompter, Storyboard Grid, Review Overlays) должны быть вынесены в папку `_components` внутри соответствующего роута.
   
3. **Локальные хуки (`_hooks`):** Сложная бизнес-логика, управление стейтом манифеста и захват медиа-потоков выносятся в кастомные хуки. Это обеспечивает "чистоту" UI-компонентов.
   
4. **Zero-Lag Rendering:** Изоляция высоконагруженных компонентов предотвращает ререндеринг всей страницы при частых обновлениях (например, скроллинг суфлера или таймеры записи).
   
5. **Standard for Agents:** Данная структура является эталонной для работы ИИ-агентов, обеспечивая предсказуемую навигацию и точечное внесение изменений.

