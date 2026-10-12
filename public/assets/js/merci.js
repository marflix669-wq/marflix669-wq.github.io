(function(){
  const id = new URLSearchParams(location.search).get('session_id');
  const T = document.getElementById('mTitle'), X = document.getElementById('mText');
  if(!id){ T.textContent = 'Merci !'; X.textContent = 'Retrouve-nous sur Instagram pour toute question.'; return; }
  fetch('/api/session-status?session_id=' + encodeURIComponent(id)).then(r => r.json()).then(d => {
    if(d.status === 'complete' && d.payment_status === 'paid'){
      try { localStorage.removeItem('r2a_cart'); } catch(_) {}
      T.textContent = 'Merci pour ta commande !';
      X.textContent = 'Paiement confirmé.' + (d.email ? ' Un reçu a été envoyé à ' + d.email + '.' : '') + ' On te contacte pour la livraison.';
    } else if(d.status === 'open'){
      T.textContent = 'Paiement non terminé'; X.textContent = 'Ton paiement n’a pas abouti. Tu peux réessayer depuis la page du maillot.';
    } else { T.textContent = 'Merci !'; X.textContent = 'Nous vérifions ton paiement. Contacte-nous sur Instagram en cas de doute.'; }
  }).catch(() => { T.textContent = 'Merci !'; X.textContent = 'Nous vérifions ton paiement. Contacte-nous sur Instagram en cas de doute.'; });
})();
