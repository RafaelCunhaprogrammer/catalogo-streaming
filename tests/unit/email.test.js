// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { sendResetEmail } from '@/lib/email';

describe('sendResetEmail', () => {
  it('sem chave do Resend, mostra o link no terminal', async () => {
    const log = vi.fn();
    await sendResetEmail({ to: 'ana@ex.com', name: 'Ana', url: 'http://x/redefinir' }, { apiKey: '', log });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('http://x/redefinir'));
  });

  it('com a chave, envia pelo Resend em português', async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: '1' }, error: null });
    await sendResetEmail(
      { to: 'ana@ex.com', name: 'Ana', url: 'http://x/redefinir' },
      { apiKey: 'chave', from: 'Pai <a@b.c>', createClient: () => ({ emails: { send } }) },
    );
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      to: 'ana@ex.com',
      from: 'Pai <a@b.c>',
      subject: "Redefina sua senha do Pai d'Égua",
      html: expect.stringContaining('http://x/redefinir'),
    }));
  });

  it('falha do Resend vira erro claro', async () => {
    const send = vi.fn().mockResolvedValue({ data: null, error: { message: 'x' } });
    await expect(sendResetEmail({ to: 'a@b.c', name: 'A', url: 'u' }, { apiKey: 'k', from: 'f', createClient: () => ({ emails: { send } }) }))
      .rejects.toThrow('Não foi possível enviar o e-mail');
  });
});
