export interface Project {
  id: string;
  name: string;
  tagline: string;
  description: string;
  stack: string[];
  status: 'live' | 'development' | 'spec' | 'concept';
  statusLabel: string;
  category: string;
  github?: string;
  demo?: string;
  highlights: string[];
  visible: boolean;
}

export interface GitHubInfo {
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  pushedAt: string;
  updatedAt: string;
  topics: string[];
  archived: boolean;
  size: number;
}

export function extractRepoName(githubUrl?: string): string | null {
  if (!githubUrl) return null;
  const m = githubUrl.match(/github\.com\/[^/]+\/([^/?#]+)/i);
  return m ? m[1].toLowerCase() : null;
}

export const projects: Project[] = [
  {
    id: 'corner-mobile-pos',
    name: 'Corner Mobile POS',
    tagline: 'ERP SaaS multi-tenant pour le retail mobile',
    description:
      'Système POS complet avec suivi IMEI, gestion multi-magasin, impression étiquettes, comptabilité intégrée et assistant IA. 15 modules couvrant toute la chaîne de valeur retail.',
    stack: ['Next.js 14', 'TypeScript', 'Supabase', 'Claude AI', 'Tailwind CSS'],
    status: 'development',
    statusLabel: 'En développement',
    category: 'ERP / Retail',
    github: 'https://github.com/MarouaneOulabass/corner-mobile-pos',
    demo: 'https://corner-mobile-pos.vercel.app',
    highlights: [
      'IMEI tracking & gestion stock avancée',
      '15 modules métier intégrés',
      'Assistant IA intégré pour aide à la vente',
      'Mode offline pour continuité opérationnelle',
    ],
    visible: true,
  },
  {
    id: 'telecom-erp',
    name: 'TelecomERP',
    tagline: 'ERP vertical Odoo 17 pour les télécoms marocaines',
    description:
      'ERP SaaS bâti sur Odoo 17, conçu spécifiquement pour les entreprises télécom au Maroc. Multi-tenant, 12 modules custom, 359 tests BDD, assistant IA intégré.',
    stack: ['Python', 'Odoo 17', 'PostgreSQL', 'Docker', 'IA'],
    status: 'live',
    statusLabel: 'Déployé',
    category: 'ERP / Télécom',
    github: 'https://github.com/MarouaneOulabass/TelecomERP',
    demo: 'https://erp.kleanse.fr',
    highlights: [
      '12 modules Odoo custom',
      '359 tests BDD automatisés',
      'Multi-tenant SaaS',
      'Suivi rentabilité projets télécom',
    ],
    visible: true,
  },
  {
    id: 'corner-mobile-assistant',
    name: 'Corner Mobile AI Assistant',
    tagline: 'Assistant IA trilingue pour le retail mobile',
    description:
      'PWA d\'assistant IA trilingue (FR/Darija/AR) pour les boutiques de téléphonie. Intégration Loyverse, saisie vocale, multi-rôles, propulsé par Claude API.',
    stack: ['HTML/JS', 'Claude API', 'PWA', 'Voice Input', 'Loyverse API'],
    status: 'live',
    statusLabel: 'Live',
    category: 'IA / Retail',
    github: 'https://github.com/MarouaneOulabass/corner-mobile-assistant',
    demo: 'https://marouaneoulabass.github.io/corner-mobile-assistant',
    highlights: [
      'Trilingue : Français, Darija, Arabe',
      'Saisie vocale native',
      'Intégration POS Loyverse',
      'PWA installable sur mobile',
    ],
    visible: true,
  },
  {
    id: 'btp-manager',
    name: 'BTP Manager',
    tagline: 'ERP pour les entreprises de construction marocaines',
    description:
      'ERP spécialisé BTP couvrant les achats, la logistique, la gestion du parc matériel et le suivi carburant. Adapté aux workflows des entreprises de construction au Maroc.',
    stack: ['Next.js', 'TypeScript', 'Vercel'],
    status: 'development',
    statusLabel: 'En développement',
    category: 'ERP / Construction',
    github: 'https://github.com/MarouaneOulabass/btp-manager',
    demo: 'https://btp-manager-sigma.vercel.app',
    highlights: [
      'Modules Achats & Logistique',
      'Gestion du parc matériel',
      'Suivi carburant',
      'Adapté au marché marocain',
    ],
    visible: true,
  },
  {
    id: 'callcenter-ai',
    name: 'CallCenter AI',
    tagline: 'SaaS de centre d\'appels propulsé par l\'IA',
    description:
      'Plateforme SaaS de centre d\'appels augmentée par l\'intelligence artificielle. Gestion des conversations voice + chat, routage intelligent, analytics en temps réel.',
    stack: ['TypeScript', 'Next.js', 'IA', 'WebRTC'],
    status: 'development',
    statusLabel: 'En développement',
    category: 'SaaS / IA',
    github: 'https://github.com/MarouaneOulabass/callcenter-ai',
    highlights: [
      'Voice + Chat unifié',
      'Routage intelligent par IA',
      'Analytics temps réel',
      'Multi-tenant SaaS',
    ],
    visible: true,
  },
  {
    id: 'markai-platform',
    name: 'MarkAI Platform',
    tagline: 'Plateforme d\'automatisation marketing IA',
    description:
      'SaaS de marketing automation propulsé par l\'IA. Génération de contenu, planification de campagnes, analytics avancés, le tout piloté par intelligence artificielle.',
    stack: ['TypeScript', 'Next.js', 'IA', 'SaaS'],
    status: 'development',
    statusLabel: 'En développement',
    category: 'SaaS / Marketing',
    github: 'https://github.com/MarouaneOulabass/markai-platform',
    highlights: [
      'Génération de contenu IA',
      'Planification de campagnes',
      'Analytics marketing avancés',
      'Architecture multi-tenant',
    ],
    visible: true,
  },
  {
    id: 'servier-drug-pipeline',
    name: 'Drug Pipeline Analytics',
    tagline: 'Pipeline data engineering pour l\'industrie pharma',
    description:
      'Pipeline de données reliant médicaments, publications PubMed et essais cliniques. Conçu pour le traitement de grands volumes avec discussion Big Data (Pandas chunking, GCP/BigQuery/dbt).',
    stack: ['Python', 'Pandas', 'Data Engineering', 'GCP', 'dbt'],
    status: 'live',
    statusLabel: 'Complété',
    category: 'Data Engineering',
    github: 'https://github.com/MarouaneOulabass/servier-drug-pipeline',
    highlights: [
      'Pipeline drugs × PubMed × clinical trials',
      'Scaling Big Data documenté',
      'Architecture GCP/BigQuery/dbt',
      'Tests et documentation complète',
    ],
    visible: true,
  },
  {
    id: 'deal-hunter',
    name: 'Deal Hunter',
    tagline: 'Détection automatique d\'opportunités e-commerce',
    description:
      'Système de détection automatique de bonnes affaires sur eBay, LeBonCoin, Vinted et Catawiki. Scraping intelligent, scoring des deals, alertes en temps réel.',
    stack: ['Python', 'Scraping', 'Automation', 'APIs'],
    status: 'development',
    statusLabel: 'En développement',
    category: 'Automation / E-commerce',
    github: 'https://github.com/MarouaneOulabass/deal-hunter',
    highlights: [
      'Multi-plateforme : eBay, LBC, Vinted, Catawiki',
      'Scoring intelligent des deals',
      'Alertes en temps réel',
      'Arbitrage e-commerce automatisé',
    ],
    visible: true,
  },
  {
    id: 'corner-check',
    name: 'Corner Check',
    tagline: 'App diagnostic smartphone — 65 tests, grading A-D',
    description:
      'Application de diagnostic complet pour smartphones. 65 tests automatisés, système de grading A-D, génération de rapport PDF. Spéc complète rédigée, en attente de développement.',
    stack: ['React Native', 'TypeScript', 'PDF Generation'],
    status: 'spec',
    statusLabel: 'Spec rédigée',
    category: 'Mobile / Diagnostic',
    highlights: [
      '65 tests de diagnostic automatisés',
      'Système de grading A-D',
      'Rapport PDF professionnel',
      'Intégration Corner Mobile écosystème',
    ],
    visible: true,
  },
  {
    id: 'data-warehouse',
    name: 'Data Warehouse & BI',
    tagline: 'Pipelines BI enterprise — SQL Server, Azure, Power BI',
    description:
      'Expérience enterprise en Data Warehouse et Business Intelligence. SQL Server, Azure Data Factory, Power BI, stored procedures complexes. Environnement enterprise SGS/CertIQ.',
    stack: ['SQL Server', 'Azure Data Factory', 'Power BI', 'SSIS', 'T-SQL'],
    status: 'live',
    statusLabel: 'Enterprise',
    category: 'Data / BI',
    highlights: [
      'Pipelines Azure Data Factory',
      'Dashboards Power BI complexes',
      'Stored procedures T-SQL avancées',
      'Environnement enterprise SGS/CertIQ',
    ],
    visible: true,
  },
  {
    id: 'phone-post-generator',
    name: 'Phone Post Generator',
    tagline: 'Générateur de posts Instagram pour boutiques mobile',
    description:
      'Outil mobile-first pour générer des visuels Instagram professionnels pour les boutiques de téléphonie. Templates prêts à l\'emploi, personnalisation rapide.',
    stack: ['HTML', 'JavaScript', 'Canvas API', 'PWA'],
    status: 'live',
    statusLabel: 'Live',
    category: 'Outil / Marketing',
    github: 'https://github.com/MarouaneOulabass/phone-post-generator',
    demo: 'https://marouaneoulabass.github.io/phone-post-generator',
    highlights: [
      'Templates Instagram professionnels',
      'Mobile-first design',
      'Personnalisation instantanée',
      'Export haute résolution',
    ],
    visible: true,
  },
];

export const skills = [
  { name: 'Full-Stack Development', level: 95 },
  { name: 'Data Engineering', level: 90 },
  { name: 'IA / LLM Integration', level: 88 },
  { name: 'ERP & Business Apps', level: 92 },
  { name: 'Cloud & DevOps', level: 85 },
  { name: 'Mobile & PWA', level: 80 },
];

export const profile = {
  name: 'Marouane Oulabass',
  title: 'Full-Stack Developer & Data Engineer',
  experience: '~20 ans',
  location: 'Rabat, Maroc',
  languages: ['Français', 'English', 'العربية', 'Darija'],
  github: 'https://github.com/MarouaneOulabass',
};
