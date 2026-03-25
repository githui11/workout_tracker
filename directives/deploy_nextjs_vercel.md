# Deploy Next.js App to Vercel

## Goal
Troubleshoot and resolve deployment issues for Next.js apps on Vercel.

## Common Issues & Fixes

### 1. 404: NOT_FOUND (Vercel platform-level)
This is a Vercel routing error, not a Next.js error. Check these in order:

1. **Framework Preset** — Go to Vercel Project → Settings → General → Framework Preset. Must be set to **Next.js**, not "Other". If set to "Other", Vercel treats the app as static files and can't route server-rendered pages or API routes. Fix: change to Next.js, then redeploy.

2. **Root Directory** — Should be empty/blank if the Next.js app is at the repo root. If the app is in a subdirectory (e.g., `apps/web`), set that path here.

3. **Node.js Version** — Next.js 16+ requires Node.js **20.9+**. Check Settings → General → Node.js Version.

4. **Environment Variables** — `.env*` files are gitignored by default. Any env vars the app needs (e.g., `DATABASE_URL`) must be added in Vercel Project → Settings → Environment Variables. Enable for Production, Preview, and Development.

### 2. "This page couldn't load" (runtime crash after deploy)
The app loads but crashes. Most common cause: **database tables don't exist yet**.

- If the app has a setup/seed endpoint (e.g., `/api/setup`), hit it once after the first deploy: `https://<deployment-url>/api/setup`
- Check Vercel Functions logs (Deployments → click deployment → Functions tab) for the actual error.

### 3. Build Failure
Check the build logs in Vercel (Deployments → click deployment → Building/Logs).

Common causes:
- TypeScript errors that only surface during `next build`
- Missing dependencies (check `package.json`)
- Next.js 16 uses Turbopack by default for builds. If there's a custom `webpack` config, the build will fail. Either remove the webpack config, use `--turbopack` flag, or add `--webpack` flag to the build script.

## Deployment Checklist (New Project)
1. Push code to GitHub
2. Import repo in Vercel
3. Set Framework Preset to **Next.js**
4. Add all required environment variables
5. Deploy
6. Run any setup/seed endpoints if needed (e.g., `/api/setup`)
7. Verify the app loads

## Key Details
- Vercel project URL format: `project-xxxx.vercel.app` (project-level) or `appname-xxxxx-username.vercel.app` (deployment-level)
- Build logs are the first place to check — if the build succeeds but the app 404s, it's almost always the Framework Preset
- `.env.local` is gitignored — always configure env vars in Vercel dashboard for deployments
