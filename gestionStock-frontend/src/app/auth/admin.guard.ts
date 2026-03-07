import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, CanActivateFn } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';

export const adminGuard: CanActivateFn = async (route, state) => {
    const platformId = inject(PLATFORM_ID);
    const keycloak = inject(KeycloakService);
    const router = inject(Router);

    if (!isPlatformBrowser(platformId)) {
        return true;
    }

    try {
        const isLoggedIn = await keycloak.isLoggedIn();

        if (!isLoggedIn) {
            await keycloak.login({
                redirectUri: window.location.origin + state.url
            });
            return false;
        }

        const userRoles = keycloak.getUserRoles();

        const isAdmin = userRoles.some(role => {
            const upperRole = role.toUpperCase().replace('ROLE_', '');
            return upperRole === 'ADMINISTRATEUR';
        });

        if (isAdmin) {
            return true;
        }

        router.navigate(['/dashboard']);
        return false;

    } catch (error) {
        console.error('Guard error:', error);
        return true;
    }
};
