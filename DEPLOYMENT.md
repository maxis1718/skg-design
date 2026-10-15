# Repository and deployment

Repository: https://github.com/maxis1718/skg-design (private).

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

`.github/workflows/pages.yml` builds/checks every main push. Publication is explicitly disabled until the repository variable `PUBLISH_SITE` equals `true`, so a push alone does not accidentally expose a private floor plan.

To enable, after the website audience is settled:

1. Settings → Pages → Source: GitHub Actions.
2. Settings → Secrets and variables → Actions → Variables → `PUBLISH_SITE=true`.
3. Run `Build and deploy design atlas` or push the next approved change.
4. Verify the successful deployment's returned URL; do not infer success from the expected URL alone.

GitHub Free permits Pages from public repos; publishing from a private repo requires a supported paid GitHub plan. A personal-repo Pages site is normally public even if the repository is private. Do not change this repository to public to work around eligibility.

Official references:
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## Other static hosts

The build has no backend dependency and works with Cloudflare Pages, Netlify or Vercel: repository `maxis1718/skg-design`, build command `npm run build`, output directory `dist`. Choose a host/account and access policy before connecting it. A private repo does not itself make the resulting website private.

An unpublished Sites experiment was created while cross-device editing was initially interpreted as browser-based cloud editing. It was stopped after clarification. Its local `web/` prototype, dependencies and unused cloud client are ignored by this repo; no database or login service is required by the static atlas.
