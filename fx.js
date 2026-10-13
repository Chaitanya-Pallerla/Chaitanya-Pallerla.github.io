/* ==========================================================================
   fx.js — shared motion & interaction layer for all pages
   Particle network · scroll progress · cursor glow · scroll reveal ·
   3D tilt + spotlight · count-up · typewriter · magnetic buttons
   All effects are disabled or simplified under prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ---------- Injected styles ---------- */
  const css = `
  #fx-net{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.9}
  #fx-progress{position:fixed;top:0;left:0;height:2px;width:0;z-index:2000;
    background:linear-gradient(90deg,var(--accent),var(--accent2));box-shadow:0 0 12px var(--accent);transition:width .1s linear}
  #fx-glow{position:fixed;left:0;top:0;width:420px;height:420px;margin:-210px 0 0 -210px;border-radius:50%;
    pointer-events:none;z-index:0;background:radial-gradient(circle,rgba(255,107,43,.10),transparent 65%);
    transition:opacity .4s;will-change:transform}
  body.light #fx-glow{background:radial-gradient(circle,rgba(255,107,43,.08),transparent 65%)}
  .fx-reveal{opacity:0;transform:translateY(26px);transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1)}
  .fx-reveal.fx-in{opacity:1;transform:none}
  .fx-spot{--mx:50%;--my:50%}
  .fx-spot:hover{background-image:radial-gradient(380px circle at var(--mx) var(--my),rgba(255,107,43,.12),transparent 45%)!important}
  .fx-tilt{transform-style:preserve-3d;will-change:transform}
  .fx-caret{display:inline-block;width:.55em;margin-left:2px;border-bottom:2px solid var(--accent2);animation:fxBlink 1s steps(1) infinite;transform:translateY(-2px)}
  @keyframes fxBlink{50%{opacity:0}}
  .fx-shine{background:linear-gradient(110deg,var(--accent) 20%,var(--accent2) 40%,#fff3 50%,var(--accent2) 60%,var(--accent) 80%);
    background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent!important;animation:fxShine 6s linear infinite}
  @keyframes fxShine{to{background-position:-250% 0}}
  @media (prefers-reduced-motion:reduce){.fx-reveal{opacity:1;transform:none;transition:none}.fx-shine{animation:none}.fx-caret{display:none}}
  `;
  const st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- Scroll progress ---------- */
  const bar = document.createElement('div');
  bar.id = 'fx-progress';
  document.body.appendChild(bar);
  function onScroll() {
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + '%';
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Cursor glow ---------- */
  const mouse = { x: -9999, y: -9999 };
  if (finePointer && !reduce) {
    const glow = document.createElement('div');
    glow.id = 'fx-glow';
    document.body.prepend(glow);
    let gx = innerWidth / 2, gy = innerHeight / 2;
    (function loop() {
      gx += (mouse.x - gx) * 0.12;
      gy += (mouse.y - gy) * 0.12;
      glow.style.transform = `translate(${gx}px,${gy}px)`;
      requestAnimationFrame(loop);
    })();
  }
  addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  document.addEventListener('pointerleave', () => { mouse.x = -9999; mouse.y = -9999; });

  /* ---------- Particle network ---------- */
  if (!reduce) {
    const cv = document.createElement('canvas');
    cv.id = 'fx-net';
    document.body.prepend(cv);
    const ctx = cv.getContext('2d');
    let W, H, pts = [], dpr = Math.min(devicePixelRatio || 1, 2), running = true;
    function size() {
      W = innerWidth; H = innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(90, (W * H) / 16000));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.6
      }));
    }
    size();
    addEventListener('resize', size);
    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
      if (running) requestAnimationFrame(draw);
    });
    const LINK = 130, MLINK = 170;
    function draw() {
      if (!running) return;
      const light = document.body.classList.contains('light');
      const a = light ? 0.55 : 1;
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        // gentle attraction toward cursor
        const dx = mouse.x - p.x, dy = mouse.y - p.y, d2 = dx * dx + dy * dy;
        if (d2 < MLINK * MLINK && d2 > 1) { p.vx += dx / d2 * 0.6; p.vy += dy / d2 * 0.6; }
        p.vx *= 0.995; p.vy *= 0.995;
        const sp = Math.hypot(p.vx, p.vy);
        if (sp < 0.12) { p.vx += (Math.random() - 0.5) * 0.05; p.vy += (Math.random() - 0.5) * 0.05; }
        if (sp > 1.2) { p.vx *= 0.9; p.vy *= 0.9; }
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10; if (p.y > H + 10) p.y = -10;
      }
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j], dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy);
          if (d < LINK) {
            ctx.strokeStyle = `rgba(255,107,43,${(1 - d / LINK) * 0.22 * a})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
        const md = Math.hypot(mouse.x - p.x, mouse.y - p.y);
        if (md < MLINK) {
          ctx.strokeStyle = `rgba(255,179,71,${(1 - md / MLINK) * 0.45 * a})`;
          ctx.lineWidth = 0.9;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
        ctx.fillStyle = `rgba(255,140,70,${0.55 * a})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  /* ---------- Scroll reveal ---------- */
  const REVEAL_SEL = '.area-card,.news-item,.award-item,.edu-item,.about-section,.section-title,.section-label,' +
    '.home-stats,.marquee,.mentor-card,.impact-panel,.glass-card,.coauthors-section,.pill-row,.fx-r';
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) revealEl(en.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }) : null;

  // Fallback for elements observed while hidden (display:none) — some engines never re-notify.
  function revealEl(el) {
    if (!el.classList.contains('fx-reveal') || el.classList.contains('fx-in')) return;
    el.classList.add('fx-in');
    if (io) io.unobserve(el);
    const wait = 750 + (parseFloat(el.style.transitionDelay) || 0);
    setTimeout(() => { el.classList.remove('fx-reveal', 'fx-in'); el.style.transitionDelay = ''; }, wait);
  }
  let checkQueued = false;
  function checkVisible() {
    checkQueued = false;
    document.querySelectorAll('.fx-reveal:not(.fx-in)').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height && r.top < innerHeight - 40 && r.bottom > 0) revealEl(el);
    });
  }
  function queueCheck() { if (!checkQueued) { checkQueued = true; requestAnimationFrame(checkVisible); } }
  addEventListener('scroll', queueCheck, { passive: true });
  addEventListener('resize', queueCheck);
  setInterval(checkVisible, 700);

  function armReveal(root) {
    if (reduce || !io) return;
    root.querySelectorAll(REVEAL_SEL).forEach(el => {
      if (el.dataset.fxr) return;
      el.dataset.fxr = '1';
      // stagger siblings in grids/lists
      const sib = el.parentElement ? Array.from(el.parentElement.children).indexOf(el) : 0;
      el.style.transitionDelay = Math.min(sib, 8) * 60 + 'ms';
      el.classList.add('fx-reveal');
      io.observe(el);
    });
  }

  /* ---------- Tilt + spotlight ---------- */
  const TILT_SEL = '.area-card,.proj-card,.coauthor-card,.mentor-card';
  const SPOT_SEL = TILT_SEL + ',.pub-card,.news-item,.award-item,.skill-chip,.home-stat,.stat-item,.glass-card,.contact-item';

  function armCards(root) {
    root.querySelectorAll(SPOT_SEL).forEach(el => {
      if (el.dataset.fxs) return;
      el.dataset.fxs = '1';
      el.classList.add('fx-spot');
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    if (reduce || !finePointer) return;
    root.querySelectorAll(TILT_SEL).forEach(el => {
      if (el.dataset.fxt) return;
      el.dataset.fxt = '1';
      el.classList.add('fx-tilt');
      // entrance keyframes with fill-mode "forwards" would lock transform; release them once done
      el.addEventListener('animationend', () => { el.style.animation = 'none'; el.style.opacity = '1'; }, { once: true });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transition = 'transform .08s linear, border-color .3s, box-shadow .3s, background .3s';
        el.style.transform = `perspective(900px) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 9).toFixed(2)}deg) translateY(-5px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = 'transform .5s cubic-bezier(.2,.8,.2,1), border-color .3s, box-shadow .3s, background .3s';
        el.style.transform = '';
      });
    });
  }

  /* ---------- Magnetic buttons ---------- */
  function armMagnetic(root) {
    if (reduce || !finePointer) return;
    root.querySelectorAll('.btn-primary,.btn-ghost,.social-pill,.proj-panel-link,.scholar-link').forEach(b => {
      if (b.dataset.fxm) return;
      b.dataset.fxm = '1';
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px,${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  /* ---------- Count-up (data-count="53" data-prefix="$" data-suffix="+") ---------- */
  function runCount(el) {
    const end = parseFloat(el.dataset.count), pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    if (reduce || isNaN(end)) { el.textContent = pre + (isNaN(end) ? el.dataset.count : end) + suf; return; }
    const dur = 1600, t0 = performance.now();
    (function step(t) {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      el.textContent = pre + Math.round(end * e) + suf;
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  const cio = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { runCount(en.target); cio.unobserve(en.target); } });
  }, { threshold: 0.4 }) : null;
  function armCounts(root) {
    root.querySelectorAll('[data-count]').forEach(el => {
      if (el.dataset.fxc) return;
      el.dataset.fxc = '1';
      cio ? cio.observe(el) : runCount(el);
    });
  }

  /* ---------- Typewriter (data-typed='["A","B"]') ---------- */
  function armTyped(root) {
    root.querySelectorAll('[data-typed]').forEach(el => {
      if (el.dataset.fxty) return;
      el.dataset.fxty = '1';
      let words;
      try { words = JSON.parse(el.dataset.typed); } catch (e) { return; }
      if (!words.length) return;
      if (reduce) { el.textContent = words[0]; return; }
      const txt = document.createElement('span'), caret = document.createElement('span');
      caret.className = 'fx-caret';
      el.textContent = ''; el.append(txt, caret);
      let w = 0, i = 0, del = false;
      (function tick() {
        const word = words[w];
        i += del ? -1 : 1;
        txt.textContent = word.slice(0, i);
        let delay = del ? 28 : 55;
        if (!del && i === word.length) { del = true; delay = 1900; }
        else if (del && i === 0) { del = false; w = (w + 1) % words.length; delay = 350; }
        setTimeout(tick, delay);
      })();
    });
  }

  /* ---------- Boot + watch for dynamically rendered cards ---------- */
  function armAll(root) { armReveal(root); armCards(root); armMagnetic(root); armCounts(root); armTyped(root); }
  armAll(document);
  new MutationObserver(muts => {
    for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1) armAll(n.parentElement || document);
  }).observe(document.body, { childList: true, subtree: true });

  // Hidden SPA sections (display:none) get revealed when shown; re-check visibility on nav.
  window.fxRefresh = () => { armAll(document); queueCheck(); };
})();
