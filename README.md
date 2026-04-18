# J.A.R.V.I.S — Portfolio Cockpit

Cockpit IA façon Iron Man pour le portfolio de **Marouane Oulabass**. Ce n'est pas un site avec un chatbot : l'IA *est* le portail.

Parlez à Jarvis (voix ou texte FR/EN/AR), il orchestre les projets en constellation 3D flottante. Glissez-les, zoomez, balayez. Déposez une card sur la zone CLIENT, Jarvis génère un pitch. Sélectionnez plusieurs projets, il compose un narratif transversal. Mode présentation fullscreen pour meetings, partage d'URL figée pour prospects.

## Stack

- **Next.js 14** (App Router, edge runtime sur les routes API)
- **Claude Sonnet 4.5** (streaming, prompt caching)
- **React Three Fiber** + post-processing (bloom, chromatic aberration, vignette)
- **Framer Motion** (drag inertia, layout, pinch, swipe)
- **Tailwind CSS** (thème Jarvis custom)
- **Web Speech API** (STT multilingue + TTS)
- **Web Audio API** (sons HUD synthétisés)

## Dev

```bash
npm install
cp .env.local.example .env.local
# → Renseigner ANTHROPIC_API_KEY
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

## Variables d'environnement

| Var | Requis | Défaut | Rôle |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | oui | — | Clé Claude AI |
| `ANTHROPIC_MODEL` | non | `claude-sonnet-4-5` | Modèle Claude à utiliser |
| `GITHUB_TOKEN` | non | — | Token GitHub (5000 req/h au lieu de 60) |
| `GITHUB_USER` | non | `MarouaneOulabass` | User à auditer |
| `NEXT_PUBLIC_SITE_URL` | non | `https://jarvis-portfolio.vercel.app` | URL publique pour OG/canonical |

## Déploiement Vercel

1. `vercel link` puis `vercel env add ANTHROPIC_API_KEY`
2. (optionnel) `vercel env add GITHUB_TOKEN`
3. `vercel deploy --prod`

Ou connexion GitHub + import dans l'UI Vercel. La config `vercel.json` règle région (`cdg1`), timeouts API, headers sécurité.

## Gestes

| Action | Geste |
| --- | --- |
| Focus / détail | Tap |
| Fermer focus | Tap / Esc |
| Déplacer une card | Drag |
| Zoom card | Pinch (tactile) · Molette (desktop) |
| Masquer une card | Swipe vers le haut |
| Pitch auto | Drag sur zone CLIENT |
| Sélection multi | Maintenir 550ms |
| Narratif groupé | Sélectionner 2+ puis « Composer narratif » |
| Présentation | Bouton ▶ · flèches ← → · P pause · Esc sortir |
| Partager vue | Bouton ↗ (copie URL avec sélection + titre prospect) |

## Commandes vocales / chat

- « Montre-moi tout »
- « Prépare un pitch pour [contexte prospect] »
- « Cache [nom de projet] »
- « Zoom sur [nom de projet] »
- « Compétences data engineering »

## Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts       → Claude streaming + XML parsing
│   │   └── github/route.ts     → Audit live /users/{user}/repos
│   ├── layout.tsx              → Metadata + OG + viewport
│   ├── page.tsx                → Cockpit principal, constellation, multi-select
│   └── globals.css             → HUD styles + animations
├── components/
│   ├── AIOrb.tsx               → Orbe 3D shader R3F
│   ├── ChatInterface.tsx       → Chat streaming, voice IO, suggestions
│   ├── HUDOverlay.tsx          → Barres top/bottom, time, sound toggle
│   ├── ParticleField.tsx       → Scène R3F (étoiles, grille, bloom)
│   ├── PresentationMode.tsx    → Slides fullscreen + navigation
│   └── ProjectCard.tsx         → Card constellation gestuelle
├── data/
│   └── projects.ts             → Projets + GitHub info type
└── lib/
    ├── jarvisSound.ts          → Sons HUD Web Audio
    └── speak.ts                → TTS manager persistant
```

## Auteur

**Marouane Oulabass** — Full-stack & data engineer, ~20 ans d'XP, Rabat, Maroc.
[github.com/MarouaneOulabass](https://github.com/MarouaneOulabass)
