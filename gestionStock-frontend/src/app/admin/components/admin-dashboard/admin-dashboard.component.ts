import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';

interface AppModule {
    id: string;
    name: string;
    icon: string;
    route: string;
    color: string;
    roles: string[];
}

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './admin-dashboard.component.html',
    styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
    private keycloak = inject(KeycloakService);
    userRoles: string[] = [];

    modules: AppModule[] = [
        {
            id: 'users',
            name: 'Utilisateurs',
            icon: 'users',
            route: '/admin/users',
            color: '#3d7a7f',
            roles: ['ADMINISTRATEUR']
        },
        {
            id: 'catalog',
            name: 'Catalogue',
            icon: 'book-open',
            route: '/magasinier/catalogue',
            color: '#3d7a7f',
            roles: ['ADMINISTRATEUR', 'MAGASINIER', 'RESPONSABLE_LOGISTIQUE']
        },
        {
            id: 'pieces',
            name: 'Pièces Détachées',
            icon: 'box',
            route: '/magasinier/pieces',
            color: '#3d7a7f',
            roles: ['ADMINISTRATEUR', 'MAGASINIER']
        },
        {
            id: 'produits',
            name: 'Produits Finis',
            icon: 'package',
            route: '/magasinier/produits',
            color: '#3d7a7f',
            roles: ['ADMINISTRATEUR', 'MAGASINIER']
        },
        {
            id: 'stock',
            name: 'Inventaire',
            icon: 'clipboard-list',
            route: '/magasinier/stocks',
            color: '#3d7a7f',
            roles: ['ADMINISTRATEUR', 'MAGASINIER', 'RESPONSABLE_LOGISTIQUE']
        },
        {
            id: 'bons',
            name: 'Bons & Flux',
            icon: 'file-text',
            route: '/magasinier/bons',
            color: '#3d7a7f',
            roles: ['ADMINISTRATEUR', 'MAGASINIER']
        },
        {
            id: 'suppliers',
            name: 'Fournisseurs',
            icon: 'truck',
            route: '/logistique/fournisseurs',
            color: '#3d7a7f',
            roles: ['ADMINISTRATEUR', 'RESPONSABLE_LOGISTIQUE']
        },
        {
            id: 'commands',
            name: 'Commandes',
            icon: 'shopping-cart',
            route: '/logistique/commandes',
            color: '#3d7a7f',
            roles: ['ADMINISTRATEUR', 'RESPONSABLE_LOGISTIQUE']
        },
        {
            id: 'tracking',
            name: 'Suivi Prix',
            icon: 'trending-up',
            route: '/logistique/tracking',
            color: '#3d7a7f',
            roles: ['ADMINISTRATEUR', 'RESPONSABLE_LOGISTIQUE']
        },
        {
            id: 'parametres',
            name: 'Champs Personnalisés',
            icon: 'settings-2',
            route: '/admin/parametres',
            color: '#3d7a7f',
            roles: ['ADMINISTRATEUR']
        },
        {
            id: 'entreprise',
            name: 'Entreprise',
            icon: 'building-2',
            route: '/admin/entreprise',
            color: '#3d7a7f',
            roles: ['ADMINISTRATEUR']
        },
        {
            id: 'settings',
            name: 'Paramètres Système',
            icon: 'settings',
            route: '/admin/settings',
            color: '#3d7a7f',
            roles: ['ADMINISTRATEUR']
        }
    ];

    ngOnInit() {
        this.userRoles = this.keycloak.getUserRoles();
    }

    get filteredModules() {
        return this.modules.filter(m =>
            m.roles.some(role => this.hasRole(role))
        );
    }

    private hasRole(role: string): boolean {
        const normalize = (r: string) => r.toUpperCase().replace('ROLE_', '').replace(/\s+/g, '_');
        const targetRole = normalize(role);
        return this.userRoles.some(r => normalize(r) === targetRole);
    }
}
