import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LogistiqueService } from '../../services/logistique.service';
import { PieceFournisseur, Fournisseur } from '../../models/logistique.models';
import { PieceDetachee } from '../../../magasinier/models/magasinier.models';
import { MagasinierService } from '../../../magasinier/services/magasinier.service';
import { forkJoin, Subject, Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { Entreprise } from '../../../admin/models/entreprise.model';
import { DocumentConfigService, DocumentType } from '../../../admin/services/document-config.service';

@Component({
    selector: 'app-supplier-catalog',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './supplier-catalog.component.html',
    styleUrl: './supplier-catalog.component.css'
})
export class SupplierCatalogComponent implements OnInit, OnChanges, OnDestroy {
    @Input() supplier: Fournisseur | undefined;
    @Input() isEmbedded: boolean = false;

    catalogItems: any[] = [];
    allPieces: any[] = [];
    searchTerm: string = '';
    showResults: boolean = false;
    filteredPiecesList: any[] = [];
    private searchSubject = new Subject<string>();
    private destroy$ = new Subject<void>();
    catalogFilterTerm: string = '';

    validationErrors: { piece?: string; prix?: string; dates?: string, tauxRemise?: string, nbJoursLivraison?: string } = {};
    notification: { message: string; type: 'success' | 'error' } | null = null;


    pendingItems: any[] = [];
    deletedIds: number[] = [];
    hasChanges: boolean = false;
    entreprise: Entreprise | null = null;

    editingIndex: number | null = null;
    visibleVarianteIds: number[] = [];

    newEntry: any = {
        piece: null,
        prixAchat: 0,
        qteMinACommander: 1,
        tauxRemise: 0,
        nbJoursLivraison: 0,
        estPrincipale: false,
        dateDebutValidite: '',
        dateFinValidite: ''
    };

    private logistiqueService = inject(LogistiqueService);
    private magasinierService = inject(MagasinierService);
    private entrepriseService = inject(EntrepriseService);
    private platformId = inject(PLATFORM_ID);
    private cdr = inject(ChangeDetectorRef);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private docConfigService = inject(DocumentConfigService);

    get currencySymbol(): string {
        return this.entrepriseService.getDeviseSymbol(this.entreprise);
    }

    constructor() {
        this.searchSubject.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe(term => {
            this.applyPieceFilter(term);
        });
    }

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.loadDisplaySettings();
            if (!this.isEmbedded) {
                const id = this.route.snapshot.params['id'];
                if (id) {
                    this.loadSupplier(Number(id));
                    this.loadEntreprise();
                }
            } else {
                this.loadPieces();
                this.loadEntreprise();
                if (this.supplier?.id) {
                    this.loadCatalog();
                }
            }
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (isPlatformBrowser(this.platformId)) {
            if (this.isEmbedded && changes['supplier']) {
                this.loadPieces();
                if (this.supplier?.id) {
                    this.loadCatalog();
                }
            }
        }
    }

    loadSupplier(id: number) {
        this.logistiqueService.getFournisseurById(id).subscribe({
            next: (data) => {
                this.supplier = data;
                this.loadCatalog();
                this.loadPieces();
            }
        });
    }

    loadCatalog() {
        const id = this.supplier?.id;
        if (!id) return;
        this.logistiqueService.getPieceFournisseursByFournisseur(id).subscribe({
            next: (data: any[]) => {
                this.catalogItems = data;
                this.pendingItems = data.map(item => ({
                    ...item,
                    _isNew: false,
                    _isModified: false,
                    dateDebutValidite: item.dateDebutValidite ? item.dateDebutValidite.substring(0, 10) : '',
                    dateFinValidite: item.dateFinValidite ? item.dateFinValidite.substring(0, 10) : ''
                }));
                this.deletedIds = [];
                this.hasChanges = false;
                if (isPlatformBrowser(this.platformId)) {
                    this.cdr.detectChanges();
                }
            }
        });
    }

    loadPieces() {
        this.magasinierService.getPieces().subscribe({
            next: (data: any[]) => {
                this.allPieces = data;
                this.filteredPiecesList = [...this.allPieces].slice(0, 50); // Initial view
                if (isPlatformBrowser(this.platformId)) {
                    this.cdr.detectChanges();
                }
            }
        });
    }

    onSearchTermChange(term: string) {
        this.searchSubject.next(term);
    }

    applyPieceFilter(term: string) {
        if (!term || term.length < 1) {
            this.filteredPiecesList = [...this.allPieces].slice(0, 50);
            this.cdr.detectChanges();
            return;
        }

        const lowerTerm = term.toLowerCase();
        const results = this.allPieces.filter(p => {
            const designation = (p.designation || '').toLowerCase();
            const reference = (p.reference || '').toLowerCase();
            const barcode = (p.details?.[0]?.codeBarre || '').toLowerCase();

            if (designation.includes(lowerTerm) || reference.includes(lowerTerm) || barcode.includes(lowerTerm)) {
                return true;
            }

            return p.details?.some((d: any) => {
                const attrLabel = this.getVariantLabel(d).toLowerCase();
                return attrLabel.includes(lowerTerm) || (d.codeBarre || '').toLowerCase().includes(lowerTerm);
            }) ?? false;
        });

        this.filteredPiecesList = results.slice(0, 50); // Limit to top 50 for extra performance
        this.cdr.detectChanges();
    }

    loadEntreprise() {
        this.entrepriseService.getCurrentEntreprise().subscribe({
            next: (data) => {
                this.entreprise = data;
                this.cdr.detectChanges();
            },
            error: () => {
                // Fallback: prendre la première entreprise si /current n'est pas disponible
                this.entrepriseService.getAllEntreprises().subscribe({
                    next: (list) => {
                        if (list && list.length > 0) {
                            this.entreprise = list[0];
                            this.cdr.detectChanges();
                        }
                    }
                });
            }
        });
    }

    loadDisplaySettings() {
        // On prend la config BON_ENTREE par défaut pour le catalogue
        this.docConfigService.getSettingByType(DocumentType.BON_ENTREE).subscribe({
            next: (setting) => {
                this.visibleVarianteIds = setting.visibleVarianteIds || [];
                this.cdr.detectChanges();
            }
        });
    }

    // Optimized away: getter replaced by filteredPiecesList and applyPieceFilter
    // get filteredPieces() { ... }

    getVariantLabel(detail: any): string {
        if (!detail || !detail.valeursParametres) return '';
        return (detail.valeursParametres || [])
            .filter((vp: any) => vp.parametre?.variante && vp.valeur)
            .map((vp: any) => vp.valeur)
            .join(' - ');
    }

    getVariantAttributes(detail: any): string[] {
        if (!detail || !detail.valeursParametres) return [];
        return (detail.valeursParametres || [])
            .filter((vp: any) => vp.valeur)
            .map((vp: any) => `${vp.parametre?.nom || 'Attribut'}: ${vp.valeur}`);
    }

    getPieceDisplayCode(p: any): string {
        return p.details?.[0]?.codeBarre || p.reference || '-';
    }

    get filteredCatalogItems() {
        if (!this.catalogFilterTerm) return this.pendingItems;
        const term = this.catalogFilterTerm.toLowerCase();
        return this.pendingItems.filter(item =>
            item.piece?.designation?.toLowerCase().includes(term) ||
            (item.piece?.details?.some((d: any) => (d.codeBarre || '').toLowerCase().includes(term)) ?? false)
        );
    }

    getPrincipalCount(): number {
        return this.pendingItems.filter(item => item.estPrincipale).length;
    }

    selectPiece(piece: any) {
        this.newEntry.piece = piece;
        const code = this.getPieceDisplayCode(piece);
        const variant = this.getVariantLabel(piece.details?.[0]);
        const suffix = variant ? ` (${variant})` : '';
        this.searchTerm = `[${code}] ${piece.designation}${suffix}`;
        this.showResults = false;
        if (isPlatformBrowser(this.platformId)) {
            this.cdr.detectChanges();
        }
    }

    toggleResults(show: boolean) {
        if (isPlatformBrowser(this.platformId)) {
            setTimeout(() => {
                this.showResults = show;
                this.cdr.detectChanges();
            }, 200);
        } else {
            this.showResults = show;
        }
    }

    validateEntry(entry: any = this.newEntry): boolean {
        this.validationErrors = {};
        const errors: string[] = [];

        if (!entry.piece) {
            this.validationErrors.piece = 'piece';
            errors.push('Veuillez sélectionner un article');
        }

        if (!entry.prixAchat || entry.prixAchat <= 0) {
            this.validationErrors.prix = 'prix';
            errors.push('Le prix unitaire doit être supérieur à 0');
        }

        if (entry.tauxRemise < 0) {
            this.validationErrors.tauxRemise = 'tauxRemise';
            errors.push('Le taux de remise doit être supérieur à 0');
        }

        if (entry.nbJoursLivraison < 0) {
            this.validationErrors.nbJoursLivraison = 'nbJoursLivraison';
            errors.push('Le délai de livraison ne peut pas être négatif');
        }

        if (entry.dateDebutValidite && entry.dateFinValidite) {
            if (entry.dateDebutValidite > entry.dateFinValidite) {
                this.validationErrors.dates = 'dates';
                errors.push('La date de début ne peut pas dépasser la date de fin');
            }
        }

        if (errors.length > 0) {
            this.notify(errors.join(' \u2022 '), 'error');
            return false;
        }

        return true;
    }


    addToLocalList() {
        if (!this.validateEntry()) return;

        const localItem = {
            ...this.newEntry,
            _isNew: true,
            _isModified: false
        };

        this.pendingItems.push(localItem);
        this.hasChanges = true;
        this.resetNewEntry();
        if (isPlatformBrowser(this.platformId)) {
            this.cdr.detectChanges();
        }
    }

    removeFromLocalList(index: number) {
        const item = this.pendingItems[index];
        if (item.id) {
            this.deletedIds.push(item.id);
        }
        this.pendingItems.splice(index, 1);
        this.hasChanges = true;

        if (this.editingIndex === index) {
            this.editingIndex = null;
        } else if (this.editingIndex !== null && this.editingIndex > index) {
            this.editingIndex--;
        }

        if (isPlatformBrowser(this.platformId)) {
            this.cdr.detectChanges();
        }
    }
    startEditing(index: number) {
        this.editingIndex = index;
        if (isPlatformBrowser(this.platformId)) {
            this.cdr.detectChanges();
        }
    }


    confirmEditing(index: number) {
        const item = this.pendingItems[index];
        if (!this.validateEntry(item)) return;

        if (!item._isNew) {
            item._isModified = true;
        }
        this.editingIndex = null;
        this.hasChanges = true;
        if (isPlatformBrowser(this.platformId)) {
            this.cdr.detectChanges();
        }
    }

    cancelEditing() {
        this.editingIndex = null;
        this.loadCatalog();
    }

    markModified(index: number) {
        const item = this.pendingItems[index];
        if (!item._isNew) {
            item._isModified = true;
        }
        this.hasChanges = true;
    }

    saveAll(providedSupplier?: Fournisseur): Observable<any> | null {
        const targetSupplier = providedSupplier || this.supplier;
        if (!targetSupplier || !targetSupplier.id) return null;

        for (let i = 0; i < this.pendingItems.length; i++) {
            const item = this.pendingItems[i];
            if (!item.prixAchat || item.prixAchat <= 0) {
                this.notify(`Ligne "${item.piece?.designation}" : le prix doit être supérieur à 0`, 'error');
                return null;
            }
            if (item.dateDebutValidite && item.dateFinValidite && item.dateDebutValidite > item.dateFinValidite) {
                this.notify(`Ligne "${item.piece?.designation}" : la date de début dépasse la date de fin`, 'error');
                return null;
            }
        }

        const operations: any[] = [];

        for (const id of this.deletedIds) {
            operations.push(this.logistiqueService.deletePieceFournisseur(id));
        }

        for (const item of this.pendingItems) {
            if (item._isNew || item._isModified) {
                const payload = {
                    id: item.id || null,
                    prixAchat: Number(item.prixAchat || 0),
                    qteMinACommander: Math.round(Number(item.qteMinACommander || 0)),
                    tauxRemise: Number(item.tauxRemise || 0),
                    nbJoursLivraison: Math.round(Number(item.nbJoursLivraison || 0)),
                    estPrincipale: !!item.estPrincipale,
                    piece: { id: item.piece.id },
                    fournisseur: { id: targetSupplier.id },
                    dateDebutValidite: item.dateDebutValidite && item.dateDebutValidite.trim() ? item.dateDebutValidite.substring(0, 10) + 'T00:00:00' : null,
                    dateFinValidite: item.dateFinValidite && item.dateFinValidite.trim() ? item.dateFinValidite.substring(0, 10) + 'T23:59:59' : null
                };
                operations.push(this.logistiqueService.savePieceFournisseur(payload));
            }
        }

        if (operations.length === 0) {
            if (!this.isEmbedded) {
                this.router.navigate(['/logistique/fournisseurs']);
            }
            return null;
        }

        const obs = forkJoin(operations);

        if (!this.isEmbedded) {
            obs.subscribe({
                next: () => {
                    const msg = 'Catalogue enregistré avec succès';
                    this.notify(msg, 'success');
                    this.editingIndex = null;
                    this.loadCatalog();
                    this.router.navigate(['/logistique/fournisseurs'], {
                        state: { message: msg }
                    });
                },
                error: (err) => {
                    console.error('Erreur lors de l\'enregistrement:', err);
                    this.notify('Erreur lors de l\'enregistrement du catalogue', 'error');
                }
            });
        }

        return obs;
    }

    resetNewEntry() {
        this.newEntry = {
            piece: null,
            prixAchat: 0,
            qteMinACommander: 1,
            tauxRemise: 0,
            nbJoursLivraison: 0,
            estPrincipale: false,
            dateDebutValidite: '',
            dateFinValidite: ''
        };
        this.searchTerm = '';
        this.validationErrors = {};
    }

    closeNotification() {
        this.notification = null;
        if (isPlatformBrowser(this.platformId)) {
            this.cdr.detectChanges();
        }
    }

    notify(message: string, type: 'success' | 'error') {
        this.notification = { message, type };
        if (isPlatformBrowser(this.platformId)) {
            this.cdr.detectChanges();
            setTimeout(() => {
                if (this.notification?.message === message) {
                    this.closeNotification();
                }
            }, 5000);
        }
    }

    getPieceVariantArray(piece: any): string[] {
        if (!piece) return [];
        const details = piece.allDetails || piece.details || [];
        
        return details
            .filter((d: any) => {
                const hasValue = d.valeur && d.valeur.trim() !== '' && d.valeur !== '-';
                if (!hasValue) return false;
                
                // Si on a des IDs visibles configurés, on filtre dessus
                if (this.visibleVarianteIds && this.visibleVarianteIds.length > 0) {
                    return d.parametre && d.parametre.id && this.visibleVarianteIds.includes(d.parametre.id!);
                }
                return true;
            })
            .map((d: any) => `${d.parametre.nom}: ${d.valeur}`);
    }

    goBack() {
        this.router.navigate(['/logistique/fournisseurs']);
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
