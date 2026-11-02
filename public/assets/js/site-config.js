(function(){
  window.R2A_CONFIG = Object.freeze({
    instagramUrl: 'https://www.instagram.com/r2a.coaching/',
    instagramHandle: '@r2a.coaching',
    tiktokUrl: 'https://www.tiktok.com/@r2a.coaching',
    // Numéro WhatsApp au format wa.me, ex. 'https://wa.me/33612345678'. Vide = le bouton WhatsApp reste caché.
    whatsappUrl: '',
    lowStockThreshold: 5,
    // Liens de paiement Stripe (un par catégorie). Collez ici les liens https://buy.stripe.com/...
    // Secours uniquement (si le paiement intégré ne répond pas). Vide = Instagram. Mettre des liens buy.stripe.com/… de PRODUCTION (pas test_).
    stripeLinks: {
      enfant: '',
      homme: '',
      femme: ''
    },
    // Paiement intégré au site (fonction /api/checkout). Les liens ci-dessus servent de secours.
    checkoutEndpoint: '/api/checkout',
    // Clé PUBLIQUE de l'intégration Sendcloud (sélecteur de Points Relais). Vide = ancien champ texte libre.
    // Cette clé est faite pour être visible dans le navigateur. Ne JAMAIS mettre la clé secrète ici.
    sendcloudPublicKey: 'b8f1cb32-db2d-4ca8-ac18-848f9f81846e',
    // Livraison Mondial Relay (affichage ; le montant réellement facturé est calculé par le serveur)
    shipping: { fee: 4.9, freeFrom: 2 },
    currency: 'EUR',
    locale: 'fr-FR',
    promoEndpoint: '/api/promo',
    // Mettre votre domaine final ici pour les canonical/SEO lors du go-live.
    canonicalBaseUrl: ''
  });
})();
