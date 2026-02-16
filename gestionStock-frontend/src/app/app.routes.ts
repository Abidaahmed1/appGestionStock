import { Routes } from '@angular/router';
import { UserListComponent } from './admin/components/user-list/user-list.component';
import { PieceListComponent } from './magasinier/components/piece-list/piece-list.component';
import { ProduitListComponent } from './magasinier/components/produit-list/produit-list.component';
import { CatalogueLayoutComponent } from './magasinier/components/catalogue-layout/catalogue-layout.component';
import { MainLayoutComponent } from './shared/layouts/main-layout/main-layout.component';
import { DashboardComponent } from './shared/components/dashboard/dashboard.component';
import { SettingsComponent } from './shared/components/settings/settings.component';
import { authGuard } from './auth/auth.guard';

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
                data: { roles: ['MAGASINIER', 'ADMINISTRATEUR'] }
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
