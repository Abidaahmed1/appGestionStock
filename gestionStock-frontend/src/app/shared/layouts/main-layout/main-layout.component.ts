import { Component, OnInit, inject, signal, PLATFORM_ID, Inject, NgZone } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';

import { NotificationsComponent } from '../../components/notifications/notifications.component';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { Entreprise } from '../../../admin/models/entreprise.model';
import { UserService } from '../../services/user.service';

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
    private userService = inject(UserService);
    private ngZone = inject(NgZone);

    username = signal('');
    roles = signal<string[]>([]);
    entreprise = signal<Entreprise | null>(null);
    expandedSections = signal<Set<string>>(new Set());
    currentTime = signal('');
    currentDate = signal('');

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
        this.updateTime();
        if (isPlatformBrowser(this.platformId)) {
            this.ngZone.runOutsideAngular(() => {
                setInterval(() => {
                    this.ngZone.run(() => this.updateTime());
                }, 1000);
            });
            this.initializeTheme();
        }
    }

    private initializeTheme() {
        // Initial load from DB
        this.userService.getCurrentUser().subscribe({
            next: (user) => {
                if (user) {
                    this.applyTheme({ theme: user.theme, accentColor: user.accentColor });
                }
            }
        });

        // Listen for updates
        this.userService.userSettings$.subscribe(settings => {
            this.applyTheme(settings);
        });
    }

    private applyTheme(settings: { theme: string; accentColor: string }) {
        if (!isPlatformBrowser(this.platformId)) return;

        const root = document.documentElement;
        const body = document.body;

        // Apply theme class
        body.classList.toggle('dark-theme', settings.theme === 'dark');

        // Apply accent color variables
        const colors: { [key: string]: { main: string, hover: string, light: string, active: string, entree: string, sortie: string, retour: string } } = {
            'teal': {
                main: '#0d9488', hover: '#0f766e', light: 'rgba(13, 148, 136, 0.1)', active: 'rgba(13, 148, 136, 0.12)',
                entree: '#10b981', sortie: '#3b82f6', retour: '#f59e0b'
            },
            'lime': {
                main: '#98c01d', hover: '#86ab1a', light: 'rgba(152, 192, 29, 0.1)', active: 'rgba(152, 192, 29, 0.15)',
                entree: '#98c01d', sortie: '#0d9488', retour: '#f59e0b'
            },
            'blue': {
                main: '#2563eb', hover: '#1d4ed8', light: 'rgba(37, 99, 235, 0.1)', active: 'rgba(37, 99, 235, 0.15)',
                entree: '#10b981', sortie: '#3b82f6', retour: '#d97706'
            },
            'indigo': {
                main: '#4f46e5', hover: '#4338ca', light: 'rgba(79, 70, 229, 0.1)', active: 'rgba(79, 70, 229, 0.15)',
                entree: '#0d9488', sortie: '#4f46e5', retour: '#f43f5e'
            },
            'amber': {
                main: '#d97706', hover: '#b45309', light: 'rgba(217, 119, 6, 0.1)', active: 'rgba(217, 119, 6, 0.15)',
                entree: '#10b981', sortie: '#f97316', retour: '#d97706'
            },
            'rose': {
                main: '#f43f5e', hover: '#e11d48', light: 'rgba(244, 63, 94, 0.1)', active: 'rgba(244, 63, 94, 0.15)',
                entree: '#4f46e5', sortie: '#f43f5e', retour: '#f97316'
            }
        };

        const themeColors = colors[settings.accentColor] || colors['teal'];

        // Helper to convert hex to rgba
        const hexToRgba = (hex: string, alpha: number) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        root.style.setProperty('--primary', themeColors.main);
        root.style.setProperty('--primary-hover', themeColors.hover);
        root.style.setProperty('--primary-light', themeColors.light);
        root.style.setProperty('--active-item-bg', themeColors.active);
        root.style.setProperty('--teal-600', themeColors.main);

        root.style.setProperty('--status-entree-text', themeColors.entree);
        root.style.setProperty('--status-entree-bg', hexToRgba(themeColors.entree, 0.1));
        root.style.setProperty('--status-sortie-text', themeColors.sortie);
        root.style.setProperty('--status-sortie-bg', hexToRgba(themeColors.sortie, 0.1));
        root.style.setProperty('--status-retour-text', themeColors.retour);
        root.style.setProperty('--status-retour-bg', hexToRgba(themeColors.retour, 0.1));
    }

    private updateTime() {
        const now = new Date();
        this.currentTime.set(now.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }));

        const options: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        };

        let dateStr = now.toLocaleDateString('fr-FR', options);
        if (dateStr) {
            dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
        }
        this.currentDate.set(dateStr);
    }

    getNavigationMenu() {
        const menu: any[] = [];
        const roles = this.roles();
        const isAdmin = this.hasRole('ROLE_ADMINISTRATEUR');

        menu.push({
            title: null,
            icon: 'dashboard',
            items: [
                { label: 'Tableau de bord', link: '/', icon: 'dashboard', exact: true }
            ]
        });

        if (this.hasRole('ROLE_RESPONSABLE_LOGISTIQUE') || isAdmin) {
            const logistiqueItems = [
                { label: 'Fournisseurs', link: '/logistique/fournisseurs', icon: 'users' },
                { label: 'Commandes', link: '/logistique/commandes', icon: 'shopping-bag' },
                { label: 'Suivi des prix', link: '/logistique/tracking', icon: 'trending-up' }
            ];

            if (!isAdmin) {
                logistiqueItems.splice(1, 0, { label: 'Catalogue', link: '/magasinier/catalogue', icon: 'grid' });
            }

            menu.push({
                title: 'GESTION LOGISTIQUE',
                icon: 'logistique',
                items: logistiqueItems
            });
        }

        if (this.hasRole('ROLE_MAGASINIER') || isAdmin) {
            menu.push({
                title: 'CATALOGUE',
                icon: 'catalogue',
                items: [
                    { label: 'Catalogue Général', link: '/magasinier/catalogue', icon: 'grid' },
                    { label: 'Produits finis', link: '/magasinier/produits', icon: 'package' },
                    { label: 'Pièces détachées', link: '/magasinier/pieces', icon: 'puzzle' },
                    { label: 'Gestion Bons', link: '/magasinier/bons', icon: 'file-text' }
                ]
            });
        }

        if (this.hasRole('ROLE_AUDITEUR') || isAdmin) {
            menu.push({
                title: 'AUDIT & CONTRÔLE',
                icon: 'audit',
                items: [
                    { label: 'Gestion Audit', link: '/auditeur/gestion-audit', icon: 'file-text' }
                ]
            });

            const auditSection = menu[menu.length - 1];
            if (this.hasRole('ROLE_AUDITEUR')) {
                if (!isAdmin) {
                    auditSection.items.push({ label: 'Catalogue Général', link: '/magasinier/catalogue', icon: 'grid' });
                }
                auditSection.items.push({ label: 'Commandes', link: '/logistique/commandes', icon: 'shopping-bag' });
                auditSection.items.push({ label: ' mouvements stocks', link: '/auditeur/bons', icon: 'file-text' });
            }
        }

        if (isAdmin) {
            menu.push({
                title: 'ADMINISTRATION',
                icon: 'admin',
                items: [
                    { label: 'Configuration Système', link: '/admin/settings', icon: 'settings' }
                ]
            });
        }

        return menu;
    }

    private loadEntreprise() {
        // Souscription aux changements d'entreprise en temps rÃ©el
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
        const userRoles = this.roles();
        if (!userRoles || userRoles.length === 0) return false;
        const normalize = (r: string) => (r || '').toUpperCase().replace('ROLE_', '').replace(/\s+/g, '_');
        const targetRole = normalize(role);
        return userRoles.some(r => normalize(r) === targetRole);
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
