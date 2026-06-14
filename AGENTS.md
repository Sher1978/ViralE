<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deployment Workflow
- **Standard Deployment:** Always deploy by committing and pushing changes to the GitHub repository (`main` branch). This automatically triggers Vercel's production build.
- **Vercel CLI Avoidance:** Avoid running local Vercel CLI deployments (`npx vercel --prod`), as the local tokens do not have permission to access the remote linked Vercel team context.
