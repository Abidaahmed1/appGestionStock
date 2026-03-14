import { Component, OnInit, inject, signal, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';

import { NotificationsComponent } from '../../components/notifications/notifications.component';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { Entreprise } from '../../../admin/models/entreprise.model';

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
    private entrepriseService = inject(EntrepriseService);

    username = signal('');
    roles = signal<string[]>([]);
    entreprise = signal<Entreprise | null>(null);

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            const keycloakInstance = this.keycloak.getKeycloakInstance();
            if (keycloakInstance && keycloakInstance.authenticated) {
                const token = keycloakInstance.tokenParsed;
                if (token) {
                    const firstName = token['given_name'] || '';
                    const lastName = token['family_name'] || '';
                    const fullName = `${firstName} ${lastName}`.trim();
                    this.username.set(fullName || token['preferred_username'] || token['name'] || '');
                }
                this.roles.set(this.keycloak.getUserRoles());
                this.loadEntreprise();
            }
        }
    }

    getNavigationMenu() {
        const menu: any[] = [];
        
        // Dashboard is for everyone
        menu.push({
            title: null,
            items: [
                { label: 'Tableau de bord', link: '/', icon: 'dashboard', exact: true }
            ]
        });

        const roles = this.roles();

        // 1. Logistique Role - Their primary section
        if (this.hasRole('ROLE_RESPONSABLE_LOGISTIQUE')) {
            menu.push({
                title: 'GESTION LOGISTIQUE',
                items: [
                    { label: 'Fournisseurs', link: '/logistique/fournisseurs', icon: 'users' },
                    { label: 'Commandes', link: '/logistique/commandes', icon: 'shopping-bag' },
                    { label: 'Suivi des prix', link: '/logistique/tracking', icon: 'trending-up' }
                ]
            });
            // Responsable Logistique sees limited Catalogue
            menu.push({
                title: 'CATALOGUE',
                items: [
                    { label: 'Catalogue Général', link: '/magasinier/catalogue', icon: 'grid' }
                ]
            });
        }

        // 2. Magasinier Role - Their primary section
        else if (this.hasRole('ROLE_MAGASINIER')) {
            menu.push({
                title: 'CATALOGUE & STOCKS',
                items: [
                    { label: 'Catalogue Général', link: '/magasinier/catalogue', icon: 'grid' },
                    { label: 'Produits finis', link: '/magasinier/produits', icon: 'package' },
                    { label: 'Pièces détachées', link: '/magasinier/pieces', icon: 'puzzle' },
                    { label: 'Gestion Stocks', link: '/magasinier/stocks', icon: 'rotate-ccw' },
                    { label: 'Gestion Bons', link: '/magasinier/bons', icon: 'file-text' }
                ]
            });
        }

        // 3. Auditeur Role
        else if (this.hasRole('ROLE_AUDITEUR')) {
            menu.push({
                title: 'AUDIT & CONTRÔLE',
                items: [
                    { label: 'Commandes', link: '/logistique/commandes', icon: 'shopping-bag' },
                    { label: 'Archives Bons', link: '/logistique/bons-history', icon: 'history' },
                    { label: 'Catalogue', link: '/magasinier/catalogue', icon: 'grid' },
                    { label: 'Consultation Bons', link: '/magasinier/bons', icon: 'file-text' }
                ]
            });
        }

        // 4. Admin Role
        if (this.hasRole('ROLE_ADMINISTRATEUR')) {
            menu.push({
                title: 'ADMINISTRATION',
                items: [
                    { label: 'Configuration Système', link: '/admin/settings', icon: 'settings' },
                    { label: 'Gestion Utilisateurs', link: '/admin/users', icon: 'users-gear' }
                ]
            });
        }

        return menu;
    }

    private loadEntreprise() {
        this.entrepriseService.getCurrentEntreprise().subscribe({
            next: (data: Entreprise) => this.entreprise.set(data),
            error: (err: any) => console.error('Erreur chargement entreprise:', err)
        });
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
