import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KeycloakService } from 'keycloak-angular';
import { MagasinierService } from '../../services/magasinier.service';
import { PieceDetachee, Categorie, ProduitFini } from '../../models/magasinier.models';

@Component({
    selector: 'app-piece-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './piece-list.component.html',
    styleUrl: './piece-list.component.css'
})
export class PieceListComponent implements OnInit {
    pieces: PieceDetachee[] = [];
    loading: boolean = false;
    showCreateModal = false;
    showDeleteModal = false;
    selectedPiece: PieceDetachee | null = null;
    newPiece: PieceDetachee = this.initNewPiece();
    notification: { message: string, type: 'success' | 'error' } | null = null;
    searchTerm: string = '';
    searchCategory: string = 'all';
    userRoles: string[] = [];
    categories: Categorie[] = [];
    produitsFinis: ProduitFini[] = [];
    showQuickAddCategory = false;
    showQuickAddProduct = false;
    newCategory: Categorie = { nom: '', code: '', description: '' };
    newProduct: ProduitFini = { code: '', designation: '' };
    showDeleteConfirm = false;
    itemToDelete: any = null;
    selectedFile: File | null = null;
    imagePreview: string | null = null;

    showCategorySelector = false;
    showProductSelector = false;
    categorySearchTerm = '';
    productSearchTerm = '';
    quickProductFile: File | null = null;
    newProductPreview: string | null = null;

    showAssociatedProductsModal = false;
    selectedPieceForProducts: PieceDetachee | null = null;
    associatedProductsSearchTerm: string = '';

    private keycloak = inject(KeycloakService);
    private platformId = inject(PLATFORM_ID);
    private cdr = inject(ChangeDetectorRef);

    constructor(private magasinierService: MagasinierService) { }

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.userRoles = this.keycloak.getUserRoles() || [];
            this.cdr.detectChanges();
            this.loadPieces();
            this.loadCategories();
            this.loadProduits();
        }
    }


    hasRole(role: string): boolean {
        const targetRole = role.toUpperCase().replace('ROLE_', '');
        return this.userRoles.some(r => {
            const upperR = r.toUpperCase().replace('ROLE_', '');
            return upperR === targetRole;
        });
    }

    canManage(): boolean {
        return this.hasRole('MAGASINIER');
    }

    initNewPiece(): PieceDetachee {
        return {
            codeBarre: '',
            designation: '',
            prixVente: 0,
            reference: '',
            seuilMinimum: 0,
            tauxTVA: 0,
            archivee: false,
            categorie: { nom: '' },
            imageUrl: ''
        };
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            this.selectedFile = input.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                this.imagePreview = reader.result as string;
            };
            reader.readAsDataURL(this.selectedFile);
        }
    }

    uploadImage(event: Event, type: 'piece' | 'produit', id: number): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            const file = input.files[0];
            this.doUpload(file, id);
        }
    }

    private doUpload(file: File, id: number): void {
        const formData = new FormData();
        formData.append('file', file);

        this.magasinierService.uploadPieceImage(id, formData).subscribe({
            next: (updatedPiece) => {
                this.notify('Image mise à jour', 'success');
                this.loadPieces();
                if (this.selectedPiece?.id === id) {
                    this.selectedPiece = updatedPiece;
                }
            },
            error: (err) => {
                const msg = typeof err.error === 'string' ? err.error : (err.error?.message || 'Erreur lors du chargement de l\'image');
                this.notify(msg, 'error');
            }
        });
    }

    loadPieces(): void {
        this.loading = true;
        this.magasinierService.getPieces().subscribe({
            next: (data) => {
                this.pieces = data || [];
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.notify('Erreur lors du chargement des pièces', 'error');
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }

    loadCategories(): void {
        this.magasinierService.getCategories().subscribe({
            next: (data) => {
                this.categories = data || [];
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading categories:', err);
                this.cdr.detectChanges();
            }
        });
    }

    loadProduits(): void {
        this.magasinierService.getProduits().subscribe({
            next: (data) => this.produitsFinis = data,
            error: (err) => console.error('Error loading products:', err)
        });
    }

    quickAddCategorySubmit(): void {
        if (!this.newCategory.nom || !this.newCategory.code) return;
        this.magasinierService.createCategorie(this.newCategory).subscribe({
            next: (cat) => {
                this.categories.push(cat);
                this.newPiece.categorie = cat;
                this.showQuickAddCategory = false;
                this.newCategory = { nom: '', code: '', description: '' };
                this.notify('Catégorie ajoutée', 'success');
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.notify('Erreur lors de l\'ajout de la catégorie', 'error');
                this.cdr.detectChanges();
            }
        });
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

    closeQuickAddCategory(event?: Event): void {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        this.showQuickAddCategory = false;
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
        } else {
            this.quickProductFile = null;
            this.newProductPreview = null;
        }
    }

    quickAddProductSubmit(): void {
        if (!this.newProduct.code || !this.newProduct.designation) return;

        this.magasinierService.createProduit(this.newProduct).subscribe({
            next: (prod) => {
                const finalize = (finalProd: ProduitFini) => {
                    this.produitsFinis.push(finalProd);
                    if (!this.newPiece.produitsAssocies) this.newPiece.produitsAssocies = [];
                    this.newPiece.produitsAssocies.push(finalProd);
                    this.showQuickAddProduct = false;
                    this.newProduct = { code: '', designation: '' };
                    this.quickProductFile = null;
                    this.newProductPreview = null;
                    this.notify('Produit ajouté', 'success');
                    this.cdr.detectChanges();
                };

                if (this.quickProductFile && prod.id) {
                    const formData = new FormData();
                    formData.append('file', this.quickProductFile);

                    this.magasinierService.uploadProduitImage(prod.id, formData).subscribe({
                        next: (updatedProd) => finalize(updatedProd),
                        error: (err) => {
                            console.error('Error uploading produit image from quick add:', err);
                            finalize(prod);
                        }
                    });
                } else {
                    finalize(prod);
                }
            },
            error: (err) => {
                this.notify('Erreur lors de l\'ajout du produit', 'error');
                this.cdr.detectChanges();
            }
        });
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

    closeQuickAddProduct(event?: Event): void {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        this.quickProductFile = null;
        this.newProductPreview = null;
        this.showQuickAddProduct = false;
        this.cdr.detectChanges();
    }

    onProductSelect(event: any): void {
        const id = +event.target.value;
        if (!id) return;

        const product = this.produitsFinis.find(p => p.id === id);
        if (product) {
            if (!this.newPiece.produitsAssocies) {
                this.newPiece.produitsAssocies = [];
            }
            if (!this.newPiece.produitsAssocies.some(p => p.id === id)) {
                this.newPiece.produitsAssocies.push(product);
            }
        }
        event.target.value = '';
    }

    removeAssociatedProduct(index: number): void {
        if (this.newPiece.produitsAssocies) {
            this.newPiece.produitsAssocies.splice(index, 1);
            this.cdr.detectChanges();
        }
    }

    toggleProductSelection(product: ProduitFini): void {
        if (!this.newPiece.produitsAssocies) this.newPiece.produitsAssocies = [];
        const index = this.newPiece.produitsAssocies.findIndex(p => p.id === product.id);
        if (index === -1) {
            this.newPiece.produitsAssocies.push(product);
        } else {
            this.newPiece.produitsAssocies.splice(index, 1);
        }
        this.cdr.detectChanges();
    }

    isProductSelected(productId?: number): boolean {
        if (!productId || !this.newPiece.produitsAssocies) return false;
        return this.newPiece.produitsAssocies.some(p => p.id === productId);
    }

    getSelectedProductsCount(): number {
        return this.newPiece.produitsAssocies?.length ?? 0;
    }

    selectCategory(cat: Categorie): void {
        this.newPiece.categorie = cat;
        this.showCategorySelector = false;
        this.cdr.detectChanges();
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (this.showCategorySelector) {
            const target = event.target as HTMLElement;
            const categoryPicker = target.closest('.custom-picker');

            if (!categoryPicker) {
                this.showCategorySelector = false;
                this.cdr.detectChanges();
            }
        }
    }

    toggleCategorySelector(event?: Event): void {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        this.showCategorySelector = !this.showCategorySelector;
        this.cdr.detectChanges();
    }

    toggleProductSelectorModal(event?: Event): void {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        this.showProductSelector = !this.showProductSelector;
        this.cdr.detectChanges();
    }

    get filteredCategories() {
        const term = (this.categorySearchTerm || '').toLowerCase();
        return (this.categories || []).filter(c => (c.nom || '').toLowerCase().includes(term));
    }

    get filteredProduitsSelection() {
        const term = this.productSearchTerm.toLowerCase();
        return this.produitsFinis.filter(p =>
            p.designation.toLowerCase().includes(term) ||
            p.code.toLowerCase().includes(term)
        );
    }

    openCreateModal(): void {
        this.selectedPiece = null;
        this.newPiece = this.initNewPiece();
        this.selectedFile = null;
        this.imagePreview = null;
        this.showCreateModal = true;
    }

    openEditModal(piece: PieceDetachee): void {
        this.selectedPiece = piece;
        this.newPiece = { ...piece, categorie: piece.categorie ? { ...piece.categorie } : { nom: '' } };
        this.selectedFile = null;
        this.imagePreview = piece.imageUrl || null;
        this.showCreateModal = true;
        this.cdr.detectChanges();
    }

    closeCreateModal(): void {
        this.showCreateModal = false;
        this.selectedPiece = null;
        this.newPiece = this.initNewPiece();
        this.selectedFile = null;
        this.imagePreview = null;
        this.cdr.detectChanges();
    }

    savePiece(): void {
        const pieceData = { ...this.newPiece };

        if (pieceData.prixVente <= 0) {
            this.notify('Le prix d\'achat doit être supérieur à 0', 'error');
            return;
        }
        if (pieceData.seuilMinimum < 0) {
            this.notify('Le seuil minimum ne peut pas être négatif', 'error');
            return;
        }
        if (!pieceData.codeBarre || pieceData.codeBarre.trim().length === 0) {
            this.notify('Le code barre est obligatoire', 'error');
            return;
        }


        const alreadyExists = this.pieces.some(p =>
            p.codeBarre === pieceData.codeBarre && p.id !== this.selectedPiece?.id
        );
        if (alreadyExists) {
            this.notify('Ce code barre existe déjà pour une autre pièce', 'error');
            return;
        }

        if (pieceData.categorie && pieceData.categorie.nom && !pieceData.categorie.code) {
            pieceData.categorie.code = 'CAT_' + pieceData.categorie.nom.toUpperCase().replace(/\s+/g, '_');
        }

        if (this.selectedPiece && this.selectedPiece.id) {
            this.magasinierService.updatePiece(this.selectedPiece.id, pieceData).subscribe({
                next: (saved) => {
                    if (this.selectedFile && saved.id) {
                        this.doUpload(this.selectedFile, saved.id);
                    } else {
                        this.notify('Pièce mise à jour', 'success');
                        this.loadPieces();
                    }
                    this.closeCreateModal();
                },
                error: (err) => {
                    const msg = err.error?.message || err.error || 'Erreur lors de la mise à jour';
                    this.notify(msg, 'error');
                }
            });
        } else {
            this.magasinierService.createPiece(pieceData).subscribe({
                next: (saved) => {
                    if (this.selectedFile && saved.id) {
                        this.doUpload(this.selectedFile, saved.id);
                    } else {
                        this.notify('Pièce créée', 'success');
                        this.loadPieces();
                    }
                    this.closeCreateModal();
                },
                error: (err) => {
                    console.error('Create error:', err);
                    const msg = err.error?.message || (typeof err.error === 'string' ? err.error : 'Erreur lors de la création');
                    this.notify(msg, 'error');
                }
            });
        }
    }

    confirmDelete(piece: PieceDetachee): void {
        this.itemToDelete = piece;
        this.showDeleteConfirm = true;
        this.cdr.detectChanges();
    }

    cancelDelete(): void {
        this.itemToDelete = null;
        this.showDeleteConfirm = false;
        this.cdr.detectChanges();
    }

    deletePiece(codeBarre: string): void {
        this.magasinierService.deletePiece(codeBarre).subscribe({
            next: () => {
                this.notify('Pièce supprimée avec succès', 'success');
                this.loadPieces();
                this.cancelDelete();
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.notify('Erreur lors de la suppression', 'error');
                console.error(err);
                this.cancelDelete();
                this.cdr.detectChanges();
            }
        });
    }

    notify(message: string, type: 'success' | 'error'): void {
        this.notification = { message, type };
        this.cdr.detectChanges();
        if (isPlatformBrowser(this.platformId)) {
            const duration = type === 'success' ? 1500 : 5000;
            setTimeout(() => {
                this.notification = null;
                this.cdr.detectChanges();
            }, duration);
        }
    }

    getImageUrl(url: string | null | undefined): string {
        if (!url) return 'assets/images/default-produit.svg';

        if (url.startsWith('/api/images') || url.startsWith('/uploads')) {
            return `http://localhost:8081${url}`;
        }

        if (url.includes('/remote.php/dav/files/')) {
            const parts = url.split('/');
            const filename = parts[parts.length - 1];
            return `http://localhost:8081/api/images/${filename}`;
        }

        return url;
    }

    get filteredPieces() {
        if (!this.searchTerm) return this.pieces;
        const term = this.searchTerm.toLowerCase();
        return this.pieces.filter(p => {
            const designation = (p.designation || '').toLowerCase();
            const reference = (p.reference || '').toLowerCase();
            const codeBarre = (p.codeBarre || '').toString().toLowerCase();

            if (this.searchCategory === 'all') {
                const matchesBasic = designation.includes(term) ||
                    reference.includes(term) ||
                    codeBarre.includes(term);
                const matchesProduct = p.produitsAssocies?.some(prod =>
                    (prod.designation || '').toLowerCase().includes(term) ||
                    (prod.code || '').toLowerCase().includes(term)
                );
                return matchesBasic || !!matchesProduct;
            }
            if (this.searchCategory === 'reference') return reference.includes(term);
            if (this.searchCategory === 'designation') return designation.includes(term);
            if (this.searchCategory === 'codeBarre') return codeBarre.includes(term);
            if (this.searchCategory === 'produit') {
                return !!p.produitsAssocies?.some(prod =>
                    (prod.designation || '').toLowerCase().includes(term) ||
                    (prod.code || '').toLowerCase().includes(term)
                );
            }
            return true;
        });
    }

    triggerChangeDetection(): void {
        this.cdr.detectChanges();
    }

    // Associated Products Methods
    showAssociatedProducts(piece: PieceDetachee): void {
        this.selectedPieceForProducts = piece;
        this.showAssociatedProductsModal = true;
    }

    get filteredAssociatedProducts(): ProduitFini[] {
        const produits = this.selectedPieceForProducts?.produitsAssocies || [];
        if (!this.associatedProductsSearchTerm) {
            return produits;
        }
        const term = this.associatedProductsSearchTerm.toLowerCase();
        return produits.filter(p => {
            const designation = (p.designation || '').toLowerCase();
            const code = (p.code || '').toLowerCase();
            return designation.includes(term) || code.includes(term);
        });
    }

    closeAssociatedProductsModal(): void {
        this.showAssociatedProductsModal = false;
        this.selectedPieceForProducts = null;
        this.associatedProductsSearchTerm = '';
    }
}
