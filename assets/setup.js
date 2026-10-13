import { parseReference } from './core.js';
import { buildIframeMarkup, buildWidgetUrl, validateEmbedSettings } from './embed.js';

const form = document.getElementById('builder-form');
const modeRadios = [...document.querySelectorAll('input[name="mode"]')];
const referenceField = document.getElementById('reference-field');
const referenceInput = document.getElementById('reference');
const searchInput = document.getElementById('translation-search');
const translationList = document.getElementById('translation-list');
const resultCount = document.getElementById('result-count');
const creditCard = document.getElementById('selected-credit');
const modeNote = document.getElementById('mode-note');
const themeInput = document.getElementById('theme');
const heightInput = document.getElementById('height');
const verseNumbersInput = document.getElementById('verse-numbers');
const formStatus = document.getElementById('form-status');
const linkOutput = document.getElementById('widget-link');
const iframeOutput = document.getElementById('iframe-code');
const previewFrame = document.getElementById('preview-frame');
const previewPlaceholder = document.getElementById('preview-placeholder');
const previewStatus = document.getElementById('preview-status');
const previewSize = document.getElementById('preview-size');
const baseUrl = new URL('./', location.href);

const SPECIAL_TRANSLATIONS = [{
  id: 'niv', name: 'New International Version', language: 'English', languageCode: 'eng',
  books: 66, direction: 'ltr', website: 'https://www.ourmanna.com/',
  licence: { label: 'OurManna source text', url: 'https://www.ourmanna.com/' }, special: true,
}];
const BUILTIN_FALLBACKS = [
  { id: 'eng_kjv', shortcut: 'kjv', name: 'King James Version', language: 'English', books: 66, website: 'https://bible.helloao.org/', licence: { label: 'Unknown', url: 'https://bible.helloao.org/' } },
  { id: 'BSB', shortcut: 'bsb', name: 'Berean Standard Bible', language: 'English', books: 66, website: 'https://bible.helloao.org/', licence: { label: 'Unknown', url: 'https://bible.helloao.org/' } },
  { id: 'eng_net', shortcut: 'net', name: 'NET Bible', language: 'English', books: 66, website: 'https://bible.helloao.org/', licence: { label: 'Unknown', url: 'https://bible.helloao.org/' } },
];

let translations = [...SPECIAL_TRANSLATIONS];
let selectedId = 'eng_kjv';
let previewWidth = 'desktop';
let catalogueWarning = '';
let previewObserver = null;
let bootSettings = readInitialSettings();

function readInitialSettings() {
  const params = new URLSearchParams(location.search);
  const mode = params.has('ref') ? 'fixed' : params.get('order') === 'random' ? 'random' : 'daily';
  return {
    mode,
    reference: params.get('ref') || '',
    translation: params.get('translation') || 'kjv',
    theme: ['light', 'dark', 'auto'].includes(params.get('theme')) ? params.get('theme') : 'light',
    verseNumbers: params.get('verseNumbers') === '1',
  };
}

function normalizeTranslationId(requested) {
  if (requested.toLowerCase() === 'niv') return 'niv';
  const found = translations.find((item) => item.id === requested)
    || translations.find((item) => item.shortcut?.toLowerCase() === requested.toLowerCase());
  return found?.id || requested;
}

function getMode() {
  return modeRadios.find((radio) => radio.checked)?.value || 'daily';
}

function selectedTranslation() {
  return translations.find((item) => item.id === selectedId) || null;
}

function safeExternalLink(href, text) {
  try {
    const url = new URL(href);
    if (url.protocol !== 'https:') return document.createTextNode(text);
    const link = document.createElement('a');
    link.href = url.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = text;
    return link;
  } catch {
    return document.createTextNode(text);
  }
}

function showCredit(translation) {
  creditCard.replaceChildren();
  if (!translation) {
    creditCard.textContent = 'Choose a translation to see available source and licence information.';
    return;
  }
  const name = document.createElement('p');
  name.textContent = `${translation.name} · ${translation.language || 'Language not listed'} · ${translation.books || '?'} books`;
  creditCard.append(name);
  const licence = document.createElement('p');
  const licenceLabel = translation.licence?.label || 'Unknown';
  licence.append(`Licence information: ${licenceLabel}. `);
  const licenceUrl = translation.licence?.url || translation.website;
  if (licenceUrl) licence.append(safeExternalLink(licenceUrl, 'View source information'));
  creditCard.append(licence);
  if (translation.licence?.notes) {
    const notes = document.createElement('p');
    notes.textContent = translation.licence.notes;
    creditCard.append(notes);
  }
  if (translation.licence?.notice) {
    const notice = document.createElement('p');
    notice.textContent = translation.licence.notice;
    creditCard.append(notice);
  }
  if (translation.licence?.terms && typeof translation.licence.terms === 'object') {
    for (const [key, value] of Object.entries(translation.licence.terms)) {
      if (value === null || value === undefined || typeof value === 'object') continue;
      const term = document.createElement('p');
      const label = key.replace(/([a-z])([A-Z])/g, '$1 $2');
      term.textContent = `${label}: ${String(value)}`;
      creditCard.append(term);
    }
  }
  if (licenceLabel === 'Unknown') {
    const reminder = document.createElement('p');
    reminder.textContent = 'The catalogue has no reviewed licence label for this entry. Check publisher terms before use.';
    creditCard.append(reminder);
  }
}

function matchesTranslation(translation, term) {
  if (!term) return true;
  const needle = term.toLocaleLowerCase();
  return [translation.id, translation.shortcut, translation.name, translation.originalName,
    translation.language, translation.nativeLanguage, translation.languageCode]
    .some((value) => String(value || '').toLocaleLowerCase().includes(needle));
}

function renderTranslationChoices() {
  const term = searchInput.value.trim();
  const matches = translations.filter((translation) => matchesTranslation(translation, term));
  translationList.replaceChildren();
  for (const translation of matches) {
    const option = document.createElement('option');
    option.value = translation.id;
    option.textContent = `${translation.name} · ${translation.language || 'Unknown language'} · ${translation.id}`;
    if (translation.id === 'niv' && getMode() === 'fixed') option.disabled = true;
    translationList.append(option);
  }
  translationList.value = matches.some((item) => item.id === selectedId) ? selectedId : '';
  translationList.disabled = matches.length === 0;
  resultCount.textContent = matches.length
    ? `${matches.length.toLocaleString()} translation${matches.length === 1 ? '' : 's'} match${matches.length === 1 ? 'es' : ''}${term ? ` “${term}”` : ''}.`
    : `No translations match “${term}”. Try a language name or ID.`;
}

function getSettings() {
  const translation = selectedTranslation();
  const reference = referenceInput.value.trim();
  return {
    mode: getMode(),
    translation: selectedId,
    reference,
    referenceValid: Boolean(reference && parseReference(reference).ok),
    theme: themeInput.value,
    height: Number(heightInput.value),
    verseNumbers: verseNumbersInput.checked,
    translationData: translation,
  };
}

function clearGeneratedOutput() {
  linkOutput.value = '';
  iframeOutput.value = '';
  previewFrame.removeAttribute('src');
  previewFrame.removeAttribute('data-ready');
  previewPlaceholder.hidden = false;
  previewStatus.textContent = 'Correct the settings to load the preview.';
  previewObserver?.disconnect();
  formStatus.dataset.error = 'true';
}

function update() {
  const settings = getSettings();
  referenceField.hidden = settings.mode !== 'fixed';
  const nivFixed = settings.mode === 'fixed' && settings.translation === 'niv';
  modeNote.hidden = !nivFixed;
  modeNote.textContent = nivFixed
    ? 'NIV comes from OurManna and is available for daily or random verses only. Choose another translation to set a fixed passage.'
    : '';
  formStatus.textContent = catalogueWarning;
  formStatus.dataset.error = 'false';
  showCredit(settings.translationData);

  const validation = validateEmbedSettings(settings);
  if (!validation.ok) {
    clearGeneratedOutput();
    formStatus.textContent = [catalogueWarning, validation.message].filter(Boolean).join(' ');
    return;
  }

  const url = buildWidgetUrl(baseUrl.href, settings);
  linkOutput.value = url.href;
  iframeOutput.value = buildIframeMarkup(url.href, settings.height);
  const sourceChanged = previewFrame.src !== url.href;
  if (sourceChanged) {
    previewObserver?.disconnect();
    previewStatus.textContent = 'Loading preview…';
    previewFrame.src = url.href;
  } else {
    previewStatus.textContent = 'Preview size updated.';
  }
  previewFrame.title = `Live preview: ${settings.mode === 'fixed' ? settings.reference : settings.mode === 'random' ? 'random verse' : 'daily verse'}, ${settings.translationData?.name || selectedId}`;
  previewFrame.height = String(settings.height);
  previewFrame.style.height = `${settings.height}px`;
  previewFrame.dataset.ready = 'true';
  previewFrame.dataset.width = previewWidth;
  previewPlaceholder.hidden = true;
  formStatus.textContent = catalogueWarning || 'Settings are ready to preview and copy.';
}

async function loadCatalogue() {
  try {
    const response = await fetch(new URL('data/translations.json', baseUrl), { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const snapshot = await response.json();
    if (!Array.isArray(snapshot.translations) || !snapshot.translations.length) throw new Error('Catalogue is empty.');
    translations = [...SPECIAL_TRANSLATIONS, ...snapshot.translations];
  } catch {
    translations = [...SPECIAL_TRANSLATIONS, ...BUILTIN_FALLBACKS];
    catalogueWarning = 'The full translation catalogue could not be loaded. Built-in translations remain available.';
  }

  selectedId = normalizeTranslationId(bootSettings.translation);
  if (!translations.some((translation) => translation.id === selectedId)) {
    catalogueWarning = [catalogueWarning, 'That translation ID is not in the available catalogue; choose a listed translation.'].filter(Boolean).join(' ');
    selectedId = 'eng_kjv';
  }
  modeRadios.forEach((radio) => { radio.checked = radio.value === bootSettings.mode; });
  referenceInput.value = bootSettings.reference;
  themeInput.value = bootSettings.theme;
  verseNumbersInput.checked = bootSettings.verseNumbers;
  translationList.disabled = false;
  renderTranslationChoices();
  update();
}

async function copyValue(kind) {
  const field = kind === 'link' ? linkOutput : iframeOutput;
  const status = document.getElementById(kind === 'link' ? 'link-copy-status' : 'iframe-copy-status');
  if (!field.value) return;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(field.value);
    status.textContent = 'Copied.';
  } catch {
    field.focus();
    field.select();
    status.textContent = 'Copy is unavailable. The text is selected; use your device’s Copy command.';
  }
}

function observePreviewStatus() {
  if (previewFrame.dataset.ready !== 'true') return;
  previewObserver?.disconnect();
  try {
    const widgetStatus = previewFrame.contentDocument?.getElementById('status');
    if (!widgetStatus) {
      previewStatus.textContent = 'The preview page opened, but its widget status is unavailable.';
      return;
    }
    const updateStatus = () => {
      const message = widgetStatus.textContent.trim().replace(/\s+/g, ' ');
      if (!message) previewStatus.textContent = 'Preview is showing the selected settings.';
      else if (message.startsWith('Loading')) previewStatus.textContent = 'Loading preview data…';
      else previewStatus.textContent = `Preview message: ${message}`;
    };
    previewObserver = new MutationObserver(updateStatus);
    previewObserver.observe(widgetStatus, { childList: true, characterData: true, subtree: true });
    updateStatus();
  } catch {
    previewStatus.textContent = 'The preview loaded; its provider status cannot be read here.';
  }
}

form.addEventListener('submit', (event) => event.preventDefault());
previewFrame.addEventListener('load', observePreviewStatus);
modeRadios.forEach((radio) => radio.addEventListener('change', () => {
  renderTranslationChoices();
  update();
}));
searchInput.addEventListener('input', renderTranslationChoices);
translationList.addEventListener('change', () => {
  selectedId = translationList.value;
  update();
});
for (const control of [referenceInput, themeInput, heightInput, verseNumbersInput]) {
  control.addEventListener('input', update);
  control.addEventListener('change', update);
}
document.querySelectorAll('[data-copy]').forEach((button) => button.addEventListener('click', () => copyValue(button.dataset.copy)));
document.querySelectorAll('[data-preview-width]').forEach((button) => button.addEventListener('click', () => {
  previewWidth = button.dataset.previewWidth;
  previewFrame.dataset.width = previewWidth;
  previewSize.textContent = previewWidth === 'narrow' ? '320px narrow width' : 'Desktop width';
  document.querySelectorAll('[data-preview-width]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
}));

loadCatalogue();
