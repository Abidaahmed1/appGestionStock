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
    expandedSections = signal<Set<string>>(new Set());

    toggleSection(title: string | null) {
        if (!title) return;
        const current = new Set(this.expandedSections());
        if (current.has(title)) {
            current.delete(title);
        } else {
            current.add(title);
        }
        this.expandedSections.set(current);
    }

    isSectionExpanded(title: string | null): boolean {
        if (!title) return true;
        return this.expandedSections().has(title);
    }

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
        const roles = this.roles();
        const isAdmin = this.hasRole('ROLE_ADMINISTRATEUR');
        
        // 0. Dashboard - For everyone
        menu.push({
            title: null,
            icon: 'dashboard',
            items: [
                { label: 'Tableau de bord', link: '/', icon: 'dashboard', exact: true }
            ]
        });

        // 1. Logistique - Logistique + Admin
        if (this.hasRole('ROLE_RESPONSABLE_LOGISTIQUE') || isAdmin) {
            menu.push({
                title: 'GESTION LOGISTIQUE',
                icon: 'logistique',
                items: [
                    { label: 'Fournisseurs', link: '/logistique/fournisseurs', icon: 'users' },
                    { label: 'Commandes', link: '/logistique/commandes', icon: 'shopping-bag' },
                    { label: 'Suivi des prix', link: '/logistique/tracking', icon: 'trending-up' }
                ]
            });
        }

        // 2. Catalogue & Stocks - Magasinier + Admin
        if (this.hasRole('ROLE_MAGASINIER') || isAdmin) {
            menu.push({
                title: 'CATALOGUE & STOCKS',
                icon: 'catalogue',
                items: [
                    { label: 'Catalogue Général', link: '/magasinier/catalogue', icon: 'grid' },
                    { label: 'Produits finis', link: '/magasinier/produits', icon: 'package' },
                    { label: 'Pièces détachées', link: '/magasinier/pieces', icon: 'puzzle' },
                    { label: 'Gestion Stocks', link: '/magasinier/stocks', icon: 'rotate-ccw' },
                    { label: 'Gestion Bons', link: '/magasinier/bons', icon: 'file-text' }
                ]
            });
        }

        // 3. Audit - Auditeur + Admin
        if (this.hasRole('ROLE_AUDITEUR') || isAdmin) {
            menu.push({
                title: 'AUDIT & CONTRÔLE',
                icon: 'audit',
                items: [
                    { label: 'Archives Bons', link: '/logistique/bons-history', icon: 'history' }
                ]
            });
            
            // If it's JUST an auditor, they might need these links here
            if (this.hasRole('ROLE_AUDITEUR') && !isAdmin && !this.hasRole('ROLE_RESPONSABLE_LOGISTIQUE')) {
                 const auditItems = menu[menu.length-1].items;
                 auditItems.push({ label: 'Commandes', link: '/logistique/commandes', icon: 'shopping-bag' });
                 auditItems.push({ label: 'Catalogue Général', link: '/magasinier/catalogue', icon: 'grid' });
            }
        }

        // 4. Administration - Admin Only
        if (isAdmin) {
            menu.push({
                title: 'ADMINISTRATION',
                icon: 'admin',
                items: [
                    { label: 'Configuration Système', link: '/admin/settings', icon: 'settings' },
                    { label: 'Gestion Utilisateurs', link: '/admin/users', icon: 'users-gear' }
                ]
            });
        }

        return menu;
    }

    private loadEntreprise() {
        // Souscription aux changements d'entreprise en temps réel
        this.entrepriseService.currentEntreprise$.subscribe(data => {
            if (data) {
                this.entreprise.set(data);
            }
        });

        // Lancement du chargement initial
        this.entrepriseService.getCurrentEntreprise().subscribe({
            error: (err: any) => console.error('Erreur chargement entreprise initiale:', err)
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

    isAdminUser(): boolean {
        return this.hasRole('ROLE_ADMINISTRATEUR');
    }

    isHomePage(): boolean {
        return this.router.url === '/' || this.router.url === '/dashboard';
    }

    logout() {
        this.keycloak.logout(window.location.origin);
    }
}
