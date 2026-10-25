import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { GenrePicker } from '@/components/lists/GenrePicker';
import { GenresInvite } from '@/components/lists/GenresInvite';
import { saveGenresAction, dismissGenresPromptAction } from '@/lib/actions/listas';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock('@/lib/actions/listas', () => ({ saveGenresAction: vi.fn(), dismissGenresPromptAction: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

function Harness({ kids = false, initial = [] }) {
  const [value, setValue] = useState(initial);
  return <GenrePicker kids={kids} value={value} onChange={setValue} />;
}

describe('GenrePicker', () => {
  it('adulto mostra 14 gêneros', () => {
    render(<Harness />);
    expect(screen.getAllByRole('button')).toHaveLength(14);
  });

  it('Kids mostra só Infantil, Animação, Fantasia e Aventura', () => {
    render(<Harness kids />);
    expect(screen.getAllByRole('button').map((b) => b.textContent).sort()).toEqual(['Animação', 'Aventura', 'Fantasia', 'Infantil']);
  });

  it('marca com aria-pressed e alterna ao clicar', async () => {
    render(<Harness initial={['acao']} />);
    expect(screen.getByRole('button', { name: 'Ação' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Drama' }));
    expect(screen.getByRole('button', { name: 'Drama' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Ação' }));
    expect(screen.getByRole('button', { name: 'Ação' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('com name, gera um campo oculto por gênero escolhido', () => {
    const { container } = render(<GenrePicker kids={false} value={['acao', 'drama']} onChange={() => {}} name="genres" />);
    const hidden = [...container.querySelectorAll('input[type="hidden"][name="genres"]')].map((i) => i.value);
    expect(hidden).toEqual(['acao', 'drama']);
  });
});

describe('GenresInvite', () => {
  it('Salvar chama saveGenresAction com os escolhidos, atualiza a página e o convite some', async () => {
    saveGenresAction.mockResolvedValue({ ok: true, genres: ['comedia'] });
    render(<GenresInvite kids={false} />);
    expect(screen.getByRole('heading', { name: 'Do que você gosta?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Comédia' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(saveGenresAction).toHaveBeenCalledWith(['comedia']);
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Do que você gosta?' })).not.toBeInTheDocument();
  });

  it('Agora não chama dismissGenresPromptAction e o convite some', async () => {
    dismissGenresPromptAction.mockResolvedValue({ ok: true });
    render(<GenresInvite kids={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Agora não' }));
    expect(dismissGenresPromptAction).toHaveBeenCalled();
    expect(saveGenresAction).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Do que você gosta?' })).not.toBeInTheDocument();
  });
});
