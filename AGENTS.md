<!-- BEGIN:nextjs-agent-rules -->
# Next.js & Deployment Rules

1. **Next.js Conventions:** This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
2. **Deployment Process:** Always deploy by committing and pushing changes to the GitHub repository (`main` branch). This automatically triggers Vercel's production build.
3. **Do NOT use Vercel CLI:** Avoid running local Vercel CLI deployments (`npx vercel --prod`), as the local tokens do not have permission to access the remote linked Vercel team context.
<!-- BEGIN:telegram-bot-rules -->
# Telegram Bot Conventions
CRITICAL RULE: The official Telegram bot username for ViralEngine is `@Viralengin_bot` (link: https://t.me/Viralengin_bot).
NEVER use `@Virale_bot` or `@ViralE_bot`. Always use or fallback to `Viralengin_bot`.
<!-- END:telegram-bot-rules -->

