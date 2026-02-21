import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';
import { LogistiqueService } from '../../services/logistique.service';
import { Fournisseur } from '../../models/logistique.models';

@Component({
    selector: 'app-fournisseur-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './fournisseur-list.component.html',
    styleUrl: './fournisseur-list.component.css'
})
export class FournisseurListComponent implements OnInit {
    fournisseurs: Fournisseur[] = [];
    notification: { message: string, type: 'success' | 'error' } | null = null;
    searchTerm: string = '';
    userRoles: string[] = [];
    showDeleteConfirm = false;
    itemToDelete: any = null;

    private keycloak = inject(KeycloakService);
    private platformId = inject(PLATFORM_ID);
    private cdr = inject(ChangeDetectorRef);
    private router = inject(Router);

    constructor(private logistiqueService: LogistiqueService) { }

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.userRoles = this.keycloak.getUserRoles() || [];
            console.log('User Roles:', this.userRoles);
            console.log('Can Manage:', this.canManage());
            this.loadFournisseurs();
            this.cdr.detectChanges();
        }
    }

    hasRole(role: string): boolean {
        const normalize = (r: string) => r.toUpperCase().replace('ROLE_', '').replace(/\s+/g, '_');
        const targetRole = normalize(role);
        return this.userRoles.some(r => normalize(r) === targetRole);
    }

    canManage(): boolean {
        return this.hasRole('RESPONSABLE_LOGISTIQUE') || this.hasRole('ADMINISTRATEUR');
    }


    loadFournisseurs(): void {
        this.logistiqueService.getAllFournisseurs().subscribe({
            next: (data) => {
                this.fournisseurs = data || [];
                this.cdr.detectChanges();
            },
            error: () => {
                this.notify('Erreur lors du chargement des fournisseurs', 'error');
            }
        });
    }

    openCreateModal(): void {
        this.router.navigate(['/logistique/fournisseurs/nouveau']);
    }

    openEditModal(fournisseur: Fournisseur): void {
        if (fournisseur.id) {
            this.router.navigate(['/logistique/fournisseurs', fournisseur.id]);
        }
    }


    confirmDelete(fournisseur: Fournisseur): void {
        this.itemToDelete = fournisseur;
        this.showDeleteConfirm = true;
        this.cdr.detectChanges();
    }

    cancelDelete(): void {
        this.showDeleteConfirm = false;
        this.itemToDelete = null;
        this.cdr.detectChanges();
    }

    deleteFournisseur(id: number): void {
        this.logistiqueService.deleteFournisseur(id).subscribe({
            next: () => {
                this.notify('Fournisseur archivé', 'success');
                this.loadFournisseurs();
                this.cancelDelete();
            },
            error: () => {
                this.notify('Erreur lors de l\'archivage', 'error');
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

    get filteredFournisseurs() {
        if (!this.searchTerm) return this.fournisseurs;
        const term = this.searchTerm.toLowerCase();
        return this.fournisseurs.filter(f =>
            f.code?.toLowerCase().includes(term) ||
            f.email?.toLowerCase().includes(term) ||
            f.tel?.includes(term)
        );
    }

    openCatalog(fournisseur: Fournisseur) {
        if (fournisseur.id) {
            this.router.navigate(['/logistique/fournisseurs', fournisseur.id, 'catalog']);
        }
    }
}
