import { ApplicationConfig, provideZoneChangeDetection, PLATFORM_ID, APP_INITIALIZER, importProvidersFrom } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptorsFromDi, HttpClient } from '@angular/common/http';
import { KeycloakService, KeycloakAngularModule } from 'keycloak-angular';

function initializeKeycloak(keycloak: KeycloakService, platformId: object) {
  return () => {
    if (isPlatformBrowser(platformId)) {
      return keycloak.init({
        config: {
          url: 'http://localhost:8080',
          realm: 'myrealm',
          clientId: 'myclient'
        },
        initOptions: {
          onLoad: 'login-required',
          checkLoginIframe: false,
          redirectUri: window.location.origin,
          flow: 'standard',
          pkceMethod: 'S256'
        },
        enableBearerInterceptor: true,
        bearerExcludedUrls: ['/assets'],
        bearerPrefix: 'Bearer'
      });
    }
    return Promise.resolve(true);
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    provideClientHydration(),
    importProvidersFrom(KeycloakAngularModule),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeKeycloak,
      multi: true,
      deps: [KeycloakService, PLATFORM_ID]
    }
  ]
};
