import { Component, OnInit, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AdminService } from '../../services/admin.service';
import { EntrepriseService } from '../../services/entreprise.service';
import { UserRepresentation } from '../../models/admin.models';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
    selector: 'app-user-list',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './user-list.component.html',
    styleUrl: './user-list.component.css'
})
export class UserListComponent implements OnInit {
    users: UserRepresentation[] = [];
    loadingUsers = false;
    hasEntreprise: boolean | null = null;
    showCreateModal = false;
    showDeleteModal = false;
    showRoleModal = false;
    valideRoles = ['RESPONSABLE_LOGISTIQUE', 'AUDITEUR', 'MAGASINIER'];
    userRoles: string[] = [];
    newUser: any = { role: 'MAGASINIER' };
    userToDelete: UserRepresentation | null = null;
    notification: { message: string, type: 'success' | 'error' } | null = null;
    selectedRoleFilter: string = 'All';
    searchTerm: string = '';
    statusFilter: 'All' | 'Active' | 'Inactive' = 'All';
    showStatusDropdown = false;


    showConfirmStatusModal = false;
    showConfirmRoleModal = false;
    showResetPasswordModal = false;
    activeTab: 'details' | 'activities' = 'details';
    selectedUser: UserRepresentation | null = null;
    pendingStatusUser: UserRepresentation | null = null;
    pendingRoleChange: { roleName: string, action: 'add' | 'remove' | 'replace', oldRole?: string } | null = null;
    resetPasswordData = { newPassword: '', confirmPassword: '' };

    get availableRoles() {
        return this.valideRoles;
    }

    get filteredUsers() {
        const term = this.searchTerm.toLowerCase().trim();
        return this.users.filter(user => {
            const matchesRole = this.selectedRoleFilter === 'All' || user.role === this.selectedRoleFilter;
            
            const matchesStatus = this.statusFilter === 'All' || 
                                (this.statusFilter === 'Active' && user.enabled) || 
                                (this.statusFilter === 'Inactive' && !user.enabled);

            const matchesSearch = !term ||
                (user.username?.toLowerCase().includes(term) ||
                    user.email?.toLowerCase().includes(term) ||
                    user.firstName?.toLowerCase().includes(term) ||
                    user.lastName?.toLowerCase().includes(term));
            
            return matchesRole && matchesStatus && matchesSearch;
        });
    }

    getUserCountByRole(role: string): number {
        if (role === 'All') return this.users.length;
        return this.users.filter(u => u.role === role).length;
    }

    setRoleFilter(role: string) {
        this.selectedRoleFilter = role;
    }

    setStatusFilter(status: 'All' | 'Active' | 'Inactive') {
        this.statusFilter = status;
        this.showStatusDropdown = false;
    }

    toggleStatusDropdown() {
        this.showStatusDropdown = !this.showStatusDropdown;
    }

    constructor(
        private adminService: AdminService,
        private entrepriseService: EntrepriseService,
        private router: Router,
        @Inject(PLATFORM_ID) private platformId: Object
    ) { }

    @HostListener('window:click', ['$event'])
    onWindowClick(event: MouseEvent) {
        if (this.showStatusDropdown) {
            const target = event.target as HTMLElement;
            if (!target.closest('.status-filter-wrapper')) {
                this.showStatusDropdown = false;
            }
        }
    }

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.checkEntreprise();
            this.loadUsers();
        }
    }

    checkEntreprise() {
        this.entrepriseService.getCurrentEntreprise().subscribe({
            next: (e) => {
                this.hasEntreprise = !!(e && e.id);
            },
            error: () => {
                this.hasEntreprise = false;
            }
        });
    }

    loadUsers() {
        this.loadingUsers = true;
        this.adminService.getAllUsers().subscribe({
            next: (data) => {
                this.users = data;
                this.loadingUsers = false;
                // Auto-selection du premier utilisateur
                if (this.users.length > 0 && !this.selectedUser) {
                    this.onSelectUser(this.users[0]);
                }
            },
            error: (err) => {
                this.loadingUsers = false;
                if (err.status === 403 || err.status === 404) {
                    this.users = [];
                    // Silence notify to avoid spam
                } else {
                    console.error('Erreur loading users:', err);
                }
            }
        });
    }

    onSelectUser(user: UserRepresentation) {
        this.selectedUser = user;
        this.activeTab = 'details';
    }

    notify(message: string, type: 'success' | 'error') {
        this.notification = { message, type };
        if (isPlatformBrowser(this.platformId)) {
            setTimeout(() => {
                if (this.notification?.message === message) {
                    this.notification = null;
                }
            }, 5000);
        }
    }

    openCreateModal() {
        if (!this.hasEntreprise) {
            this.notify(
                'Vous devez d\'abord créer votre entreprise dans les paramètres avant d\'ajouter des utilisateurs.',
                'error'
            );
            return;
        }
        this.newUser = { role: 'MAGASINIER', password: '', confirmPassword: '' };
        this.showCreateModal = true;
    }

    goToEntrepriseSettings() {
        this.router.navigate(['/admin/settings']);
    }

    closeCreateModal() {
        this.showCreateModal = false;
    }

    createUser() {
        if (!this.newUser.firstName || !this.newUser.firstName.trim() ||
            !this.newUser.lastName || !this.newUser.lastName.trim() ||
            !this.newUser.email || !this.newUser.email.trim() ||
            !this.newUser.password || !this.newUser.role) {
            this.notify('Veuillez remplir correctement tous les champs obligatoires.', 'error');
            return;
        }

        if (this.newUser.password.length < 8) {
            this.notify('Le mot de passe doit contenir au moins 8 caractères', 'error');
            return;
        }
        if (this.newUser.password !== this.newUser.confirmPassword) {
            this.notify('Les mots de passe ne correspondent pas', 'error');
            return;
        }

        const username = this.newUser.username || this.newUser.email;

        const userToCreate: any = {
            username: username,
            email: this.newUser.email,
            firstName: this.newUser.firstName,
            lastName: this.newUser.lastName,
            enabled: true,
            role: this.newUser.role,
            credentials: [{ type: 'password', value: this.newUser.password, temporary: false }]
        };

        this.adminService.createUser(userToCreate).subscribe({
            next: (res) => {
                this.closeCreateModal();
                this.notify(res.message || 'Utilisateur créé avec succès', 'success');

                if (res.user) {
                    this.users = [res.user, ...this.users];
                }

                setTimeout(() => {
                    this.loadUsers();
                }, 1000);
            },
            error: (err) => {
                console.error('Erreur lors de la création:', err);
                const errorMessage = err.error?.message || err.error || 'Erreur inconnue lors de la création';
                this.notify('Erreur : ' + errorMessage, 'error');
            }
        });
    }

    deleteUser(user: UserRepresentation) {
        this.userToDelete = user;
        this.showDeleteModal = true;
    }


    closeDeleteModal() {
        this.showDeleteModal = false;
        this.userToDelete = null;
    }

    manageRoles(user: UserRepresentation) {
        this.selectedUser = { ...user }; // Clone to avoid direct mutation before confirmation
        this.showRoleModal = true;

        // 1. Instant Normalization and Pre-Check
        const currentRole = user.role ? user.role.toUpperCase().replace('ROLE_', '').trim() : '';
        this.userRoles = currentRole ? [currentRole] : [];

        console.log('Opening modal for:', user.email, 'Current Role Normalized:', currentRole);

        // 2. Fetch from server to ensure synchronization
        if (user.id) {
            this.adminService.getUserRoles(user.id).subscribe({
                next: (roles) => {
                    const serverRoles = roles.map(r => r.name.toUpperCase().replace('ROLE_', '').trim());
                    // Business check: we only care about roles defined in our valideRoles
                    const businessRole = serverRoles.find(r => this.valideRoles.includes(r));

                    if (businessRole) {
                        this.userRoles = [businessRole];
                        if (this.selectedUser) this.selectedUser.role = businessRole;
                        // Synchronize back to the main list as well
                        const index = this.users.findIndex(u => u.id === user.id);
                        if (index !== -1) this.users[index].role = businessRole;
                    }
                },
                error: (err) => console.error('Roles sync error:', err)
            });
        }
    }

    closeRoleModal() {
        this.showRoleModal = false;
        this.selectedUser = null;
        this.userRoles = [];
    }

    hasRole(roleName: string): boolean {
        if (!roleName || !this.userRoles || this.userRoles.length === 0) return false;
        const normalizedTarget = roleName.toUpperCase().replace('ROLE_', '').trim();
        // Check if any of our detected roles match the target
        return this.userRoles.some(r => r.toUpperCase().replace('ROLE_', '').trim() === normalizedTarget);
    }

    addRole(roleName: string) {
        if (this.userRoles.length > 0) {
            const oldRole = this.userRoles[0];
            if (oldRole === roleName) return;
            this.pendingRoleChange = { roleName, action: 'replace', oldRole };
        } else {
            this.pendingRoleChange = { roleName, action: 'add' };
        }
        this.showConfirmRoleModal = true;
    }

    removeRole(roleName: string) {
        this.pendingRoleChange = { roleName, action: 'remove' };
        this.showConfirmRoleModal = true;
    }

    executeRoleChange() {
        if (!this.selectedUser?.id || !this.pendingRoleChange) return;

        const { roleName, action, oldRole } = this.pendingRoleChange;
        const userId = this.selectedUser.id;

        if (action === 'replace' && oldRole) {
            this.adminService.removeRole(userId, oldRole).subscribe({
                next: () => {
                    this.adminService.assignRole(userId, roleName).subscribe({
                        next: () => this.finalizeRole(roleName),
                        error: (err) => this.handleRoleError(err)
                    });
                },
                error: (err) => this.handleRoleError(err)
            });
        } else if (action === 'add') {
            this.adminService.assignRole(userId, roleName).subscribe({
                next: () => this.finalizeRole(roleName),
                error: (err) => this.handleRoleError(err)
            });
        } else if (action === 'remove') {
            this.adminService.removeRole(userId, roleName).subscribe({
                next: () => {
                    this.userRoles = [];
                    if (this.selectedUser) this.selectedUser.role = 'AUCUN';
                    this.notify('Rôle retiré avec succès', 'success');
                    this.closeConfirmRole();
                },
                error: (err) => this.handleRoleError(err)
            });
        }
    }

    private finalizeRole(roleName: string) {
        this.userRoles = [roleName];
        if (this.selectedUser) this.selectedUser.role = roleName;
        this.notify('Rôle mis à jour avec succès', 'success');
        this.closeConfirmRole();
    }

    private handleRoleError(err: any) {
        console.error('Erreur rôle:', err);
        this.notify('Erreur lors de la modification du rôle', 'error');
        this.closeConfirmRole();
    }

    closeConfirmRole() {
        this.showConfirmRoleModal = false;
        this.pendingRoleChange = null;
    }

    toggleStatus(user: UserRepresentation) {
        this.pendingStatusUser = user;
        this.showConfirmStatusModal = true;
    }

    confirmStatusChange() {
        if (!this.pendingStatusUser?.id) return;

        const user = this.pendingStatusUser;
        const newStatus = !user.enabled;

        this.adminService.toggleUserStatus(user.id!, newStatus).subscribe({
            next: () => {
                user.enabled = newStatus;
                this.notify(`Utilisateur ${newStatus ? 'activé' : 'bloqué'} avec succès`, 'success');
                this.closeConfirmStatus();
            },
            error: (err) => {
                console.error('Erreur lors du changement de statut:', err);
                this.notify('Erreur lors du changement de statut.', 'error');
                this.closeConfirmStatus();
            }
        });
    }

    closeConfirmStatus() {
        this.showConfirmStatusModal = false;
        this.pendingStatusUser = null;
    }

    openResetPassword(user: UserRepresentation) {
        this.selectedUser = user;
        this.resetPasswordData = { newPassword: '', confirmPassword: '' };
        this.showResetPasswordModal = true;
    }

    closeResetPassword() {
        this.showResetPasswordModal = false;
        this.selectedUser = null;
    }

    getRoleDisplayName(role: string | undefined): string {
        if (!role || role === 'AUCUN' || role === 'Aucun') return 'Aucun';

        const technicalRoles = [
            'manage-account', 'view-profile', 'manage-account-links',
            'offline_access', 'uma_authorization', 'default-roles'
        ];

        const lowRole = role.toLowerCase();
        if (technicalRoles.some(t => lowRole.includes(t))) {
            return 'Utilisateur';
        }

        const cleanRole = role.toUpperCase().replace('ROLE_', '');
        switch (cleanRole) {
            case 'ADMINISTRATEUR': return 'Administrateur';
            case 'RESPONSABLE_LOGISTIQUE': return 'Responsable Logistique';
            case 'AUDITEUR': return 'Auditeur';
            case 'MAGASINIER': return 'Magasinier';
            default: return role.replace('ROLE_', '');
        }
    }

    confirmResetPassword() {
        if (!this.selectedUser?.id || !this.resetPasswordData.newPassword) return;

        if (this.resetPasswordData.newPassword !== this.resetPasswordData.confirmPassword) {
            this.notify('Les mots de passe ne correspondent pas', 'error');
            return;
        }

        if (this.resetPasswordData.newPassword.length < 8) {
            this.notify('Le mot de passe doit contenir au moins 8 caractères', 'error');
            return;
        }

        this.adminService.resetUserPassword(this.selectedUser.id, this.resetPasswordData.newPassword).subscribe({
            next: () => {
                this.notify('Mot de passe réinitialisé avec succès', 'success');
                this.closeResetPassword();
            },
            error: (err) => {
                console.error('Erreur reset password:', err);
                this.notify('Erreur lors de la réinitialisation du mot de passe', 'error');
            }
        });
    }
}
