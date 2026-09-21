// view_content: clique em botão que leva para fora deste domínio.
// O evento de cadastro/agendamento é disparado no domínio de destino, não aqui.
document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (!link || !link.hostname || link.hostname === window.location.hostname) return;

  window.rudderanalytics?.track("view_content", {
    button: link.dataset.cta,
    button_location: link.dataset.ctaLocation,
    destination_url: link.href,
  });
});

// Carrossel das conversas: só roda onde há overflow (mobile), nunca no grid do desktop.
const scroller = document.querySelector(".social__scroller");

if (scroller && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let timer = null;
  const podeRolar = () => scroller.scrollWidth > scroller.clientWidth + 4;

  const avancar = () => {
    const card = scroller.querySelector(".testi");
    if (!card) return;
    const passo = card.offsetWidth + (parseFloat(getComputedStyle(scroller).columnGap) || 0);
    const acabou = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 4;
    scroller.scrollTo({ left: acabou ? 0 : scroller.scrollLeft + passo, behavior: "smooth" });
  };

  const parar = () => { clearInterval(timer); timer = null; };
  const rodar = () => { parar(); if (podeRolar()) timer = setInterval(avancar, 3800); };

  scroller.addEventListener("pointerdown", parar);
  scroller.addEventListener("pointerup", () => setTimeout(rodar, 5000));

  new IntersectionObserver(([entry]) => (entry.isIntersecting ? rodar() : parar()), {
    threshold: 0.4,
  }).observe(scroller);
}

const stickyBar = document.querySelector("[data-sticky-cta]");
const hero = document.querySelector("#hero");

if (stickyBar && hero) {
  new IntersectionObserver(
    ([entry]) => {
      stickyBar.classList.toggle("is-visible", !entry.isIntersecting);
      document.body.classList.toggle("bar-on", !entry.isIntersecting);
    },
    { rootMargin: "-40px 0px 0px 0px" }
  ).observe(hero);
}
