(async function(){
  const mount = document.getElementById('siteNav');
  if(!mount) return;

  const res = await fetch('./partials/nav.html', { cache: 'no-cache' });
  mount.innerHTML = await res.text();

  const nav = mount.querySelector('.nav');
  const btn = mount.querySelector('.nav__toggle');
  const menu = mount.querySelector('#navMenu');
  if(!nav || !btn || !menu) return;

  const close = () => { nav.classList.remove('nav--open'); btn.setAttribute('aria-expanded','false'); };

  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('nav--open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  menu.addEventListener('click', (e) => { if(e.target.closest('a')) close(); });
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape') close(); });
})();