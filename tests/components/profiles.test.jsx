import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfilePicker } from '@/components/profiles/ProfilePicker';
import { ProfileManager } from '@/components/profiles/ProfileManager';
import { chooseProfileAction, createProfileAction, deleteProfileAction } from '@/lib/actions/conta';
import { playOpeningSound } from '@/lib/opening-sound';
import { defaultPrefs } from '@/lib/preferences';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/lib/opening-sound', () => ({ playOpeningSound: vi.fn() }));
vi.mock('@/lib/actions/conta', () => ({
  chooseProfileAction: vi.fn(),
  createProfileAction: vi.fn(),
  updateProfileAction: vi.fn(),
  deleteProfileAction: vi.fn(),
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
});
