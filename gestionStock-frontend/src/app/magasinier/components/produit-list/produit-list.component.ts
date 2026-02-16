import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KeycloakService } from 'keycloak-angular';
import { MagasinierService } from '../../services/magasinier.service';
import { ProduitFini, PieceDetachee } from '../../models/magasinier.models';

@Component({
    selector: 'app-produit-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './produit-list.component.html',
    styleUrl: './produit-list.component.css'
})
export class ProduitListComponent implements OnInit {
    produits: ProduitFini[] = [];
    showCreateModal = false;
    selectedProduit: ProduitFini | null = null;
    newProduit: ProduitFini = this.initNewProduit();
    notification: { message: string, type: 'success' | 'error' } | null = null;
    searchTerm: string = '';
    searchCategory: string = 'all';
    userRoles: string[] = [];
    selectedFile: File | null = null;
    imagePreview: string | null = null;
    showDeleteConfirm = false;
    itemToDelete: any = null;


    showAssociatedPiecesModal = false;
    selectedProductForPieces: ProduitFini | null = null;
    showPieceDetailsModal = false;
    selectedPieceForDetails: PieceDetachee | null = null;
    associatedPiecesSearchTerm: string = '';

    private keycloak = inject(KeycloakService);
    private platformId = inject(PLATFORM_ID);
    private cdr = inject(ChangeDetectorRef);

    constructor(private magasinierService: MagasinierService) { }

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.userRoles = this.keycloak.getUserRoles() || [];
            this.cdr.detectChanges();
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

    initNewProduit(): ProduitFini {
        return {
            code: '',
            designation: '',
            pieces: [],
            estArchivee: false,
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

        this.magasinierService.uploadProduitImage(id, formData).subscribe({
            next: (updatedProduit) => {
                this.notify('Image mise à jour', 'success');
                this.loadProduits();
                if (this.selectedProduit?.id === id) {
                    this.selectedProduit = updatedProduit;
                }
            },
            error: (err) => {
                console.error('Error uploading produit image:', err);
                this.notify('Erreur lors du chargement de l\'image', 'error');
            }
        });
    }

    loadProduits(): void {
        this.magasinierService.getProduits().subscribe({
            next: (data) => {
                this.produits = data || [];
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.notify('Erreur lors du chargement des produits', 'error');
                this.cdr.detectChanges();
            }
        });
    }

    openCreateModal(): void {
        this.selectedProduit = null;
        this.newProduit = this.initNewProduit();
        this.selectedFile = null;
        this.imagePreview = null;
        this.showCreateModal = true;
        this.cdr.detectChanges();
    }

    openEditModal(produit: ProduitFini): void {
        this.selectedProduit = produit;
        this.newProduit = { ...produit };
        this.selectedFile = null;
        this.imagePreview = produit.imageUrl || null;
        this.showCreateModal = true;
        this.cdr.detectChanges();
    }

    closeCreateModal(): void {
        this.showCreateModal = false;
        this.cdr.detectChanges();
    }

    saveProduit(): void {
        if (this.selectedProduit && this.selectedProduit.id) {
            this.magasinierService.updateProduit(this.selectedProduit.id, this.newProduit).subscribe({
                next: (saved) => {
                    if (this.selectedFile && saved.id) {
                        this.doUpload(this.selectedFile, saved.id);
                    } else {
                        this.notify('Produit mis à jour', 'success');
                        this.loadProduits();
                    }
                    this.closeCreateModal();
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    const msg = err.error?.message || err.error || 'Erreur lors de la mise à jour';
                    this.notify(msg, 'error');
                    this.cdr.detectChanges();
                }
            });
        } else {
            this.magasinierService.createProduit(this.newProduit).subscribe({
                next: (saved) => {
                    if (this.selectedFile && saved.id) {
                        this.doUpload(this.selectedFile, saved.id);
                    } else {
                        this.notify('Produit créé', 'success');
                        this.loadProduits();
                    }
                    this.closeCreateModal();
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    const msg = err.error?.message || err.error || 'Erreur lors de la création';
                    this.notify(msg, 'error');
                    this.cdr.detectChanges();
                }
            });
        }
    }

    confirmDelete(produit: ProduitFini): void {
        this.itemToDelete = produit;
        this.showDeleteConfirm = true;
        this.cdr.detectChanges();
    }

    cancelDelete(): void {
        this.showDeleteConfirm = false;
        this.itemToDelete = null;
        this.cdr.detectChanges();
    }

    deleteProduit(id: number): void {
        this.magasinierService.deleteProduit(id).subscribe({
            next: () => {
                this.notify('Produit supprimé', 'success');
                this.loadProduits();
                this.cancelDelete();
                this.cdr.detectChanges();
            },
            error: () => {
                this.notify('Erreur lors de la suppression', 'error');
                this.cdr.detectChanges();
            }
        });
    }

    notify(message: string, type: 'success' | 'error'): void {
        this.notification = { message, type };
        this.cdr.detectChanges();
        if (isPlatformBrowser(this.platformId)) {
            setTimeout(() => {
                this.notification = null;
                this.cdr.detectChanges();
            }, 5000);
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

    get filteredProduits() {
        if (!this.searchTerm) return this.produits;
        const term = this.searchTerm.toLowerCase();
        return (this.produits || []).filter(p => {
            if (this.searchCategory === 'all') {
                const matchesBasic = (p.designation || '').toLowerCase().includes(term) ||
                    (p.code || '').toLowerCase().includes(term);
                const matchesPiece = p.pieces?.some(piece =>
                    piece.designation.toLowerCase().includes(term) ||
                    piece.reference.toLowerCase().includes(term) ||
                    piece.codeBarre.toLowerCase().includes(term)
                );
                return matchesBasic || matchesPiece;
            }
            if (this.searchCategory === 'code') return (p.code || '').toLowerCase().includes(term);
            if (this.searchCategory === 'designation') return (p.designation || '').toLowerCase().includes(term);
            if (this.searchCategory === 'piece') {
                return p.pieces?.some(piece =>
                    piece.designation.toLowerCase().includes(term) ||
                    piece.reference.toLowerCase().includes(term) ||
                    piece.codeBarre.toLowerCase().includes(term)
                );
            }
            return true;
        });
    }


    showAssociatedPieces(produit: ProduitFini): void {
        this.selectedProductForPieces = produit;
        this.showAssociatedPiecesModal = true;
        this.cdr.detectChanges();
    }

    get filteredAssociatedPieces(): PieceDetachee[] {
        const pieces = this.selectedProductForPieces?.pieces || [];
        if (!this.associatedPiecesSearchTerm) {
            return pieces;
        }
        const term = this.associatedPiecesSearchTerm.toLowerCase();
        return pieces.filter(p => {
            const designation = (p.designation || '').toLowerCase();
            const reference = (p.reference || '').toLowerCase();
            const codeBarre = (p.codeBarre || '').toString().toLowerCase();
            return designation.includes(term) || reference.includes(term) || codeBarre.includes(term);
        });
    }

    closeAssociatedPiecesModal(): void {
        this.showAssociatedPiecesModal = false;
        this.selectedProductForPieces = null;
        this.associatedPiecesSearchTerm = '';
        this.showPieceDetailsModal = false;
        this.selectedPieceForDetails = null;
        this.cdr.detectChanges();
    }

    openPieceDetailsModal(piece: PieceDetachee): void {
        this.selectedPieceForDetails = piece;
        this.showPieceDetailsModal = true;
        this.cdr.detectChanges();
    }

    closePieceDetailsModal(): void {
        this.showPieceDetailsModal = false;
        this.selectedPieceForDetails = null;
        this.cdr.detectChanges();
    }

    triggerChangeDetection(): void {
        this.cdr.detectChanges();
    }
}
