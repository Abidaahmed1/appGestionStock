import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LogistiqueService } from '../../services/logistique.service';
import { PieceFournisseur, Fournisseur } from '../../models/logistique.models';
import { PieceDetachee } from '../../../magasinier/models/magasinier.models';
import { MagasinierService } from '../../../magasinier/services/magasinier.service';
import { forkJoin } from 'rxjs';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { Entreprise } from '../../../admin/models/entreprise.model';

@Component({
    selector: 'app-supplier-catalog',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './supplier-catalog.component.html',
    styleUrl: './supplier-catalog.component.css'
})
export class SupplierCatalogComponent implements OnInit, OnChanges {
    @Input() supplier: Fournisseur | undefined;
    @Input() isEmbedded: boolean = false;

    catalogItems: any[] = [];
    allPieces: any[] = [];
    searchTerm: string = '';
    showResults: boolean = false;
    catalogFilterTerm: string = '';

    validationErrors: { piece?: string; prix?: string; dates?: string, tauxRemise?: string } = {};
    notification: { message: string; type: 'success' | 'error' } | null = null;


    pendingItems: any[] = [];
    deletedIds: number[] = [];
    hasChanges: boolean = false;
    entreprise: Entreprise | null = null;

    editingIndex: number | null = null;

    newEntry: any = {
        piece: null,
        prixAchat: 0,
        qteMinACommander: 1,
        tauxRemise: 0,
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

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
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
                if (isPlatformBrowser(this.platformId)) {
                    this.cdr.detectChanges();
                }
            }
        });
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

    get filteredPieces() {
        if (!this.searchTerm) return this.allPieces;
        const term = this.searchTerm.toLowerCase();
        return this.allPieces.filter(p =>
            p.designation.toLowerCase().includes(term) ||
            p.codeBarre.toLowerCase().includes(term)
        );
    }

    get filteredCatalogItems() {
        if (!this.catalogFilterTerm) return this.pendingItems;
        const term = this.catalogFilterTerm.toLowerCase();
        return this.pendingItems.filter(item =>
            item.piece?.designation?.toLowerCase().includes(term) ||
            item.piece?.codeBarre?.toLowerCase().includes(term)
        );
    }

    getPrincipalCount(): number {
        return this.pendingItems.filter(item => item.estPrincipale).length;
    }

    selectPiece(piece: any) {
        this.newEntry.piece = piece;
        this.searchTerm = `[${piece.codeBarre}] ${piece.designation}`;
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

    saveAll() {
        if (!this.supplier) return;

        for (let i = 0; i < this.pendingItems.length; i++) {
            const item = this.pendingItems[i];
            if (!item.prixAchat || item.prixAchat <= 0) {
                this.notify(`Ligne "${item.piece?.designation}" : le prix doit être supérieur à 0`, 'error');
                return;
            }
            if (item.dateDebutValidite && item.dateFinValidite && item.dateDebutValidite > item.dateFinValidite) {
                this.notify(`Ligne "${item.piece?.designation}" : la date de début dépasse la date de fin`, 'error');
                return;
            }
        }

        const operations: any[] = [];

        for (const id of this.deletedIds) {
            operations.push(this.logistiqueService.deletePieceFournisseur(id));
        }

        for (const item of this.pendingItems) {
            if (item._isNew || item._isModified) {
                const payload = {
                    id: item.id,
                    prixAchat: item.prixAchat,
                    qteMinACommander: item.qteMinACommander,
                    tauxRemise: item.tauxRemise,
                    estPrincipale: item.estPrincipale,
                    piece: { id: item.piece.id },
                    fournisseur: { id: this.supplier.id },
                    dateDebutValidite: item.dateDebutValidite ? item.dateDebutValidite + 'T00:00:00' : null,
                    dateFinValidite: item.dateFinValidite ? item.dateFinValidite + 'T23:59:59' : null
                };
                operations.push(this.logistiqueService.savePieceFournisseur(payload));
            }
        }

        if (operations.length === 0) {
            return;
        }

        forkJoin(operations).subscribe({
            next: () => {
                this.notify('Catalogue enregistré avec succès', 'success');
                this.editingIndex = null;
                this.loadCatalog();
            },
            error: (err) => {
                console.error('Erreur lors de l\'enregistrement:', err);
                this.notify('Erreur lors de l\'enregistrement du catalogue', 'error');
            }
        });
    }

    resetNewEntry() {
        this.newEntry = {
            piece: null,
            prixAchat: 0,
            qteMinACommander: 1,
            tauxRemise: 0,
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

    goBack() {
        this.router.navigate(['/logistique/fournisseurs']);
    }
}
