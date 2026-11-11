/* Nexus Diamond Team — main.js (vanilla; GSAP/Lenis son mejoras opcionales) */
(function () {
  'use strict';

  var doc = document.documentElement;
  var CONFIG = window.NDT_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var lenis = null;

  /* =========================================================
     UTM / origen de la visita (se guarda durante la sesión)
     ========================================================= */
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  var utm = {};
  try {
    var params = new URLSearchParams(location.search);
    var stored = JSON.parse(sessionStorage.getItem('ndt_utm') || '{}');
    UTM_KEYS.forEach(function (k) { utm[k] = params.get(k) || stored[k] || ''; });
    if (!stored.referrer) utm.referrer = document.referrer || '';
    else utm.referrer = stored.referrer;
    utm.landing = stored.landing || location.pathname;
    sessionStorage.setItem('ndt_utm', JSON.stringify(utm));
  } catch (e) { /* almacenamiento no disponible */ }

  function track(event, detail) {
    if (window.dataLayer) window.dataLayer.push(Object.assign({ event: event, lang: doc.lang }, detail || {}));
  }

  /* =========================================================
     Header + menú móvil + sección activa
     ========================================================= */
  var header = $('[data-header]');
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 24); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  var nav = $('[data-nav]');
  var toggle = $('[data-menu-toggle]');
  var toggleLabel = $('[data-menu-label]');
  var desktopMQ = window.matchMedia('(min-width: 1080px)');

  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggleLabel.textContent = open ? toggle.dataset.labelClose : toggle.dataset.labelOpen;
    document.body.classList.toggle('menu-open', open);
    if (lenis) { open ? lenis.stop() : lenis.start(); }
    if (open) { var first = $('a', nav); if (first) first.focus({ preventScroll: true }); }
  }
  toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a') && !desktopMQ.matches) setMenu(false); });
  desktopMQ.addEventListener('change', function (e) { if (e.matches) setMenu(false); });

  // Mantener el foco dentro del menú móvil abierto
  document.addEventListener('keydown', function (e) {
    if (!nav.classList.contains('is-open')) return;
    if (e.key === 'Escape') { setMenu(false); toggle.focus(); return; }
    if (e.key !== 'Tab') return;
    var focusables = $$('a, button', nav).concat([toggle]);
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  var navLinks = $$('.site-nav__list a[href*="#"]');
  if ('IntersectionObserver' in window && navLinks.length) {
    var byId = {};
    navLinks.forEach(function (a) { byId[a.hash.slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var link = byId[en.target.id];
        if (!link) return;
        if (en.isIntersecting) {
          navLinks.forEach(function (l) { l.removeAttribute('aria-current'); });
          link.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(byId).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* =========================================================
     Estado de horario (hora de Florida)
     ========================================================= */
  var statusEl = $('[data-status]');
  if (statusEl) {
    try {
      var hours = JSON.parse(statusEl.dataset.hours);
      var st = JSON.parse(statusEl.dataset.i18n);
      var fmtTime = function (hhmm) {
        var p = hhmm.split(':');
        return new Intl.DateTimeFormat(st.lang, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
          .format(new Date(Date.UTC(2024, 0, 1, +p[0], +p[1])));
      };
      var toMin = function (hhmm) { var p = hhmm.split(':'); return +p[0] * 60 + +p[1]; };
      var updateStatus = function () {
        var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
        var get = function (type) { return (parts.find(function (x) { return x.type === type; }) || {}).value; };
        var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
        var now = (+get('hour') % 24) * 60 + +get('minute');
        var today = hours[day], text, open = false;
        if (today && now >= toMin(today[0]) && now < toMin(today[1])) {
          open = true;
          text = st.open + ' · ' + st.until.replace('{t}', fmtTime(today[1]));
        } else {
          for (var i = 0; i < 8; i++) {
            var d = (day + i) % 7, h = hours[d];
            if (!h || (i === 0 && now >= toMin(h[0]))) continue;
            var label = i === 0 ? st.today : i === 1 ? st.tomorrow : st.days[d];
            text = st.closed + ' · ' + st.opens.replace('{d}', label).replace('{t}', fmtTime(h[0]));
            break;
          }
        }
        if (text) $('[data-status-text]', statusEl).textContent = text;
        statusEl.classList.toggle('is-open', open);
      };
      updateStatus();
      setInterval(updateStatus, 60000);
    } catch (err) { /* queda el horario estático */ }
  }

  /* =========================================================
     Carrusel de logos: pausa
     ========================================================= */
  var carriers = $('[data-carriers]');
  var carriersBtn = $('[data-carriers-toggle]');
  if (carriers && carriersBtn) {
    carriersBtn.addEventListener('click', function () {
      var paused = carriers.classList.toggle('is-paused');
      carriersBtn.setAttribute('aria-pressed', String(paused));
      carriersBtn.setAttribute('aria-label', paused ? carriersBtn.dataset.labelPlay : carriersBtn.dataset.labelPause);
    });
  }

  /* =========================================================
     Carrusel de seguros (scroll-snap nativo + botones + arrastre)
     ========================================================= */
  var ctrack = $('[data-carousel-track]');
  if (ctrack) {
    var items = $$('[data-carousel-item]', ctrack);
    var prev = $('[data-carousel-prev]');
    var next = $('[data-carousel-next]');
    var bar = $('[data-carousel-bar]');
    var step = function () { return items[0].getBoundingClientRect().width + parseFloat(getComputedStyle(ctrack).columnGap || 0); };
    var update = function () {
      var max = ctrack.scrollWidth - ctrack.clientWidth - 2;
      if (bar) {
        bar.style.width = (ctrack.clientWidth / ctrack.scrollWidth * 100) + '%';
        bar.style.transform = 'translateX(' + (ctrack.scrollLeft / ctrack.clientWidth * 100) + '%)';
      }
      prev.disabled = ctrack.scrollLeft <= 2;
      next.disabled = ctrack.scrollLeft >= max;
    };
    prev.addEventListener('click', function () { ctrack.scrollBy({ left: -step(), behavior: 'smooth' }); });
    next.addEventListener('click', function () { ctrack.scrollBy({ left: step(), behavior: 'smooth' }); });
    ctrack.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    update();

    // Arrastre con mouse (en táctil el desplazamiento ya es nativo)
    var drag = null;
    ctrack.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('a, button')) return;
      drag = { x: e.clientX, left: ctrack.scrollLeft, moved: false };
    });
    window.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 4) { drag.moved = true; ctrack.classList.add('is-dragging'); }
      if (drag.moved) ctrack.scrollLeft = drag.left - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!drag) return;
      var moved = drag.moved; drag = null;
      if (moved) {
        ctrack.classList.remove('is-dragging');
        var target = Math.round(ctrack.scrollLeft / step()) * step();
        ctrack.scrollTo({ left: target, behavior: 'smooth' });
      }
    });
  }

  /* =========================================================
     Preselección de interés desde las tarjetas
     ========================================================= */
  var interestSelect = $('[data-interest-select]');
  $$('[data-interest]').forEach(function (a) {
    a.addEventListener('click', function () {
      if (!interestSelect) return;
      interestSelect.value = a.dataset.interest;
      interestSelect.dispatchEvent(new Event('change'));
    });
  });

  /* =========================================================
     Mapa bajo demanda (no carga Google hasta que se pide)
     ========================================================= */
  var map = $('[data-map]');
  if (map) {
    $('[data-map-load]', map).addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = map.dataset.src;
      f.title = map.dataset.title;
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      f.setAttribute('allowfullscreen', '');
      map.appendChild(f);
      $('.map__facade', map).hidden = true;
      f.focus();
    });
  }

  /* =========================================================
     Formularios de leads
     ========================================================= */
  var formI18nEl = document.getElementById('form-i18n');
  var FT = formI18nEl ? JSON.parse(formI18nEl.textContent) : null;

  function digits(v) { return (v || '').replace(/\D/g, ''); }
  function validPhone(v) { var d = digits(v); return d.length === 10 || (d.length === 11 && d[0] === '1'); }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || '').trim()); }

  function setError(field, msg) {
    var err = $('.field__error', field);
    field.classList.toggle('is-invalid', !!msg);
    var ctrls = $$('input, select, textarea', field);
    ctrls.forEach(function (c) { if (c.type !== 'hidden') c.setAttribute('aria-invalid', msg ? 'true' : 'false'); });
    if (err) { err.textContent = msg || ''; err.hidden = !msg; }
  }

  function validateField(field) {
    var el = $('input:not([type=hidden]), select, textarea', field);
    if (!el) return true;
    var name = el.name, msg = '';
    if (name === 'nombre' && el.value.trim().length < 2) msg = FT.errName;
    else if (name === 'telefono' && !validPhone(el.value)) msg = FT.errPhone;
    else if (name === 'email' && !validEmail(el.value)) msg = FT.errEmail;
    else if (name === 'interes' && !el.value) msg = FT.errSelect;
    else if (name === 'licencia' && !$('input[name=licencia]:checked', field)) msg = FT.errSelect;
    else if (name === 'consentimiento' && !el.checked) msg = FT.errConsent;
    setError(field, msg);
    return !msg;
  }

  function showStatus(form, type, title, text, phoneLink) {
    var box = $('[data-form-status]', form);
    box.className = 'form-status is-' + type;
    box.innerHTML = '';
    var s = document.createElement('strong'); s.textContent = title; box.appendChild(s);
    var p = document.createElement('p'); p.textContent = text; box.appendChild(p);
    if (phoneLink) {
      var actions = document.createElement('p');
      actions.style.marginTop = '0.75rem';
      actions.innerHTML = '<a href="tel:+17867158880">' + FT.phoneDisplay + '</a> · <a href="https://wa.me/17867158880" target="_blank" rel="noopener">WhatsApp</a>';
      box.appendChild(actions);
    }
    box.hidden = false;
    box.focus({ preventScroll: true });
  }

  $$('[data-lead-form]').forEach(function (form) {
    if (!FT) return;
    var fields = $$('[data-field]', form);
    var submitted = false;

    fields.forEach(function (field) {
      field.addEventListener('change', function () { if (submitted) validateField(field); });
      field.addEventListener('focusout', function () { if (submitted) validateField(field); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitted = true;
      var firstInvalid = null;
      fields.forEach(function (f) { if (!validateField(f) && !firstInvalid) firstInvalid = f; });
      if (firstInvalid) { $('input:not([type=hidden]), select, textarea', firstInvalid).focus(); return; }

      var fd = new FormData(form);
      if (fd.get('empresa')) return; // honeypot: bot
      var btn = $('[data-submit]', form);
      var label = $('[data-submit-label]', form);
      var originalLabel = label.textContent;
      btn.setAttribute('aria-busy', 'true'); btn.disabled = true; label.textContent = FT.sending;

      var payload = {
        origen: 'formulario',
        formulario: form.dataset.leadForm,
        nombre: (fd.get('nombre') || '').trim(),
        telefono: digits(fd.get('telefono')),
        email: (fd.get('email') || '').trim(),
        interes: fd.get('interes') || '',
        licencia: fd.get('licencia') || '',
        mensaje: (fd.get('mensaje') || '').trim(),
        consentimiento: fd.get('consentimiento') === 'si',
        consentimiento_texto: ($('[data-consent-text]', form) || {}).textContent.trim(),
        idioma: FT.lang,
        pagina: location.href,
        fecha: new Date().toISOString(),
        empresa: (fd.get('empresa') || '').trim(),
        utm: utm
      };

      var done = function (ok) {
        btn.removeAttribute('aria-busy'); btn.disabled = false; label.textContent = originalLabel;
        if (ok) {
          var first = payload.nombre.split(' ')[0];
          form.classList.add('is-done');
          showStatus(form, 'success', FT.successTitle.replace('{name}', first), FT.successText);
          track('lead_submit', { form: payload.formulario, interes: payload.interes });
        } else {
          showStatus(form, 'error', FT.failTitle, FT.failText.replace('{phone}', FT.phoneDisplay), true);
        }
      };

      if (!CONFIG.LEADS_WEBHOOK_URL) {
        console.warn('[NDT] LEADS_WEBHOOK_URL vacío en assets/js/config.js. El formulario no puede enviar leads.');
        setTimeout(function () { done(false); }, 500);
        return;
      }
      fetch(CONFIG.LEADS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) { done(r.ok); }).catch(function () { done(false); });
    });
  });

  /* =========================================================
     Chat (widget propio → n8n)
     ========================================================= */
  var chat = $('[data-chat]');
  if (chat) {
    var CT = JSON.parse(chat.dataset.i18n);
    var panel = $('[data-chat-panel]', chat);
    var launcher = $('[data-chat-toggle]', chat);
    var log = $('[data-chat-log]', chat);
    var chatForm = $('[data-chat-form]', chat);
    var input = $('#chat-input', chat);
    var sessionId;
    try { sessionId = sessionStorage.getItem('ndt_chat') || (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)); sessionStorage.setItem('ndt_chat', sessionId); }
    catch (e) { sessionId = Date.now().toString(36); }
    var started = false;

    var addMsg = function (who, text, actions) {
      var m = document.createElement('div');
      m.className = 'msg msg--' + who;
      var p = document.createElement('p'); p.textContent = text; m.appendChild(p);
      if (actions) {
        var a = document.createElement('div'); a.className = 'msg__actions';
        actions.forEach(function (act) {
          var l = document.createElement('a'); l.href = act.href; l.textContent = act.label;
          if (act.external) { l.target = '_blank'; l.rel = 'noopener'; }
          if (act.close) l.addEventListener('click', function () { closeChat(false); });
          a.appendChild(l);
        });
        m.appendChild(a);
      }
      log.appendChild(m);
      log.scrollTop = log.scrollHeight;
      return m;
    };
    var contactActions = function () {
      return [
        { href: chat.dataset.tel, label: CT.callBtn },
        { href: chat.dataset.wa, label: CT.waBtn, external: true },
        { href: chat.dataset.quote, label: CT.quoteBtn, close: true }
      ];
    };

    var openChat = function () {
      panel.hidden = false;
      launcher.setAttribute('aria-expanded', 'true');
      if (!started) {
        started = true;
        addMsg('bot', CT.greeting);
        var q = document.createElement('div'); q.className = 'chat__quick';
        CT.quick.forEach(function (label, i) {
          var b = document.createElement('button'); b.type = 'button'; b.textContent = label;
          b.addEventListener('click', function () { q.remove(); handleQuick(i, label); });
          q.appendChild(b);
        });
        log.appendChild(q);
        track('chat_open');
      }
      input.focus();
    };
    var closeChat = function (refocus) {
      panel.hidden = true;
      launcher.setAttribute('aria-expanded', 'false');
      if (refocus !== false) launcher.focus();
    };

    var handleQuick = function (i, label) {
      addMsg('user', label);
      if (i === 0) addMsg('bot', CT.quoteReply, [{ href: chat.dataset.quote, label: CT.quoteBtn, close: true }]);
      else if (i === 1 && !CONFIG.CHAT_WEBHOOK_URL && CT.faq && CT.faq[0]) {
        var tmp = document.createElement('div'); tmp.innerHTML = CT.faq[0].a;
        addMsg('bot', tmp.textContent.trim(), [{ href: chat.dataset.quote, label: CT.quoteBtn, close: true }]);
      }
      else if (i === 2) addMsg('bot', CT.offline.split('. ').slice(-1)[0], contactActions());
      else sendToBot(label);
    };

    var sendToBot = function (text) {
      if (!CONFIG.CHAT_WEBHOOK_URL) { addMsg('bot', CT.offline, contactActions()); return; }
      var typing = addMsg('bot', CT.typing); typing.classList.add('msg--typing');
      fetch(CONFIG.CHAT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sendMessage', sessionId: sessionId, chatInput: text, metadata: { idioma: CT.lang, pagina: location.href, utm: utm } })
      }).then(function (r) { return r.json(); })
        .then(function (res) { typing.remove(); addMsg('bot', (res && (res.output || res.text)) || CT.error); })
        .catch(function () { typing.remove(); addMsg('bot', CT.error, contactActions()); });
    };

    launcher.addEventListener('click', openChat);
    $('[data-chat-close]', chat).addEventListener('click', function () { closeChat(); });
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeChat(); });
    chatForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) return;
      var quick = $('.chat__quick', log); if (quick) quick.remove();
      addMsg('user', text);
      input.value = '';
      sendToBot(text);
    });
  }

  /* =========================================================
     Analítica de clics (si existe dataLayer / GTM)
     ========================================================= */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-track]');
    if (el) track('cta_click', { cta: el.dataset.track });
  });

  /* =========================================================
     Animación (GSAP + ScrollTrigger + Lenis)
     ========================================================= */
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  if (!doc.classList.contains('motion')) return;
  if (!gsap || !ScrollTrigger) { doc.classList.add('motion-failed'); return; }
  clearTimeout(window.__revealFallback);
  gsap.registerPlugin(ScrollTrigger);

  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, anchors: { offset: -80 }, autoRaf: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  // Entrada del hero (solo en inicio)
  var frame = $('.hero__frame');
  var photo = $('[data-hero-photo]');
  if (frame && photo) {
    var radius = ' round 999px 999px 16px 16px)';
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .set(frame, { opacity: 1 })
      .fromTo(frame, { clipPath: 'inset(100% 0% 0% 0%' + radius }, { clipPath: 'inset(0% 0% 0% 0%' + radius, duration: 1.3, ease: 'expo.out' }, 0.1)
      .fromTo(photo, { '--s': 1.08 }, { '--s': 1, duration: 1.8, ease: 'expo.out' }, 0.1)
      .to('.hero__title .line > span', { y: 0, duration: 1, stagger: 0.12, ease: 'power4.out' }, 0.15)
      .to('.hero__arch-line path', { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut' }, 0.35)
      .to('[data-hero-item]', { opacity: 1, y: 0, duration: 0.8, stagger: 0.08 }, 0.55)
      .to('[data-hero-portrait] .hero__status, [data-hero-portrait] .hero__caption', { opacity: 1, duration: 0.8, stagger: 0.12 }, 0.9)
      .to('.carriers', { opacity: 1, duration: 1 }, 1.0)
      .add(function () { frame.style.clipPath = 'none'; });

    gsap.to(photo, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  // Parallax leve en fotos de sección
  $$('[data-parallax]').forEach(function (img) {
    gsap.fromTo(img, { yPercent: -6 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // Entradas al hacer scroll. IntersectionObserver dispara aunque se salte
  // directo a una sección (anclas, botones), sin depender de medir posiciones.
  var reveals = $$('[data-reveal]');
  if (reveals.length && 'IntersectionObserver' in window) {
    gsap.set(reveals, { y: 24 });
    var queue = [], flushing = false;
    var flush = function () {
      flushing = false;
      queue.sort(function (a, b) { return a.getBoundingClientRect().top - b.getBoundingClientRect().top; });
      gsap.to(queue.splice(0), { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' });
    };
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        revealIO.unobserve(en.target);
        queue.push(en.target);
      });
      if (queue.length && !flushing) { flushing = true; requestAnimationFrame(flush); }
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { revealIO.observe(el); });
  } else {
    doc.classList.add('motion-failed');
  }

  // Contadores
  var counters = $$('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    var countIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        countIO.unobserve(en.target);
        var el = en.target, obj = { v: 0 };
        gsap.to(obj, { v: +el.dataset.count, duration: 1.6, ease: 'power2.out', onUpdate: function () { el.textContent = Math.round(obj.v); } });
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    counters.forEach(function (el) { el.textContent = '0'; countIO.observe(el); });
  }

  // Recalcular tras cargar fuentes e imágenes
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
