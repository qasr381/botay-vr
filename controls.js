/* Управление экскурсией: экран выбора (кнопки на экране / клавиатура / геймпад) и сенсорный интерфейс.
   Работает с компонентом player-controls из tour.html: pc.axis (движение), pc.ext (прыжок, присед, бег),
   pc.lookBy(dx, dy) (взгляд), pc.setMode(режим). */
(function () {
  const KEY = 'botayControls';
  const touchLike = navigator.maxTouchPoints > 0 || (window.matchMedia && matchMedia('(pointer:coarse)').matches);
  let pc = null, mode = null;
  const $ = (s, r) => (r || document).querySelector(s);

  /* ---------- миниатюры ---------- */
  const ICON = {
    touch: '<svg viewBox="0 0 220 120" aria-hidden="true"><rect x="5" y="5" width="210" height="110" rx="14"/>' +
      '<circle cx="50" cy="78" r="26"/><circle cx="50" cy="78" r="10" fill="currentColor" stroke="none"/>' +
      '<circle cx="172" cy="40" r="15"/><path d="M165 44l7-7 7 7"/><circle cx="172" cy="84" r="15"/><path d="M165 80l7 7 7-7"/>' +
      '<path d="M92 38q16-14 36-8" stroke-dasharray="2 7"/><circle cx="131" cy="30" r="5" fill="currentColor" stroke="none"/></svg>',
    keyboard: '<svg viewBox="0 0 220 120" aria-hidden="true"><g stroke-width="2.5">' +
      '<rect x="62" y="6" width="32" height="32" rx="5"/><rect x="24" y="44" width="32" height="32" rx="5"/><rect x="62" y="44" width="32" height="32" rx="5"/><rect x="100" y="44" width="32" height="32" rx="5"/>' +
      '<rect x="24" y="84" width="108" height="28" rx="5"/><rect x="146" y="44" width="32" height="32" rx="5"/><rect x="146" y="84" width="64" height="28" rx="5"/></g>' +
      '<g fill="currentColor" stroke="none" font-family="sans-serif" font-size="16" text-anchor="middle">' +
      '<text x="78" y="28">W</text><text x="40" y="66">A</text><text x="78" y="66">S</text><text x="116" y="66">D</text>' +
      '<text x="78" y="103" font-size="13">Space</text><text x="162" y="66">C</text><text x="178" y="103" font-size="13">Shift</text></g></svg>',
    gamepad: '<svg viewBox="0 0 200 120" aria-hidden="true"><path d="M52 24h96c20 0 34 36 38 62 2 14-10 20-20 12l-22-16H56l-22 16c-10 8-22 2-20-12 4-26 18-62 38-62z"/>' +
      '<circle cx="62" cy="52" r="11"/><path d="M78 74h16M86 66v16"/><circle cx="114" cy="74" r="11"/>' +
      '<circle cx="140" cy="38" r="5"/><circle cx="140" cy="56" r="5"/><circle cx="131" cy="47" r="5"/><circle cx="149" cy="47" r="5"/></svg>'
  };
  const OPTS = [
    { id: 'touch', title: 'Кнопки на экране', text: 'Джойстик слева, прыжок и присед справа. Взгляд — движением пальца или поворотом телефона.' },
    { id: 'keyboard', title: 'Клавиатура и мышь', text: 'W A S D — ходьба, мышь — взгляд, Пробел — прыжок, C — присед, Shift — бег.' },
    { id: 'gamepad', title: 'Геймпад', text: 'Левый стик — ходьба, правый — взгляд, A или ✕ — прыжок, B или ○ — присед, правый курок — бег.' }
  ];

  /* ---------- экран выбора ---------- */
  const ctl = document.createElement('div');
  ctl.id = 'ctl'; ctl.setAttribute('role', 'dialog'); ctl.setAttribute('aria-modal', 'true'); ctl.setAttribute('aria-labelledby', 'ctlT');
  ctl.innerHTML = '<h2 id="ctlT">Как вы будете управлять?</h2><p class="lead">Выберите способ. Его можно сменить в любой момент кнопкой «Управление» в углу экрана.</p>' +
    '<div class="cards">' + OPTS.map((o) => `<button class="card" data-m="${o.id}">${ICON[o.id]}<b>${o.title}</b><p>${o.text}</p><span class="tag" hidden></span></button>`).join('') + '</div>' +
    '<p class="hint">Геймпад определяется после нажатия любой его кнопки.</p>';
  document.body.appendChild(ctl);
  const card = (m) => $('.card[data-m="' + m + '"]', ctl);
  function tag(m, text) { const c = card(m); c.classList.add('rec'); const t = $('.tag', c); t.textContent = text; t.hidden = false; }
  if (touchLike) tag('touch', 'Подходит для этого устройства'); else tag('keyboard', 'Подходит для этого устройства');
  function padHint() { const gp = (navigator.getGamepads ? [...navigator.getGamepads()] : []).find((g) => g && g.connected); if (gp) tag('gamepad', 'Геймпад подключён'); }
  addEventListener('gamepadconnected', padHint); padHint();
  ctl.querySelectorAll('.card').forEach((c) => { c.onclick = () => choose(c.dataset.m, true); });

  const openBtn = document.createElement('button');
  openBtn.id = 'ctl-open'; openBtn.type = 'button'; openBtn.textContent = 'Управление';
  openBtn.onclick = () => { if (pc) pc.setMode(null); ctl.classList.add('on'); card(mode || 'keyboard').focus(); };
  document.body.appendChild(openBtn);

  /* ---------- сенсорный интерфейс ---------- */
  const tc = document.createElement('div');
  tc.id = 'tc';
  tc.innerHTML = '<div class="look"></div><div class="joy"><div class="knob"></div></div>' +
    '<button class="tbtn" id="tb-jump" type="button" style="bottom:124px" aria-label="Прыжок"><svg viewBox="0 0 24 24"><path d="M6 14l6-6 6 6M6 20l6-6 6 6"/></svg>прыжок</button>' +
    '<button class="tbtn" id="tb-crouch" type="button" style="bottom:26px" aria-label="Присед"><svg viewBox="0 0 24 24"><path d="M6 10l6 6 6-6M6 4l6 6 6-6"/></svg>присед</button>' +
    '<div class="rot">Поверните телефон горизонтально</div>';
  document.body.appendChild(tc);
  tc.addEventListener('contextmenu', (e) => e.preventDefault());

  // взгляд: любое касание свободной области, у каждого пальца своё состояние
  const look = $('.look', tc); let lp = null, lx = 0, ly = 0;
  look.addEventListener('pointerdown', (e) => { lp = e.pointerId; lx = e.clientX; ly = e.clientY; look.setPointerCapture(e.pointerId); });
  look.addEventListener('pointermove', (e) => { if (e.pointerId !== lp || !pc) return; pc.lookBy(e.clientX - lx, e.clientY - ly); lx = e.clientX; ly = e.clientY; });
  const lend = (e) => { if (e.pointerId === lp) lp = null; };
  look.addEventListener('pointerup', lend); look.addEventListener('pointercancel', lend);

  // джойстик
  const joy = $('.joy', tc), knob = $('.knob', tc); let jp = null;
  function jset(e) {
    const r = joy.getBoundingClientRect(), R = r.width / 2;
    let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R); const l = Math.hypot(dx, dy);
    if (l > R) { dx *= R / l; dy *= R / l; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    if (!pc) return;
    if (Math.hypot(dx, dy) / R < 0.12) { pc.axis.x = 0; pc.axis.z = 0; } else { pc.axis.x = dx / R; pc.axis.z = dy / R; }   // вверх = вперёд
  }
  joy.addEventListener('pointerdown', (e) => { jp = e.pointerId; joy.setPointerCapture(e.pointerId); jset(e); });
  joy.addEventListener('pointermove', (e) => { if (e.pointerId === jp) jset(e); });
  const jend = (e) => { if (e.pointerId !== jp) return; jp = null; knob.style.transform = ''; if (pc) { pc.axis.x = 0; pc.axis.z = 0; } };
  joy.addEventListener('pointerup', jend); joy.addEventListener('pointercancel', jend);

  // прыжок — пока нажата; присед — переключатель (нажал: присел, нажал ещё раз: встал)
  const bj = $('#tb-jump', tc), bc = $('#tb-crouch', tc);
  bj.addEventListener('pointerdown', (e) => { e.preventDefault(); if (pc) pc.ext.jump = true; bj.classList.add('on'); });
  const jrel = () => { if (pc) pc.ext.jump = false; bj.classList.remove('on'); };
  bj.addEventListener('pointerup', jrel); bj.addEventListener('pointercancel', jrel); bj.addEventListener('pointerleave', jrel);
  bc.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!pc) return; pc.ext.crouch = !pc.ext.crouch; bc.classList.toggle('on', pc.ext.crouch); });

  /* ---------- выбор режима ---------- */
  function choose(m, gesture) {
    mode = m;
    try { sessionStorage.setItem(KEY, m); } catch (e) {}
    ctl.classList.remove('on');
    tc.classList.toggle('on', m === 'touch');
    document.body.classList.toggle('touch', m === 'touch');
    if (pc) { pc.setMode(m); bc.classList.remove('on'); }
    if (m === 'touch' && gesture) {   // на весь экран и в горизонталь, если браузер разрешает
      const el = document.documentElement;
      try { (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el); } catch (e) {}
      try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) {}
    }
  }

  function start() {
    pc = $('#player').components['player-controls'];
    let saved = null; try { saved = sessionStorage.getItem(KEY); } catch (e) {}
    if (saved && ICON[saved]) choose(saved, false);   // вернулись с другой страницы: повторно не спрашиваем
    else { pc.setMode(null); ctl.classList.add('on'); }
  }
  const scene = $('a-scene');
  if (scene.hasLoaded) start(); else scene.addEventListener('loaded', start);
})();
