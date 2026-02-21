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

import { CommandeFournisseurListComponent } from './logistique/components/commande-fournisseur-list/commande-fournisseur-list.component';
import { PriceTrackingComponent } from './logistique/components/price-tracking/price-tracking.component';
import { SupplierCatalogComponent } from './logistique/components/supplier-catalog/supplier-catalog.component';
import { FournisseurDetailsComponent } from './logistique/components/fournisseur-details/fournisseur-details.component';

export const routes: Routes = [
    {
        path: '',
        component: MainLayoutComponent,
        children: [
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
                data: { roles: ['MAGASINIER'] }
            },
            {
                path: 'magasinier/pieces',
                component: PieceListComponent,
                canActivate: [authGuard],
                data: { roles: ['MAGASINIER'] }
            },
            {
                path: 'magasinier/produits',
                component: ProduitListComponent,
                canActivate: [authGuard],
                data: { roles: ['MAGASINIER'] }
            },
            {
                path: 'magasinier/stocks',
                component: StockManagementComponent,
                canActivate: [authGuard],
                data: { roles: ['MAGASINIER'] }
            },
            {
                path: 'magasinier/bons',
                component: BonListComponent,
                canActivate: [authGuard],
                data: { roles: ['MAGASINIER'] }
            },
            {
                path: 'logistique/fournisseurs',
                component: FournisseurListComponent,
                canActivate: [authGuard],
                data: { roles: ['RESPONSABLE_LOGISTIQUE'] }
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
                data: { roles: ['RESPONSABLE_LOGISTIQUE'] }
            },

            {
                path: 'logistique/commandes',
                component: CommandeFournisseurListComponent,
                canActivate: [authGuard],
                data: { roles: ['RESPONSABLE_LOGISTIQUE'] }
            },
            {
                path: 'logistique/commandes/nouvelle',
                loadComponent: () => import('./logistique/components/commande-fournisseur-form/commande-fournisseur-form.component').then(m => m.CommandeFournisseurFormComponent),
                canActivate: [authGuard],
                data: { roles: ['RESPONSABLE_LOGISTIQUE'] }
            },
            {
                path: 'logistique/commandes/:id',
                loadComponent: () => import('./logistique/components/commande-fournisseur-form/commande-fournisseur-form.component').then(m => m.CommandeFournisseurFormComponent),
                canActivate: [authGuard],
                data: { roles: ['RESPONSABLE_LOGISTIQUE'] }
            },
            {
                path: 'logistique/tracking',
                component: PriceTrackingComponent,
                canActivate: [authGuard],
                data: { roles: ['RESPONSABLE_LOGISTIQUE'] }
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
            }
        ]
    }
];
