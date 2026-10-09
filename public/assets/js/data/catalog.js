(function(){
  const DEFAULT_PRODUCTS = [
    {
      id:'r2a-enfant-001',
      name:'Maillot R2A Enfant',
      category:'enfant',
      price:30,
      stock:20,
      sizes:['4/6 ans','6/8 ans','8/10 ans','10/12 ans','12/14 ans'],
      description:'Version enfant du maillot R2A. Léger, respirant et pensé pour bouger.',
      image:'images/products/enfant/gallery-01-front-back.png',
      gallery:['images/products/enfant/gallery-01-front-back.png','images/products/enfant/gallery-02-front.png','images/products/enfant/gallery-03-back.png'],
      visible:true
    },
    {
      id:'r2a-homme-001',
      name:'Maillot R2A Homme',
      category:'homme',
      price:30,
      stock:20,
      sizes:['XS','S','M','L','XL','2XL','3XL','4XL'],
      description:'Version homme du maillot R2A. Coupe performance, confort et style.',
      image:'images/products/homme/gallery-01-front-back.png',
      gallery:['images/products/homme/gallery-01-front-back.png','images/products/homme/gallery-02-front.png','images/products/homme/gallery-03-back.png'],
      visible:true
    },
    {
      id:'r2a-femme-001',
      name:'Maillot R2A Femme',
      category:'femme',
      price:30,
      stock:20,
      sizes:['XS','S','M','L','XL'],
      description:'Version femme du maillot R2A. Ajustée, confortable et élégante.',
      image:'images/products/femme/gallery-01-front-back.png',
      gallery:['images/products/femme/gallery-01-front-back.png','images/products/femme/gallery-02-front.png','images/products/femme/gallery-03-back.png'],
      visible:true
    }
  ];

  const DEFAULT_PROMOS = []; // Production: validation via /api/promo (Cloudflare Function).

  const DEFAULT_REELS = [];

  const STORAGE_KEYS = {
    products:'r2a_products',
        reels:'r2a_reels',
    cart:'r2a_cart',
      };


  const BUILTIN_GALLERIES = {
    'r2a-enfant-001':['images/products/enfant/gallery-01-front-back.png','images/products/enfant/gallery-02-front.png','images/products/enfant/gallery-03-back.png'],
    'r2a-homme-001':['images/products/homme/gallery-01-front-back.png','images/products/homme/gallery-02-front.png','images/products/homme/gallery-03-back.png'],
    'r2a-femme-001':['images/products/femme/gallery-01-front-back.png','images/products/femme/gallery-02-front.png','images/products/femme/gallery-03-back.png']
  };

  function load(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      let value = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(fallback));
      if(key === STORAGE_KEYS.products && Array.isArray(value)){
        value = value.map(item => {
          if(BUILTIN_GALLERIES[item.id]){
            item.gallery = BUILTIN_GALLERIES[item.id].slice();
            item.image = BUILTIN_GALLERIES[item.id][0];
          }
          if(item.stock === undefined || item.stock === null || Number.isNaN(Number(item.stock))){
            item.stock = 20;
          }else{
            item.stock = Math.max(0, Math.floor(Number(item.stock)));
          }
          return item;
        });
      }
      return value;
    }catch(e){
      return JSON.parse(JSON.stringify(fallback));
    }
  }

  function save(key, value){
    localStorage.setItem(key, JSON.stringify(value));
  }

  function asset(file){
    if(!file) return '';
    if(/^data:|^https?:/i.test(file)) return file;
    if(file.indexOf('/') !== -1 && file.startsWith('.')) return file;
    const base = /\/(maillots|legal)\//.test(location.pathname) ? '../assets/' : './assets/';
    return base + file.replace(/^.*assets\//,'');
  }

  window.R2A_DATA = {
    DEFAULT_PRODUCTS,
    DEFAULT_REELS,
    STORAGE_KEYS,
    load,
    save,
    asset
  };
})();
