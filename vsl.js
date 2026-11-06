// VSL da hero · variante B do teste A/B (lp4.miaapp.com.br).
// Player próprio, no estilo dos hospedadores de VSL:
// 1. Capa até ATRASO_DA_PREVIA; depois o vídeo começa sozinho e sem som (os navegadores
//    só deixam tocar sozinho assim), com o aviso "Toque para ouvir". A prévia repete e
//    pausa fora da tela.
// 2. No toque, volta do início com som e a página escurece em volta (foco). Esc, toque
//    fora ou rolar para longe desfazem o foco.
// 3. Sem linha do tempo clicável: não dá para pular. A barra anda mais rápido no começo,
//    para o vídeo parecer curto.
// 4. Quem volta à página retoma de onde parou (localStorage).
// 5. Eventos (RudderStack e Clarity): vsl_play, vsl_progress em 10/25/30/50/60/75/80/90/100%,
//    vsl_pause, vsl_resume, vsl_complete e vsl_exit (último marco visto ao sair).
//    No Clarity também fica a etiqueta vsl_max_percent. A prévia sem som não conta.

const vsl = document.querySelector("[data-vsl]");

if (vsl) {
  const video = vsl.querySelector("video");
  const fonte = video.querySelector("source");
  const barra = vsl.querySelector(".vsl__progresso span");
  const avisoRetomada = vsl.querySelector("[data-vsl-retomado]");
  const botaoSom = vsl.querySelector("[data-vsl-som]");

  const ATRASO_DA_PREVIA = 2500;
  const CHAVE_DO_PROGRESSO = "mia-lp4-vsl-progresso";
  const MARCOS = [10, 25, 30, 50, 60, 75, 80, 90, 100];
  let maiorMarco = 0;
  let saidaEnviada = false;
  const marcosEnviados = new Set();
  const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let fase = "capa";
  let comecouComSom = false; // depois disso a prévia automática não mexe mais no vídeo
  let fundo = null;

  const mudarFase = (nova) => {
    fase = nova;
    vsl.dataset.fase = nova;
    for (const botao of vsl.querySelectorAll("[data-vsl-pausa]")) {
      botao.setAttribute("aria-label", nova === "pausado" ? "Continuar assistindo" : "Pausar vídeo");
    }
  };

  const tocar = () => Promise.resolve(video.play());

  const rastrear = (evento, propriedades) => {
    window.rudderanalytics?.track(evento, propriedades);
    window.clarity?.("event", propriedades?.percent !== undefined ? `${evento}_${propriedades.percent}` : evento);
  };

  const registrarMarco = (marco) => {
    if (marcosEnviados.has(marco)) return;
    marcosEnviados.add(marco);
    rastrear("vsl_progress", { percent: marco });
    if (marco > maiorMarco) {
      maiorMarco = marco;
      window.clarity?.("set", "vsl_max_percent", String(marco));
    }
  };

  const segundoAtual = () => Math.round(video.currentTime || 0);
  const percentAtual = () => (video.duration ? Math.round((video.currentTime / video.duration) * 100) : 0);

  const lerProgresso = () => {
    try {
      const valor = Number(localStorage.getItem(CHAVE_DO_PROGRESSO));
      return Number.isFinite(valor) && valor > 0 ? valor : 0;
    } catch {
      return 0;
    }
  };

  const gravarProgresso = (segundos) => {
    try {
      if (segundos === null) localStorage.removeItem(CHAVE_DO_PROGRESSO);
      else localStorage.setItem(CHAVE_DO_PROGRESSO, segundos.toFixed(1));
    } catch {
      // Sem armazenamento (aba anônima, bloqueio): só não retoma.
    }
  };

  // Progresso mostrado na barra: anda rápido no começo e devagar no fim.
  const progressoVisual = (real) => {
    const p = Math.min(1, Math.max(0, real));
    return 1 - Math.pow(1 - p, 2);
  };

  const desenharProgresso = (real) => {
    barra.style.transform = `scaleX(${progressoVisual(real).toFixed(4)})`;
  };

  const entrarEmFoco = () => {
    if (fundo) return;
    fundo = document.createElement("div");
    fundo.className = "vsl-fundo";
    fundo.setAttribute("aria-hidden", "true");
    fundo.addEventListener("click", sairDoFoco);
    document.body.append(fundo);
    vsl.classList.add("vsl--foco");
  };

  function sairDoFoco() {
    fundo?.remove();
    fundo = null;
    vsl.classList.remove("vsl--foco");
  }

  const assistirComSom = (automatico = false) => {
    comecouComSom = true;
    const salvo = lerProgresso();
    const podeRetomar = salvo > 5 && (!video.duration || salvo < video.duration - 5);
    video.currentTime = podeRetomar ? salvo : 0;
    video.muted = false;
    delete vsl.dataset.mudo;
    botaoSom.setAttribute("aria-label", "Tirar o som");
    desenharProgresso(video.duration ? video.currentTime / video.duration : 0);
    mudarFase("assistindo");
    tocar().catch(() => (semVideo() ? mostrarErro() : mudarFase("pausado")));
    if (automatico !== true) {
      entrarEmFoco();
      vsl.scrollIntoView({ block: "center", behavior: reduzido ? "auto" : "smooth" });
    }
    if (podeRetomar) {
      avisoRetomada.classList.remove("is-visible");
      void avisoRetomada.offsetWidth; // reinicia a animação
      avisoRetomada.classList.add("is-visible");
    }
    rastrear("vsl_play", { resumed: podeRetomar });
  };

  const alternarPausa = () => {
    if (fase === "assistindo") {
      video.pause();
      mudarFase("pausado");
      rastrear("vsl_pause", { second: segundoAtual(), percent_watched: percentAtual() });
    } else if (fase === "pausado") {
      tocar().catch(() => {});
      mudarFase("assistindo");
      rastrear("vsl_resume", { second: segundoAtual(), percent_watched: percentAtual() });
    }
  };

  const alternarSom = () => {
    video.muted = !video.muted;
    if (video.muted) vsl.dataset.mudo = "";
    else delete vsl.dataset.mudo;
    botaoSom.setAttribute("aria-label", video.muted ? "Ativar som" : "Tirar o som");
  };

  const telaCheia = () => {
    if (video.requestFullscreen) video.requestFullscreen().catch(() => video.webkitEnterFullscreen?.());
    else video.webkitEnterFullscreen?.(); // iPhone
  };

  for (const botao of vsl.querySelectorAll("[data-vsl-assistir]")) botao.addEventListener("click", () => assistirComSom());
  for (const botao of vsl.querySelectorAll("[data-vsl-pausa]")) botao.addEventListener("click", alternarPausa);
  botaoSom.addEventListener("click", alternarSom);
  vsl.querySelector("[data-vsl-tela-cheia]").addEventListener("click", telaCheia);
  vsl.querySelector("[data-vsl-de-novo]").addEventListener("click", () => {
    gravarProgresso(null);
    assistirComSom();
  });
  avisoRetomada.addEventListener("animationend", () => avisoRetomada.classList.remove("is-visible"));
  video.addEventListener("contextmenu", (evento) => evento.preventDefault());

  // A caixa assume o formato real do vídeo (16:9, 9:16, 4:5...).
  const ajustarFormato = () => {
    if (!video.videoWidth || !video.videoHeight) return;
    vsl.style.setProperty("--vsl-proporcao", `${video.videoWidth} / ${video.videoHeight}`);
    vsl.classList.toggle("vsl--retrato", video.videoHeight > video.videoWidth);
  };
  video.addEventListener("loadedmetadata", ajustarFormato);
  // O vídeo pode ter carregado antes deste script rodar.
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) ajustarFormato();

  video.addEventListener("timeupdate", () => {
    if (!video.duration || (fase !== "assistindo" && fase !== "pausado")) return;
    const real = video.currentTime / video.duration;
    desenharProgresso(real);
    gravarProgresso(video.currentTime);
    for (const marco of MARCOS) {
      if (real * 100 >= marco) registrarMarco(marco);
    }
  });

  video.addEventListener("ended", () => {
    if (fase === "previa") {
      video.currentTime = 0;
      tocar().catch(() => {});
      return;
    }
    for (const marco of MARCOS) registrarMarco(marco);
    if (!marcosEnviados.has("fim")) {
      marcosEnviados.add("fim");
      rastrear("vsl_complete");
    }
    gravarProgresso(null);
    desenharProgresso(1);
    sairDoFoco();
    mudarFase("fim");
  });

  // Arquivo do vídeo ausente ou inválido.
  const semVideo = () => video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE;
  const mostrarErro = () => {
    sairDoFoco();
    mudarFase("erro");
  };
  fonte.addEventListener("error", mostrarErro);
  // O erro pode ter acontecido antes deste script rodar.
  if (semVideo()) mostrarErro();

  // Ao terminar de carregar a página: tenta tocar com som. Se o navegador bloquear,
  // toca sem som e o primeiro toque em qualquer lugar da página liga o som.
  const autoplay = () => {
    if (reduzido || comecouComSom || fase !== "capa") return;
    video.muted = false;
    tocar()
      .then(() => {
        if (fase !== "capa") return;
        video.pause();
        assistirComSom(true);
        rastrear("vsl_autoplay_som");
      })
      .catch(() => {
        if (fase !== "capa") return;
        video.muted = true;
        tocar()
          .then(() => {
            if (fase === "capa") mudarFase("previa");
            rastrear("vsl_autoplay_mudo");
          })
          .catch(() => {});
      });
  };
  if (document.readyState === "complete") autoplay();
  else addEventListener("load", autoplay, { once: true });

  const primeiroToque = (evento) => {
    if (fase !== "previa" || comecouComSom) return;
    if (vsl.contains(evento.target)) return; // os botões do vídeo cuidam disso
    assistirComSom(true);
  };
  document.addEventListener("pointerdown", primeiroToque, true);
  document.addEventListener("keydown", primeiroToque, true);

  // Fora da tela: a prévia pausa (economiza dados) e o foco se desfaz.
  new IntersectionObserver(
    ([registro]) => {
      if (!registro.isIntersecting) sairDoFoco();
      if (fase !== "previa") return;
      if (registro.isIntersecting) tocar().catch(() => {});
      else video.pause();
    },
    { threshold: 0.25 }
  ).observe(vsl);

  // Saída da página: onde a pessoa parou (só para quem deu play com som e não terminou).
  addEventListener("pagehide", () => {
    if (!comecouComSom || saidaEnviada || maiorMarco >= 100) return;
    saidaEnviada = true;
    rastrear("vsl_exit", { percent: maiorMarco, second: segundoAtual() });
  });

  addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") sairDoFoco();
  });
}
