import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { TitleView } from '@/components/TitlePage';

vi.mock('next/navigation', () => ({ notFound: vi.fn() }));

const base = {
  id: 101, type: 'movie', title: 'Aventura Neon', year: 2024, overview: 'Uma aventura.',
  posterPath: '/p.jpg', backdropPath: '/b.jpg', rating: 7.8, genres: ['Ação', 'Aventura'],
  runtime: 128, seasons: null, certification: '12', trailerKey: 'abc', watchLink: 'https://tmdb/watch',
  providers: [{ id: 8, name: 'Netflix', logoPath: '/n.png' }],
  cast: [{ id: 1, name: 'Atriz Um', character: 'Heroína', profilePath: null }],
  recommendations: [{ id: 102, type: 'movie', title: 'Outra Aventura', year: 2023, posterPath: null }],
};

describe('TitleView', () => {
  it('mostra os dados principais do filme', () => {
    render(<TitleView title={base} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Aventura Neon' })).toBeInTheDocument();
    expect(screen.getByText('2h 8min')).toBeInTheDocument();
    expect(screen.getByLabelText('Classificação indicativa: 12 anos')).toHaveTextContent('12');
    expect(screen.getByText('Uma aventura.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver trailer' })).toBeInTheDocument();
  });

  it('mostra onde assistir com logo e link', () => {
    render(<TitleView title={base} />);
    const where = screen.getByRole('region', { name: 'Onde assistir' });
    expect(within(where).getByRole('img', { name: 'Netflix' })).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w92/n.png');
    expect(within(where).getByRole('link', { name: 'Ver detalhes de disponibilidade' })).toHaveAttribute('href', 'https://tmdb/watch');
  });

  it('mostra elenco e recomendações', () => {
    render(<TitleView title={base} />);
    expect(screen.getByText('Atriz Um')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Você também pode gostar' })).toBeInTheDocument();
  });

  it('série mostra temporadas e trata classificação ausente e falta de trailer', () => {
    render(<TitleView title={{ ...base, type: 'tv', runtime: null, seasons: 3, certification: null, trailerKey: null, recommendations: [] }} />);
    expect(screen.getByText('3 temporadas')).toBeInTheDocument();
    expect(screen.getByText('Classificação não informada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver trailer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Você também pode gostar' })).not.toBeInTheDocument();
  });
});
