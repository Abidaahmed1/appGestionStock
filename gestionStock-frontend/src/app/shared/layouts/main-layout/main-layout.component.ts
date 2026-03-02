import { Component, OnInit, inject, signal, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';

import { NotificationsComponent } from '../../components/notifications/notifications.component';

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, NotificationsComponent],
    templateUrl: './main-layout.component.html',
    styleUrls: ['./main-layout.component.css']
})
export class MainLayoutComponent implements OnInit {
    private keycloak = inject(KeycloakService);
    private router = inject(Router);
    private platformId = inject(PLATFORM_ID);

    username = signal('');
    roles = signal<string[]>([]);

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            const keycloakInstance = this.keycloak.getKeycloakInstance();
            if (keycloakInstance && keycloakInstance.authenticated) {
                const token = keycloakInstance.tokenParsed;
                if (token) {
                    this.username.set(token['preferred_username'] || token['name'] || '');
                }
                this.roles.set(this.keycloak.getUserRoles());
            }
        }
    }

    hasRole(role: string): boolean {
        const normalize = (r: string) => r.toUpperCase().replace('ROLE_', '').replace(/\s+/g, '_');
        const targetRole = normalize(role);
        return this.roles().some(r => normalize(r) === targetRole);
    }

    getDisplayRole(): string {
        const userRoles = this.roles();
        const businessRolesMapping: { [key: string]: string } = {
            'ADMINISTRATEUR': 'Administrateur',
            'RESPONSABLE_LOGISTIQUE': 'Responsable Logistique',
            'AUDITEUR': 'Auditeur',
            'MAGASINIER': 'Magasinier'
        };

        for (const role of userRoles) {
            const cleanRole = role.toUpperCase().replace('ROLE_', '').replace(/\s+/g, '_');
            if (businessRolesMapping[cleanRole]) {
                return businessRolesMapping[cleanRole];
            }
        }

        const technicalRoles = [
            'manage-account', 'view-profile', 'manage-account-links',
            'offline_access', 'uma_authorization', 'default-roles'
        ];

        const filteredRoles = userRoles.filter(role => {
            const lowRole = role.toLowerCase();
            return !technicalRoles.some(t => lowRole.includes(t));
        });

        if (filteredRoles.length > 0) {
            return filteredRoles[0].replace('ROLE_', '');
        }

        return 'Utilisateur';
    }

    isHomePage(): boolean {
        return this.router.url === '/' || this.router.url === '/dashboard';
    }

    logout() {
        this.keycloak.logout(window.location.origin);
    }
}
