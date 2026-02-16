import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, CanActivateFn } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';

export const authGuard: CanActivateFn = async (route, state) => {
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

        const normalizeRole = (r: string) => r.toUpperCase().replace('ROLE_', '').replace(/\s+/g, '_');

        const userRoles = keycloak.getUserRoles().map(role => normalizeRole(role));

        const requiredRoles = (route.data['roles'] as string[] || []).map(r => normalizeRole(r));

        if (requiredRoles.length === 0) {
            return true;
        }

        const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

        if (hasRequiredRole) {
            return true;
        }

        await router.navigate(['/dashboard']);
        return false;

    } catch (error) {
        console.error('AuthGuard Error:', error);
        return false;
    }
};
