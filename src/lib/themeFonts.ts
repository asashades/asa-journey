'use client';

export type ThemeFontKey = 'journalistic' | 'cosmic' | 'moss' | 'nocturne';

type FontFamilyKey = 'poppins' | 'montserrat' | 'inter' | 'fraunces' | 'spaceGrotesk';

interface FontFamilyConfig {
  cssName: string;
  href: string;
  probes: string[];
}

const FONT_LOAD_TIMEOUT_MS = 4500;

const FONT_FAMILIES: Record<FontFamilyKey, FontFamilyConfig> = {
  poppins: {
    cssName: 'Poppins',
    href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600;700;800;900&display=swap',
    probes: ['200 1rem "Poppins"', '400 1rem "Poppins"', '700 1rem "Poppins"'],
  },
  montserrat: {
    cssName: 'Montserrat',
    href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap',
    probes: ['400 1rem "Montserrat"', '700 1rem "Montserrat"'],
  },
  inter: {
    cssName: 'Inter',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600;700;800;900&display=swap',
    probes: ['200 1rem "Inter"', '400 1rem "Inter"', '700 1rem "Inter"'],
  },
  fraunces: {
    cssName: 'Fraunces',
    href: 'https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700;800;900&display=swap',
    probes: ['400 1rem "Fraunces"', '700 1rem "Fraunces"'],
  },
  spaceGrotesk: {
    cssName: 'Space Grotesk',
    href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap',
    probes: ['400 1rem "Space Grotesk"', '700 1rem "Space Grotesk"'],
  },
};

const THEME_FONT_FAMILIES: Record<ThemeFontKey, FontFamilyKey[]> = {
  journalistic: ['poppins', 'montserrat'],
  cosmic: ['inter', 'fraunces'],
  moss: ['inter', 'fraunces'],
  nocturne: ['inter', 'spaceGrotesk'],
};

const loadedFamilies = new Set<FontFamilyKey>();
const loadingFamilies = new Map<FontFamilyKey, Promise<void>>();

function ensurePreconnect(href: string, crossOrigin = false) {
  if (document.querySelector(`link[data-asa-font-preconnect="${href}"]`)) return;

  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = href;
  link.dataset.asaFontPreconnect = href;
  if (crossOrigin) {
    link.crossOrigin = 'anonymous';
  }
  document.head.appendChild(link);
}

function waitForStylesheet(link: HTMLLinkElement) {
  if (link.dataset.loaded === 'true') return Promise.resolve();

  return new Promise<void>((resolve) => {
    link.addEventListener(
      'load',
      () => {
        link.dataset.loaded = 'true';
        resolve();
      },
      { once: true }
    );
    link.addEventListener(
      'error',
      () => {
        resolve();
      },
      { once: true }
    );
  });
}

function withTimeout(promise: Promise<void>, timeoutMs = FONT_LOAD_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    }),
  ]);
}

function loadFontFamily(fontKey: FontFamilyKey) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve();
  }

  if ('navigator' in window && window.navigator.onLine === false) {
    return Promise.resolve();
  }

  if (loadedFamilies.has(fontKey)) {
    return Promise.resolve();
  }

  const activeLoad = loadingFamilies.get(fontKey);
  if (activeLoad) {
    return activeLoad;
  }

  const config = FONT_FAMILIES[fontKey];
  const loadPromise = (async () => {
    ensurePreconnect('https://fonts.googleapis.com');
    ensurePreconnect('https://fonts.gstatic.com', true);

    const linkId = `asa-theme-font-${fontKey}`;
    let stylesheet = document.getElementById(linkId) as HTMLLinkElement | null;

    if (!stylesheet) {
      stylesheet = document.createElement('link');
      stylesheet.id = linkId;
      stylesheet.rel = 'stylesheet';
      stylesheet.href = config.href;
      stylesheet.dataset.asaFontFamily = config.cssName;
      document.head.appendChild(stylesheet);
    }

    await waitForStylesheet(stylesheet);

    if ('fonts' in document) {
      await Promise.allSettled(config.probes.map((probe) => document.fonts.load(probe)));
    }
  })()
    .catch((error) => {
      console.warn(`[themeFonts] Failed to load ${config.cssName}:`, error);
    })
    .finally(() => {
      loadedFamilies.add(fontKey);
      loadingFamilies.delete(fontKey);
    });

  const boundedLoad = withTimeout(loadPromise).finally(() => {
    loadedFamilies.add(fontKey);
  });

  loadingFamilies.set(fontKey, boundedLoad);
  return boundedLoad;
}

export async function loadThemeFonts(theme: ThemeFontKey) {
  const families = THEME_FONT_FAMILIES[theme] || THEME_FONT_FAMILIES.journalistic;
  await Promise.all(families.map(loadFontFamily));
}
