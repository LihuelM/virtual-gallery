(() => {
  const scroller = document.querySelector(".experience");
  const scenes = Array.from(document.querySelectorAll(".scene"));
  const navLinks = Array.from(document.querySelectorAll("[data-nav]"));
  const layers = Array.from(document.querySelectorAll(".layer[data-speed]"));

  if (!scroller || !scenes.length) return;

  // ---------------------------
  // Spotlight (mouse light)
  // ---------------------------
  const finePointer = matchMedia("(pointer:fine)").matches;
  if (finePointer) {
    window.addEventListener("mousemove", (e) => {
      document.documentElement.style.setProperty("--mx", `${e.clientX}px`);
      document.documentElement.style.setProperty("--my", `${e.clientY}px`);
    }, { passive: true });
  }

  // ---------------------------
  // Reveals + Active Nav
  // ---------------------------
  const io = new IntersectionObserver((entries) => {
    // reveals
    for (const e of entries) {
      if (e.isIntersecting) e.target.classList.add("is-in");
    }
  }, { root: scroller, threshold: 0.14 });

  document.querySelectorAll(".reveal").forEach(el => io.observe(el));

  const ioNav = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(e => e.isIntersecting)
      .sort((a,b)=>b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;

    const id = visible.target.id;
    navLinks.forEach(a => a.classList.toggle("is-active", a.getAttribute("href") === `#${id}`));
  }, { root: scroller, threshold: [0.55, 0.7, 0.85] });

  scenes.forEach(s => ioNav.observe(s));

  // ---------------------------
  // Parallax (rAF) - based on scroller scrollTop
  // ---------------------------
  let latestY = scroller.scrollTop;
  let tickingParallax = false;

  function applyParallax() {
    tickingParallax = false;
    const y = latestY;

    for (const el of layers) {
      const speed = Number(el.dataset.speed || 0);
      const ty = -(y * speed);
      el.style.transform = `translate3d(0, ${ty.toFixed(2)}px, 0)`;
    }
  }

  scroller.addEventListener("scroll", () => {
    latestY = scroller.scrollTop;
    if (!tickingParallax) {
      tickingParallax = true;
      requestAnimationFrame(applyParallax);
    }
  }, { passive: true });

  // ---------------------------
  // One-step scroll (wheel -> next/prev scene)
  // ---------------------------
  let index = 0;
  let locked = false;

  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

  function syncIndex(){
    const top = scroller.scrollTop;
    let best = 0, bestDist = Infinity;
    scenes.forEach((s, i) => {
      const dist = Math.abs(s.offsetTop - top);
      if (dist < bestDist){ bestDist = dist; best = i; }
    });
    index = best;
  }

  function goTo(i){
    index = clamp(i, 0, scenes.length - 1);
    locked = true;
    scenes[index].scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => (locked = false), 650);
  }

  // scroller.addEventListener("wheel", (e) => {
  //   if (locked) return;

  //   if (Math.abs(e.deltaY) < 12) return;

  //   e.preventDefault();
  //   goTo(index + (e.deltaY > 0 ? 1 : -1));
  // }, { passive: false });

  navLinks.forEach(a => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const id = a.getAttribute("href").slice(1);
      const idx = scenes.findIndex(s => s.id === id);
      if (idx >= 0) goTo(idx);
    });
  });

  document.querySelectorAll("[data-goto]").forEach(btn => {
    btn.addEventListener("click", () => {
      const hash = btn.getAttribute("data-goto");
      const id = (hash || "").replace("#", "");
      const idx = scenes.findIndex(s => s.id === id);
      if (idx >= 0) goTo(idx);
    });
  });

  const tilts = Array.from(document.querySelectorAll("[data-tilt]"));
  let mx = 0, my = 0, rafTilt = null;

  function applyTilt() {
    rafTilt = null;
    const nx = (mx / window.innerWidth) * 2 - 1;
    const ny = (my / window.innerHeight) * 2 - 1;

    for (const el of tilts) {
      const rx = (ny * -2.2);
      const ry = (nx *  3.2);
      el.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    }
  }

  if (finePointer && tilts.length) {
    window.addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      if (!rafTilt) rafTilt = requestAnimationFrame(applyTilt);
    }, { passive: true });
  }


  // ---------------------------
  // Recepción: Video intro (una vez por carga o al volver a Recepción)
  // ---------------------------
  const reception = document.getElementById("reception");
  const v = document.getElementById("receptionVideo");
  const endfade = document.getElementById("receptionEndfade");

  let introLocked = false;
  const FADE_SECONDS = 3.0;     // cuánto dura el fade al final
  const TEXT_IN_AFTER = 1.2;    // delay (en segundos) después de iniciar el fade para mostrar texto

  function lockExperience(lock){
    introLocked = lock;
    // bloquea scroll del contenedor durante intro (UX: “esperá la entrada”)
    scroller.style.overflowY = lock ? "hidden" : "auto";
  }

  function resetReceptionState(){
    if (!reception || !v || !endfade) return;
    reception.classList.remove("is-endfade-on", "is-intro-ready");
    reception.classList.add("is-intro-playing");
    endfade.style.opacity = "";
  }

  async function playReceptionIntro(){
    if (!reception || !v || !endfade) return;

    // Solo re-disparamos si estamos en recepción
    resetReceptionState();
    lockExperience(true);

    try{
      v.currentTime = 0;
      const p = v.play();
      if (p && typeof p.then === "function") await p;
    }catch(_){
      // Si el autoplay falla, igual mostramos el contenido con overlay (fallback)
      reception.classList.add("is-endfade-on", "is-intro-ready");
      reception.classList.remove("is-intro-playing");
      lockExperience(false);
      return;
    }
  }

  // Enciende el endfade en los últimos segundos (sin arrancar en negro)
  function handleTimeUpdate(){
    if (!reception || !v) return;
    const d = v.duration;
    if (!Number.isFinite(d) || d <= 0) return;

    const remaining = d - v.currentTime;

    // Cuando entra en ventana final, activamos overlay + texto
    if (remaining <= FADE_SECONDS){
      if (!reception.classList.contains("is-endfade-on")){
        reception.classList.add("is-endfade-on");
        window.setTimeout(() => {
          reception.classList.add("is-intro-ready");
        }, Math.max(0, TEXT_IN_AFTER * 1000));
      }
    }
  }

  function handleEnded(){
    if (!reception) return;
    reception.classList.add("is-endfade-on", "is-intro-ready");
    reception.classList.remove("is-intro-playing");
    lockExperience(false);
  }

  // Hook: cuando entrás a Recepción por nav/botón, re-play
  function maybeReplayOnReceptionNav(targetIndex){
    // si el destino es recepción, re-disparamos
    const isReception = scenes[targetIndex] && scenes[targetIndex].id === "reception";
    if (isReception) playReceptionIntro();
  }

  // Overwrite goTo to respect intro lock + replay reception
  const _goTo = goTo;
  goTo = function(i){
    const next = clamp(i, 0, scenes.length - 1);

    // si está lockeado, solo permitimos quedarnos en recepción
    if (introLocked && next !== 0) return;

    _goTo(next);
    maybeReplayOnReceptionNav(next);
  };

  if (v && reception){
    v.addEventListener("timeupdate", handleTimeUpdate, { passive: true });
    v.addEventListener("ended", handleEnded, { passive: true });
  }

  // Auto-play al cargar (una sola vez por carga)
  // Si el usuario ya arrancó en otra ancla (#gallery), no forzamos el intro.
  const startHash = (location.hash || "").replace("#","");
  if (!startHash || startHash === "reception"){
    // aseguramos que el scroller arranque en recepción
    goTo(0);
    playReceptionIntro();
  }else{
    // Si no iniciamos en recepción, no lockeamos
    reception?.classList.remove("is-intro-playing");
    lockExperience(false);
  }

    // ---------------------------
  // Atelier: 3D Wheel + Info Sync (infinite)
  // ---------------------------
  function initAtelier3DWheel(){
    const root = document.querySelector("[data-atelier-wheel]");
    if (!root) return;

    const cards = Array.from(root.querySelectorAll(".atelierCard"));
    const btnPrev = document.querySelector("[data-at-prev]");
    const btnNext = document.querySelector("[data-at-next]");

    const info = document.querySelector("[data-at-info]");
    const elTitle = document.querySelector("[data-at-title]");
    const elDesc  = document.querySelector("[data-at-desc]");
    const elMeta  = document.querySelector("[data-at-meta]");

    if (!cards.length || !info || !elTitle || !elDesc || !elMeta) return;

    // 1) DATA (cambiá src por tus fotos)
    const DATA = {
      ramas:  { title: "Ramas",  desc: "Textura y quiebre. Lo imperfecto guía la mano.", meta: "textura / quiebre", src: "assets/img/atelier/ramas.jpg" },
      troncos:{ title: "Troncos",desc: "Soporte y peso. Una base para construir.",      meta: "peso / soporte",  src: "assets/img/atelier/troncos.jpg" },
      cuerdas:{ title: "Cuerdas",desc: "Tensión y nudo. Unión, ritmo, repetición.",     meta: "tensión / nudo",  src: "assets/img/atelier/cuerdas.jpg" },
      plantas:{ title: "Plantas",desc: "Cuidado y pulso. Crece con tiempo.",            meta: "ritmo / cuidado",  src: "assets/img/atelier/plantas.jpg" },
      piedra: { title: "Piedra", desc: "Silencio y base. La forma aparece lento.",     meta: "silencio / base",  src: "assets/img/atelier/piedras.jpg" },
      tierra: { title: "Tierra", desc: "Origen y mezcla. Materia que mancha y une.",   meta: "origen / mezcla",  src: "assets/img/atelier/plumas.jpg" },
    };

    // 2) hydrate images
    cards.forEach((card) => {
      const key = card.getAttribute("data-key");
      const img = card.querySelector(".atelierCard__img");
      if (DATA[key] && img) img.src = DATA[key].src;
    });

    let active = 0;
    let timer = null;

    const AUTOPLAY_MS = 2600;
    const theta = (2 * Math.PI) / cards.length;

    function mod(n, m){ return ((n % m) + m) % m; }

    function setInfoByIndex(idx){
      const key = cards[idx].getAttribute("data-key");
      const d = DATA[key];
      if (!d) return;

      info.classList.add("is-out");
      window.setTimeout(() => {
        elTitle.textContent = d.title;
        elDesc.textContent  = d.desc;
        elMeta.textContent  = d.meta;
        info.classList.remove("is-out");
      }, 170);
    }

    function render(){
      // radio “seguro”: no rompe layout, da buen 3D sin conflictos
      const radius = 200;

      cards.forEach((card, i) => {
        const rel = i - active;
        const angle = rel * theta;

        // normalizar para el “lado más corto”
        const n = cards.length;
        let relNorm = rel;
        if (rel >  n/2) relNorm = rel - n;
        if (rel < -n/2) relNorm = rel + n;

        const abs = Math.abs(relNorm);

        // Solo 3 visibles: centro y vecinos
        const visible = abs <= 1;
        const opacity = abs === 0 ? 1 : 0.58;

        // 3D: rueda + leve tilt + profundidad
        // (translate(-50%,-50%) va en la propia transform para centrar)
        const rotY = angle * (180 / Math.PI);
        const tiltX = -6;

        card.style.opacity = visible ? String(opacity) : "0";
        card.style.zIndex = abs === 0 ? "5" : "3";

        const scale = abs === 0 ? 1.08 : 0.92;

        card.style.transform =
          `translate3d(-50%, -50%, 0) rotateX(${tiltX}deg) rotateY(${rotY}deg) translateZ(${radius}px) scale(${scale})`;
      });

      setInfoByIndex(active);
    }

    function next(){ active = mod(active + 1, cards.length); render(); }
    function prev(){ active = mod(active - 1, cards.length); render(); }

    function stop(){ if (timer) window.clearInterval(timer); timer = null; }
    function start(){ stop(); timer = window.setInterval(next, AUTOPLAY_MS); }

    btnNext?.addEventListener("click", () => { next(); start(); });
    btnPrev?.addEventListener("click", () => { prev(); start(); });

    // pausa al hover
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);

    // swipe simple
    let sx = 0, dragging = false;
    root.addEventListener("touchstart", (e) => {
      sx = e.touches[0].clientX;
      dragging = true;
      stop();
    }, { passive: true });

    root.addEventListener("touchend", (e) => {
      if (!dragging) return;
      dragging = false;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 35) (dx < 0 ? next() : prev());
      start();
    }, { passive: true });

    render();
    start();
  }

  initAtelier3DWheel();


  // ---------------------------
  // Init
  // ---------------------------
  syncIndex();
  applyParallax();
})();

const ring = document.querySelector(".cursor-ring");

if (ring && matchMedia("(hover:hover) and (pointer:fine)").matches) {
  const hoverables = "a, button, input, textarea, [data-tilt], .card";

  window.addEventListener("mouseover", (e) => {
    if (e.target && e.target.closest(hoverables)) ring.classList.add("is-hover");
  }, { passive: true });

  window.addEventListener("mouseout", (e) => {
    if (e.target && e.target.closest(hoverables)) ring.classList.remove("is-hover");
  }, { passive: true });
}
