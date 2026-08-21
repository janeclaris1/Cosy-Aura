import type { UiLang } from "@/lib/geo-locale";

type Messages = Record<string, string>;

/** Incremental UI strings (checkout, product CTAs, support, PLP). Merged into UI_BY_LANG. */
export const EXTRA_EN: Messages = {
  "checkout.delivery": "Delivery",
  "checkout.payment": "Payment",
  "checkout.payOrderNow": "Pay Order Now",
  "checkout.cashOnDelivery": "Cash on delivery",
  "checkout.codHint":
    "Pay for delivery now. Pay for your order when the courier delivers.",
  "checkout.payInFull": "Pay in full",
  "checkout.noDelivery": "No delivery available for this region.",
  "checkout.weekdays": "Monday to Saturday",
  "checkout.continuePaystack": "Continue to Paystack",
  "checkout.continueFlutterwave": "Continue to Flutterwave",
  "checkout.whatsappSubmit": "Submit order on WhatsApp",
  "checkout.whatsappNeedDetails":
    "Please fill in your name, email, phone, and address before submitting on WhatsApp.",
  "checkout.orPayOnline": "or pay online",
  "checkout.ghanaHint":
    "Cards and mobile money (MTN, Telecel, AirtelTigo). Next-day delivery in Ghana.",
  "checkout.nigeriaHint": "Cards, bank, USSD, and transfer. Shipping to {country}.",
  "checkout.flutterwaveHint":
    "Cards and mobile money (Orange / MTN) for CEMAC. Shipping to {country}. Charged in XAF.",
  "product.orderWhatsApp": "Order on WhatsApp",
  "product.unavailableRegion": "Unavailable in your region",
  "product.outOfStockLocation": "Currently out of stock for your location.",
  "product.details": "Product details",
  "product.securePayment": "Secure Payment",
  "product.fastShipping": "Fast Shipping",
  "product.returns14": "14-Day Returns",
  "support.greeting":
    "Hi there! Welcome to Cosy Aura. I’m Enow - how can I help you today? Looking for a signature oil, or something for a gift?",
  "support.placeholder": "Ask about fragrances, delivery, or orders…",
  "support.thinking": "Thinking…",
  "support.open": "Open chat",
  "support.close": "Close chat",
  "support.error": "Something went wrong. Please try again or use Contact.",
  "plp.brands": "Brands",
  "plp.bottleSize": "Bottle Size",
  "plp.gender": "Gender",
  "plp.sampleAvailable": "Sample available",
};

export const EXTRA_FR: Messages = {
  "checkout.delivery": "Livraison",
  "checkout.payment": "Paiement",
  "checkout.payOrderNow": "Payer la commande maintenant",
  "checkout.cashOnDelivery": "Paiement à la livraison",
  "checkout.codHint":
    "Payez la livraison maintenant. Réglez la commande avec le coursier à l’arrivée.",
  "checkout.payInFull": "Payer la totalité",
  "checkout.noDelivery": "Aucune livraison disponible pour cette région.",
  "checkout.weekdays": "Lundi à samedi",
  "checkout.continuePaystack": "Continuer vers Paystack",
  "checkout.continueFlutterwave": "Continuer vers Flutterwave",
  "checkout.whatsappSubmit": "Envoyer la commande sur WhatsApp",
  "checkout.whatsappNeedDetails":
    "Veuillez renseigner votre nom, e-mail, téléphone et adresse avant d’envoyer sur WhatsApp.",
  "checkout.orPayOnline": "ou payer en ligne",
  "checkout.ghanaHint":
    "Cartes et mobile money (MTN, Telecel, AirtelTigo). Livraison le lendemain au Ghana.",
  "checkout.nigeriaHint": "Cartes, banque, USSD et virement. Livraison vers {country}.",
  "checkout.flutterwaveHint":
    "Cartes et mobile money (Orange / MTN) pour la CEMAC. Livraison vers {country}. Facturé en XAF.",
  "product.orderWhatsApp": "Commander sur WhatsApp",
  "product.unavailableRegion": "Indisponible dans votre région",
  "product.outOfStockLocation": "Actuellement en rupture pour votre localisation.",
  "product.details": "Détails du produit",
  "product.securePayment": "Paiement sécurisé",
  "product.fastShipping": "Livraison rapide",
  "product.returns14": "Retours sous 14 jours",
  "support.greeting":
    "Bonjour ! Bienvenue chez Cosy Aura. Je suis Enow — comment puis-je vous aider ? Une huile signature, ou un cadeau ?",
  "support.placeholder": "Questions sur les parfums, la livraison ou les commandes…",
  "support.thinking": "Réflexion…",
  "support.open": "Ouvrir le chat",
  "support.close": "Fermer le chat",
  "support.error": "Une erreur s’est produite. Réessayez ou utilisez Contact.",
  "plp.brands": "Marques",
  "plp.bottleSize": "Taille du flacon",
  "plp.gender": "Genre",
  "plp.sampleAvailable": "Échantillon disponible",
};

export const EXTRA_ES: Messages = {
  "checkout.delivery": "Entrega",
  "checkout.payment": "Pago",
  "checkout.payOrderNow": "Pagar pedido ahora",
  "checkout.cashOnDelivery": "Pago contra entrega",
  "checkout.codHint":
    "Paga el envío ahora. Paga el pedido con el mensajero a la llegada.",
  "checkout.payInFull": "Pagar todo",
  "checkout.noDelivery": "No hay entrega disponible para esta región.",
  "checkout.weekdays": "Lunes a sábado",
  "checkout.continuePaystack": "Continuar a Paystack",
  "checkout.continueFlutterwave": "Continuar a Flutterwave",
  "checkout.whatsappSubmit": "Enviar pedido por WhatsApp",
  "checkout.whatsappNeedDetails":
    "Completa nombre, correo, teléfono y dirección antes de enviar por WhatsApp.",
  "checkout.orPayOnline": "o pagar en línea",
  "checkout.ghanaHint":
    "Tarjetas y dinero móvil (MTN, Telecel, AirtelTigo). Entrega al día siguiente en Ghana.",
  "checkout.nigeriaHint": "Tarjetas, banco, USSD y transferencia. Envío a {country}.",
  "checkout.flutterwaveHint":
    "Tarjetas y dinero móvil (Orange / MTN) para CEMAC. Envío a {country}. Cobrado en XAF.",
  "product.orderWhatsApp": "Pedir por WhatsApp",
  "product.unavailableRegion": "No disponible en tu región",
  "product.outOfStockLocation": "Agotado actualmente para tu ubicación.",
  "product.details": "Detalles del producto",
  "product.securePayment": "Pago seguro",
  "product.fastShipping": "Envío rápido",
  "product.returns14": "Devoluciones en 14 días",
  "support.greeting":
    "¡Hola! Bienvenido a Cosy Aura. Soy Enow — ¿cómo puedo ayudarte? ¿Un aceite firma o un regalo?",
  "support.placeholder": "Pregunta por fragancias, entrega o pedidos…",
  "support.thinking": "Pensando…",
  "support.open": "Abrir chat",
  "support.close": "Cerrar chat",
  "support.error": "Algo salió mal. Inténtalo de nuevo o usa Contacto.",
  "plp.brands": "Marcas",
  "plp.bottleSize": "Tamaño del frasco",
  "plp.gender": "Género",
  "plp.sampleAvailable": "Muestra disponible",
};

export const EXTRA_PT: Messages = {
  "checkout.delivery": "Entrega",
  "checkout.payment": "Pagamento",
  "checkout.payOrderNow": "Pagar pedido agora",
  "checkout.cashOnDelivery": "Pagamento na entrega",
  "checkout.codHint":
    "Pague a entrega agora. Pague o pedido com o estafeta na chegada.",
  "checkout.payInFull": "Pagar tudo",
  "checkout.noDelivery": "Nenhuma entrega disponível para esta região.",
  "checkout.weekdays": "Segunda a sábado",
  "checkout.continuePaystack": "Continuar para Paystack",
  "checkout.continueFlutterwave": "Continuar para Flutterwave",
  "checkout.whatsappSubmit": "Enviar pedido no WhatsApp",
  "checkout.whatsappNeedDetails":
    "Preencha nome, e-mail, telefone e morada antes de enviar no WhatsApp.",
  "checkout.orPayOnline": "ou pagar online",
  "checkout.ghanaHint":
    "Cartões e mobile money (MTN, Telecel, AirtelTigo). Entrega no dia seguinte no Gana.",
  "checkout.nigeriaHint": "Cartões, banco, USSD e transferência. Envio para {country}.",
  "checkout.flutterwaveHint":
    "Cartões e mobile money (Orange / MTN) para a CEMAC. Envio para {country}. Cobrado em XAF.",
  "product.orderWhatsApp": "Encomendar no WhatsApp",
  "product.unavailableRegion": "Indisponível na sua região",
  "product.outOfStockLocation": "Esgotado de momento para a sua localização.",
  "product.details": "Detalhes do produto",
  "product.securePayment": "Pagamento seguro",
  "product.fastShipping": "Envio rápido",
  "product.returns14": "Devoluções em 14 dias",
  "support.greeting":
    "Olá! Bem-vindo à Cosy Aura. Sou a Enow — como posso ajudar? Um óleo assinatura ou um presente?",
  "support.placeholder": "Pergunte sobre fragrâncias, entrega ou encomendas…",
  "support.thinking": "A pensar…",
  "support.open": "Abrir chat",
  "support.close": "Fechar chat",
  "support.error": "Algo correu mal. Tente novamente ou use Contacto.",
  "plp.brands": "Marcas",
  "plp.bottleSize": "Tamanho do frasco",
  "plp.gender": "Género",
  "plp.sampleAvailable": "Amostra disponível",
};

export const EXTRA_DE: Messages = {
  "checkout.delivery": "Lieferung",
  "checkout.payment": "Zahlung",
  "checkout.payOrderNow": "Bestellung jetzt bezahlen",
  "checkout.cashOnDelivery": "Nachnahme",
  "checkout.codHint":
    "Lieferung jetzt bezahlen. Bestellung bei Ankunft mit dem Kurier begleichen.",
  "checkout.payInFull": "Alles bezahlen",
  "checkout.noDelivery": "Für diese Region ist keine Lieferung verfügbar.",
  "checkout.weekdays": "Montag bis Samstag",
  "checkout.continuePaystack": "Weiter zu Paystack",
  "checkout.continueFlutterwave": "Weiter zu Flutterwave",
  "checkout.whatsappSubmit": "Bestellung per WhatsApp senden",
  "checkout.whatsappNeedDetails":
    "Bitte Name, E-Mail, Telefon und Adresse ausfüllen, bevor Sie per WhatsApp senden.",
  "checkout.orPayOnline": "oder online bezahlen",
  "checkout.ghanaHint":
    "Karten und Mobile Money (MTN, Telecel, AirtelTigo). Nächstägige Lieferung in Ghana.",
  "checkout.nigeriaHint": "Karten, Bank, USSD und Überweisung. Versand nach {country}.",
  "checkout.flutterwaveHint":
    "Karten und Mobile Money (Orange / MTN) für CEMAC. Versand nach {country}. Abrechnung in XAF.",
  "product.orderWhatsApp": "Per WhatsApp bestellen",
  "product.unavailableRegion": "In Ihrer Region nicht verfügbar",
  "product.outOfStockLocation": "Derzeit für Ihren Standort nicht auf Lager.",
  "product.details": "Produktdetails",
  "product.securePayment": "Sichere Zahlung",
  "product.fastShipping": "Schneller Versand",
  "product.returns14": "14-Tage Rückgabe",
  "support.greeting":
    "Hallo! Willkommen bei Cosy Aura. Ich bin Enow — wie kann ich helfen? Ein Signature-Öl oder ein Geschenk?",
  "support.placeholder": "Fragen zu Düften, Lieferung oder Bestellungen…",
  "support.thinking": "Denke nach…",
  "support.open": "Chat öffnen",
  "support.close": "Chat schließen",
  "support.error": "Etwas ist schiefgelaufen. Bitte erneut versuchen oder Kontakt nutzen.",
  "plp.brands": "Marken",
  "plp.bottleSize": "Flaschengröße",
  "plp.gender": "Geschlecht",
  "plp.sampleAvailable": "Probe verfügbar",
};

export const EXTRA_BY_LANG: Record<UiLang, Messages> = {
  en: EXTRA_EN,
  fr: EXTRA_FR,
  es: EXTRA_ES,
  pt: EXTRA_PT,
  de: EXTRA_DE,
};
