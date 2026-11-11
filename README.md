# Sitio Nexus Diamond Team — guía rápida

Este repositorio contiene el código fuente, los flujos de n8n y el sitio estático generado. No publiques el sitio hasta completar la lista de verificación de producción.

## Qué hay en este paquete
- `site/` → **lo que se sube a Hostinger** (todo su contenido va dentro de `public_html`).
- `src/` → fuente: textos ES/EN (`src/i18n/*.json`), datos (`src/data.json`), plantillas y `build.mjs`.
- `n8n/` → flujos para importar en n8n:
  - `leads-formulario-email.json`: formularios del sitio → email a info@nexusdiamondteam.com.
  - `chatbot-seguros-webhook.json`: chatbot adaptado a seguros (usa el flujo anterior para enviar leads).

## Publicar en Hostinger
1. Abre el Administrador de archivos → `public_html`.
2. Sube **el contenido** de `site/` (no la carpeta en sí): `index.html`, `assets/`, `en/`, `privacidad/`, `terminos/`.
3. Activa el certificado SSL (HTTPS) del dominio.

Si conectas GitHub directamente, configura `site/` como carpeta pública/de publicación o configura el despliegue para copiar su contenido a `public_html`; la raíz del repositorio no contiene el `index.html` del sitio.

## Conectar formularios y chat (n8n)
1. Importa los dos JSON en n8n y sigue la nota amarilla de cada uno (credencial SMTP, modelo de IA, URLs).
2. Pega las URLs en `site/assets/js/config.js` (`LEADS_WEBHOOK_URL` y `CHAT_WEBHOOK_URL`) y sube solo ese archivo.
   - Mientras estén vacías, el formulario muestra "llámame / WhatsApp" y el chat ofrece contacto directo.

## Cambiar textos o datos
- Textos: `src/i18n/es.json` y `src/i18n/en.json`.
- Teléfono, horario, licencia, aseguradoras, cifras, testimonios: `src/data.json`.
- Después ejecuta `node src/build.mjs` (Node 18+) y vuelve a subir los `index.html` generados.
- Estilos: `site/assets/css/main.css` · Comportamiento: `site/assets/js/main.js`.

## Antes de publicar
- [ ] Número de licencia: `src/data.json` → `license` (hoy muestra **[LICENCIA PENDIENTE]**).
- [ ] Revisión legal de `src/legal/*.html`: completar los campos resaltados, borrar el aviso de borrador
      (`legal.draftNote` en los JSON) y quitar `<meta name="robots" content="noindex">` de `src/page.html`.
- [ ] Aviso de Medicare (footer): completar número de organizaciones y productos que representa, y confirmarlo con su FMO/compliance.
- [ ] Confirmar que los testimonios son de clientes reales y que autorizaron su publicación.
- [ ] Confirmar que Bernardo está nombrado (appointed) con cada aseguradora cuyo logo aparece.
