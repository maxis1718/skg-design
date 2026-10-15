# Repository and deployment

Repository: https://github.com/maxis1718/skg-design . Observed public on 2026-10-16 after the user enabled Pages in GitHub settings; it was previously private. Source and assets are publicly readable. The agent did not change repository visibility.

The release process is: edit focused source → local preview → check → commit → push main → deployment. Telegram to Mac mini control is already provided by the user and is outside this repository; both Codex and Claude can work with the same Git repo.

## Local / Mac mini

Node.js 20+ and Git are the only build/preview requirements. No npm install, Python, PDF tooling or account secrets are needed to build.

```sh
git clone git@github.com:maxis1718/skg-design.git
cd skg-design
npm run dev
```

Preview: http://127.0.0.1:8765 . Edit `src/`, then refresh. The preview rebuilds automatically before serving a changed source.

```sh
git pull --ff-only
# agent edits focused src files
npm run build
npm run check
git diff
git add src tools README.md RECORD_INDEX.md AGENTS.md CLAUDE.md
git commit -m "Describe the concrete design change"
git push origin main
```

Use a separate branch/worktree for simultaneous Codex/Claude tasks; do not have both modify one checkout. Never force push to resolve an ordinary conflict.

## GitHub Pages option

The user confirmed on 2026-10-16 that anyone with the website URL may view it and completed the Pages setup. `.github/workflows/pages.yml` builds/checks every main push, detects whether Pages is enabled, and deploys automatically once it is. No repository variable or deployment secret is needed.

One-time setup:

1. Settings → Pages → Source: GitHub Actions.
2. Run `Build and deploy design atlas` from Actions, choosing Re-run all jobs if a setup-only run already completed, or push the next approved change.
3. Verify the successful deployment's returned URL; do not infer success from the expected URL alone.

Until Pages is enabled, build/check still pass and the deployment job is skipped with a setup note in the workflow summary. The GitHub connector can submit source but cannot change Pages settings. The standard Actions token cannot enable Pages itself; complete the setting once using the owner account. If GitHub requests a paid plan for this private repo, use another static host rather than making the repo public.

GitHub Free permits Pages from public repos; publishing from a private repo requires a supported paid GitHub plan. A personal-repo Pages site is normally public even if the repository is private. Do not change repository visibility without a user request.

Official references:
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## Other static hosts

The build has no backend dependency and works with Cloudflare Pages, Netlify or Vercel: repository `maxis1718/skg-design`, build command `npm run build`, output directory `dist`. Choose a host/account and access policy before connecting it. A private repo does not itself make the resulting website private.

An unpublished Sites experiment was created while cross-device editing was initially interpreted as browser-based cloud editing. It was stopped after clarification. Its local `web/` prototype, dependencies and unused cloud client are ignored by this repo; no database or login service is required by the static atlas.
