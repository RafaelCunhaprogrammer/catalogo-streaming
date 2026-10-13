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
    expect(screen.getByRole('img', { name: 'Filme 1 (2020)' })).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w500/p1.jpg');
    expect(screen.getByLabelText('Nota 7.3 de 10')).toBeInTheDocument();
  });

  it('sem imagem mostra um cartaz neon com o nome', () => {
    render(<PosterCard title={title(2, { type: 'tv', posterPath: null, year: null, rating: null })} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/serie/2');
    expect(screen.getByTestId('poster-fallback')).toHaveTextContent('Filme 2');
    expect(screen.queryByLabelText(/^Nota/)).not.toBeInTheDocument();
  });
});

describe('Row', () => {
  it('mostra o título, o link Ver tudo e os cartazes', () => {
    render(<Row title="Em alta na Netflix" href="/explorar?plataforma=8" items={[title(1), title(2)]} />);
    expect(screen.getByRole('region', { name: 'Em alta na Netflix' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver tudo: Em alta na Netflix' })).toHaveAttribute('href', '/explorar?plataforma=8');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('mostra o logo da plataforma ao lado do título', () => {
    const { container } = render(<Row title="Em alta na Netflix" logoPath="/n.png" items={[title(1)]} />);
    const logo = container.querySelector('h2 img');
    expect(logo).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w154/n.png');
    expect(logo).toHaveAttribute('alt', '');
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

describe('MoodPicker com imagens', () => {
  it('cada humor vira um cartão com a imagem de fundo do filme', () => {
    const cards = [{ slug: 'rir', label: 'Rir', icon: 'Laugh', backdropPath: '/rir.jpg', filmTitle: 'Filme Engraçado' }, { slug: 'medo', label: 'Sentir medo', icon: 'Ghost', backdropPath: null, filmTitle: null }];
    const { container } = render(<MoodPicker cards={cards} />);
    expect(screen.getByRole('link', { name: 'Rir' })).toHaveAttribute('href', '/explorar?humor=rir');
    expect(container.querySelector('a[href="/explorar?humor=rir"] img')).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w780/rir.jpg');
    expect(container.querySelector('a[href="/explorar?humor=medo"] img')).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(2);
    // ao passar o mouse ou focar, aparece o nome do filme da imagem
    expect(screen.getByText('Na imagem: Filme Engraçado')).toHaveClass('group-hover:opacity-100', 'group-focus-visible:opacity-100');
    expect(screen.queryByText(/Na imagem:/, { selector: 'a[href="/explorar?humor=medo"] *' })).not.toBeInTheDocument();
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
