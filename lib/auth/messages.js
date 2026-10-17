// Mensagens que não revelam se um e-mail tem conta.
export function authErrorMessage(error, context) {
  if (!error) return '';
  if (error.status === 429) return 'Muitas tentativas. Tente de novo em alguns minutos.';
  if (context === 'entrar' && (error.status === 401 || error.status === 403)) return 'E-mail ou senha incorretos.';
  if (context === 'criar' && (error.code === 'USER_ALREADY_EXISTS' || error.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' || error.status === 422)) {
    return 'Já existe uma conta com este e-mail.';
  }
  if (context === 'senha' && error.code === 'INVALID_TOKEN') return 'Este link expirou.';
  return 'Não foi possível concluir agora. Tente de novo.';
}
