import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  
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

  { path: 'admin/entreprise', renderMode: RenderMode.Client },
  { path: 'admin/entreprise/:id', renderMode: RenderMode.Client },
  { path: 'admin/settings', renderMode: RenderMode.Client },
  { path: 'admin/users', renderMode: RenderMode.Client },
  { path: 'admin/parametres', renderMode: RenderMode.Client },
  { path: 'admin/numerotation', renderMode: RenderMode.Client },
  { path: 'admin/document-settings', renderMode: RenderMode.Client },

  { path: 'dashboard', renderMode: RenderMode.Server },
  { path: 'settings', renderMode: RenderMode.Server },
  { path: '', renderMode: RenderMode.Server },

  {
    path: '**',
    renderMode: RenderMode.Server
  }
];
