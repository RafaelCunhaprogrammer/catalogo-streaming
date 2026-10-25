import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfilePicker } from '@/components/profiles/ProfilePicker';
import { ProfileManager } from '@/components/profiles/ProfileManager';
import { chooseProfileAction, createProfileAction, deleteProfileAction, updateProfileAction, saveProfileGenresAction, dismissProfileGenresAction } from '@/lib/actions/conta';
import { playOpeningSound } from '@/lib/opening-sound';
import { defaultPrefs } from '@/lib/preferences';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock('@/lib/opening-sound', () => ({ playOpeningSound: vi.fn() }));
vi.mock('@/lib/actions/conta', () => ({
  chooseProfileAction: vi.fn(),
  createProfileAction: vi.fn(),
  updateProfileAction: vi.fn(),
  deleteProfileAction: vi.fn(),
  saveProfileGenresAction: vi.fn(),
  dismissProfileGenresAction: vi.fn(),
  setPinAction: vi.fn(),
  verifyPinAction: vi.fn(),
}));

const p = (id, name, extra = {}) => ({ id, name, color: '#8b5cf6', kind: 'adulto', maxRating: null, prefs: defaultPrefs(), ...extra });

beforeEach(() => vi.clearAllMocks());

describe('Quem está assistindo?', () => {
  it('escolher um perfil toca o som de abertura e entra', async () => {
    render(<ProfilePicker profiles={[p('p1', 'Ana'), p('p2', 'Pequeno', { kind: 'kids', maxRating: '10' })]} voltar="/explorar" />);
    expect(screen.getByRole('heading', { name: 'Quem está assistindo?' })).toBeInTheDocument();
    expect(screen.getByText('Kids')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ana' }));
    expect(playOpeningSound).toHaveBeenCalled();
    expect(chooseProfileAction).toHaveBeenCalledWith('p1', '/explorar');
  });

  it('sem som no Modo calmo ou com o som desligado no perfil escolhido', async () => {
    render(<ProfilePicker profiles={[p('p1', 'Calma', { prefs: { ...defaultPrefs(), calm: true } }), p('p2', 'Mudo', { prefs: { ...defaultPrefs(), openingSound: false } })]} voltar="/" />);
    await userEvent.click(screen.getByRole('button', { name: 'Calma' }));
    await userEvent.click(screen.getByRole('button', { name: 'Mudo' }));
    expect(playOpeningSound).not.toHaveBeenCalled();
  });

  it('depois do Kids (trava), escolher um adulto abre o pedido de PIN ali mesmo', async () => {
    chooseProfileAction.mockResolvedValueOnce({ ok: false, error: 'pin' });
    render(<ProfilePicker profiles={[p('p1', 'Ana')]} voltar="/" />);
    await userEvent.click(screen.getByRole('button', { name: 'Ana' }));
    expect(await screen.findByRole('dialog', { name: 'Área de adultos' })).toBeInTheDocument();
  });

  it('ao escolher, aparece a transição com a logo no lugar da tela preta', async () => {
    chooseProfileAction.mockReturnValueOnce(new Promise(() => {}));
    render(<ProfilePicker profiles={[p('p1', 'Ana')]} voltar="/" />);
    await userEvent.click(screen.getByRole('button', { name: 'Ana' }));
    const status = screen.getByRole('status', { name: 'Entrando como Ana' });
    expect(within(status).getByRole('img', { name: "Pai d'Égua" })).toBeInTheDocument();
  });

  it('tem o atalho para gerenciar perfis', () => {
    render(<ProfilePicker profiles={[p('p1', 'Ana')]} voltar="/" />);
    expect(screen.getByRole('link', { name: 'Gerenciar perfis' })).toHaveAttribute('href', '/perfis/gerenciar');
  });
});

describe('Gerenciar perfis', () => {
  it('com 5 perfis, some o botão de adicionar e aparece o aviso', () => {
    const five = ['A', 'B', 'C', 'D', 'E'].map((n, i) => p(`p${i}`, n));
    render(<ProfileManager profiles={five} hasPin isDemo={false} />);
    expect(screen.queryByRole('button', { name: 'Adicionar perfil' })).not.toBeInTheDocument();
    expect(screen.getByText('Limite de 5 perfis.')).toBeInTheDocument();
  });

  it('o único perfil não pode ser excluído', () => {
    render(<ProfileManager profiles={[p('p1', 'Ana')]} hasPin={false} isDemo={false} />);
    expect(screen.getByRole('button', { name: 'Excluir Ana' })).toBeDisabled();
    expect(screen.getByText('A conta precisa de pelo menos um perfil.')).toBeInTheDocument();
  });

  it('criar Kids sem PIN pede para criar o PIN antes', async () => {
    createProfileAction.mockResolvedValue({ ok: false, errors: { form: 'Crie o PIN dos pais antes de criar um perfil Kids.' }, needsPin: true });
    render(<ProfileManager profiles={[p('p1', 'Ana')]} hasPin={false} isDemo={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar perfil' }));
    const form = screen.getByRole('form', { name: 'Novo perfil' });
    await userEvent.type(within(form).getByLabelText('Nome'), 'Pequeno');
    await userEvent.click(within(form).getByRole('radio', { name: 'Kids' }));
    await userEvent.selectOptions(within(form).getByLabelText('Classificação máxima'), '10');
    await userEvent.click(within(form).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('form', { name: 'Criar o PIN dos pais' })).toBeInTheDocument();
  });

  it('a faixa só aparece para perfis Kids', async () => {
    render(<ProfileManager profiles={[p('p1', 'Ana')]} hasPin isDemo={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar perfil' }));
    expect(screen.queryByLabelText('Classificação máxima')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Kids' }));
    expect(screen.getByLabelText('Classificação máxima')).toBeInTheDocument();
  });

  it('excluir pede confirmação', async () => {
    deleteProfileAction.mockResolvedValue({ ok: true });
    render(<ProfileManager profiles={[p('p1', 'Ana'), p('p2', 'Bia')]} hasPin isDemo={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Excluir Bia' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sim, excluir Bia' }));
    expect(deleteProfileAction).toHaveBeenCalledWith('p2');
  });

  it('vindo do "Editar perfil" do menu, já abre a edição daquele perfil com o nome em foco', () => {
    render(<ProfileManager profiles={[p('p1', 'Ana'), p('p2', 'Bia')]} hasPin editId="p2" voltar="/filmes" />);
    const form = screen.getByRole('form', { name: 'Editar Bia' });
    expect(within(form).getByLabelText('Nome')).toHaveFocus();
    expect(screen.queryByRole('form', { name: 'Editar Ana' })).not.toBeInTheDocument();
  });

  it('salvando a edição aberta pelo menu, volta para a página de onde veio', async () => {
    updateProfileAction.mockResolvedValue({ ok: true });
    render(<ProfileManager profiles={[p('p1', 'Ana')]} hasPin editId="p1" voltar="/filmes" />);
    const name = screen.getByLabelText('Nome');
    await userEvent.clear(name);
    await userEvent.type(name, 'Rafael');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(updateProfileAction).toHaveBeenCalled();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/filmes'));
  });

  it('um perfil de outra conta (ou inexistente) no endereço não abre nada', () => {
    render(<ProfileManager profiles={[p('p1', 'Ana')]} hasPin editId="outro" voltar="/" />);
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('depois de criar um perfil, pergunta do que a pessoa gosta; Concluir salva os gêneros do novo perfil', async () => {
    createProfileAction.mockResolvedValue({ ok: true, profileId: 'novo1' });
    saveProfileGenresAction.mockResolvedValue({ ok: true, genres: ['acao'] });
    render(<ProfileManager profiles={[p('p1', 'Ana')]} hasPin isDemo={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar perfil' }));
    await userEvent.type(screen.getByLabelText('Nome'), 'Bia');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('heading', { name: 'Do que você gosta?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ação' }));
    await userEvent.click(screen.getByRole('button', { name: 'Concluir' }));
    expect(saveProfileGenresAction).toHaveBeenCalledWith('novo1', ['acao']);
    expect(screen.queryByRole('heading', { name: 'Do que você gosta?' })).not.toBeInTheDocument();
  });

  it('Pular dispensa o convite do novo perfil', async () => {
    createProfileAction.mockResolvedValue({ ok: true, profileId: 'novo1' });
    dismissProfileGenresAction.mockResolvedValue({ ok: true });
    render(<ProfileManager profiles={[p('p1', 'Ana')]} hasPin isDemo={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar perfil' }));
    await userEvent.type(screen.getByLabelText('Nome'), 'Bia');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Pular' }));
    expect(dismissProfileGenresAction).toHaveBeenCalledWith('novo1');
    expect(screen.queryByRole('heading', { name: 'Do que você gosta?' })).not.toBeInTheDocument();
  });

  it('editar mostra os gêneros atuais marcados e envia genres no formulário', async () => {
    updateProfileAction.mockResolvedValue({ ok: true });
    render(<ProfileManager profiles={[p('p1', 'Ana', { favoriteGenres: ['drama'] })]} hasPin editId="p1" voltar="/" />);
    expect(screen.getByRole('button', { name: 'Drama' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Ação' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    const formData = updateProfileAction.mock.calls[0][1];
    expect(formData.getAll('genres')).toEqual(['acao', 'drama']);
  });
});
