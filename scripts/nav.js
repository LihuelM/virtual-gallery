(async function () {
  const mount = document.getElementById('siteNav');
  if (!mount) return;

  const isInnerPage = window.location.pathname.includes('/pages/');
  const partialPath = isInnerPage ? '../partials/nav.html' : './partials/nav.html';
  const basePath = isInnerPage ? '../' : './';

  try {
    const res = await fetch(partialPath, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`No se pudo cargar ${partialPath}`);

    mount.innerHTML = await res.text();

    const nav = mount.querySelector('.nav');
    const btn = mount.querySelector('.nav__toggle');
    const menu = mount.querySelector('#navMenu');
    if (!nav || !btn || !menu) return;

    const submenuItem = mount.querySelector('.nav__item--has-submenu');
    const submenuToggle = mount.querySelector('.nav__submenu-toggle');

    const closeMainMenu = () => {
      nav.classList.remove('nav--open');
      btn.setAttribute('aria-expanded', 'false');
    };

    const closeSubmenu = () => {
      if (submenuItem) submenuItem.classList.remove('nav__item--submenu-open');
      if (submenuToggle) submenuToggle.setAttribute('aria-expanded', 'false');
    };

    const closeAllMenus = () => {
      closeMainMenu();
      closeSubmenu();
    };

    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('nav--open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');

      if (!open) closeSubmenu();
    });

    menu.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link) {
        closeAllMenus();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllMenus();
      }
    });

    document.addEventListener('click', (e) => {
      if (!mount.contains(e.target)) {
        closeAllMenus();
      }
    });

    const links = mount.querySelectorAll('[data-route]');
    links.forEach((link) => {
      const route = link.dataset.route;

      switch (route) {
        case 'reception':
          link.href = `${basePath}index.html#reception`;
          break;

        case 'gallery':
          link.href = `${basePath}index.html#gallery`;
          break;

        case 'room-01':
          link.href = isInnerPage ? './room-01.html' : './pages/room-01.html';
          break;

        case 'room-02':
          link.href = isInnerPage ? './room-02.html' : './pages/room-02.html';
          break;

        case 'room-03':
          link.href = isInnerPage ? './room-03.html' : './pages/room-03.html';
          break;

        case 'workshops':
          link.href = `${basePath}index.html#workshops`;
          break;

        case 'manifesto':
          link.href = isInnerPage ? './manifesto.html' : './pages/manifesto.html';
          break;

        case 'farewell':
          link.href = `${basePath}index.html#farewell`;
          break;
      }
    });

    if (submenuToggle && submenuItem) {
      submenuToggle.addEventListener('click', (e) => {
        if (window.innerWidth >= 1024) return;

        e.preventDefault();
        e.stopPropagation();

        const isOpen = submenuItem.classList.toggle('nav__item--submenu-open');
        submenuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024) {
        closeSubmenu();
      }
    });
  } catch (err) {
    console.error('Error cargando navbar:', err);
  }
})();