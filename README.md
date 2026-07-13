# EffyZheng.github.io

Personal website hosted on GitHub Pages.

## Tech Stack

- Static HTML / CSS / JavaScript
- GitHub Pages (hosting)

## Local Preview

Open `index.html` directly in a browser, or use a local server:

```bash
# Python
python3 -m http.server 8080

# Node (npx)
npx serve .
```

Then visit `http://localhost:8080`.

## Branch Convention

| Branch | Purpose |
|--------|---------|
| `main` | Production — auto-deployed to GitHub Pages |
| `dev` | Integration branch for ongoing work |
| `feat/<name>` | New features |
| `fix/<name>` | Bug fixes |
| `chore/<name>` | Tooling, config, non-functional changes |

All changes to `main` must go through a Pull Request. Direct push to `main` is disabled.

## Commit Convention

Follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add hero section
fix: correct mobile nav overflow
chore: update .gitignore
```
