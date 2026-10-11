(function(){
  window.R2A_CONFIG = Object.freeze({
    instagramUrl: 'https://www.instagram.com/r2a.coaching/',
    instagramHandle: '@r2a.coaching',
    lowStockThreshold: 5,
    // Liens de paiement Stripe (un par catégorie). Collez ici les liens https://buy.stripe.com/...
    // Tant qu'un lien est vide, le bouton renvoie vers Instagram pour commander.
    stripeLinks: {
      enfant: 'https://buy.stripe.com/test_8x2fZicU34s8fWEeL64wM02',
      homme: 'https://buy.stripe.com/test_4gM5kE5rB7EkfWEbyU4wM01',
      femme: 'https://buy.stripe.com/test_28EdRa2fpf6M6m4auQ4wM00'
    },
    currency: 'EUR',
    locale: 'fr-FR',
    promoEndpoint: '/api/promo',
    // Mettre votre domaine final ici pour les canonical/SEO lors du go-live.
    canonicalBaseUrl: ''
  });
})();
