// Genera el sitio estático en site/ desde src/.
//   ES: site/index.html, site/privacidad/, site/terminos/
//   EN: site/en/index.html, site/en/privacy/, site/en/terms/
// Uso: node src/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const data = JSON.parse(read('src/data.json'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => esc(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const carrierById = Object.fromEntries(data.carriers.map((c) => [c.id, c]));

/* ---------- Generadores de bloques ---------- */
function carriersHtml(base, clone) {
  return data.carriers.map((c) => {
    if (c.text) {
      const [a, b] = c.name.split(' · ');
      return `<li class="carriers__item carriers__item--text"><span>${a}</span><small>${b}</small></li>`;
    }
    return `<li class="carriers__item"><img src="${base}assets/seguros/${c.file}.webp" alt="${clone ? '' : escAttr(c.name)}" style="--h:${c.h}px" height="${c.h}" loading="lazy" decoding="async"></li>`;
  }).join('\n            ');
}

function miniLogos(ids, base) {
  return ids.map((id) => {
    const c = carrierById[id];
    if (c.text) return `<li class="mini-logos__text">${esc(c.name.split(' · ')[0])}</li>`;
    return `<li><img src="${base}assets/seguros/${c.file}.webp" alt="${escAttr(c.name)}" style="--h:${Math.round(c.h * 0.62)}px" loading="lazy" decoding="async"></li>`;
  }).join('');
}

const cardIcons = { salud: 'i-heart', vida: 'i-umbrella', medicare: 'i-shield' };
function segurosCards(t, base) {
  const total = t.seguros.cards.length;
  return t.seguros.cards.map((c, i) => {
    const ids = data.insuranceCarriers[c.id] || [];
    const carriers = ids.length
      ? `<ul class="mini-logos" role="list">${miniLogos(ids, base)}</ul>`
      : `<p class="ins-card__note">${esc(c.noCarriers)}</p>`;
    return `<li class="ins-card" aria-label="${escAttr(t.a11y.slideOf.replace('{n}', i + 1).replace('{t}', total))}" data-carousel-item>
            <article class="ins-card__inner">
              <header class="ins-card__head">
                <svg class="ins-card__icon" aria-hidden="true"><use href="#${cardIcons[c.id]}"/></svg>
                <p class="ins-card__tag">${esc(c.tag)}</p>
              </header>
              <h3 class="ins-card__title">${esc(c.title)}</h3>
              <p class="ins-card__text">${esc(c.text)}</p>
              <ul class="ins-card__points" role="list">${c.points.map((p) => `<li><svg class="icon" aria-hidden="true"><use href="#i-check"/></svg><span>${esc(p)}</span></li>`).join('')}</ul>
              <footer class="ins-card__foot">
                ${ids.length ? `<p class="ins-card__label">${esc(t.seguros.carriersLabel)}</p>` : ''}
                ${carriers}
                <a class="btn btn--ghost ins-card__cta" href="#cotizar" data-interest="${c.interest}" data-track="cta_${c.id}">${esc(c.cta)}<svg class="icon icon--arrow" aria-hidden="true"><use href="#i-arrow"/></svg></a>
              </footer>
            </article>
          </li>`;
  }).join('\n          ');
}

function statsList(t) {
  return data.stats.map((s) => `<li class="stat" data-reveal>
            <p class="stat__num"><span data-count="${s.value}">${s.value}</span><span class="stat__suffix">${s.suffix}</span></p>
            <p class="stat__label">${esc(t.porque.stats[s.key])}</p>
          </li>`).join('\n          ');
}

function equipoItems(t) {
  return t.equipo.items.map((it) => `<li class="equipo__item" data-reveal>
              <h3 class="equipo__item-title">${esc(it.title)}</h3>
              <p class="equipo__item-text">${esc(it.text)}</p>
            </li>`).join('\n            ');
}

function testimonialsList(t) {
  return data.testimonials.map((q) => `<li class="quote" data-reveal>
            <figure>
              <span class="quote__mark" aria-hidden="true">“</span>
              <blockquote lang="${q.lang}"><p>${esc(q.text)}</p></blockquote>
              <figcaption class="quote__by">
                <span class="quote__name">${esc(q.name)}</span>
                <span class="quote__city">${esc(q.city)}</span>
                <span class="quote__tag">${esc(t.testimonios.insurance)}: ${esc(q.carrier)}</span>
              </figcaption>
            </figure>
          </li>`).join('\n          ');
}

function faqList(t) {
  return t.faq.items.map((f, i) => `<details class="faq-item" data-reveal${i === 0 ? ' open' : ''}>
            <summary class="faq-item__q"><span>${esc(f.q)}</span><svg class="icon faq-item__icon" aria-hidden="true"><use href="#i-plus"/></svg></summary>
            <div class="faq-item__a">${f.a}</div>
          </details>`).join('\n          ');
}

function interestOptions(t) {
  return Object.entries(t.contacto.interestOptions).map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('\n                  ');
}

function fieldsBasic(t, prefix) {
  const f = t.form;
  const req = `<span class="field__req">(${esc(f.required)})</span>`;
  const field = (id, name, type, label, auto, extra = '') => `<div class="field" data-field>
              <label class="field__label" for="${prefix}-${id}">${esc(label)} ${req}</label>
              <input class="field__input" id="${prefix}-${id}" name="${name}" type="${type}" autocomplete="${auto}" required aria-describedby="${prefix}-${id}-err"${extra}>
              <p class="field__error" id="${prefix}-${id}-err" hidden></p>
            </div>`;
  return [
    field('nombre', 'nombre', 'text', f.name, 'name', ' maxlength="80"'),
    `<div class="field-row">`,
    field('telefono', 'telefono', 'tel', f.phone, 'tel-national', ' inputmode="tel" maxlength="20"'),
    field('email', 'email', 'email', f.email, 'email', ' maxlength="120"'),
    `</div>`
  ].join('\n            ');
}

function consent(t, prefix, privacyHref) {
  return `<div class="field field--consent" data-field>
              <label class="consent">
                <input type="checkbox" name="consentimiento" value="si" required aria-describedby="${prefix}-consent-err">
                <span class="consent__box" aria-hidden="true"><svg class="icon"><use href="#i-check"/></svg></span>
                <span class="consent__text" data-consent-text>${esc(t.form.consent)} <a class="link" href="${privacyHref}">${esc(t.form.consentLink)}</a>.</span>
              </label>
              <p class="field__error" id="${prefix}-consent-err" hidden></p>
            </div>`;
}

const honeypot = `<div class="hp" aria-hidden="true"><label>Empresa<input type="text" name="empresa" tabindex="-1" autocomplete="off"></label></div>`;

function schema(t) {
  const days = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'InsuranceAgency',
    name: 'Nexus Diamond Team',
    description: t.meta.description,
    url: data.domain + t.pages.home.path,
    logo: data.domain + '/assets/brand/logo-192.png',
    image: data.domain + '/assets/img/bernardo-retrato-900.webp',
    telephone: data.phone,
    email: data.email,
    knowsLanguage: ['es', 'en'],
    employee: { '@type': 'Person', name: 'Bernardo Castro', jobTitle: t.lang === 'es' ? 'Agente de seguros' : 'Insurance agent' },
    address: { '@type': 'PostalAddress', streetAddress: data.address.street, addressLocality: data.address.city, addressRegion: data.address.region, postalCode: data.address.zip, addressCountry: data.address.country },
    areaServed: { '@type': 'Country', name: 'United States' },
    openingHoursSpecification: Object.entries(data.hours).map(([d, [o, c]]) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: days[d], opens: o, closes: c })),
    sameAs: Object.values(data.social)
  }).replace(/</g, '\\u003c');
}

function faqSchema(t) {
  const strip = (h) => h.replace(/<h3>(.*?)<\/h3>/g, '$1: ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: t.faq.items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: strip(f.a) } }))
  }).replace(/</g, '\\u003c');
}

/* ---------- Motor de plantillas ---------- */
function render(tpl, ctx, lang) {
  let out = tpl;
  for (let i = 0; i < 3; i++) out = out.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (m, name) => read(`src/partials/${name}.html`));
  return out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, key) => {
    const v = get(ctx, key);
    if (v === undefined) throw new Error(`[${lang}] Falta la clave: ${key}`);
    return v;
  });
}

const rel = (base, path) => base + path.replace(/^\//, '');

for (const lang of ['es', 'en']) {
  const t = JSON.parse(read(`src/i18n/${lang}.json`));
  const pages = [
    { key: 'home', tpl: 'src/index.html' },
    { key: 'privacy', tpl: 'src/page.html', body: lang === 'es' ? 'privacidad.es' : 'privacy.en' },
    { key: 'terms', tpl: 'src/page.html', body: lang === 'es' ? 'terminos.es' : 'terms.en' }
  ];
  for (const p of pages) {
    const page = t.pages[p.key];
    const depth = page.path.split('/').filter(Boolean).length;
    const base = '../'.repeat(depth);
    const homeHref = rel(base, t.pages.home.path) || './';
    const privacyHref = rel(base, t.pages.privacy.path);
    const ctx = {
      ...t,
      data,
      page,
      base,
      home: p.key === 'home' ? '' : homeHref,
      pageTitle: page.title || t.meta.title,
      pageDescription: page.description || t.meta.description,
      xDefault: lang === 'es' ? page.path : page.alt,
      langLabel: lang.toUpperCase(),
      altHref: rel(base, page.alt) || './',
      privacyHref,
      termsHref: rel(base, t.pages.terms.path),
      waText: encodeURIComponent(t.wa),
      mapsQ: encodeURIComponent(data.mapsQuery),
      carrierCount: data.carriers.filter((c) => !c.text).length,
      cardCount: t.seguros.cards.length,
      hoursJson: escAttr(JSON.stringify(data.hours)),
      statusJson: escAttr(JSON.stringify({ ...t.status, lang: t.locale.replace('_', '-') })),
      chatJson: escAttr(JSON.stringify({ ...t.chat, lang, faq: t.faq.items.slice(0, 1) })),
      formJson: JSON.stringify({ ...t.form, phoneDisplay: data.phoneDisplay, lang }).replace(/</g, '\\u003c'),
      carriersList: carriersHtml(base, false),
      carriersListClone: carriersHtml(base, true),
      segurosCards: segurosCards(t, base),
      statsList: statsList(t),
      equipoItems: equipoItems(t),
      testimonialsList: testimonialsList(t),
      faqList: faqList(t),
      interestOptions: interestOptions(t),
      fieldsBasicEquipo: fieldsBasic(t, 'eq'),
      fieldsBasicContacto: fieldsBasic(t, 'ct'),
      consentEquipo: consent(t, 'eq', privacyHref),
      consentContacto: consent(t, 'ct', privacyHref),
      honeypot,
      schema: schema(t),
      faqSchema: faqSchema(t),
      legalBody: p.body ? read(`src/legal/${p.body}.html`) : ''
    };
    const html = render(read(p.tpl), ctx, lang);
    const out = join(root, 'site', page.path, 'index.html');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, html);
    console.log('✓', out.replace(root + '/', ''));
  }
}
