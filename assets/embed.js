const ALLOWED_MODES = new Set(['daily', 'random', 'fixed']);
const ALLOWED_THEMES = new Set(['light', 'dark', 'auto']);

export function validateEmbedSettings(settings) {
  if (!ALLOWED_MODES.has(settings.mode)) return { ok: false, message: 'Choose a verse mode.' };
  if (typeof settings.translation !== 'string' || !settings.translation.trim()) {
    return { ok: false, message: 'Choose a translation.' };
  }
  if (!ALLOWED_THEMES.has(settings.theme)) return { ok: false, message: 'Choose a colour theme.' };
  if (!Number.isInteger(settings.height) || settings.height < 160 || settings.height > 2000) {
    return { ok: false, message: 'Choose a height from 160 to 2000 pixels.' };
  }
  if (settings.mode === 'fixed') {
    if (settings.translation.toLowerCase() === 'niv') {
      return { ok: false, message: 'NIV is available for daily or random verses only. Choose another translation for a fixed passage.' };
    }
    if (typeof settings.reference !== 'string' || !settings.reference.trim()) {
      return { ok: false, message: 'Enter a Bible reference for a fixed passage.' };
    }
    if (!settings.referenceValid) {
      return { ok: false, message: 'Use a full book name, such as John 3:16 or Psalm 23.' };
    }
  }
  return { ok: true };
}

export function buildWidgetUrl(baseUrl, settings) {
  const base = new URL('./', new URL(baseUrl));
  const url = new URL('index.html', base);
  const params = new URLSearchParams();
  if (settings.mode === 'random') params.set('order', 'random');
  if (settings.translation) params.set('translation', settings.translation);
  if (settings.mode === 'fixed' && settings.reference) params.set('ref', settings.reference.trim());
  params.set('theme', settings.theme);
  if (settings.verseNumbers) params.set('verseNumbers', '1');
  url.search = params.toString();
  return url;
}

function escapeAttribute(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

export function buildIframeMarkup(widgetUrl, height) {
  if (!Number.isInteger(height) || height < 160 || height > 2000) {
    throw new RangeError('Iframe height must be an integer from 160 to 2000 pixels.');
  }
  return `<iframe src="${escapeAttribute(widgetUrl)}" title="Verse of the Day" width="100%" height="${height}" style="border:0"></iframe>`;
}
