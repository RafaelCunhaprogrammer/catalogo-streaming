import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoCropper } from '@/components/profiles/PhotoCropper';

const drawImage = vi.fn();
let toBlobImpl;

beforeEach(() => {
  drawImage.mockClear();
  toBlobImpl = (cb, type) => cb(new Blob(['x'], { type }));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage });
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (cb, type, q) { toBlobImpl(cb, type, q); });
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.restoreAllMocks());

const arquivo = () => new File(['x'], 'eu.jpg', { type: 'image/jpeg' });
// jsdom não carrega imagens: simulamos o tamanho natural e o onLoad.
function carregar(largura = 800, altura = 400) {
  const img = document.querySelector('img');
  Object.defineProperty(img, 'naturalWidth', { value: largura, configurable: true });
  Object.defineProperty(img, 'naturalHeight', { value: altura, configurable: true });
  fireEvent.load(img);
}

describe('PhotoCropper', () => {
  it('mostra o quadro com zoom e setas para mover', () => {
    render(<PhotoCropper file={arquivo()} onDone={() => {}} onCancel={() => {}} />);
    expect(screen.getByLabelText('Zoom')).toHaveAttribute('type', 'range');
    for (const n of ['Mover para a esquerda', 'Mover para a direita', 'Mover para cima', 'Mover para baixo']) {
      expect(screen.getByRole('button', { name: n })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Usar esta foto' })).toBeInTheDocument();
  });

  it('"Usar esta foto" desenha 256 x 256 e entrega o blob em webp', async () => {
    const onDone = vi.fn();
    render(<PhotoCropper file={arquivo()} onDone={onDone} onCancel={() => {}} />);
    carregar(800, 400);
    await userEvent.click(screen.getByRole('button', { name: 'Usar esta foto' }));
    const canvas = HTMLCanvasElement.prototype.toBlob.mock.contexts[0];
    expect([canvas.width, canvas.height]).toEqual([256, 256]);
    expect(HTMLCanvasElement.prototype.toBlob.mock.calls[0].slice(1)).toEqual(['image/webp', 0.85]);
    // centro da imagem larga: lado 400, começando em x = 200
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 200, 0, 400, 400, 0, 0, 256, 256);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone.mock.calls[0][0]).toBeInstanceOf(Blob);
  });

  it('cai para JPEG quando o navegador não faz webp', async () => {
    const onDone = vi.fn();
    toBlobImpl = (cb, type) => cb(type === 'image/webp' ? null : new Blob(['x'], { type }));
    render(<PhotoCropper file={arquivo()} onDone={onDone} onCancel={() => {}} />);
    carregar();
    await userEvent.click(screen.getByRole('button', { name: 'Usar esta foto' }));
    expect(onDone.mock.calls[0][0].type).toBe('image/jpeg');
  });

  it('as setas movem o recorte e o zoom o aproxima', async () => {
    render(<PhotoCropper file={arquivo()} onDone={() => {}} onCancel={() => {}} />);
    carregar(800, 400);
    await userEvent.click(screen.getByRole('button', { name: 'Mover para a esquerda' }));
    await userEvent.click(screen.getByRole('button', { name: 'Usar esta foto' }));
    const [, sx] = drawImage.mock.calls[0];
    expect(sx).toBeLessThan(200);
    drawImage.mockClear();
    fireEvent.change(screen.getByLabelText('Zoom'), { target: { value: '2' } });
    await userEvent.click(screen.getByRole('button', { name: 'Usar esta foto' }));
    expect(drawImage.mock.calls[0][3]).toBe(200); // lado = 400 / 2
  });

  it('cancelar avisa e não entrega foto', async () => {
    const onDone = vi.fn();
    const onCancel = vi.fn();
    render(<PhotoCropper file={arquivo()} onDone={onDone} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });
});
