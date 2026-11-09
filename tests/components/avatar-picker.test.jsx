import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AvatarPicker } from '@/components/profiles/AvatarPicker';

afterEach(() => vi.restoreAllMocks());

describe('AvatarPicker', () => {
  it('quatro grupos com os nomes dos avatares, mais "Só a inicial"', () => {
    render(<AvatarPicker kind="adulto" color="#8b5cf6" value="acai" onChange={() => {}} />);
    const grupos = screen.getAllByRole('group').filter((g) => g.tagName === 'FIELDSET' && g.querySelector('legend'));
    expect(grupos.map((g) => g.querySelector('legend').textContent)).toEqual(['Avatar', 'Sua foto', 'Frutas e símbolos do Pará', 'Bichos da Amazônia', 'Lendas do Pará', 'Sabores e festas do Pará']);
    expect(screen.getByRole('radio', { name: 'Açaí' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Só a inicial' })).not.toBeChecked();
    expect(screen.getAllByRole('radio')).toHaveLength(28);
  });

  it('cada grupo é uma fileira horizontal, que rola de lado em vez de quebrar a linha', () => {
    render(<AvatarPicker kind="adulto" color="#8b5cf6" value="acai" onChange={() => {}} />);
    const fileiras = [...document.querySelectorAll('[data-avatar-row]')];
    expect(fileiras).toHaveLength(5);
    // fieldset não encolhe abaixo do conteúdo por padrão: sem min-w-0, a fileira empurra a página para fora da tela
    for (const fs of document.querySelectorAll('fieldset')) expect(fs.className).toContain('min-w-0');
    for (const f of fileiras) {
      expect(f.className).toContain('flex-nowrap');
      expect(f.className).toContain('overflow-x-auto');
    }
  });

  it('adulto tem a fileira "Sua foto"; o Kids não', () => {
    const { unmount } = render(<AvatarPicker kind="adulto" color="#8b5cf6" value="acai" onChange={() => {}} onPhoto={() => {}} />);
    expect(screen.getByText('Sua foto', { selector: 'legend' })).toBeInTheDocument();
    expect(screen.getByLabelText('Escolher foto')).toHaveAttribute('accept', 'image/*');
    unmount();
    render(<AvatarPicker kind="kids" color="#8b5cf6" value="boto" onChange={() => {}} onPhoto={() => {}} />);
    expect(screen.queryByText('Sua foto')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Escolher foto')).not.toBeInTheDocument();
  });

  it('escolher um arquivo abre o recorte; "Usar esta foto" entrega o blob', async () => {
    const onPhoto = vi.fn();
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() });
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb, type) => cb(new Blob(['x'], { type })));
    render(<AvatarPicker kind="adulto" color="#8b5cf6" value="acai" onChange={() => {}} onPhoto={onPhoto} />);
    expect(screen.queryByLabelText('Zoom')).not.toBeInTheDocument();
    await userEvent.upload(screen.getByLabelText('Escolher foto'), new File(['x'], 'eu.jpg', { type: 'image/jpeg' }));
    expect(screen.getByLabelText('Zoom')).toBeInTheDocument();
    const img = screen.getByAltText('Prévia do recorte'); // jsdom não carrega imagem: simulamos o tamanho
    Object.defineProperty(img, 'naturalWidth', { value: 300 });
    Object.defineProperty(img, 'naturalHeight', { value: 300 });
    fireEvent.load(img);
    await userEvent.click(screen.getByRole('button', { name: 'Usar esta foto' }));
    expect(onPhoto).toHaveBeenCalledWith(expect.any(Blob));
    expect(screen.queryByLabelText('Zoom')).not.toBeInTheDocument();
  });

  it('com foto já salva, "Sua foto" é uma opção que se marca sem enviar de novo', async () => {
    const onChange = vi.fn();
    render(<AvatarPicker kind="adulto" color="#8b5cf6" value="acai" onChange={onChange} onPhoto={() => {}} photoSrc="/api/foto/p1?v=abc" />);
    const opcao = screen.getByRole('radio', { name: 'Sua foto' });
    expect(opcao.closest('label').querySelector('img')).toHaveAttribute('src', '/api/foto/p1?v=abc');
    await userEvent.click(opcao);
    expect(onChange).toHaveBeenCalledWith('foto');
  });

  it('no Kids, os bichos e as lendas vêm primeiro; as crianças também escolhem as lendas', async () => {
    const onChange = vi.fn();
    render(<AvatarPicker kind="kids" color="#8b5cf6" value="boto" onChange={onChange} />);
    const legendas = [...document.querySelectorAll('fieldset fieldset > legend')].map((l) => l.textContent);
    expect(legendas).toEqual(['Bichos da Amazônia', 'Lendas do Pará', 'Sabores e festas do Pará', 'Frutas e símbolos do Pará']);
    await userEvent.click(screen.getByRole('radio', { name: 'Matinta Perera' }));
    expect(onChange).toHaveBeenCalledWith('matinta-perera');
  });

  it('escolher avisa o formulário; o valor vai no campo avatar', async () => {
    const onChange = vi.fn();
    const { container } = render(<form><AvatarPicker kind="adulto" color="#8b5cf6" value="acai" onChange={onChange} /></form>);
    await userEvent.click(screen.getByRole('radio', { name: 'Onça' }));
    expect(onChange).toHaveBeenCalledWith('onca');
    await userEvent.click(screen.getByRole('radio', { name: 'Só a inicial' }));
    expect(onChange).toHaveBeenLastCalledWith('');
    expect(new FormData(container.querySelector('form')).get('avatar')).toBe('acai');
  });

  it('a opção marcada tem o sinal ✓, além da cor', () => {
    render(<AvatarPicker kind="adulto" color="#8b5cf6" value="jambu" onChange={() => {}} />);
    const marcada = screen.getByRole('radio', { name: 'Jambu' }).closest('label');
    expect(within(marcada).getByText('✓')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Açaí' }).closest('label').textContent).not.toContain('✓');
  });
});
