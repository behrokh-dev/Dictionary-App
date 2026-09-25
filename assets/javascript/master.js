const form = document.getElementById('searchForm');
  const input = document.getElementById('wordInput');
  const btn = document.getElementById('searchBtn');
  const statusEl = document.getElementById('status');
  const resultArea = document.getElementById('resultArea');

  const translationCache = new Map();

  //---translating to fa-----//
  async function translateToPersian(text) {
    if (!text) return '';
    if (translationCache.has(text)) return translationCache.get(text);

    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|fa`;
      const response = await fetch(url);
      const data = await response.json();
      const translated = data.responseData.translatedText || '';
      translationCache.set(text, translated);
      return translated;
    } catch {
      return ''; 
    }
  }

  async function fetchWordData(word) {
    const path = word.toLowerCase().trim().split('').join('/');
    const url = `https://raw.githubusercontent.com/vighnesh153/open-dictionary/main/data/${path}/_.json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('کلمه پیدا نشد');

    const data = await response.json();

    const partsOfSpeech = { nouns: 'noun', verbs: 'verb', adjectives: 'adjective', adverbs: 'adverb' };
    const meanings = [];
    for (const etymology of data.etymologies || []) {
      for (const key in partsOfSpeech) {
        for (const block of etymology[key] || []) {
          for (const group of block.definitionGroups || []) {
            for (const entry of group.entries || []) {
              meanings.push({
                partOfSpeech: partsOfSpeech[key],
                definition: entry.meaning,
                example: (entry.examples && entry.examples[0]) || ''
              });
            }
          }
        }
      }
    }

    if (meanings.length === 0) throw new Error('کلمه پیدا نشد');

    const topMeanings = meanings.slice(0, 3); //  ۳ معنی اول 

    const wordFa = await translateToPersian(word);
    for (const meaning of topMeanings) {
      meaning.definitionFa = await translateToPersian(meaning.definition);
      meaning.exampleFa = await translateToPersian(meaning.example);
    }

    return { word, wordFa, meanings: topMeanings };
  }

  function renderLoading() {
    resultArea.innerHTML = '';
    statusEl.innerHTML = '<div class="spinner"></div>';
  }

  function renderError() {
    statusEl.innerHTML = '';
    resultArea.innerHTML = `
      <div class="error-card">
        <span class="emoji">😕</span>
        <div>همچین کلمه‌ای پیدا نشد یا مشکلی پیش اومد. دوباره امتحان کن.</div>
      </div>
    `;
  }

  function renderResult(entry) {
    statusEl.innerHTML = '';

    const meaningsHtml = entry.meanings.map(m => `
      <li>
        <span class="pos">${m.partOfSpeech}</span>
        <div>${m.definition}</div>
        ${m.definitionFa ? `<div class="fa-def">${m.definitionFa}</div>` : ''}
        ${m.example ? `<div class="example">"${m.example}"</div>` : ''}
        ${m.exampleFa ? `<div class="example-fa">«${m.exampleFa}»</div>` : ''}
      </li>
    `).join('');

    resultArea.innerHTML = `
      <div class="result-card">
        <h2 class="word">
          ${entry.word}
          ${entry.wordFa ? `<span class="word-fa">${entry.wordFa}</span>` : ''}
        </h2>
        <ol class="def-list">${meaningsHtml}</ol>
      </div>
    `;
  }

  async function handleSearch(word) {
    if (!word) return;
    btn.disabled = true;
    renderLoading();

    try {
      const entry = await fetchWordData(word);
      renderResult(entry);
    } catch {
      renderError();
    } finally {
      btn.disabled = false;
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    handleSearch(input.value.trim());
  });