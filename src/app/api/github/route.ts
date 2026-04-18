import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 1800;

const USER = process.env.GITHUB_USER || 'MarouaneOulabass';

interface GitHubRepo {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  pushed_at: string;
  updated_at: string;
  topics?: string[];
  archived: boolean;
  fork: boolean;
  size: number;
}

export async function GET() {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'jarvis-portfolio',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(
      `https://api.github.com/users/${USER}/repos?per_page=100&sort=updated&type=owner`,
      {
        headers,
        next: { revalidate: 1800 },
      },
    );

    if (!res.ok) {
      return NextResponse.json(
        { repos: [], error: `GitHub ${res.status}`, user: USER },
        { status: 200 },
      );
    }

    const repos = (await res.json()) as GitHubRepo[];
    const enriched = repos
      .filter((r) => !r.fork)
      .map((r) => ({
        name: r.name,
        fullName: r.full_name,
        url: r.html_url,
        description: r.description,
        stars: r.stargazers_count,
        forks: r.forks_count,
        language: r.language,
        pushedAt: r.pushed_at,
        updatedAt: r.updated_at,
        topics: r.topics || [],
        archived: r.archived,
        size: r.size,
      }))
      .sort((a, b) => new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime());

    return NextResponse.json({
      repos: enriched,
      user: USER,
      syncedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { repos: [], error: String(e), user: USER },
      { status: 200 },
    );
  }
}
