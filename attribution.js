(() => {
  const STORAGE_KEY = "mia_signup_attribution";
  const APP_HOSTNAME = "web.miaapp.com.br";
  const OWN_DOMAIN = "miaapp.com.br";
  const CAMPAIGN_PARAMS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "gclid",
    "fbclid",
  ];

  const currentLandingPage = () => {
    const hostname = location.hostname.replace(/^www\./, "");
    return hostname === "miaapp.com.br" ? "miaapp" : hostname.split(".")[0];
  };

  const externalReferrer = () => {
    try {
      const { hostname, origin } = new URL(document.referrer);
      const isOwnDomain =
        hostname === location.hostname ||
        hostname === OWN_DOMAIN ||
        hostname.endsWith(`.${OWN_DOMAIN}`);
      return isOwnDomain || origin === "null" ? undefined : origin;
    } catch {
      return undefined;
    }
  };

  const store = (attribution) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
    } catch {}
    return attribution;
  };

  const readStored = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  };

  const capture = () => {
    const urlParams = new URLSearchParams(location.search);
    const attribution = {};
    for (const param of CAMPAIGN_PARAMS) {
      const value = urlParams.get(param)?.trim();
      if (value) attribution[param] = value;
    }
    const hasCampaign = Object.keys(attribution).length > 0;
    const stored = readStored();
    const referrer = externalReferrer();

    if (!hasCampaign && (Object.keys(stored).length > 0 || !referrer)) {
      return stored;
    }

    attribution.landing_page = currentLandingPage();
    if (referrer) attribution.referrer = referrer;
    return store(attribution);
  };

  const attribution = { landing_page: currentLandingPage(), ...capture() };

  const decorate = (link) => {
    if (link.hostname !== APP_HOSTNAME) return;
    const url = new URL(link.href);
    for (const [param, value] of Object.entries(attribution)) {
      if (!url.searchParams.has(param)) url.searchParams.set(param, value);
    }
    // Só reescreve quando muda: o MutationObserver abaixo vê cada escrita no href.
    if (url.href !== link.href) link.href = url.href;
  };

  const decorateAll = () => document.querySelectorAll("a[href]").forEach(decorate);

  const decorateFromEvent = (event) => {
    const link = event.target.closest?.("a[href]");
    if (link) decorate(link);
  };

  decorateAll();
  // Landings em React (Lovable) criam os botões depois que este script roda.
  new MutationObserver(decorateAll).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["href"],
  });
  document.addEventListener("click", decorateFromEvent, true);
  document.addEventListener("auxclick", decorateFromEvent, true);
})();
