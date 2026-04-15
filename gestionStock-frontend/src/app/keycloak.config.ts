import { KeycloakService } from 'keycloak-angular';

export function initializeKeycloak(keycloak: KeycloakService): () => Promise<boolean> {
  return () =>
    keycloak.init({
      config: {
        url: 'http://localhost:8085',
        realm: 'myrealm',
        clientId: 'myclient'
      },
      initOptions: {
        onLoad: 'login-required',
        checkLoginIframe: false,
        flow: 'standard'
      },
      enableBearerInterceptor: true,
      bearerPrefix: 'Bearer'
    }).catch(error => {
      console.error('Keycloak initialization failed:', error);
      return true;
    });
}
