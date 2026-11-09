import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AvatarPicker } from '@/components/profiles/AvatarPicker';

describe('AvatarPicker', () => {
  it('três grupos com os nomes dos avatares, mais "Só a inicial"', () => {
    render(<AvatarPicker kind="adulto" color="#8b5cf6" value="acai" onChange={() => {}} />);
    const grupos = screen.getAllByRole('group').filter((g) => g.tagName === 'FIELDSET' && g.querySelector('legend'));
    expect(grupos.map((g) => g.querySelector('legend').textContent)).toEqual(['Avatar', 'Frutas e símbolos do Pará', 'Bichos da Amazônia', 'Lendas do Pará']);
    expect(screen.getByRole('radio', { name: 'Açaí' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Só a inicial' })).not.toBeChecked();
    expect(screen.getAllByRole('radio')).toHaveLength(20);
  });

  it('cada grupo é uma fileira horizontal, que rola de lado em vez de quebrar a linha', () => {
    render(<AvatarPicker kind="adulto" color="#8b5cf6" value="acai" onChange={() => {}} />);
    const fileiras = [...document.querySelectorAll('[data-avatar-row]')];
    expect(fileiras).toHaveLength(3);
    for (const f of fileiras) {
      expect(f.className).toContain('flex-nowrap');
      expect(f.className).toContain('overflow-x-auto');
    }
  });

  it('no Kids, os bichos e as lendas vêm primeiro; as crianças também escolhem as lendas', async () => {
    const onChange = vi.fn();
    render(<AvatarPicker kind="kids" color="#8b5cf6" value="boto" onChange={onChange} />);
    const legendas = [...document.querySelectorAll('fieldset fieldset > legend')].map((l) => l.textContent);
    expect(legendas).toEqual(['Bichos da Amazônia', 'Lendas do Pará', 'Frutas e símbolos do Pará']);
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
