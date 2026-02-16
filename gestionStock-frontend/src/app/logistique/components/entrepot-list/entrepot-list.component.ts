import { Component, OnInit, inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KeycloakService } from 'keycloak-angular';
import { LogistiqueService } from '../../services/logistique.service';
import { Entrepot } from '../../models/logistique.models';

@Component({
    selector: 'app-entrepot-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './entrepot-list.component.html',
    styleUrl: './entrepot-list.component.css'
})
export class EntrepotListComponent implements OnInit {
    entrepots: Entrepot[] = [];
    filteredEntrepots: Entrepot[] = [];
    searchTerm = '';
    loading = false;
    showCreateModal = false;
    selectedEntrepot: Entrepot | null = null;
    newEntrepot: Entrepot = { nomEntrepot: '', adresse: '', ville: '', taille: 0 };

    showDeleteConfirm = false;
    itemToDelete: Entrepot | null = null;
    notification: { message: string, type: 'success' | 'error' } | null = null;

    private logistiqueService = inject(LogistiqueService);
    private cdr = inject(ChangeDetectorRef);
    private keycloak = inject(KeycloakService);
    private platformId = inject(PLATFORM_ID);

    userRoles: string[] = [];

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.initAuth();
            this.loadEntrepots();
        }
    }

    private initAuth() {
        try {
            const instance = this.keycloak.getKeycloakInstance();
            if (instance && instance.authenticated) {
                this.userRoles = this.keycloak.getUserRoles();
                console.log('User roles loaded:', this.userRoles);
            }
        } catch (error) {
            console.error('Keycloak initialization check failed:', error);
        }
    }

    hasRole(role: string): boolean {
        const normalize = (r: string) => r.toUpperCase().replace('ROLE_', '').replace(/\s+/g, '_');
        const targetRole = normalize(role);
        return this.userRoles.some(r => normalize(r) === targetRole);
    }

    canManage(): boolean {
        return this.hasRole('RESPONSABLE_LOGISTIQUE');
    }

    loadEntrepots() {
        this.loading = true;
        this.logistiqueService.getAll().subscribe({
            next: (data) => {
                this.entrepots = data;
                this.onSearch();
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading entrepots:', err);
                this.notify('Erreur lors du chargement des entrepôts', 'error');
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }

    onSearch() {
        if (!this.searchTerm.trim()) {
            this.filteredEntrepots = [...this.entrepots];
        } else {
            const term = this.searchTerm.toLowerCase().trim();
            this.filteredEntrepots = this.entrepots.filter(e =>
                e.nomEntrepot.toLowerCase().includes(term) ||
                e.adresse.toLowerCase().includes(term) ||
                e.ville.toLowerCase().includes(term)
            );
        }
        this.cdr.detectChanges();
    }

    getUniqueVilles(): number {
        return new Set(this.entrepots.map(e => e.ville.toLowerCase().trim())).size;
    }

    getTotalCapacite(): number {
        return this.entrepots.reduce((acc, curr) => acc + (curr.taille || 0), 0);
    }

    openCreateModal() {

        this.selectedEntrepot = null;
        this.newEntrepot = { nomEntrepot: '', adresse: '', ville: '', taille: 0 };
        this.showCreateModal = true;
        this.cdr.detectChanges();
    }

    openEditModal(entrepot: Entrepot) {

        this.selectedEntrepot = entrepot;

        this.newEntrepot = { ...entrepot };
        this.showCreateModal = true;
        this.cdr.detectChanges();
    }

    closeCreateModal() {
        this.showCreateModal = false;
        this.selectedEntrepot = null;
        this.cdr.detectChanges();
    }

    saveEntrepot() {
        if (!this.newEntrepot.nomEntrepot || !this.newEntrepot.adresse || !this.newEntrepot.ville || this.newEntrepot.taille === null || this.newEntrepot.taille === undefined) {
            this.notify('Veuillez remplir tous les champs obligatoires', 'error');
            return;
        }

        if (this.selectedEntrepot && this.selectedEntrepot.id) {

            this.logistiqueService.update(this.selectedEntrepot.id, this.newEntrepot).subscribe({
                next: () => {
                    this.notify('Entrepôt modifié avec succès', 'success');
                    this.loadEntrepots();
                    this.closeCreateModal();
                },
                error: (err) => {
                    console.error('Update failed:', err);
                    this.notify('Erreur lors de la modification', 'error');
                }
            });
        } else {

            this.logistiqueService.create(this.newEntrepot).subscribe({
                next: () => {
                    this.notify('Entrepôt ajouté avec succès', 'success');
                    this.loadEntrepots();
                    this.closeCreateModal();
                },
                error: (err) => {
                    console.error('Creation failed:', err);
                    this.notify('Erreur lors de l\'ajout', 'error');
                }
            });
        }
    }

    confirmDelete(entrepot: Entrepot) {

        this.itemToDelete = entrepot;
        this.showDeleteConfirm = true;
        this.cdr.detectChanges();
    }

    cancelDelete() {
        this.itemToDelete = null;
        this.showDeleteConfirm = false;
        this.cdr.detectChanges();
    }

    deleteEntrepot() {
        if (this.itemToDelete && this.itemToDelete.id) {

            this.logistiqueService.delete(this.itemToDelete.id).subscribe({
                next: () => {
                    this.notify('Entrepôt supprimé avec succès', 'success');
                    this.loadEntrepots();
                    this.cancelDelete();
                },
                error: (err) => {
                    console.error('Deletion failed:', err);
                    this.notify('Erreur lors de la suppression', 'error');
                    this.cancelDelete();
                }
            });
        }
    }

    notify(message: string, type: 'success' | 'error') {
        this.notification = { message, type };
        this.cdr.detectChanges();
        setTimeout(() => {
            this.notification = null;
            this.cdr.detectChanges();
        }, 3000);
    }
}
