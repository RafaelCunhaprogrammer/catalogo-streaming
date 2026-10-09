import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PosterCard } from '@/components/PosterCard';
import { Row } from '@/components/Row';
import { MoodPicker } from '@/components/MoodPicker';

const title = (id, extra = {}) => ({
  id, type: 'movie', title: `Filme ${id}`, year: 2020, posterPath: `/p${id}.jpg`, rating: 7.3, ...extra,
});

describe('PosterCard', () => {
  it('liga para a página do título e descreve o cartaz com título e ano', () => {
    render(<PosterCard title={title(1)} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/filme/1');
    expect(screen.getByRole('img', { name: 'Filme 1 (2020)' })).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w342/p1.jpg');
    expect(screen.getByText('★ 7.3')).toBeInTheDocument();
  });

  it('sem imagem mostra um cartaz neon com o nome', () => {
    render(<PosterCard title={title(2, { type: 'tv', posterPath: null, year: null, rating: null })} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/serie/2');
    expect(screen.getByTestId('poster-fallback')).toHaveTextContent('Filme 2');
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });
});

describe('Row', () => {
  it('mostra o título, o link Ver tudo e os cartazes', () => {
    render(<Row title="Em alta na Netflix" href="/explorar?plataforma=8" items={[title(1), title(2)]} />);
    expect(screen.getByRole('region', { name: 'Em alta na Netflix' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver tudo: Em alta na Netflix' })).toHaveAttribute('href', '/explorar?plataforma=8');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('as setas do teclado andam entre os cartazes', async () => {
    render(<Row title="Ação" items={[title(1), title(2), title(3)]} />);
    const links = screen.getAllByRole('link', { name: /Filme/ });
    links[0].focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(links[1]).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(links[2]).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(links[1]).toHaveFocus();
  });
});

describe('MoodPicker', () => {
  it('mostra os 8 humores ligando para o Explorar', () => {
    render(<MoodPicker />);
    expect(screen.getByRole('heading', { name: 'Como você quer se sentir hoje?' })).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(8);
    expect(screen.getByRole('link', { name: /Fé e espiritualidade/ })).toHaveAttribute('href', '/explorar?humor=fe');
  });
});
