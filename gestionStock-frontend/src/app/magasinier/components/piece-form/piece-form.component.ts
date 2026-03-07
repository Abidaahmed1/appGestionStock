import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject, ChangeDetectorRef, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PieceDetachee, Categorie, ProduitFini, Parametre, ChampPersonnalise } from '../../models/magasinier.models';
import { MagasinierService } from '../../services/magasinier.service';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { Entreprise } from '../../../admin/models/entreprise.model';

@Component({
    selector: 'app-piece-form',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './piece-form.component.html',
    styleUrl: './piece-form.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PieceFormComponent implements OnInit, OnChanges {
    @Input() selectedPiece: PieceDetachee | null = null;
    @Input() categories: Categorie[] = [];
    @Input() produitsFinis: ProduitFini[] = [];
    @Input() parametres: Parametre | null = null;
    @Input() showModal: boolean = false;

    @Output() save = new EventEmitter<{ piece: PieceDetachee, file: File | null }>();
    @Output() cancel = new EventEmitter<void>();
    @Output() quickAddCategory = new EventEmitter<Categorie>();
    @Output() quickAddProduct = new EventEmitter<{ product: ProduitFini, file: File | null }>();

    newPiece: PieceDetachee = this.initNewPiece();
    imagePreview: string | null = null;
    selectedFile: File | null = null;

    showCategorySelector = false;
    showProductSelector = false;
    categorySearchTerm = '';
    productSearchTerm = '';

    showQuickAddCategory = false;
    showQuickAddProduct = false;
    newCategory: Categorie = { nom: '', code: '', description: '' };
    newProduct: ProduitFini = { code: '', designation: '' };
    quickProductFile: File | null = null;
    newProductPreview: string | null = null;
    showConfirmModal = false;
    optionToRemove: string = '';
    champToRemoveFrom: any = null;
    confirmEvent: MouseEvent | null = null;
    variantErrors: { [key: string]: boolean } = {};

    private cdr = inject(ChangeDetectorRef);
    private magasinierService = inject(MagasinierService);
    private entrepriseService = inject(EntrepriseService);
    entreprise: Entreprise | null = null;

    ngOnInit() {
        this.resetForm();
        this.loadEntreprise();
    }

    loadEntreprise() {
        this.entrepriseService.getCurrentEntreprise().subscribe({
            next: (data) => {
                this.entreprise = data;
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Erreur chargement entreprise:', err)
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['showModal'] && changes['showModal'].currentValue === true &&
            changes['showModal'].previousValue !== true) {
            this.resetForm();
            this.cdr.markForCheck();
        } else if (changes['parametres'] && !changes['showModal']) {
            this.resetForm();
            this.cdr.markForCheck();
        }
    }

    resetForm() {
        if (this.selectedPiece) {
            const pieceToUse = (this.selectedPiece as any).originalPiece || this.selectedPiece;
            this.newPiece = {
                ...pieceToUse,
                categorie: pieceToUse.categorie ? { ...pieceToUse.categorie } : { nom: '' },
                details: pieceToUse.details && pieceToUse.details.length > 0 ?
                    pieceToUse.details.map((d: any) => ({ ...d, attributs: { ...d.attributs } })) :
                    [{ attributs: {} }]
            };
            this.imagePreview = pieceToUse.imageUrl || null;
        } else {
            this.newPiece = this.initNewPiece();
            this.imagePreview = null;
        }
        this.selectedFile = null;
        this.initializeDynamicFields();
    }

    initNewPiece(): PieceDetachee {
        return {
            codeBarre: '',
            designation: '',
            prixVente: 0,
            reference: '',
            seuilMinimum: 0,
            seuilMaximum: 0,
            tauxTVA: 0,
            archivee: false,
            categorie: { nom: '' },
            imageUrl: '',
            details: [{ attributs: {} }]
        };
    }

    initializeDynamicFields(): void {
        if (!this.parametres?.champsPersonnalises || !this.newPiece.details) return;

        const details = this.newPiece.details;
        if (details.length === 0) {
            this.newPiece.details = [{ attributs: {} }];
        }

        const firstDetail = this.newPiece.details[0];

        this.parametres.champsPersonnalises.forEach(champ => {
            if (!(champ.nom in firstDetail.attributs)) {
                firstDetail.attributs[champ.nom] = champ.defaultValue || '';
            }

            const optionsKey = `_options_${champ.nom}`;

            if (champ.variante && details.length > 0) {
                const uniqueValues = new Set<string>();
                details.forEach(d => {
                    if (d.attributs && d.attributs[champ.nom]) {
                        uniqueValues.add(String(d.attributs[champ.nom]));
                    }
                });

                if (uniqueValues.size > 0) {
                    firstDetail.attributs[optionsKey] = Array.from(uniqueValues);
                } else if (!firstDetail.attributs[optionsKey]) {
                    firstDetail.attributs[optionsKey] = [...(champ.options || [])];
                }
            } else if (!firstDetail.attributs[optionsKey]) {
                firstDetail.attributs[optionsKey] = [...(champ.options || [])];
            }
        });
    }

    getLocalOptions(champ: any): string[] {
        if (!this.newPiece.details![0].attributs) return champ.options || [];
        const optionsKey = `_options_${champ.nom}`;
        return this.newPiece.details![0].attributs[optionsKey] || champ.options || [];
    }


    onReferenceChange(ref: string): void {
        if (this.selectedPiece || !ref || ref.length < 5) return;

        this.magasinierService.getPieceByReference(ref).subscribe({
            next: (piece) => {
                if (piece) {
                    this.newPiece.designation = piece.designation;
                    this.newPiece.prixVente = piece.prixVente;
                    this.newPiece.categorie = piece.categorie;
                    this.newPiece.tauxTVA = piece.tauxTVA;
                    this.newPiece.seuilMinimum = piece.seuilMinimum;
                    this.newPiece.seuilMaximum = piece.seuilMaximum;
                    this.newPiece.imageUrl = piece.imageUrl;
                    this.imagePreview = piece.imageUrl || null;
                    this.newPiece.produitsAssocies = [...(piece.produitsAssocies || [])];

                    if (piece.details && piece.details.length > 0) {
                        const templateDetail = piece.details[0];
                        const cleanAttributs: any = {};
                        Object.entries(templateDetail.attributs).forEach(([k, v]) => {
                            cleanAttributs[k] = v;
                        });
                        this.newPiece.details = [{ attributs: cleanAttributs }];
                    }
                    this.cdr.detectChanges();
                }
            },
            error: (err) => {
            }
        });
    }


    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            this.selectedFile = input.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                this.imagePreview = reader.result as string;
                this.cdr.detectChanges();
            };
            reader.readAsDataURL(this.selectedFile);
        }
    }

    getImageUrl(url: string | null | undefined): string {
        if (!url) return 'assets/images/default-produit.svg';
        if (url.startsWith('data:')) return url;
        if (url.startsWith('/api/images') || url.startsWith('/uploads')) {
            return `http://localhost:8081${url}`;
        }
        return url;
    }

    toggleCategorySelector(event?: Event): void {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        this.showCategorySelector = !this.showCategorySelector;
        this.cdr.detectChanges();
    }

    selectCategory(cat: Categorie): void {
        this.newPiece.categorie = cat;
        this.showCategorySelector = false;
        this.cdr.detectChanges();
    }

    get filteredCategories() {
        const term = (this.categorySearchTerm || '').toLowerCase();
        return (this.categories || []).filter(c => (c.nom || '').toLowerCase().includes(term));
    }

    openQuickAddCategory(event?: Event): void {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        this.showQuickAddCategory = true;
        this.showCategorySelector = false;
        this.cdr.detectChanges();
    }

    closeQuickAddCategory(): void {
        this.showQuickAddCategory = false;
        this.cdr.detectChanges();
    }

    submitQuickAddCategory(): void {
        if (!this.newCategory.nom || !this.newCategory.code) return;
        this.quickAddCategory.emit({ ...this.newCategory });
        this.showQuickAddCategory = false;
        this.newCategory = { nom: '', code: '', description: '' };
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
        this.cdr.detectChanges();
    }

    isProductSelected(productId?: number): boolean {
        if (!productId || !this.newPiece.produitsAssocies) return false;
        return this.newPiece.produitsAssocies.some(p => p.id === productId);
    }

    removeAssociatedProduct(index: number): void {
        if (this.newPiece.produitsAssocies) {
            this.newPiece.produitsAssocies.splice(index, 1);
            this.cdr.detectChanges();
        }
    }

    get filteredProduitsSelection() {
        const term = (this.productSearchTerm || '').toLowerCase();
        return this.produitsFinis.filter(p =>
            p.designation.toLowerCase().includes(term) ||
            p.code.toLowerCase().includes(term)
        );
    }

    getSelectedProductsCount(): number {
        return this.newPiece.produitsAssocies?.length ?? 0;
    }

    openQuickAddProduct(event?: Event): void {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        this.newProduct = { code: '', designation: '' };
        this.quickProductFile = null;
        this.newProductPreview = null;
        this.showQuickAddProduct = true;
        this.cdr.detectChanges();
    }

    onQuickProductFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            this.quickProductFile = input.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                this.newProductPreview = reader.result as string;
                this.cdr.detectChanges();
            };
            reader.readAsDataURL(this.quickProductFile);
        }
    }

    submitQuickAddProduct(): void {
        if (!this.newProduct.code || !this.newProduct.designation) return;
        this.quickAddProduct.emit({ product: { ...this.newProduct }, file: this.quickProductFile });
        this.showQuickAddProduct = false;
        this.newProduct = { code: '', designation: '' };
    }

    closeQuickAddProduct(): void {
        this.showQuickAddProduct = false;
        this.cdr.detectChanges();
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (this.showCategorySelector) {
            const target = event.target as HTMLElement;
            if (!target.closest('.custom-picker')) {
                this.showCategorySelector = false;
                this.cdr.detectChanges();
            }
        }
    }

    onFormSubmit(form: any): void {
        this.variantErrors = {};
        let hasVariantErrors = false;

        if (this.parametres?.champsPersonnalises) {
            this.parametres.champsPersonnalises.forEach(champ => {
                if (champ.actif && champ.variante && champ.obligatoire) {
                    const options = this.getLocalOptions(champ);
                    if (!options || options.length === 0) {
                        this.variantErrors[champ.nom] = true;
                        hasVariantErrors = true;
                    }
                }
            });
        }

        const seuilInvalid = this.newPiece.seuilMaximum < this.newPiece.seuilMinimum;

        if (form.invalid || !this.newPiece.categorie?.id || hasVariantErrors || seuilInvalid) {
            Object.keys(form.controls).forEach(key => {
                form.controls[key].markAsTouched();
            });


            const container = document.querySelector('.odoo-unified-content');
            if (container) {
                container.scrollTo({ top: 0, behavior: 'smooth' });
            }

            if (seuilInvalid) {
                console.warn('Seuil Maximum doit être supérieur au Seuil Minimum');
            }

            this.cdr.detectChanges();
            return;
        }
        this.onSubmit();
    }

    onSubmit(): void {
        const rawPiece = this.newPiece;
        const pieceToSave: any = {
            id: rawPiece.id,
            codeBarre: rawPiece.codeBarre,
            designation: rawPiece.designation,
            prixVente: Number(rawPiece.prixVente),
            reference: rawPiece.reference,
            seuilMinimum: Number(rawPiece.seuilMinimum),
            seuilMaximum: Number(rawPiece.seuilMaximum),
            tauxTVA: Number(rawPiece.tauxTVA),
            archivee: !!rawPiece.archivee,
            imageUrl: rawPiece.imageUrl,
            categorie: rawPiece.categorie?.id ? { id: rawPiece.categorie.id } : null,
            produitsAssocies: (rawPiece.produitsAssocies || []).map(p => ({ id: p.id })),
            details: []
        };

        if (this.parametres?.champsPersonnalises && rawPiece.details?.length) {
            const templateDetail = rawPiece.details[0];
            const variantChamps = this.parametres.champsPersonnalises.filter(c => c.variante && c.actif);

            const baseAttributs: { [key: string]: any } = {};
            Object.entries(templateDetail.attributs).forEach(([key, value]) => {
                if (!key.startsWith('_')) {
                    const isVariant = variantChamps.some(c => c.nom === key);
                    if (!isVariant) {
                        baseAttributs[key] = value;
                    }
                }
            });

            if (variantChamps.length > 0) {
                let combinations: { [key: string]: any }[] = [{ ...baseAttributs }];

                variantChamps.forEach(champ => {
                    const options = this.getLocalOptions(champ);
                    if (options.length === 0) {
                        const currentVal = templateDetail.attributs[champ.nom];
                        if (currentVal !== undefined && currentVal !== null) {
                            combinations.forEach(combo => combo[champ.nom] = currentVal);
                        }
                        return;
                    }

                    const nextCombinations: { [key: string]: any }[] = [];
                    combinations.forEach(combo => {
                        options.forEach(opt => {
                            nextCombinations.push({ ...combo, [champ.nom]: opt });
                        });
                    });
                    combinations = nextCombinations;
                });

                const existingDetails = [...(rawPiece.details || [])];
                pieceToSave.details = combinations.map(combo => {
                    const matchingIndex = existingDetails.findIndex(d =>
                        variantChamps.every(c => d.attributs[c.nom] === combo[c.nom])
                    );

                    if (matchingIndex > -1) {
                        const existing = existingDetails.splice(matchingIndex, 1)[0];
                        return {
                            id: existing.id,
                            attributs: { ...combo },
                            stock: existing.stock ? { id: existing.stock.id } : null
                        };
                    }
                    return { attributs: { ...combo } };
                });
            } else {
                pieceToSave.details = [{
                    id: templateDetail.id,
                    attributs: baseAttributs,
                    stock: templateDetail.stock ? { id: templateDetail.stock.id } : null
                }];
            }
        }

        console.log('Sending cleaned piece to backend:', pieceToSave);
        this.save.emit({ piece: pieceToSave, file: this.selectedFile });
    }

    onCancel(): void {
        this.cancel.emit();
    }

    addVariantOption(champ: any, input: HTMLInputElement): void {
        const value = input.value.trim();
        if (!value) return;

        const optionsKey = `_options_${champ.nom}`;
        if (!this.newPiece.details![0].attributs[optionsKey]) {
            this.newPiece.details![0].attributs[optionsKey] = [];
        }

        const localOptions = this.newPiece.details![0].attributs[optionsKey];
        if (localOptions.includes(value)) {
            input.value = '';
            return;
        }

        localOptions.push(value);
        this.newPiece.details![0].attributs[champ.nom] = value;
        input.value = '';
        this.cdr.detectChanges();
    }

    openConfirmRemove(champ: any, option: string, event: MouseEvent): void {
        event.stopPropagation();
        console.log('Opening confirm delete for:', option, 'in champ:', champ.nom);

        this.champToRemoveFrom = champ;
        this.optionToRemove = option;
        this.showConfirmModal = true;
        this.cdr.detectChanges();
    }

    cancelRemove(): void {
        this.showConfirmModal = false;
        this.champToRemoveFrom = null;
        this.optionToRemove = '';
        this.cdr.detectChanges();
    }

    confirmRemoveOption(): void {
        if (this.champToRemoveFrom && this.optionToRemove) {
            console.log('Confirming delete of:', this.optionToRemove);
            const optionsKey = `_options_${this.champToRemoveFrom.nom}`;
            const localOptions = this.newPiece.details![0].attributs[optionsKey];

            this.newPiece.details![0].attributs[optionsKey] = localOptions.filter((o: string) => o !== this.optionToRemove);

            if (this.newPiece.details![0].attributs[this.champToRemoveFrom.nom] === this.optionToRemove) {
                this.newPiece.details![0].attributs[this.champToRemoveFrom.nom] = '';
            }
            this.cdr.detectChanges();
        }
        this.cancelRemove();
    }

    hasVisibleFields(isVariant: boolean): boolean {
        if (!this.parametres?.champsPersonnalises) return false;
        return this.parametres.champsPersonnalises.some(c => c.actif && c.variante === isVariant);
    }

    getVariantLabel(detail: any): string {
        const attributes = detail.attributs || {};
        const label = Object.entries(attributes)
            .filter(([key, value]) => !key.startsWith('_') && value !== null && value !== '' && String(value).trim() !== '')
            .map(([_, value]) => value)
            .join(' - ');
        return label || 'Standard';
    }
}
