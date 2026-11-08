import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CoverHeader } from '@/components/lists/CoverHeader';
import { saveCoverAction } from '@/lib/actions/conta';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock('@/lib/actions/conta', () => ({ saveCoverAction: vi.fn() }));

const profile = { name: 'Pai', color: '#0ea5e9', kind: 'adulto', avatar: 'acai' };
const counts = { favoritos: 2, assistindo: 0, assistidos: 0 };
const options = [
  { type: 'movie', id: 1, title: 'Duna', backdropPath: '/duna.jpg' },
  { type: 'tv', id: 2, title: 'Ruptura', backdropPath: '/ruptura.jpg' },
];
const cover = { type: 'movie', id: 1, title: 'Duna', backdropPath: '/duna.jpg', certification: '12', accent: null };

const open = async (props) => {
  render(<CoverHeader profile={profile} counts={counts} options={options} cover={null} {...props} />);
  await userEvent.click(screen.getByRole('button', { name: 'Editar capa' }));
  return screen.getByRole('dialog', { name: 'Capa do perfil' });
};

beforeEach(() => vi.clearAllMocks());

describe('painel "Capa do perfil"', () => {
  it('sem favoritos com imagem: a opção do favorito fica desligada, com o aviso', async () => {
    await open({ options: [] });
    expect(screen.getByRole('radio', { name: 'Filme ou série favorito' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Usar página padrão' })).toBeChecked();
    expect(screen.getByText('Favorite um filme ou série para usá-lo como capa.')).toBeInTheDocument();
  });

  it('com capa, abre com ela marcada; escolher outro favorito e salvar aplica e recarrega', async () => {
    saveCoverAction.mockResolvedValue({ ok: true });
    await open({ cover });
    expect(screen.getByRole('radio', { name: 'Filme ou série favorito' })).toBeChecked();
    expect(screen.getByLabelText('Favorito da capa')).toHaveValue('movie-1');
    await userEvent.selectOptions(screen.getByLabelText('Favorito da capa'), 'tv-2');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(saveCoverAction).toHaveBeenCalledWith({ type: 'tv', id: 2 });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('"Usar página padrão" salva sem capa', async () => {
    saveCoverAction.mockResolvedValue({ ok: true });
    await open({ cover });
    await userEvent.click(screen.getByRole('radio', { name: 'Usar página padrão' }));
    expect(screen.queryByLabelText('Favorito da capa')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(saveCoverAction).toHaveBeenCalledWith(null);
  });

  it('erro ao salvar: avisa e o painel continua aberto', async () => {
    saveCoverAction.mockResolvedValue({ ok: false, error: 'salvar' });
    await open();
    await userEvent.click(screen.getByRole('radio', { name: 'Filme ou série favorito' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar. Tente de novo.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('perfil trocado em outra aba: vai para "Quem está assistindo?"', async () => {
    saveCoverAction.mockResolvedValue({ ok: false, error: 'perfil' });
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/perfis'));
  });

  it('Esc fecha e devolve o foco ao botão "Editar capa"', async () => {
    await open();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar capa' })).toHaveFocus();
  });
});
