// Roda no <head>, antes da primeira pintura, para a tela não piscar em branco.
// Precisa ser autônoma: é convertida em texto com toString(), então não pode usar importações.
export function bootstrapTheme() {
  var prefs = {};
  try {
    prefs = JSON.parse(localStorage.getItem('catalogo:prefs')) || {};
  } catch (e) {
    prefs = {};
  }
  if (prefs.version !== 1) prefs = {};
  var themes = ['escuro', 'claro', 'noturno'];
  var sizes = ['normal', 'grande', 'muito-grande'];
  var systemDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  var theme = themes.indexOf(prefs.theme) >= 0 ? prefs.theme : systemDark ? 'escuro' : 'claro';
  var root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-text', sizes.indexOf(prefs.textSize) >= 0 ? prefs.textSize : 'normal');
  root.setAttribute('data-calm', String(prefs.calm === true));
  root.setAttribute('data-contrast', String(prefs.highContrast === true));
}

export const THEME_SCRIPT = `(${bootstrapTheme.toString()})();`;
