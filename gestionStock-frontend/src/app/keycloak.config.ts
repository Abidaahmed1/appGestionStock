import { KeycloakService } from 'keycloak-angular';

export function initializeKeycloak(keycloak: KeycloakService): () => Promise<boolean> {
  return () =>
    keycloak.init({
      config: {
        url: 'http://localhost:8080',
        realm: 'myrealm',
        clientId: 'myclient'
      },
      initOptions: {
        onLoad: 'check-sso',
        checkLoginIframe: false,
        redirectUri: typeof window !== 'undefined' ? window.location.origin : '/',
        flow: 'standard',
        pkceMethod: 'S256'
      },
      bearerExcludedUrls: ['/assets', '/clients/public', '/login', '/sign-in', '/register', '/registration-success', '/access-denied'],
      enableBearerInterceptor: true,
      bearerPrefix: 'Bearer'
    }).then(authenticated => {
      console.log(` Keycloak initialization completed. Authenticated: ${authenticated}`);
      return true;
    }).catch(error => {
      console.error(' Keycloak initialization failed:', error);
      return true;
    });
}
