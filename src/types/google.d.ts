export {};

declare global {
  interface Window {
    google: typeof google;
  }

  namespace google {
    namespace accounts {
      namespace oauth2 {
        interface TokenClient {
          requestAccessToken: (options?: { prompt?: string }) => void;
          callback: (response: { access_token?: string; error?: string }) => void;
        }

        function initTokenClient(config: {
          client_id: string;
          scope: string;
          callback: (response: { access_token: string; error?: string }) => void;
        }): TokenClient;
      }
    }
  }
}
