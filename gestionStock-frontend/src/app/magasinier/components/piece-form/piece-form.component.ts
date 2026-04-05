import { Component, OnInit, Input, Output, EventEmitter, inject, ChangeDetectorRef, OnChanges, SimpleChanges, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { PieceDetachee, Categorie, ProduitFini, Parametre, DetailPiece, Unite, TypeChamp } from '../../models/magasinier.models';
import { Devise } from '../../../admin/models/entreprise.model';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { Subject, debounceTime, takeUntil } from 'rxjs';

@Component({
    selector: 'app-piece-form',
    standalone: true,
    imports: [CommonModule, FormsModule, ConfirmDialogComponent],
    templateUrl: './piece-form.component.html',
    styleUrl: './piece-form.component.css'
})
export class PieceFormComponent implements OnInit, OnChanges, OnDestroy {
    @Input() showModal: boolean = false;
    @Input() selectedPiece: PieceDetachee | null = null;
    @Input() parametres: Parametre[] = [];
    @Input() categories: Categorie[] = [];
    @Input() produitsFinis: ProduitFini[] = [];
    @Input() unites: Unite[] = [];
    @Input() errorMessage: string | null = null;
    @Input() devise: Devise | null | undefined = null;
    @Output() close = new EventEmitter<void>();
    @Output() cancel = new EventEmitter<void>();
    @Output() save = new EventEmitter<{ piece: any, file: File | null }>();
    @Output() quickAddCategory = new EventEmitter<Categorie>();
    @Output() quickAddProduct = new EventEmitter<{ product: ProduitFini, file: File | null }>();

    @Input() isSaving: boolean = false;

    @ViewChild('pieceForm') pieceForm?: NgForm;
    submitted = false;

    newPiece: PieceDetachee = this.initNewPiece();
    showUnsavedChangesDialog: boolean = false;
    imagePreview: string | null = null;
    selectedFile: File | null = null;
    isImageMarkedForDeletion: boolean = false;
    showSaveConfirm: boolean = false;
    localParametres: Parametre[] = [];

    // Search and Selection
    productSearchTerm: string = '';
    filteredProductsList: ProduitFini[] = [];
    showProductSelector: boolean = false;

    // Quick Add Categorie
    showQuickAddCategorie: boolean = false;
    newCategory: { nom: string, code: string, description: string } = { nom: '', code: 'AUTO', description: '' };

    // Search and Dropdown states
    categorySearchTerm: string = '';
    showCategoryDropdown: boolean = false;
    filteredCategories: Categorie[] = [];
    private categorySearchSubject = new Subject<string>();
    private destroy$ = new Subject<void>();

    private cdr = inject(ChangeDetectorRef);
    private entrepriseService = inject(EntrepriseService);

    ngOnInit(): void {
        this.resetForm();

        this.categorySearchSubject.pipe(
            debounceTime(50),
            takeUntil(this.destroy$)
        ).subscribe(term => {
            this.executeCategorySearch(term);
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['showModal'] && changes['showModal'].currentValue === true &&
            changes['showModal'].previousValue !== true) {
            this.resetForm();
            this.cdr.markForCheck();
        } else if (changes['parametres'] && !changes['showModal']) {
            this.resetForm();
            this.cdr.markForCheck();
        } else {
            if (changes['errorMessage'] && changes['errorMessage'].currentValue) {
                this.scrollToTop();
            }
            if (changes['categories']) {
                this.executeCategorySearch(this.categorySearchTerm);
            }
            if (changes['parametres']) {
                this.localParametres = [...this.parametres];
            }
            if (changes['produitsFinis']) {
                this.filteredProductsList = [...this.produitsFinis];
            }
        }
    }

    resetForm() {
        this.submitted = false;
        this.localParametres = [...(this.parametres || [])];

        if (this.selectedPiece) {
            this.newPiece = {
                ...this.selectedPiece,
                categorie: this.selectedPiece.categorie ? { ...this.selectedPiece.categorie } : undefined,
                unite: this.selectedPiece.unite ? { ...this.selectedPiece.unite } : undefined,
                details: this.selectedPiece.details ? this.selectedPiece.details.map(d => ({
                    ...d, 
                    parametre: (d.parametre ? { ...d.parametre } : {}) as Parametre
                })) : [],
                produitsAssocies: this.selectedPiece.produitsAssocies ? [...this.selectedPiece.produitsAssocies] : []
            };
            this.imagePreview = this.newPiece.imageUrl || null;
            this.categorySearchTerm = this.newPiece.categorie?.nom || '';
        } else {
            this.newPiece = this.initNewPiece();
            this.imagePreview = null;
            this.selectedFile = null;
            this.categorySearchTerm = '';
        }

        this.filteredProductsList = [...this.produitsFinis];
        this.filteredCategories = [...this.categories];

        this.initializeDetails();
    }

    initNewPiece(): PieceDetachee {
        const isAuto = this.isModuleAuto('PIECE');
        return {
            designation: '',
            reference: isAuto ? 'AUTO' : '',
            codeBarre: '',
            prixVente: 0,
            tauxTVA: 20,
            seuilMinimum: 0,
            seuilMaximum: 100,
            description: '',
            imageUrl: '',
            unite: undefined,
            archivee: false,
            details: [],
            produitsAssocies: []
        };
    }

    initializeDetails() {
        if (!this.newPiece.details) {
            this.newPiece.details = [];
        }
        
        // Ensure every active parameter has a detail entry
        this.localParametres.forEach(param => {
            if (param.actif) {
                const existingInfo = this.newPiece.details!.find(d => 
                    d.parametre?.id === param.id || d.parametreNom === param.nom || d.parametre?.nom === param.nom
                );
                
                if (!existingInfo) {
                    this.newPiece.details!.push({
                        parametre: param,
                        parametreNom: param.nom,
                        valeur: ''
                    });
                }
            }
        });
    }

    getDetailForParam(param: Parametre): any {
        const found = this.newPiece.details?.find(d =>
            d.parametre?.id === param.id || d.parametreNom === param.nom || d.parametre?.nom === param.nom
        );
        if (!found) {
            const newDetail: any = { valeur: '', valeurBool: false, parametre: param, parametreNom: param.nom };
            this.newPiece.details = this.newPiece.details || [];
            this.newPiece.details.push(newDetail);
            return newDetail;
        }
        if (found.valeurBool === undefined) found.valeurBool = false;
        return found;
    }

    isFormValid(): boolean {
        const isAutoRef = this.isModuleAuto('PIECE');
        const basicOk = !!(
            this.newPiece.designation.trim() && 
            this.newPiece.categorie && 
            this.newPiece.unite && 
            (isAutoRef || this.newPiece.reference.trim()) &&
            this.newPiece.codeBarre?.trim() &&
            Number(this.newPiece.prixVente || 0) > 0 &&
            Number(this.newPiece.tauxTVA || 0) > 0 &&
            this.newPiece.seuilMaximum > 0
        );
        
        const sMin = Number(this.newPiece.seuilMinimum || 0);
        const sMax = Number(this.newPiece.seuilMaximum || 0);
        const thresholdsOk = sMin <= sMax;

        const paramsOk = this.localParametres
            .filter(p => p.actif && p.obligatoire)
            .every(p => {
                const detail = this.getDetailForParam(p);
                if (!detail) return false;
                // BOOLEAN: valeurBool counts as valid answer
                if (p.type === 'BOOLEAN') return true;
                return detail.valeur !== undefined && detail.valeur !== null && String(detail.valeur).trim() !== '';
            });

        return basicOk && thresholdsOk && paramsOk;
    }

    getThresholdError(): string | null {
        const sMin = Number(this.newPiece.seuilMinimum || 0);
        const sMax = Number(this.newPiece.seuilMaximum || 0);
        if (sMin > sMax) {
            return "Le seuil maximum doit être supérieur au seuil minimum.";
        }
        return null;
    }

    compareById(o1: any, o2: any): boolean {
        return o1 && o2 ? o1.id === o2.id : o1 === o2;
    }

    isModuleAuto(moduleName: string): boolean {
        for (const p of (this.localParametres || [])) {
            const config = p.numerotationConfigs?.find(c => c.module?.toUpperCase() === moduleName.toUpperCase());
            if (config) return config.automatique !== false;
        }
        return true;
    }

    getCurrencyCode(): string {
        return this.devise?.code || this.devise?.symbole || 'TND';
    }

    onSubmit(): void {
        this.submitted = true;
        if (!this.isFormValid()) {
            this.errorMessage = "Veuillez corriger les erreurs dans le formulaire avant de continuer.";
            this.scrollToTop();
            return;
        }

        if (Number(this.newPiece.seuilMinimum || 0) > Number(this.newPiece.seuilMaximum || 0)) {
            this.errorMessage = "Le seuil maximum doit être supérieur au seuil minimum.";
            this.scrollToTop();
            return;
        }

        const isDirty = (this.pieceForm?.dirty || !!this.selectedFile || this.isImageMarkedForDeletion);

        if (!isDirty) {
            this.forceClose(); // Close directly if no changes
            return;
        }

        this.errorMessage = '';
        this.showSaveConfirm = true;
        this.cdr.detectChanges();
    }

    onConfirmFinalSave(): void {
        this.showSaveConfirm = false;
        this.isSaving = true;

        try {
            // Apply image deletion if marked
            if (this.isImageMarkedForDeletion) {
                this.selectedFile = null;
                this.imagePreview = null;
                this.newPiece.imageUrl = '';
                if (this.selectedPiece) this.selectedPiece.imageUrl = '';
            }

            // Filter out empty details
            if (this.newPiece.details) {
                this.newPiece.details = this.newPiece.details.filter(d => {
                    const val = d.valeur;
                    return val !== null && val !== undefined && String(val).trim() !== '';
                });
            }

            const pieceToSave = this.mapPieceForSave(this.newPiece);
            sessionStorage.removeItem('piece_draft');
            this.save.emit({ piece: pieceToSave, file: this.selectedFile });
        } catch (err) {
            console.error('Error in onConfirmFinalSave:', err);
            this.errorMessage = "Une erreur est survenue lors de la préparation de l'envoi.";
            this.scrollToTop();
            this.isSaving = false;
        }
    }

    onCancelFinalSave(): void {
        this.showSaveConfirm = false;
        this.cdr.detectChanges();
    }

    private scrollToTop(): void {
        const body = document.querySelector('.form-body');
        if (body) {
            body.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    private mapPieceForSave(piece: PieceDetachee): any {
        const mapped: any = {
            id: piece.id,
            designation: piece.designation,
            reference: piece.reference,
            codeBarre: piece.codeBarre,
            prixVente: Number(piece.prixVente || 0),
            tauxTVA: Number(piece.tauxTVA || 0),
            seuilMinimum: Number(piece.seuilMinimum || 0),
            seuilMaximum: Number(piece.seuilMaximum || 0),
            description: piece.description,
            imageUrl: piece.imageUrl,
            unite: piece.unite,
            archivee: piece.archivee ?? false,
            details: (piece.details || []).map(d => ({
                id: d.id,
                parametreNom: d.parametreNom || d.parametre?.nom,
                valeur: typeof d.valeur === 'string' ? d.valeur.trim() : d.valeur,
                parametre: d.parametre ? { id: d.parametre.id } : null
            }))
        };

        if (piece.categorie) mapped.categorie = { id: piece.categorie.id };

        mapped.produitsAssocies = (piece.produitsAssocies || []).map(p => ({
            id: p.id,
            designation: p.designation,
            code: p.code
        }));

        mapped.variations = [];

        return mapped;
    }

    closeModal() {
        if (this.isFormDirty()) {
            this.showUnsavedChangesDialog = true;
            this.cdr.detectChanges();
        } else {
            this.forceClose();
        }
    }

    private isFormDirty(): boolean {
        if (!this.selectedPiece && !this.pieceForm?.dirty && !this.selectedFile) {
            return false;
        }
        return this.pieceForm?.dirty || !!this.selectedFile;
    }

    onConfirmStay() {
        this.showUnsavedChangesDialog = false;
        this.cdr.detectChanges();
    }

    handleSaveFromDialog() {
        this.showUnsavedChangesDialog = false;
        this.onSubmit();
        this.cdr.detectChanges();
    }

    onConfirmQuit() {
        this.showUnsavedChangesDialog = false;
        this.forceClose();
        this.cdr.detectChanges();
    }

    private forceClose() {
        sessionStorage.removeItem('piece_draft');
        this.close.emit();
        this.cancel.emit();
        this.cdr.detectChanges();
    }

    getImageUrl(path: string | null | undefined): string {
        if (!path) return 'assets/img/default-piece.png';
        if (path.startsWith('data:')) return path;
        return this.entrepriseService.getImageUrl(path);
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                this.selectedFile = file;
                this.imagePreview = reader.result as string;
                this.cdr.detectChanges();
            };
            reader.readAsDataURL(file);
        }
    }

    removeImage(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isImageMarkedForDeletion = true;
        this.pieceForm?.form.markAsDirty();
        this.cdr.detectChanges();
    }

    undoRemoveImage(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isImageMarkedForDeletion = false;
        this.cdr.detectChanges();
    }

    toggleCategorieModal(event?: Event): void {
        if (event) event.stopPropagation();
        this.showQuickAddCategorie = !this.showQuickAddCategorie;
        if (this.showQuickAddCategorie) {
            this.showCategoryDropdown = false;
            const isAuto = this.isModuleAuto('CATEGORIE');
            this.newCategory = { nom: this.categorySearchTerm, code: isAuto ? 'AUTO' : '', description: '' };
        } else {
            this.newCategory = { nom: '', code: 'AUTO', description: '' };
        }
        this.cdr.detectChanges();
    }

    onCategorySearch(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.categorySearchTerm = value;
        this.showCategoryDropdown = true;
        this.categorySearchSubject.next(value);
    }

    private executeCategorySearch(term: string): void {
        const normalizedTerm = term.toLowerCase().trim();
        this.filteredCategories = normalizedTerm
            ? this.categories.filter(c => c.nom.toLowerCase().includes(normalizedTerm))
            : [...this.categories];
        this.cdr.detectChanges();
    }

    selectCategory(cat: Categorie): void {
        this.newPiece.categorie = cat;
        this.categorySearchTerm = cat.nom;
        this.showCategoryDropdown = false;
        this.pieceForm?.form.markAsDirty();
        this.cdr.detectChanges();
    }

    toggleCategoryDropdown(): void {
        this.showCategoryDropdown = !this.showCategoryDropdown;
        if (this.showCategoryDropdown) {
            this.filteredCategories = [...this.categories];
        }
    }

    @HostListener('document:click', ['$event'])
    onClickOutside(event: MouseEvent) {
        if (!this.showCategoryDropdown) return;
        const target = event.target as HTMLElement;
        if (!target.closest('.p-dropdown')) {
            this.showCategoryDropdown = false;
            this.cdr.detectChanges();
        }
    }

    @HostListener('window:beforeunload')
    saveDraftToSession() {
        if (this.showModal && this.isFormDirty()) {
            try {
                /* Simplify object to avoid circular reference issues if any */
                const cleanPiece = {
                    ...this.newPiece,
                    details: this.newPiece.details?.map(d => ({ ...d })),
                    produitsAssocies: this.newPiece.produitsAssocies?.map(p => ({ ...p })),
                    categorie: this.newPiece.categorie ? { ...this.newPiece.categorie } : undefined,
                    unite: this.newPiece.unite ? { ...this.newPiece.unite } : undefined
                };
                sessionStorage.setItem('piece_draft', JSON.stringify({
                    piece: cleanPiece
                }));
            } catch (e) {
                console.error('Error saving draft', e);
            }
        } else {
            sessionStorage.removeItem('piece_draft');
        }
    }

    submitQuickAddCategorie(): void {
        if (!this.newCategory.nom) return;
        this.quickAddCategory.emit({
            nom: this.newCategory.nom,
            code: this.newCategory.code,
            description: this.newCategory.description,
            archivee: false
        });
        this.categorySearchTerm = this.newCategory.nom;
        this.newCategory = { nom: '', code: 'AUTO', description: '' };
        this.showQuickAddCategorie = false;
    }

    toggleProductSelectorModal(event?: Event): void {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        this.showProductSelector = !this.showProductSelector;
        this.cdr.detectChanges();
    }

    toggleProductSelection(product: ProduitFini): void {
        if (!this.newPiece.produitsAssocies) this.newPiece.produitsAssocies = [];
        const index = this.newPiece.produitsAssocies.findIndex(p => p.id === product.id);
        if (index === -1) {
            this.newPiece.produitsAssocies.push({ ...product });
        } else {
            this.newPiece.produitsAssocies.splice(index, 1);
        }
        this.pieceForm?.form.markAsDirty();
        this.cdr.detectChanges();
    }

    isProductSelected(productId?: number): boolean {
        if (!productId || !this.newPiece.produitsAssocies) return false;
        return this.newPiece.produitsAssocies.some(p => p.id === productId);
    }

    removeAssociatedProduct(index: number): void {
        if (this.newPiece.produitsAssocies) {
            this.newPiece.produitsAssocies.splice(index, 1);
            this.pieceForm?.form.markAsDirty();
            this.cdr.detectChanges();
        }
    }

    isAllFilteredSelected(): boolean {
        if (this.filteredProductsList.length === 0) return false;
        return this.filteredProductsList.every(p => this.isProductSelected(p.id));
    }

    toggleSelectAllFiltered(): void {
        const allSelected = this.isAllFilteredSelected();
        if (!this.newPiece.produitsAssocies) this.newPiece.produitsAssocies = [];

        if (allSelected) {
            // Deselect all filtered products
            const filteredIds = new Set(this.filteredProductsList.map(p => p.id));
            this.newPiece.produitsAssocies = this.newPiece.produitsAssocies.filter(p => !filteredIds.has(p.id));
        } else {
            // Select all filtered products (avoid duplicates)
            this.filteredProductsList.forEach(product => {
                if (!this.isProductSelected(product.id)) {
                    this.newPiece.produitsAssocies!.push({ ...product });
                }
            });
        }
        this.pieceForm?.form.markAsDirty();
        this.cdr.detectChanges();
    }

    onQuickAddProduct(): void {
        const newProduct: ProduitFini = {
            designation: this.productSearchTerm,
            code: 'AUTO',
            estArchivee: false
        };
        this.quickAddProduct.emit({ product: newProduct, file: null });
        this.toggleProductSelectorModal();
    }

    onProductSearchChange() {
        const term = this.productSearchTerm.toLowerCase().trim();
        this.filteredProductsList = term 
            ? this.produitsFinis.filter(p =>
                p.designation.toLowerCase().includes(term) ||
                p.code.toLowerCase().includes(term)
            )
            : [...this.produitsFinis];
        this.cdr.detectChanges();
    }

    getSelectedProductsCount(): number {
        return this.newPiece.produitsAssocies?.length ?? 0;
    }
    
    generateBarcode(): void {
        const timestamp = Date.now().toString().slice(-10);
        const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        this.newPiece.codeBarre = timestamp + random;
        this.pieceForm?.form.markAsDirty();
        this.cdr.detectChanges();
    }

}
