(function(){
  window.R2A_CONFIG = Object.freeze({
    instagramUrl: 'https://www.instagram.com/r2a.coaching/',
    instagramHandle: '@r2a.coaching',
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
    currency: 'EUR',
    locale: 'fr-FR',
    promoEndpoint: '/api/promo',
    // Mettre votre domaine final ici pour les canonical/SEO lors du go-live.
    canonicalBaseUrl: ''
  });
})();
