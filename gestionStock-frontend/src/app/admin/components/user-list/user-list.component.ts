import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AdminService } from '../../services/admin.service';
import { UserRepresentation } from '../../models/admin.models';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-user-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './user-list.component.html',
    styleUrl: './user-list.component.css'
})
export class UserListComponent implements OnInit {
    users: UserRepresentation[] = [];
    showCreateModal = false;
    showDeleteModal = false;
    showRoleModal = false;
    selectedUser: UserRepresentation | null = null;
    valideRoles = ['RESPONSABL_LOGISTIQUE', 'AUDITEUR', 'MAGASINIER'];
    userRoles: string[] = [];
    newUser: any = { role: 'MAGASINIER' };
    userToDelete: UserRepresentation | null = null;
    notification: { message: string, type: 'success' | 'error' } | null = null;
    searchTerm: string = '';
    searchCategory: string = 'all';


    showConfirmStatusModal = false;
    showConfirmRoleModal = false;
    showResetPasswordModal = false;
    pendingStatusUser: UserRepresentation | null = null;
    pendingRoleChange: { roleName: string, action: 'add' | 'remove' | 'replace', oldRole?: string } | null = null;
    resetPasswordData = { newPassword: '', confirmPassword: '' };

    get availableRoles() {
        return this.valideRoles;
    }

    get filteredUsers() {
        const term = this.searchTerm.toLowerCase().trim();
        if (!term) {
            return this.users;
        }

        return this.users.filter(user => {
            const usernameMatch = user.username?.toLowerCase().includes(term);
            const emailMatch = user.email?.toLowerCase().includes(term);
            const firstNameMatch = user.firstName?.toLowerCase().includes(term);
            const lastNameMatch = user.lastName?.toLowerCase().includes(term);
            const roleMatch = user.role?.toLowerCase().includes(term);
            const statusMatch = (user.enabled ? 'actif' : 'bloqué').includes(term);

            switch (this.searchCategory) {
                case 'username': return usernameMatch;
                case 'email': return emailMatch;
                case 'role': return roleMatch;
                case 'name': return firstNameMatch || lastNameMatch;
                case 'status': return statusMatch;
                default: return usernameMatch || emailMatch || firstNameMatch || lastNameMatch || roleMatch || statusMatch;
            }
        });
    }

    constructor(private adminService: AdminService, @Inject(PLATFORM_ID) private platformId: Object) { }

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.loadUsers();
        }
    }

    loadUsers() {
        this.adminService.getAllUsers().subscribe({
            next: (data) => {
                this.users = data;
            },
            error: (err) => {
                console.error('Erreur lors du chargement des utilisateurs:', err);
                this.notify('Erreur lors du chargement des utilisateurs.', 'error');
            }
        });
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
        this.newUser = { role: 'MAGASINIER' };
        this.showCreateModal = true;
    }

    closeCreateModal() {
        this.showCreateModal = false;
    }

    createUser() {
        if (!this.newUser.email) return;

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
        this.selectedUser = user;
        this.showRoleModal = true;

        if (user.role && user.role !== 'Aucun' && user.role !== 'AUCUN') {
            this.userRoles = [user.role];
        } else {
            this.userRoles = [];
        }

        this.adminService.getUserRoles(user.id!).subscribe(roles => {
            this.userRoles = roles.map(r => r.name);

            const allValidRoles = [...this.valideRoles, 'ADMINISTRATEUR'];
            const businessRole = this.userRoles.find(r => allValidRoles.includes(r));

            if (this.selectedUser) {

                if (businessRole) {
                    this.selectedUser.role = businessRole;
                } else if (!this.selectedUser.role || this.selectedUser.role === 'AUCUN') {
                    this.selectedUser.role = 'AUCUN';
                }
            }
        });
    }

    closeRoleModal() {
        this.showRoleModal = false;
        this.selectedUser = null;
        this.userRoles = [];
    }

    hasRole(roleName: string): boolean {
        return this.userRoles.includes(roleName);
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
                    this.loadUsers();
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
        this.loadUsers();
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
                this.loadUsers();
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
            case 'RESPONSABL_LOGISTIQUE': return 'Responsable Logistique';
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
