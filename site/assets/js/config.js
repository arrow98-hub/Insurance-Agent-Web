/*
 * Configuración del sitio — Nexus Diamond Team
 * ---------------------------------------------
 * Pega aquí las URLs de producción de n8n cuando estén listas.
 * Mientras estén vacías:
 *   - Los formularios muestran un mensaje para llamar o escribir por WhatsApp.
 *   - El chat responde con opciones de contacto en vez de usar IA.
 * Ninguna API key va en este archivo: todo pasa por n8n.
 */
window.NDT_CONFIG = {
  // Webhook del flujo "Leads del sitio → email" (n8n/leads-formulario-email.json)
  // Ejemplo: 'https://n8n.tudominio.com/webhook/ndt-leads'
  LEADS_WEBHOOK_URL: '',

  // URL del Chat Trigger del flujo "Chatbot Seguros" (n8n/chatbot-seguros-webhook.json)
  // Ejemplo: 'https://n8n.tudominio.com/webhook/<id>/chat'
  CHAT_WEBHOOK_URL: ''
};
