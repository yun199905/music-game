declare global {
  interface Window {
    APP_CONFIG?: {
      apiBaseUrl?: string;
      wsBaseUrl?: string;
    };
  }
}

const apiBaseUrl = window.APP_CONFIG?.apiBaseUrl ?? 'http://localhost:3000';
const wsBaseUrl = window.APP_CONFIG?.wsBaseUrl ?? apiBaseUrl;

export const appConfigValues = {
  apiBaseUrl,
  wsBaseUrl,
};
