# Contributing to Kekeli

A lightweight workflow so history stays readable and changes are reviewable.

## Branches

- `production` is the integration branch — never commit to it directly.
- Branch per change, named by type:
  - `feat/…` new feature (e.g. `feat/meter-ocr`)
  - `fix/…` bug fix
  - `chore/…` tooling, deps, config
  - `docs/…` documentation only
  - `refactor/…` no behaviour change

## Commits — Conventional Commits

Format: `type(scope): summary`

```
feat(balance): estimate days-left from reading history
fix(sms): normalise Ghana numbers before sending
docs(readme): document balance settings
chore(ci): add typecheck + build workflow
```

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `build`, `ci`.
Keep the summary in the imperative and under ~72 chars. Reference issues in the
body or footer (`Closes #12`).

## Pull requests

1. Push your branch and open a PR into `production`.
2. Fill in the PR template; link the issue it closes.
3. Make sure `npm run build` passes (runs typecheck too).
4. Squash-merge to keep `production` history tidy.

## Before you push

```bash
npm run build   # typecheck + production build
```

Never commit secrets — `.env` is gitignored; keep real keys local and set them
as environment variables in deployment.
