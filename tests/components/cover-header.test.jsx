import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CoverHeader } from '@/components/lists/CoverHeader';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/lib/actions/conta', () => ({ saveCoverAction: vi.fn() }));

const profile = { name: 'Pai', color: '#0ea5e9', kind: 'adulto', avatar: 'acai' };
const counts = { favoritos: 12, assistindo: 3, assistidos: 41 };
const cover = { type: 'movie', id: 1, title: 'Duna', backdropPath: '/duna.jpg', certification: '12', accent: { dark: '#aabbcc', light: '#112233' } };

describe('CoverHeader', () => {
  it('sem capa: faixa na cor do tema, sem imagem, com avatar, nome e contagens', () => {
    const { container } = render(<CoverHeader profile={profile} cover={null} counts={counts} options={[]} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg[data-avatar="acai"]')).not.toBeNull();
    expect(screen.getByText('Pai')).toBeInTheDocument();
    expect(screen.getByText('12 favoritos · 3 assistindo · 41 já assistidos')).toBeInTheDocument();
  });

  it('contagens no singular', () => {
    render(<CoverHeader profile={profile} cover={null} counts={{ favoritos: 1, assistindo: 0, assistidos: 1 }} options={[]} />);
    expect(screen.getByText('1 favorito · 0 assistindo · 1 já assistido')).toBeInTheDocument();
  });

  it('com capa: imagem decorativa do TMDB e as cores da capa no estilo da faixa', () => {
    const { container } = render(<CoverHeader profile={profile} cover={cover} counts={counts} options={[]} />);
    const img = container.querySelector('img');
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('src')).toContain('/duna.jpg');
    const band = container.querySelector('[data-cover]');
    expect(band.getAttribute('data-cover')).toBe('imagem');
    expect(band.style.getPropertyValue('--cover-accent-dark')).toBe('#aabbcc');
    expect(band.style.getPropertyValue('--cover-accent-light')).toBe('#112233');
  });

  it('capa sem cor própria: sem variáveis de cor (vale a do tema)', () => {
    const { container } = render(<CoverHeader profile={profile} cover={{ ...cover, accent: null }} counts={counts} options={[]} />);
    expect(container.querySelector('[data-cover]').style.getPropertyValue('--cover-accent-dark')).toBe('');
  });

  it('com imagem, a faixa é sempre escura (como o destaque do Início): o texto branco tem contraste até no tema Claro', () => {
    const { container } = render(<CoverHeader profile={profile} cover={cover} counts={counts} options={[]} />);
    const sombra = container.querySelector('[data-testid="capa-sombra"]').className;
    expect(sombra).toContain('from-[var(--hero-bg)]');
    expect(sombra).not.toContain('from-[var(--bg)]');
    expect(container.querySelector('[data-cover]').className).toContain('bg-[var(--hero-bg)]');
  });

  it('no Modo sensorial calmo, a sombra sobre a imagem fica mais forte', () => {
    const { container } = render(<CoverHeader profile={profile} cover={cover} counts={counts} options={[]} />);
    expect(container.querySelector('[data-testid="capa-sombra"]').className).toMatch(/calm:/);
  });

  it('"Editar capa" abre o painel', async () => {
    render(<CoverHeader profile={profile} cover={null} counts={counts} options={[]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Editar capa' }));
    expect(screen.getByRole('dialog', { name: 'Capa do perfil' })).toBeInTheDocument();
  });
});
