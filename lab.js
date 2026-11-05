/* Location Science · Lab 02 — browser-local navigation and worksheet only. */
(() => {
  'use strict';
  const STORAGE_KEY = 'location-science-chicago-broken-bottles-lab-v6';
  const chapters = Array.from(document.querySelectorAll('details.chapter'));
  const notes = Array.from(document.querySelectorAll('textarea[data-answer]'));
  const checks = Array.from(document.querySelectorAll('input[data-done]'));
  const toc = document.getElementById('toc');
  const menuToggle = document.getElementById('menuToggle');

  const load = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  };
  const saved = load();
  const answers = saved.answers && typeof saved.answers === 'object' ? saved.answers : {};
  const completed = saved.completed && typeof saved.completed === 'object' ? saved.completed : {};
  const persist = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, completed })); }
    catch { /* Worksheets can still be downloaded even if storage is disabled. */ }
  };
  const updateProgress = () => {
    const done = checks.filter(item => item.checked).length;
    document.getElementById('progressLabel').textContent = `${done} / ${checks.length}`;
    document.getElementById('progressBar').style.width = `${(100 * done) / checks.length}%`;
    chapters.forEach(chapter => {
      const key = chapter.dataset.chapter;
      const status = chapter.querySelector('[data-chapter-status]');
      const isDone = Boolean(completed[key]);
      status.textContent = isDone ? 'Completed ✓' : key === '1' ? 'Open chapter' : 'Not started';
      status.classList.toggle('is-done', isDone);
    });
  };

  notes.forEach(field => {
    field.value = typeof answers[field.dataset.answer] === 'string' ? answers[field.dataset.answer] : '';
    field.addEventListener('input', () => {
      answers[field.dataset.answer] = field.value;
      persist();
    });
  });
  checks.forEach(check => {
    check.checked = Boolean(completed[check.dataset.done]);
    check.addEventListener('change', () => {
      completed[check.dataset.done] = check.checked;
      updateProgress();
      persist();
    });
  });
  updateProgress();

  const closeMenu = () => {
    toc.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  };
  menuToggle.addEventListener('click', () => {
    const next = !toc.classList.contains('open');
    toc.classList.toggle('open', next);
    menuToggle.setAttribute('aria-expanded', String(next));
  });
  const links = Array.from(document.querySelectorAll('.toc-links a'));
  const openHashChapter = () => {
    const anchor = window.location.hash.slice(1);
    const target = document.getElementById(anchor);
    if (target && target.matches('details.chapter')) target.open = true;
    links.forEach(link => link.classList.toggle('active', link.hash === window.location.hash));
  };
  links.forEach(link => link.addEventListener('click', () => {
    const chapter = document.querySelector(link.hash);
    if (chapter && chapter.matches('details.chapter')) chapter.open = true;
    closeMenu();
    window.setTimeout(openHashChapter, 0);
  }));
  window.addEventListener('hashchange', openHashChapter);
  openHashChapter();

  document.getElementById('openAll').addEventListener('click', () => {
    chapters.forEach(chapter => { chapter.open = true; });
  });
  document.getElementById('closeAll').addEventListener('click', () => {
    chapters.forEach(chapter => { chapter.open = false; });
  });

  const prompts = [
    'Offense categories, most frequent type, and the neighborhood with the most robberies',
    'Fishnet versus hexagons and interpretation of the Gi* +3 bin',
    'Why the liquor vendors were counted in the existing crime polygons',
    'Poverty attribute units and the distinction between counts and rates',
    'Meaning and limitations of the three-way overlap',
    'NetCDF and how emerging hot spot categories differ over time',
    'Meaning and limitations of unemployment hot spots',
    'Crime trend classes, unemployment selection, and intersection',
    'Selected public high schools, the 0.25-mile rule, and a limitation'
  ];
  document.getElementById('downloadNotes').addEventListener('click', () => {
    const sections = [
      'LOCATION SCIENCE — LAB 02: ANALYZING VIOLENT CRIME',
      'Original historical Chicago case-study data | ArcGIS Pro',
      'Source package: https://www.arcgis.com/sharing/rest/content/items/653c890653244e72b122d8bbbf2c0f11/data',
      'This worksheet was generated locally by the student. No answers were uploaded.',
      '',
      ...prompts.flatMap((prompt, index) => {
        const key = String(index + 1);
        return [`${key}. ${prompt}`, `Status: ${completed[key] ? 'Completed' : 'Not marked complete'}`, (answers[key] || '[No response entered]').trim(), ''];
      })
    ];
    const objectUrl = URL.createObjectURL(new Blob([sections.join('\n')], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = 'LocationScience_Lab02_Chicago_Answers.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
  });

  let beforePrintOpen = [];
  document.getElementById('printLab').addEventListener('click', () => window.print());
  window.addEventListener('beforeprint', () => {
    beforePrintOpen = Array.from(document.querySelectorAll('details')).filter(item => item.open);
    document.querySelectorAll('details').forEach(item => { item.open = true; });
  });
  window.addEventListener('afterprint', () => {
    document.querySelectorAll('details').forEach(item => { item.open = beforePrintOpen.includes(item); });
  });
})();
