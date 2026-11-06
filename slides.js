/* Общая логика слайдов: стрелки, клавиши, свайп и кнопка «Вернуться к экскурсии». */
(function () {
  const slides = [...document.querySelectorAll('.slide')], n = slides.length;
  const seg = document.getElementById('seg'), cnt = document.getElementById('count');
  const prev = document.getElementById('prev'), next = document.getElementById('next'), backBtn = document.getElementById('back');
  const bands = ['var(--loam)', 'var(--ochre)', 'var(--deep)'];
  let i = -1; const seen = new Set();

  slides.forEach((s, k) => {
    s.style.setProperty('--band', bands[k % 3]);
    const b = document.createElement('button');
    b.className = 'sg'; b.style.setProperty('--c', bands[k % 3]);
    b.setAttribute('aria-label', 'Раздел ' + (k + 1) + ': ' + s.querySelector('h1, h2').textContent);
    b.onclick = () => go(k);
    seg.appendChild(b);
  });

  function go(k) {
    if (k < 0 || k >= n || k === i) return;
    const dir = k > i ? 'r' : 'l';
    slides.forEach((s) => s.classList.remove('on', 'r', 'l'));
    i = k; seen.add(k);
    slides[i].classList.add('on', dir); slides[i].scrollTop = 0;
    [...seg.children].forEach((b, j) => { b.classList.toggle('on', j === i); b.classList.toggle('done', seen.has(j) && j !== i); });
    cnt.textContent = 'Раздел ' + (i + 1) + ' из ' + n;
    prev.disabled = i === 0;
    next.hidden = i === n - 1;          // на последнем слайде вместо «вперёд» появляется кнопка возврата
    backBtn.hidden = i !== n - 1;
  }

  // Возврат работает как кнопка «Назад» в браузере. Экскурсия при уходе сама запомнила место
  // (sessionStorage), поэтому возвращает туда же, откуда игрок ушёл.
  function back() {
    let fromTour = false;
    try { fromTour = !!document.referrer && new URL(document.referrer).origin === location.origin && /tour\.html/.test(document.referrer); } catch (e) {}
    if (fromTour && history.length > 1) history.back(); else location.href = 'tour.html';
  }

  prev.onclick = () => go(i - 1);
  next.onclick = () => go(i + 1);
  backBtn.onclick = back;

  addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') go(i + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(i - 1);
  });

  // свайп по полю со слайдами (на телефоне)
  const stage = document.querySelector('.slides'); let x0 = null, y0 = null;
  stage.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? i + 1 : i - 1);
    x0 = null;
  }, { passive: true });

  go(0);
})();
