# JARVIS PORTFOLIO — Brief Claude Code

## La vision

Pense **Jarvis**. Pense l'interface holographique de Tony Stark. Un portail où je parle à une IA, elle me répond, elle fait apparaître des projets en 3D/cards flottantes, je les déplace au toucher sur tablette, je les jette vers le client, je les agrande d'un geste. L'IA n'est pas une feature du portail — **l'IA EST le portail**. Tout passe par elle.

Ce n'est pas un site avec une section chatbot. C'est un **cockpit IA** façon Iron Man où les projets, les données, les pitchs flottent dans l'espace et réagissent à ma voix et à mes gestes.

---

## Qui je suis

Marouane Oulabass — développeur full-stack / data engineer, ~20 ans d'expérience.  
GitHub : **MarouaneOulabass**  
Basé à Rabat, Maroc. Opère en français, anglais, arabe/darija.

---

## Ta première tâche : Audit GitHub

Avant de coder, **audite mon GitHub** (https://github.com/MarouaneOulabass) :
- Liste tous les repos publics
- Analyse le contenu, les stacks, la maturité, la dernière activité
- Identifie ce qui est montrable vs WIP/brouillon
- Croise avec les projets ci-dessous que je te donne de mémoire
- Propose-moi un inventaire consolidé avant de continuer

---

## Projets connus (de mémoire, à compléter avec l'audit)

### Déployés / Live
- **Corner Mobile AI Assistant** — Assistant IA trilingue (FR/Darija/AR) pour retail mobile, intégration Loyverse, voice input. Live sur GitHub Pages.
- **TelecomERP** — ERP SaaS Odoo 17 pour entreprises télécom marocaines. Multi-tenant, assistant IA intégré. Déployé sur erp.kleanse.fr.

### En développement
- **Corner Mobile POS** — App POS custom (remplace Loyverse). IMEI tracking, impression étiquettes, multi-magasin, offline mode.

### Specs rédigées
- **Corner Check** — App diagnostic smartphone (65 tests, grading A-D, rapport PDF).

### Compétences enterprise (pas de repo public)
- **Data Warehouse & BI Pipelines** — SQL Server, Azure Data Factory, Power BI, stored procedures complexes. Environnement enterprise SGS/CertIQ.

### Concepts explorés
- AI Customer Support SaaS (voice + chat, multi-tenant)
- "Ssi" — Marketplace services à domicile Maroc
- SaaS Factory
- Deal Detection System (arbitrage e-commerce)

---

## L'expérience utilisateur que je veux

### Au lancement
Le portail s'ouvre sur un écran sombre style HUD. L'IA se manifeste — une présence visuelle (orbe, onde, grille, peu importe — trouve le truc qui claque). Elle salue. On sent qu'on est dans un cockpit, pas sur un site web.

### L'interaction principale
**Je parle à l'IA** (texte ou voix). Exemples de ce que je lui dis :

- *"Mon prospect est une boîte télécom qui galère avec le suivi de rentabilité de ses projets"*
  → L'IA fait apparaître TelecomERP en card flottante, avec un pitch adapté. Si d'autres projets sont pertinents, ils apparaissent aussi, ordonnés par pertinence.

- *"Montre-moi tout"*
  → Tous les projets visibles apparaissent en grille/constellation flottante.

- *"Cache Corner Check, c'est pas prêt"*
  → Le projet disparaît avec une animation. L'IA confirme.

- *"Prépare-moi un pitch pour un client retail qui veut digitaliser son magasin"*
  → L'IA compose un pitch en temps réel, le texte apparaît façon hologramme, prêt à copier.

- *"Zoom sur le POS"*
  → La card POS s'agrandit, révèle les détails : stack, features, démo, GitHub.

### Les gestes (tablette / tactile)
- **Drag & drop** les cards de projets — les repositionner dans l'espace
- **Pinch to zoom** sur une card pour voir les détails
- **Swipe away** pour masquer temporairement un projet
- **Tap** pour ouvrir le détail
- Les cards ont une **physique** — elles bougent avec inertie, rebondissent légèrement

### L'IA en action permanente
L'IA n'attend pas qu'on lui parle pour être utile :
- Quand je drag un projet vers une zone "client", elle génère automatiquement un pitch
- Quand je sélectionne plusieurs projets, elle trouve le fil conducteur et propose un narratif
- Elle peut suggérer : *"Pour ce type de client, je recommande aussi de montrer vos compétences Data/BI"*

---

## Ce que le portail doit accomplir

### Pour moi (utilisateur admin)
- Piloter la vitrine entièrement par l'IA et le geste
- Choisir quels projets montrer/masquer via commande vocale ou config
- Générer des pitchs client à la volée
- Impressionner un prospect en live pendant un meeting (mode démo)

### Pour un visiteur / prospect (si je partage le lien)
- Il tombe sur une expérience "wow" qui montre immédiatement le niveau technique
- Il peut explorer les projets
- Il comprend en 10 secondes qu'il a affaire à quelqu'un qui maîtrise l'IA
- Le portail lui-même est la meilleure démo de ce qu'on sait faire

---

## Contraintes

- **Hébergement & stack** — À toi de choisir le meilleur setup. Vercel, Cloudflare, VPS Hetzner (j'en ai un : 65.108.146.17, Ubuntu 24.04), GitHub Pages, peu importe. Pareil pour l'IA : Claude API, OpenAI, modèle local, mix — choisis ce qui donne le meilleur résultat pour l'expérience décrite. La seule contrainte : que ça tourne vite, que ce soit déployable facilement, et que la clé API ne soit pas exposée côté client.
- **Tactile first** — optimisé tablette, mais doit fonctionner desktop et mobile
- **Performance** — les animations doivent être fluides, 60fps. Pas de saccade.
- **Le design doit évoquer Jarvis / Iron Man** sans être un cosplay cheap. Pas un skin par-dessus un framework. Quelque chose de pro, original, qui impressionne.
- Couleurs de référence (adapte librement) : bleu #4AAFD5, vert #6DB33F

---

## Ce que je ne veux PAS

- Un site web classique avec un chatbot en bas à droite
- Un truc qui ressemble à un template
- Des animations qui lagguent
- Que tu me demandes de valider chaque étape — ship le truc
- Un résultat "placeholder" ou "v0.1 minimaliste" — c'est une vitrine client, ça doit être spectaculaire au premier contact

---

## Inspirations visuelles (pas à copier, à dépasser)

- Les HUD de Iron Man / Avengers (évidemment)
- Les interfaces de Minority Report (gestes + data flottante)
- Les dashboards cyberpunk de Blade Runner 2049
- Les UI de Westworld (élégance + data)
- Les demos Three.js/WebGL les plus impressionnantes que tu connais

---

## Évolutions futures (contexte, pas pour maintenant)

- Fetch automatique des stats GitHub (stars, commits récents)
- Mode présentation fullscreen pour meetings (slides auto-générées par l'IA)
- Reconnaissance vocale native (Web Speech API)
- Multi-langue FR/EN à la volée
- Partage de "vue client" : je compose une sélection et j'envoie un lien unique au prospect avec juste ses projets
