/* ==========================================================================
   MAX VIEW LATINO | Landing premium
   JavaScript puro, sin dependencias.

   Principios de rendimiento
   - Un solo bucle requestAnimationFrame para scroll, parallax y marquee
     (no hay listeners de "scroll"; se lee scrollY una vez por frame).
   - IntersectionObserver para revelados, contadores y pausa de animaciones.
   - Solo se animan transform / opacity / translate.
   - Todo respeta prefers-reduced-motion.

   Para cambiar el número de WhatsApp: edita WA_NUMBER aquí
   y los href "https://wa.me/..." del HTML (el JS reescribe los enlaces con mensaje).
   ========================================================================== */
(() => {
  'use strict';

  window.__mvReady = true;

  /* ---------- Configuración ---------- */
  const WA_NUMBER = '526371105206';
  const BRAND = 'Max View Latino';

  /* ---------- Utilidades ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 4);
  const money = new Intl.NumberFormat('es-MX');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const waLink = (msg) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  const root = document.documentElement;

  const state = { y: window.scrollY, vh: window.innerHeight, vw: window.innerWidth };

  /* ======================================================================
     1. ENLACES DE WHATSAPP (mensajes prellenados)
     ====================================================================== */
  function initWhatsAppLinks() {
    $$('[data-wa]').forEach((a) => {
      a.href = waLink(a.dataset.wa);
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  /* ======================================================================
     2. PRELOADER: "sintonizando señal" + apertura tipo cortina de cine
     ====================================================================== */
  function initPreloader() {
    const pl = $('#preloader');
    if (!pl) { markReady(); return; }

    const num = $('[data-pl-num]', pl);
    const status = $('[data-pl-status]', pl);
    const ring = $('.pl-prog', pl);
    const messages = ['Sintonizando señal', 'Cargando catálogo', 'Optimizando la calidad', 'Todo listo para el play'];

    let loaded = document.readyState === 'complete';
    window.addEventListener('load', () => { loaded = true; }, { once: true });

    const minMs = reduceMotion ? 450 : 2300;
    const maxMs = 7000;
    const t0 = performance.now();
    let p = 0;
    let lastMsg = -1;

    const tick = (now) => {
      const t = now - t0;
      let target = Math.min(88, (t / minMs) * 88);
      if ((loaded && t >= minMs) || t > maxMs) target = 100;
      p = lerp(p, target, reduceMotion ? 0.35 : 0.075);
      if (target === 100 && p > 99.3) p = 100;

      const shown = Math.floor(p);
      num.textContent = shown;
      ring.style.strokeDashoffset = String(100 - p);
      const mi = Math.min(messages.length - 1, Math.floor(p / 26));
      if (mi !== lastMsg) { lastMsg = mi; status.textContent = messages[mi]; }

      if (p < 100) { requestAnimationFrame(tick); return; }

      setTimeout(() => {
        pl.classList.add('is-done');
        setTimeout(markReady, reduceMotion ? 0 : 520);
        setTimeout(() => pl.remove(), reduceMotion ? 50 : 1300);
      }, 260);
    };
    requestAnimationFrame(tick);
  }

  function markReady() {
    root.classList.add('is-ready');
    document.body.classList.remove('is-loading');
    const title = $('.hero-title');
    if (title) setTimeout(() => title.classList.add('in'), reduceMotion ? 0 : 280);
    measure();
  }

  /* ======================================================================
     3. TITULARES POR PALABRA + REVELADO AL HACER SCROLL
     ====================================================================== */
  function splitText(el) {
    let idx = 0;
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const outer = document.createElement('span');
            outer.className = 'sw';
            outer.setAttribute('aria-hidden', 'true');
            const inner = document.createElement('span');
            inner.className = 'swi';
            inner.style.setProperty('--wi', idx++);
            inner.textContent = part;
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          walk(n);
        }
      });
    };
    walk(el);
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = label;
    el.prepend(sr);
  }

  function initReveal() {
    $$('[data-split]').forEach(splitText);

    const targets = $$('.reveal, [data-split]:not([data-split="hero"])');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      targets.forEach((t) => t.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    targets.forEach((t) => io.observe(t));
  }

  /* ======================================================================
     4. NAVEGACIÓN: estado al hacer scroll, scrollspy, menú móvil
     ====================================================================== */
  function initNav() {
    const nav = $('#nav');
    const burger = $('.burger');
    const menu = $('#menu');
    if (!nav || !burger || !menu) return;

    $$('.menu-nav a', menu).forEach((a, i) => a.style.setProperty('--k', i));

    const setMenu = (open) => {
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      root.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
    window.matchMedia('(min-width: 1100px)').addEventListener('change', (m) => { if (m.matches) setMenu(false); });

    // scrollspy
    const links = $$('.nav-links a');
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    if ('IntersectionObserver' in window) {
      const spy = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          const link = map.get(e.target.id);
          if (link && e.isIntersecting) {
            links.forEach((l) => l.classList.toggle('is-active', l === link));
          }
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      map.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
    }
  }

  /* ======================================================================
     5. PARED DE PÓSTERS (arte abstracto generado, sin material con copyright)
     ====================================================================== */
  function mulberry32(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function buildWall() {
    const wall = $('[data-wall]');
    if (!wall) return;
    const rand = mulberry32(44);
    const small = state.vw < 700;
    const rows = small ? 7 : 9;

    // medimos el ancho real de un póster para generar solo los que hacen falta
    const probe = document.createElement('i');
    probe.className = 'poster';
    probe.style.visibility = 'hidden';
    wall.appendChild(probe);
    const stride = probe.offsetWidth + 14;
    wall.removeChild(probe);
    const perHalf = clamp(Math.ceil((state.vw * 1.5) / stride) + 1, 8, 30);
    const palettes = [[215, 268], [200, 322], [28, 350], [45, 18], [262, 212], [188, 232], [330, 262], [12, 42], [160, 215], [240, 290]];

    for (let r = 0; r < rows; r++) {
      const row = document.createElement('div');
      row.className = 'wall-row';
      row.style.setProperty('--dur', `${68 + Math.round(rand() * 55)}s`);
      row.style.setProperty('--dir', r % 2 ? 'reverse' : 'normal');
      row.style.marginLeft = `${-Math.round(rand() * 220)}px`;

      const specs = Array.from({ length: perHalf }, () => {
        const pal = palettes[Math.floor(rand() * palettes.length)];
        return {
          h1: pal[0] + Math.round(rand() * 14 - 7),
          h2: pal[1] + Math.round(rand() * 14 - 7),
          x: 18 + Math.round(rand() * 64),
          y: 8 + Math.round(rand() * 30),
          cx: 38 + Math.round(rand() * 26),
          v: Math.floor(rand() * 4),
        };
      });

      for (let k = 0; k < 2; k++) {
        const half = document.createElement('div');
        half.className = 'wall-half';
        specs.forEach((s) => {
          const poster = document.createElement('i');
          poster.className = 'poster';
          poster.dataset.v = s.v;
          poster.style.cssText = `--h1:${s.h1};--h2:${s.h2};--x:${s.x}%;--y:${s.y}%;--cx:${s.cx}%`;
          half.appendChild(poster);
        });
        row.appendChild(half);
      }
      wall.appendChild(row);
    }
  }

  /* ======================================================================
     6. PARTÍCULAS DEL HERO (canvas 2D, pausa fuera de vista)
     ====================================================================== */
  function initParticles() {
    const canvas = $('[data-particles]');
    const hero = $('.hero');
    if (!canvas || reduceMotion) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    let w = 0; let h = 0; let pts = [];
    const mouse = { x: -9999, y: -9999 };
    let visible = true;
    let raf = 0;

    const make = () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: 0.6 + Math.random() * 1.7,
      vx: (Math.random() - 0.5) * 0.22, vy: -0.06 - Math.random() * 0.28,
      tw: Math.random() * Math.PI * 2,
      gold: Math.random() < 0.28,
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(clamp((w * h) / 17000, 26, 86));
      pts = Array.from({ length: n }, make);
    };

    const draw = () => {
      raf = 0;
      if (!visible) return;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const dx = p.x - mouse.x; const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 14400) { const d = Math.sqrt(d2) || 1; const f = (120 - d) / 120; p.x += (dx / d) * f * 1.8; p.y += (dy / d) * f * 1.8; }
        p.x += p.vx; p.y += p.vy; p.tw += 0.03;
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;

        const a = 0.35 + Math.sin(p.tw) * 0.3;
        ctx.beginPath();
        ctx.fillStyle = p.gold ? `rgba(255,217,130,${a})` : `rgba(130,196,255,${a})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j];
          const lx = p.x - q.x; const ly = p.y - q.y;
          const ld = lx * lx + ly * ly;
          if (ld < 9600) {
            ctx.strokeStyle = `rgba(110,170,255,${(1 - ld / 9600) * 0.16})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };

    const start = () => { if (!raf && visible) raf = requestAnimationFrame(draw); };

    resize();
    window.addEventListener('resize', () => { clearTimeout(resize.t); resize.t = setTimeout(resize, 200); });
    if (hero) {
      hero.addEventListener('pointermove', (e) => {
        const r = canvas.getBoundingClientRect();
        mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      }, { passive: true });
      hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    }
    if ('IntersectionObserver' in window && hero) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        hero.classList.toggle('is-off', !visible);
        if (visible) start();
      }).observe(hero);
    }
    start();
  }

  /* ======================================================================
     7. HERO: rotador de palabras e inclinación 3D con el cursor
     ====================================================================== */
  function initRotator() {
    const box = $('[data-rotator]');
    if (!box || reduceMotion) return;
    const items = $$('span', box);
    let i = 0;
    setInterval(() => {
      const cur = items[i];
      i = (i + 1) % items.length;
      const next = items[i];
      cur.classList.remove('on'); cur.classList.add('out');
      next.classList.add('on');
      setTimeout(() => {
        cur.style.transition = 'none';
        cur.classList.remove('out');
        void cur.offsetWidth;
        cur.style.transition = '';
      }, 760);
    }, 2600);
  }

  function initTilt() {
    const hero = $('.hero');
    const visual = $('.hero-visual[data-tilt]');
    if (!hero || !visual || !finePointer || reduceMotion) return;
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      visual.style.setProperty('--ry', `${(-6 + px * 12).toFixed(2)}deg`);
      visual.style.setProperty('--rx', `${(3 - py * 8).toFixed(2)}deg`);
    }, { passive: true });
    hero.addEventListener('pointerleave', () => {
      visual.style.setProperty('--ry', '-6deg');
      visual.style.setProperty('--rx', '3deg');
    });
  }

  /* ======================================================================
     8. INTERACCIÓN: botones magnéticos y foco de luz en tarjetas
     ====================================================================== */
  function initMagnetic() {
    if (!finePointer || reduceMotion) return;
    $$('.magnetic').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--mx', `${((e.clientX - r.left - r.width / 2) * 0.2).toFixed(1)}px`);
        b.style.setProperty('--my', `${((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1)}px`);
      });
      b.addEventListener('pointerleave', () => {
        b.style.setProperty('--mx', '0px');
        b.style.setProperty('--my', '0px');
      });
    });
  }

  function initSpotlight() {
    if (!finePointer) return;
    document.addEventListener('pointermove', (e) => {
      const t = e.target.closest && e.target.closest('.spot');
      if (!t) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx-p', `${(e.clientX - r.left).toFixed(0)}px`);
      t.style.setProperty('--my-p', `${(e.clientY - r.top).toFixed(0)}px`);
    }, { passive: true });
  }

  /* ======================================================================
     9. MARQUEE, PARALLAX Y SECCIÓN FIJA (bucle único por frame)
     ====================================================================== */
  const loopData = {
    marquee: null, marqueeVisible: true, mx: 0, groupW: 0,
    parallax: [], story: null, steps: [], scenes: [], stepsBox: null, storyIdx: -1,
    hero: null, progress: null, nav: null, vel: 0, lastY: window.scrollY, lastT: performance.now(),
  };

  function measure() {
    state.vh = window.innerHeight;
    state.vw = window.innerWidth;
    const d = loopData;
    if (d.marquee) d.groupW = d.marquee.firstElementChild.offsetWidth;
    d.parallax.forEach((p) => {
      p.el.style.setProperty('--py', '0px');
    });
    const y = window.scrollY;
    d.parallax.forEach((p) => {
      const r = p.el.getBoundingClientRect();
      p.base = r.top + y + r.height / 2;
      p.cur = 0;
    });
  }

  function initLoop() {
    const d = loopData;
    d.hero = $('.hero');
    d.progress = $('.progress');
    d.nav = $('#nav');

    const mq = $('[data-marquee]');
    if (mq) {
      d.marquee = $('.marquee-track', mq);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([e]) => { d.marqueeVisible = e.isIntersecting; }).observe(mq);
      }
    }

    if (!reduceMotion) {
      d.parallax = $$('[data-parallax]').map((el) => ({
        el, speed: parseFloat(el.dataset.parallax) || 0.1, base: 0, cur: 0,
      }));
    }

    d.story = $('[data-story]');
    if (d.story) {
      d.steps = $$('.step', d.story);
      d.scenes = $$('.scene', d.story);
      d.stepsBox = $('.steps', d.story);
    }

    measure();
    window.addEventListener('resize', () => { clearTimeout(measure.t); measure.t = setTimeout(measure, 150); });
    window.addEventListener('load', measure);

    const frame = (now) => {
      const y = window.scrollY;
      const dt = Math.min(0.064, (now - d.lastT) / 1000) || 0.016;
      d.lastT = now;
      const sv = (y - d.lastY) / dt;
      d.vel = lerp(d.vel, sv, 0.12);
      d.lastY = y;
      state.y = y;

      // barra de progreso + nav
      const max = document.documentElement.scrollHeight - state.vh;
      if (d.progress) d.progress.style.setProperty('--sp', max > 0 ? (y / max).toFixed(4) : '0');
      if (d.nav) d.nav.classList.toggle('is-stuck', y > 24);

      // desvanecer el hero al salir
      if (d.hero) d.hero.style.setProperty('--hs', clamp(y / (state.vh * 0.85), 0, 1).toFixed(3));

      // parallax suave (lerp = sensación de movimiento lento)
      for (const p of d.parallax) {
        const rel = y + state.vh / 2 - p.base;
        if (Math.abs(rel) > state.vh * 2.2) continue;
        const target = -rel * p.speed;
        p.cur = lerp(p.cur, target, 0.09);
        p.el.style.setProperty('--py', `${p.cur.toFixed(1)}px`);
      }

      // marquee reactivo a la velocidad del scroll
      if (d.marquee && d.marqueeVisible && d.groupW && !reduceMotion) {
        d.mx -= (70 + d.vel * 0.55) * dt;
        if (d.mx <= -d.groupW) d.mx += d.groupW;
        if (d.mx > 0) d.mx -= d.groupW;
        d.marquee.style.transform = `translate3d(${d.mx.toFixed(1)}px,0,0)`;
      }

      // sección fija "Cómo funciona"
      if (d.story && state.vw >= 900) {
        const r = d.story.getBoundingClientRect();
        const span = r.height - state.vh;
        const p = clamp(-r.top / span, 0, 1);
        const n = d.steps.length;
        const idx = Math.min(n - 1, Math.floor(p * n));
        if (d.stepsBox) d.stepsBox.style.setProperty('--sp-story', (0.06 + p * 0.88).toFixed(3));
        if (idx !== d.storyIdx) {
          d.storyIdx = idx;
          d.steps.forEach((s, i) => s.classList.toggle('on', i === idx));
          d.scenes.forEach((s, i) => s.classList.toggle('on', i === idx));
        }
      }

      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* ======================================================================
     10. PLANES: selector de periodo, precios animados y enlaces a WhatsApp
     ====================================================================== */
  function initPricing() {
    const group = $('[data-period]');
    if (!group) return;
    const buttons = $$('button[role="radio"]', group);
    const cards = $$('[data-prices]');
    const labels = ['1 mes', '3 meses', '6 meses', '1 año'];
    const months = [1, 3, 6, 12];
    let current = -1;

    const tween = (el, to, prefix) => {
      const from = el._v ?? to;
      el._v = to;
      if (reduceMotion || from === to) { el.textContent = prefix + money.format(to); return; }
      const t0 = performance.now();
      cancelAnimationFrame(el._raf);
      const step = (now) => {
        const k = clamp((now - t0) / 700, 0, 1);
        el.textContent = prefix + money.format(Math.round(lerp(from, to, easeOut(k))));
        if (k < 1) el._raf = requestAnimationFrame(step);
      };
      el._raf = requestAnimationFrame(step);
    };

    const render = (idx) => {
      if (idx === current) return;
      current = idx;
      group.style.setProperty('--i', idx);
      buttons.forEach((b, i) => { b.setAttribute('aria-checked', String(i === idx)); b.tabIndex = i === idx ? 0 : -1; });

      cards.forEach((card) => {
        const prices = card.dataset.prices.split(',').map(Number);
        const price = prices[idx];
        const amt = $('[data-amt]', card);
        const prefix = amt.textContent.trim().startsWith('$') ? '$' : '';
        if (amt._v === undefined) amt._v = prices[0];
        tween(amt, price, prefix);

        const unit = $('[data-unit]', card);
        if (unit) unit.textContent = buttons[idx].dataset.unit;

        const per = $('[data-permonth]', card);
        const save = $('[data-save]', card);
        if (per && save) {
          if (idx === 0) {
            per.textContent = 'Elige más meses y paga menos al mes';
            save.hidden = true;
          } else {
            const perMonth = Math.round(price / months[idx]);
            const saved = prices[0] * months[idx] - price;
            per.textContent = `Equivale a $${money.format(perMonth)} al mes`;
            save.textContent = `Ahorras $${money.format(saved)}`;
            save.hidden = saved <= 0;
          }
        }

        const cta = $('[data-wa-plan]', card);
        if (cta) {
          const what = card.classList.contains('app') ? card.dataset.plan : `el ${card.dataset.plan}`;
          const msg = `Hola, quiero ${what} de ${BRAND} por ${labels[idx]} ($${money.format(price)} MXN). ¿Me ayudan a activarlo?`;
          cta.href = waLink(msg);
        }
      });
    };

    buttons.forEach((b, i) => b.addEventListener('click', () => render(i)));
    group.addEventListener('keydown', (e) => {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      const next = (current + keys[e.key] + buttons.length) % buttons.length;
      render(next);
      buttons[next].focus();
    });
    render(0);
  }

  /* ======================================================================
     11. DISPOSITIVOS: filtro de la órbita y contadores
     ====================================================================== */
  function initOrbit() {
    const orbit = $('[data-orbit]');
    if (!orbit) return;
    $$('.plat').forEach((card) => {
      ['pointerenter', 'focus'].forEach((ev) => card.addEventListener(ev, () => { orbit.dataset.focus = card.dataset.focus; }));
      ['pointerleave', 'blur'].forEach((ev) => card.addEventListener(ev, () => { delete orbit.dataset.focus; }));
    });
  }

  function initCounters() {
    const els = $$('[data-count]');
    if (!els.length) return;
    const run = (el) => {
      const to = Number(el.dataset.count);
      if (reduceMotion) { el.textContent = to; return; }
      const t0 = performance.now();
      const step = (now) => {
        const k = clamp((now - t0) / 1500, 0, 1);
        el.textContent = Math.round(to * easeOut(k));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!('IntersectionObserver' in window)) { els.forEach((e) => { e.textContent = e.dataset.count; }); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.6 });
    els.forEach((e) => io.observe(e));
  }

  /* ======================================================================
     12. MOMENTOS (acordeón de fotos) Y FAQ
     ====================================================================== */
  function initMoments() {
    const wrap = $('[data-moments]');
    if (!wrap) return;
    const items = $$('.moment', wrap);
    const activate = (el) => items.forEach((i) => i.classList.toggle('on', i === el));
    items.forEach((m) => {
      m.addEventListener('pointerenter', () => activate(m));
      m.addEventListener('focus', () => activate(m));
      m.addEventListener('click', () => activate(m));
    });
  }

  function initFaq() {
    const list = $('[data-faq]');
    if (!list) return;
    const items = $$('.faq-item', list);
    const setOpen = (item, open) => {
      const btn = $('button', item);
      const panel = $('.faq-a', item);
      btn.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('open', open);
    };
    items.forEach((item) => {
      $('button', item).addEventListener('click', () => {
        const willOpen = $('button', item).getAttribute('aria-expanded') !== 'true';
        items.forEach((i) => setOpen(i, false));
        setOpen(item, willOpen);
      });
    });
    setOpen(items[0], true);
  }

  /* ======================================================================
     13. FORMULARIO -> WHATSAPP
     ====================================================================== */
  function initForm() {
    const form = $('#wa-form');
    if (!form) return;
    const note = $('[data-form-note]', form);
    const fields = {
      name: $('#f-name'), device: $('#f-device'), plan: $('#f-plan'), period: $('#f-period'), msg: $('#f-msg'),
    };
    const rules = [
      { el: fields.name, err: $('#e-name'), test: (v) => v.trim().length >= 2, text: 'Escribe tu nombre para saludarte bien.' },
      { el: fields.device, err: $('#e-device'), test: (v) => !!v, text: 'Elige tu dispositivo.' },
      { el: fields.plan, err: $('#e-plan'), test: (v) => !!v, text: 'Elige lo que te interesa.' },
    ];

    rules.forEach((r) => {
      const clear = () => { r.el.closest('.field').classList.remove('invalid'); r.err.textContent = ''; };
      r.el.addEventListener('input', clear);
      r.el.addEventListener('change', clear);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let firstBad = null;
      rules.forEach((r) => {
        const ok = r.test(r.el.value);
        r.el.closest('.field').classList.toggle('invalid', !ok);
        r.err.textContent = ok ? '' : r.text;
        r.el.setAttribute('aria-invalid', String(!ok));
        if (!ok && !firstBad) firstBad = r.el;
      });
      if (firstBad) { firstBad.focus(); return; }

      const name = fields.name.value.trim();
      const plan = fields.plan.value;
      const asksDemo = plan === 'Quiero pedir mi demo';
      let msg = `Hola, soy ${name}. `;
      msg += asksDemo
        ? `Quiero pedir mi demo de ${BRAND}. `
        : `Quiero ${plan} de ${BRAND} por ${fields.period.value}. `;
      msg += `Mi dispositivo: ${fields.device.value}.`;
      const extra = fields.msg.value.trim();
      if (extra) msg += ` ${extra}`;

      const url = waLink(msg);
      const win = window.open(url, '_blank', 'noopener');
      note.textContent = 'Abriendo WhatsApp con tu mensaje listo para enviar.';
      if (!win) {
        note.innerHTML = '';
        const a = document.createElement('a');
        a.href = url; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = 'Toca aquí para abrir WhatsApp';
        note.append('Tu navegador bloqueó la ventana. ', a, '.');
      }
    });
  }

  /* ======================================================================
     14. BOTÓN FLOTANTE DE WHATSAPP: aviso discreto
     ====================================================================== */
  function initWaTip() {
    const tip = $('[data-wa-tip]');
    if (!tip) return;
    let dismissed = false;
    try { dismissed = sessionStorage.getItem('mv-tip') === '1'; } catch (_) { /* sin storage */ }
    if (dismissed) return;
    const hide = () => {
      tip.classList.remove('show');
      try { sessionStorage.setItem('mv-tip', '1'); } catch (_) { /* sin storage */ }
    };
    $('[data-wa-tip-close]', tip).addEventListener('click', hide);
    setTimeout(() => tip.classList.add('show'), 6000);
    setTimeout(() => tip.classList.remove('show'), 16000);
  }

  /* ======================================================================
     ARRANQUE
     ====================================================================== */
  function init() {
    root.classList.add('is-js');
    initWhatsAppLinks();
    buildWall();
    initReveal();
    initNav();
    initRotator();
    initTilt();
    initMagnetic();
    initSpotlight();
    initPricing();
    initOrbit();
    initCounters();
    initMoments();
    initFaq();
    initForm();
    initWaTip();
    initLoop();
    initParticles();

    const year = $('[data-year]');
    if (year) year.textContent = new Date().getFullYear();

    initPreloader();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
