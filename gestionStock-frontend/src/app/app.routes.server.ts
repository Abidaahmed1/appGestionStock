import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Explicitly setting problematic groups to Server to resolve Angular SSR build conflicts.
  // Routes sharing segments must have consistent render modes.
  
  { path: 'magasinier/bons', renderMode: RenderMode.Server },
  { path: 'magasinier/bons/nouveau', renderMode: RenderMode.Server },
  { path: 'magasinier/bons/:id', renderMode: RenderMode.Server },
  
  { path: 'magasinier/pieces', renderMode: RenderMode.Server },
  { path: 'magasinier/produits', renderMode: RenderMode.Server },
  { path: 'magasinier/stocks', renderMode: RenderMode.Server },
  { path: 'magasinier/catalogue', renderMode: RenderMode.Server },

  { path: 'logistique/fournisseurs', renderMode: RenderMode.Server },
  { path: 'logistique/fournisseurs/nouveau', renderMode: RenderMode.Server },
  { path: 'logistique/fournisseurs/:id', renderMode: RenderMode.Server },
  { path: 'logistique/fournisseurs/:id/catalog', renderMode: RenderMode.Server },
  
  { path: 'logistique/commandes', renderMode: RenderMode.Server },
  { path: 'logistique/commandes/nouvelle', renderMode: RenderMode.Server },
  { path: 'logistique/commandes/:id', renderMode: RenderMode.Server },
  { path: 'logistique/tracking', renderMode: RenderMode.Server },
  { path: 'logistique/bons-history', renderMode: RenderMode.Server },

  { path: 'admin/entreprise', renderMode: RenderMode.Server },
  { path: 'admin/entreprise/:id', renderMode: RenderMode.Server },
  { path: 'admin/settings', renderMode: RenderMode.Server },
  { path: 'admin/users', renderMode: RenderMode.Server },
  { path: 'admin/parametres', renderMode: RenderMode.Server },
  { path: 'admin/numerotation', renderMode: RenderMode.Server },

  { path: 'dashboard', renderMode: RenderMode.Server },
  { path: 'settings', renderMode: RenderMode.Server },
  { path: '', renderMode: RenderMode.Server },

  {
    path: '**',
    renderMode: RenderMode.Server
  }
];
