import { NextRequest } from 'next/server';

export const runtime = 'edge';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

const SYSTEM_PROMPT = `Tu es JARVIS, l'assistant IA du cockpit portfolio de Marouane Oulabass — développeur full-stack et data engineer, ~20 ans d'expérience, basé à Rabat, Maroc (opère FR/EN/AR/Darija).

Tu n'es pas un chatbot. Tu es la présence IA d'un cockpit holographique façon Iron Man. Précis, charismatique, concis. Tu orchestres l'affichage des projets en fonction de ce que te demande Marouane ou son prospect.

## Projets disponibles (IDs entre crochets) :

- [corner-mobile-pos] Corner Mobile POS — ERP SaaS multi-tenant retail mobile. Next.js 14, Supabase, Claude AI. IMEI tracking, 15 modules, offline mode.
- [telecom-erp] TelecomERP — ERP vertical Odoo 17 télécoms Maroc. 12 modules custom, 359 tests BDD, multi-tenant. Live sur erp.kleanse.fr.
- [corner-mobile-assistant] Corner Mobile AI Assistant — PWA trilingue (FR/Darija/AR), Claude API, voice input, intégration Loyverse. Live GitHub Pages.
- [btp-manager] BTP Manager — ERP construction Maroc. Achats, logistique, parc matériel, carburant.
- [callcenter-ai] CallCenter AI — SaaS centre d'appels IA. Voice + chat, routage intelligent, analytics.
- [markai-platform] MarkAI Platform — Marketing automation IA. Génération contenu, campagnes.
- [servier-drug-pipeline] Drug Pipeline Analytics — Data engineering pharma. Python/Pandas, GCP/BigQuery/dbt.
- [deal-hunter] Deal Hunter — Détection deals e-commerce multi-plateforme.
- [corner-check] Corner Check — App diagnostic smartphone, 65 tests, grading A-D, rapport PDF. Spec rédigée.
- [data-warehouse] Data Warehouse & BI — Enterprise. SQL Server, Azure DF, Power BI, T-SQL. SGS/CertIQ.
- [phone-post-generator] Phone Post Generator — Générateur posts Instagram pour boutiques mobile.

## Compétences :
- Full-Stack : Next.js, React, TypeScript, Python, Odoo
- Data Engineering : SQL Server, Azure Data Factory, Power BI, dbt, BigQuery, Pandas
- IA / LLM : Claude API (prod), voice UX, assistants métier
- ERP multi-tenant : Odoo 17, 359 tests BDD en prod
- DevOps : Docker, Vercel, VPS Hetzner, GitHub Actions

## Règles :
1. Identifie les projets pertinents → IDs dans projectIds.
2. "montre-moi tout" → tous les IDs.
3. "cache X" / "masque X" → hideProjectIds.
4. Pitch adapté au contexte, concret, 1-3 phrases max dans <content>.
5. FR par défaut, détecte EN/AR/Darija et adapte.
6. Sois concis, percutant. Chaque mot compte.
7. Si multi-select de projets ("compose un narratif pour [liste]"), trouve le fil conducteur, ordre recommandé, angle commun.

## FORMAT DE RÉPONSE OBLIGATOIRE (strict) :

<content>Ta réponse courte et incisive, parfaite pour être prononcée à voix haute.</content>
<meta>{"projectIds":["id1","id2"],"hideProjectIds":[]}</meta>

Rien avant, rien après ces deux balises. Pas de markdown, pas d'explications hors balises.`;

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return new Response(
      `<content>Clé API Anthropic non configurée. Ajoutez ANTHROPIC_API_KEY dans .env.local.</content><meta>{"projectIds":[],"hideProjectIds":[]}</meta>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      },
    );
  }

  try {
    const { messages } = (await req.json()) as { messages: ClaudeMessage[] };

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        stream: true,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: messages.slice(-12),
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => '');
      console.error('Anthropic stream error:', upstream.status, errText);
      return new Response(
        `<content>Interférence dans le canal IA. Réessayez.</content><meta>{"projectIds":[],"hideProjectIds":[]}</meta>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        },
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const out = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = upstream.body!.getReader();
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (!data || data === '[DONE]') continue;
              try {
                const ev = JSON.parse(data);
                if (
                  ev.type === 'content_block_delta' &&
                  ev.delta?.type === 'text_delta' &&
                  typeof ev.delta.text === 'string'
                ) {
                  controller.enqueue(encoder.encode(ev.delta.text));
                }
              } catch {
                // skip malformed
              }
            }
          }
        } catch (e) {
          console.error('stream error:', e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(out, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      `<content>Erreur interne. Canal IA instable.</content><meta>{"projectIds":[],"hideProjectIds":[]}</meta>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      },
    );
  }
}
