import { collectPassage, formatReference, parseReference, requestJson, resolveOptions } from './core.js';

const options = resolveOptions(location.search);
const themePreference = options.theme === 'auto' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const applyTheme = () => {
  const theme = options.theme === 'auto' ? (themePreference.matches ? 'dark' : 'light') : options.theme;
  document.documentElement.dataset.theme = theme;
};
applyTheme();
if (themePreference) themePreference.addEventListener('change', applyTheme);

const verseEl = document.getElementById('mannaverse');
const refEl = document.getElementById('mannaverse-reference');
const statusEl = document.getElementById('status');
const retryEl = document.getElementById('retry');
const attrEl = document.getElementById('attribution');
const contentEl = document.getElementById('mannaverse-container');

let activeController = null;
let activeAttempt = 0;
let sourceVerse = null;

function link(href, text) {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.target = '_blank';
  anchor.rel = 'noopener';
  anchor.textContent = text;
  return anchor;
}

function setStatus(message = '', { error = false, setup = false, retry = false } = {}) {
  statusEl.replaceChildren();
  statusEl.setAttribute('role', error ? 'alert' : 'status');
  statusEl.setAttribute('aria-live', error ? 'assertive' : 'polite');
  if (retry) retryEl.hidden = false;
  if (!message) return;

  statusEl.append(document.createTextNode(message));
  if (setup) {
    statusEl.append(' ', link('./setup.html', 'Choose a translation or build an embed.'));
  }
}

function setLoading(loading) {
  contentEl.setAttribute('aria-busy', String(loading));
  if (loading) retryEl.hidden = true;
  retryEl.disabled = loading;
}

function show(text, reference, version, language = 'en', direction = 'ltr') {
  verseEl.textContent = text.replace(/\s+/g, ' ').trim();
  verseEl.lang = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(language) ? language : 'und';
  verseEl.dir = direction === 'rtl' || direction === 'ltr' ? direction : 'auto';
  const versionLabel = document.createElement('small');
  const italic = document.createElement('i');
  versionLabel.id = 'mannaverse-version';
  italic.textContent = `(${version})`;
  versionLabel.append(italic);
  refEl.textContent = reference;
  refEl.append(versionLabel);
}

function credit(fromManna, translationName, notice = '') {
  attrEl.replaceChildren();
  if (fromManna) {
    attrEl.append(translationName ? 'Verse chosen by ' : 'Powered by ', link('https://www.ourmanna.com/', 'OurManna.com'));
  }
  if (translationName) {
    if (fromManna) attrEl.append(' · ');
    attrEl.append(`${translationName} via `, link('https://bible.helloao.org/', 'Free Use Bible API'));
  }
  if (notice) {
    const span = document.createElement('span');
    span.className = 'notice';
    span.textContent = notice;
    attrEl.append(span);
  }
}

function fail(error) {
  retryEl.hidden = false;
  const retryable = ['network-error', 'provider-error', 'request-timeout', 'overall-timeout', 'invalid-response'].includes(error?.code);
  retryEl.hidden = !retryable;

  if (error?.code === 'invalid-reference') {
    verseEl.textContent = 'This passage format is not supported.';
    setStatus('Use a full book name, such as John 3:16 or Psalm 23.', { error: true, setup: true });
  } else if (error?.code === 'passage-unavailable' || error?.code === 'unavailable') {
    verseEl.textContent = 'This complete passage or translation could not be found.';
    setStatus('Check the full book name and verse range, or choose another translation.', { error: true, setup: true });
  } else {
    verseEl.textContent = options.reference ? 'This passage is temporarily unavailable.' : 'Verse of the day is unavailable right now.';
    setStatus(options.reference
      ? 'Please check your connection and try this passage again.'
      : 'Please check your connection and try again.', { error: true });
  }
  refEl.replaceChildren();
  attrEl.replaceChildren();
}

function appendContent(container, parts) {
  for (const part of parts) {
    if (typeof part === 'string') {
      container.append(document.createTextNode(part.replace(/¶/g, ' ')));
    } else if (part && typeof part.text === 'string') {
      if (Number.isFinite(part.poem)) {
        const line = document.createElement('span');
        line.className = 'poetry-line';
        line.style.marginInlineStart = `${Math.max(0, Math.min(8, part.poem))}em`;
        line.textContent = part.text;
        container.append(line);
      } else {
        const span = document.createElement('span');
        span.textContent = part.text;
        container.append(span);
      }
    } else if (part && part.heading && typeof part.heading === 'string') {
      const heading = document.createElement('strong');
      heading.className = 'inline-heading';
      heading.textContent = part.heading;
      container.append(heading);
    } else if (part && part.lineBreak === true) {
      container.append(document.createElement('br'));
    }
  }
}

async function getPassage(reference, translationId, signal) {
  const parsed = parseReference(reference);
  if (!parsed.ok) {
    const error = new Error('Unsupported reference');
    error.code = 'invalid-reference';
    throw error;
  }

  const range = parsed.value;
  const chapterRequests = [];
  for (let chapter = range.startChapter; chapter <= range.endChapter; chapter += 1) {
    const url = `https://bible.helloao.org/api/${encodeURIComponent(translationId)}/${range.book}/${chapter}.json`;
    chapterRequests.push(requestJson(url, { signal, timeoutMs: 10_000 }));
  }
  const chapters = await Promise.all(chapterRequests);
  const passage = collectPassage(range, chapters, translationId);
  if (!passage.ok) {
    const error = new Error(passage.code);
    error.code = passage.code;
    throw error;
  }
  return { range, chapters, passage };
}

function renderPassage({ range, chapters, passage }, { fromManna = false, notice = '' } = {}) {
  const translation = chapters[0].translation;
  verseEl.replaceChildren();
  verseEl.lang = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(translation.language) ? translation.language : 'und';
  verseEl.dir = translation.textDirection === 'rtl' || translation.textDirection === 'ltr' ? translation.textDirection : 'auto';

  let previousChapter = null;
  for (const item of passage.items) {
    if (item.type === 'heading') {
      const heading = document.createElement('h2');
      heading.className = 'section-heading';
      heading.textContent = item.content.filter((part) => typeof part === 'string').join(' ');
      verseEl.append(heading);
    } else if (item.type === 'line_break') {
      const lineBreak = document.createElement('div');
      lineBreak.className = 'chapter-line-break';
      lineBreak.setAttribute('aria-hidden', 'true');
      verseEl.append(lineBreak);
    } else if (item.type === 'hebrew_subtitle') {
      const subtitle = document.createElement('p');
      subtitle.className = 'hebrew-subtitle';
      appendContent(subtitle, item.content);
      verseEl.append(subtitle);
    } else if (item.type === 'verse') {
      const verse = document.createElement('p');
      verse.className = 'verse-line';
      if (options.verseNumbers) {
        const number = document.createElement('sup');
        number.className = 'verse-number';
        number.setAttribute('aria-label', `Chapter ${item.chapter}, verse ${item.number}`);
        number.textContent = range.startChapter !== range.endChapter && previousChapter === null
          ? `${item.chapter}:${item.number}`
          : previousChapter !== null && previousChapter !== item.chapter
          ? `${item.chapter}:${item.number}`
          : String(item.number);
        verse.append(number);
      }
      appendContent(verse, item.content);
      verseEl.append(verse);
      previousChapter = item.chapter;
    }
  }

  refEl.textContent = formatReference(passage.bookName, range);
  const versionLabel = document.createElement('small');
  const italic = document.createElement('i');
  versionLabel.id = 'mannaverse-version';
  italic.textContent = `(${options.translationLabel || translation.shortName})`;
  versionLabel.append(italic);
  refEl.append(versionLabel);
  credit(fromManna, translation.name, translation.licenseNotice || translation.licenseNotes || notice);
}

function showSourceVerse(verse) {
  show(verse.text, verse.reference, verse.version);
  credit(true);
}

async function load() {
  activeController?.abort('superseded');
  const controller = new AbortController();
  activeController = controller;
  const attempt = ++activeAttempt;
  const timeout = setTimeout(() => controller.abort('overall-timeout'), 20_000);
  setLoading(true);
  retryEl.hidden = true;
  setStatus(options.reference ? 'Loading passage…' : 'Loading today’s verse…');
  verseEl.textContent = 'Loading…';
  verseEl.lang = 'en';
  verseEl.dir = 'ltr';
  refEl.replaceChildren();
  attrEl.replaceChildren();

  try {
    if (options.reference) {
      const result = await getPassage(options.reference, options.translationId, controller.signal);
      if (attempt !== activeAttempt) return;
      renderPassage(result, { notice: options.nivFixedReference ? 'NIV is unavailable for fixed passages. Showing KJV instead.' : '' });
      setStatus(options.nivFixedReference ? 'NIV is unavailable for fixed passages. Showing KJV instead.' : '');
      return;
    }

    if (!sourceVerse) {
      const data = await requestJson(`https://beta.ourmanna.com/api/v1/get?format=json&order=${options.order}`, {
        signal: controller.signal,
        timeoutMs: 10_000,
      });
      const verse = data?.verse?.details;
      if (!verse || typeof verse.text !== 'string' || typeof verse.reference !== 'string' || typeof verse.version !== 'string') {
        const error = new Error('Malformed source verse');
        error.code = 'invalid-response';
        throw error;
      }
      if (attempt !== activeAttempt) return;
      sourceVerse = verse;
    }

    if (!options.translationId) {
      showSourceVerse(sourceVerse);
      setStatus('');
      return;
    }

    try {
      const result = await getPassage(sourceVerse.reference, options.translationId, controller.signal);
      if (attempt !== activeAttempt) return;
      renderPassage(result, { fromManna: true });
      setStatus('');
    } catch (error) {
      if (attempt !== activeAttempt || (controller.signal.aborted && controller.signal.reason !== 'overall-timeout')) return;
      if (error?.code === 'overall-timeout' || error?.code === 'aborted') throw error;
      showSourceVerse(sourceVerse);
      const retryable = ['network-error', 'provider-error', 'request-timeout', 'invalid-response'].includes(error?.code);
      setStatus('The requested translation was unavailable for this verse. Showing OurManna’s source text instead.', { retry: retryable, setup: true });
    }
  } catch (error) {
    if (attempt !== activeAttempt || error?.code === 'aborted') return;
    fail(error);
  } finally {
    clearTimeout(timeout);
    if (attempt === activeAttempt) {
      setLoading(false);
      activeController = null;
    }
    controller.abort('attempt-finished');
  }
}

retryEl.addEventListener('click', load);
load();
