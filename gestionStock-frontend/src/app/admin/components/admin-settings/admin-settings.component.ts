import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EntrepriseService } from '../../services/entreprise.service';
import { Entreprise } from '../../models/entreprise.model';
import { AdminService } from '../../services/admin.service';
import { UserRepresentation } from '../../models/admin.models';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-admin-settings',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './admin-settings.component.html',
    styleUrls: ['./admin-settings.component.css']
})
export class AdminSettingsComponent implements OnInit {
    activeUsers = 0;
    languagesCount = 1;

    entreprise: Entreprise | null = null;
    loadingEntreprise = true;

    searchTerm = '';
    allUsers: UserRepresentation[] = [];
    searchResults: UserRepresentation[] = [];

    constructor(
        private entrepriseService: EntrepriseService,
        private adminService: AdminService
    ) { }

    ngOnInit(): void {
        this.loadEntreprise();
        this.loadUsers();
    }

    loadEntreprise(): void {
        this.entrepriseService.getCurrentEntreprise().subscribe({
            next: (data) => {
                this.entreprise = data;
                this.loadingEntreprise = false;
            },
            error: (err) => {
                if (err.status !== 404 && err.status !== 401) {
                    console.error(err);
                }
                this.entreprise = null;
                this.loadingEntreprise = false;
            }
        });
    }

    loadUsers(): void {
        this.adminService.getAllUsers().subscribe({
            next: (users) => {
                this.allUsers = users;
                this.activeUsers = users.length;
            },
            error: (err) => {
                if (err.status !== 404 && err.status !== 403) {
                    console.error('Error loading users:', err);
                }
                this.allUsers = [];
                this.activeUsers = 0;
            }
        });
    }

    searchUsers(): void {
        if (!this.searchTerm.trim()) {
            this.searchResults = [];
            return;
        }

        const term = this.searchTerm.toLowerCase().trim();
        this.searchResults = this.allUsers.filter(user =>
            (user.firstName?.toLowerCase().includes(term)) ||
            (user.lastName?.toLowerCase().includes(term)) ||
            (user.email?.toLowerCase().includes(term)) ||
            (user.username?.toLowerCase().includes(term))
        ).slice(0, 5);
    }

    /** Same URL resolver as piece-list for Nextcloud/local images */
    getLogoUrl(url: string | null | undefined): string {
        if (!url) return '';
        if (url.startsWith('data:image/') || url.startsWith('http')) return url;
        if (url.startsWith('/api/images') || url.startsWith('/uploads')) {
            return `http://localhost:8081${url}`;
        }
        if (url.includes('/remote.php/dav/files/')) {
            const parts = url.split('/');
            return `http://localhost:8081/api/images/${parts[parts.length - 1]}`;
        }
        return url;
    }
}
