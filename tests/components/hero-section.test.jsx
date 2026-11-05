import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroSection } from '@/components/HomeView';

const load = vi.hoisted(() => vi.fn());
vi.mock('@/lib/tmdb/catalog', () => ({ loadHomeHero: load }));
vi.mock('@/lib/recommendations', () => ({ getRecommendations: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/components/Hero', () => ({ Hero: ({ items }) => <p>Destaque com {items.length}</p> }));
vi.mock('@/components/MoodPicker', () => ({ MoodPicker: () => null }));
vi.mock('@/components/Row', () => ({ Row: () => null }));
vi.mock('@/components/lists/ContinueRow', () => ({ ContinueRow: () => null }));
vi.mock('@/components/lists/GenresInvite', () => ({ GenresInvite: () => null }));

describe('HeroSection', () => {
  it('com o TMDB fora do ar, oferece Tentar novamente', async () => {
    load.mockResolvedValue({ items: [], failed: true });
    render(await HeroSection({ myProviders: [] }));
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar agora.');
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('sem falha, mostra o destaque', async () => {
    load.mockResolvedValue({ items: [{ id: 1 }], failed: false });
    render(await HeroSection({ myProviders: [] }));
    expect(screen.getByText('Destaque com 1')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
