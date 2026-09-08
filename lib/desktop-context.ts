declare global {
  interface Window {
    polaris?: {
      platform: string;
      isDesktop: boolean;
    };
  }
}

export function getAppContext(): {
  version?: string;
  platform?: string;
  is_desktop: boolean;
  url?: string;
} {
  if (typeof window === "undefined") return { is_desktop: false };
  return {
    version: process.env.NEXT_PUBLIC_APP_VERSION,
    platform: window.polaris?.platform ?? window.navigator.platform,
    is_desktop: Boolean(window.polaris?.isDesktop),
    url: window.location.href,
  };
}
