const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// E-mail de "Esqueci minha senha". Sem RESEND_API_KEY (desenvolvimento), o link vai para o terminal.
export async function sendResetEmail(
  { to, name, url },
  {
    apiKey = process.env.RESEND_API_KEY,
    from = process.env.EMAIL_FROM,
    log = console.log,
    createClient = async (key) => new (await import('resend')).Resend(key),
  } = {},
) {
  if (!apiKey) {
    log(`[Pai d'Égua] Link para redefinir a senha de ${to}: ${url}`);
    return;
  }
  const client = await createClient(apiKey);
  const { error } = await client.emails.send({
    from,
    to,
    subject: "Redefina sua senha do Pai d'Égua",
    html: `<p>Olá, ${escape(name)}!</p>
<p>Recebemos um pedido para redefinir a senha da sua conta no Pai d'Égua.</p>
<p><a href="${escape(url)}">Criar uma nova senha</a> (o link vale por 1 hora).</p>
<p>Se não foi você, pode ignorar este e-mail.</p>`,
  });
  if (error) throw new Error('Não foi possível enviar o e-mail agora.');
}
