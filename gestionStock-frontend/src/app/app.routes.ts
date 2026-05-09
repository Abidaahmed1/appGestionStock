import { Routes } from '@angular/router';
import { UserListComponent } from './admin/components/user-list/user-list.component';
import { PieceListComponent } from './magasinier/components/piece-list/piece-list.component';
import { ProduitListComponent } from './magasinier/components/produit-list/produit-list.component';
import { CatalogueLayoutComponent } from './magasinier/components/catalogue-layout/catalogue-layout.component';
import { MainLayoutComponent } from './shared/layouts/main-layout/main-layout.component';
import { DashboardComponent } from './shared/components/dashboard/dashboard.component';
import { SettingsComponent } from './shared/components/settings/settings.component';
import { authGuard } from './auth/auth.guard';
import { StockManagementComponent } from './logistique/components/stock-management/stock-management.component';
import { BonListComponent } from './magasinier/components/bon-list/bon-list.component';
import { FournisseurListComponent } from './logistique/components/fournisseur-list/fournisseur-list.component';
import { canDeactivateGuard } from './shared/guards/can-deactivate.guard';

import { CommandeFournisseurListComponent } from './logistique/components/commande-fournisseur-list/commande-fournisseur-list.component';
import { PriceTrackingComponent } from './logistique/components/price-tracking/price-tracking.component';
import { SupplierCatalogComponent } from './logistique/components/supplier-catalog/supplier-catalog.component';
import { FournisseurDetailsComponent } from './logistique/components/fournisseur-details/fournisseur-details.component';
import { DocumentViewerComponent } from './shared/components/document-viewer/document-viewer.component';

export const routes: Routes = [
    {
        path: '',
        component: MainLayoutComponent,
        children: [
            {
                path: 'admin/settings',
                loadComponent: () => import('./admin/components/admin-settings/admin-settings.component').then(m => m.AdminSettingsComponent),
                canActivate: [authGuard],
                data: { roles: ['ADMINISTRATEUR'] }
            },
            {
                path: 'admin/users',
                component: UserListComponent,
                canActivate: [authGuard],
                data: { roles: ['ADMINISTRATEUR'] }
            },
            {
                path: 'magasinier/catalogue',
                component: CatalogueLayoutComponent,
                canActivate: [authGuard],
                data: { roles: ['MAGASINIER', 'RESPONSABLE_LOGISTIQUE', 'AUDITEUR', 'ADMINISTRATEUR'] }
            },
            {
                path: 'magasinier/pieces',
                component: PieceListComponent,
                canActivate: [authGuard],
                data: { roles: ['MAGASINIER', 'ADMINISTRATEUR'] }
            },
            {
                path: 'magasinier/produits',
                component: ProduitListComponent,
                canActivate: [authGuard],
                data: { roles: ['MAGASINIER', 'ADMINISTRATEUR'] }
            },
            {
                path: 'magasinier/stocks',
                component: StockManagementComponent,
                canActivate: [authGuard],
                data: { roles: ['MAGASINIER', 'RESPONSABLE_LOGISTIQUE', 'ADMINISTRATEUR', 'AUDITEUR'] }
            },
            {
                path: 'magasinier/bons',
                component: BonListComponent,
                canActivate: [authGuard],
                data: { roles: ['MAGASINIER', 'ADMINISTRATEUR', 'AUDITEUR'] }
            },
            {
                path: 'magasinier/bons/nouveau',
                loadComponent: () => import('./magasinier/components/bon-form/bon-form.component').then(m => m.BonFormComponent),
                canActivate: [authGuard],
                data: { roles: ['MAGASINIER', 'ADMINISTRATEUR'] }
            },
            {
                path: 'magasinier/bons/:id',
                loadComponent: () => import('./magasinier/components/bon-form/bon-form.component').then(m => m.BonFormComponent),
                canActivate: [authGuard],
                data: { roles: ['MAGASINIER', 'ADMINISTRATEUR', 'AUDITEUR'] }
            },
            {
                path: 'logistique/fournisseurs',
                component: FournisseurListComponent,
                canActivate: [authGuard],
                data: { roles: ['RESPONSABLE_LOGISTIQUE', 'ADMINISTRATEUR'] }
            },
            {
                path: 'logistique/fournisseurs/nouveau',
                component: FournisseurDetailsComponent,
                canActivate: [authGuard],
                data: { roles: ['RESPONSABLE_LOGISTIQUE', 'ADMINISTRATEUR'] }
            },
            {
                path: 'logistique/fournisseurs/:id',
                component: FournisseurDetailsComponent,
                canActivate: [authGuard],
                data: { roles: ['RESPONSABLE_LOGISTIQUE', 'ADMINISTRATEUR'] }
            },
            {
                path: 'logistique/fournisseurs/:id/catalog',
                component: SupplierCatalogComponent,
                canActivate: [authGuard],
                data: { roles: ['RESPONSABLE_LOGISTIQUE', 'ADMINISTRATEUR'] }
            },

            {
                path: 'logistique/commandes',
                component: CommandeFournisseurListComponent,
                canActivate: [authGuard],
                data: { roles: ['RESPONSABLE_LOGISTIQUE', 'AUDITEUR', 'ADMINISTRATEUR'] }
            },
            {
                path: 'logistique/commandes/nouvelle',
                loadComponent: () => import('./logistique/components/commande-fournisseur-form/commande-fournisseur-form.component').then(m => m.CommandeFournisseurFormComponent),
                canActivate: [authGuard],
                data: { roles: ['RESPONSABLE_LOGISTIQUE', 'ADMINISTRATEUR'] }
            },
            {
                path: 'logistique/commandes/:id',
                loadComponent: () => import('./logistique/components/commande-fournisseur-form/commande-fournisseur-form.component').then(m => m.CommandeFournisseurFormComponent),
                canActivate: [authGuard],
                data: { roles: ['RESPONSABLE_LOGISTIQUE', 'AUDITEUR', 'ADMINISTRATEUR'] }
            },

            {
                path: 'auditeur/gestion-audit',
                loadComponent: () => import('./auditeur/components/audit-hub/audit-hub.component').then(m => m.AuditHubComponent),
                canActivate: [authGuard],
                data: { roles: ['AUDITEUR', 'ADMINISTRATEUR'] }
            },
            {
                path: 'auditeur/bons',
                component: BonListComponent,
                canActivate: [authGuard],
                data: { roles: ['AUDITEUR', 'ADMINISTRATEUR'] }
            },
            {
                path: 'auditeur/bons/:id',
                loadComponent: () => import('./magasinier/components/bon-form/bon-form.component').then(m => m.BonFormComponent),
                canActivate: [authGuard],
                data: { roles: ['AUDITEUR', 'ADMINISTRATEUR'] }
            },
            {
                path: 'logistique/bons-history',
                loadComponent: () => import('./auditeur/bon-history/bon-history.component').then(m => m.BonHistoryComponent),
                canActivate: [authGuard],
                data: { roles: ['AUDITEUR', 'ADMINISTRATEUR'] }
            },
            {
                path: 'logistique/tracking',
                component: PriceTrackingComponent,
                canActivate: [authGuard],
                data: { roles: ['RESPONSABLE_LOGISTIQUE', 'ADMINISTRATEUR'] }
            },
            {
                path: 'admin/parametres',
                loadComponent: () => import('./admin/components/piece-configuration/piece-configuration.component').then(m => m.PieceConfigurationComponent),
                canActivate: [authGuard],
                data: { roles: ['ADMINISTRATEUR'] }
            },
            {
                path: 'admin/entreprise',
                loadComponent: () => import('./admin/components/entreprise-details/entreprise-details.component').then(m => m.EntrepriseDetailsComponent),
                canActivate: [authGuard],
                data: { roles: ['ADMINISTRATEUR'] }
            },
            {
                path: 'admin/entreprise/:id',
                loadComponent: () => import('./admin/components/entreprise-details/entreprise-details.component').then(m => m.EntrepriseDetailsComponent),
                canActivate: [authGuard],
                data: { roles: ['ADMINISTRATEUR'] }
            },
            {
                path: 'admin/numerotation',
                loadComponent: () => import('./admin/components/numerotation-gestion/numerotation-gestion.component').then(m => m.NumerotationGestionComponent),
                canActivate: [authGuard],
                canDeactivate: [canDeactivateGuard],
                data: { roles: ['ADMINISTRATEUR'] }
            },
            {
                path: 'admin/document-settings',
                loadComponent: () => import('./admin/components/document-configuration/document-configuration.component').then(m => m.DocumentConfigurationComponent),
                canActivate: [authGuard],
                data: { roles: ['ADMINISTRATEUR'] }
            },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            {
                path: 'dashboard',
                component: DashboardComponent
            },
            {
                path: 'settings',
                component: SettingsComponent,
                canActivate: [authGuard]
            },
            {
                path: 'document/preview/:id',
                component: DocumentViewerComponent,
                canActivate: [authGuard]
            }
        ]
    }
];
