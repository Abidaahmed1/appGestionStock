import { Component, OnInit, Inject, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { KeycloakService } from 'keycloak-angular';
import { UserService } from '../../services/user.service';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
    profileForm!: FormGroup;
    passwordForm!: FormGroup;
    appearanceForm!: FormGroup;
    notificationsForm!: FormGroup;
    notification: { type: 'success' | 'error', message: string } | null = null;
    isBrowser: boolean;
    currentSection = signal<'profile' | 'security' | 'appearance' | 'notifications'>('profile');
    userRole: string = 'Utilisateur';

    setSection(section: 'profile' | 'security' | 'appearance' | 'notifications') {
        this.currentSection.set(section);
    }

    constructor(
        private fb: FormBuilder,
        private keycloak: KeycloakService,
        private userService: UserService,
        @Inject(PLATFORM_ID) platformId: Object
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

    ngOnInit(): void {
        this.initializeForms();
        if (this.isBrowser) {
            this.loadUserProfile();
        }
    }
    initializeForms(): void {
        this.profileForm = this.fb.group({
            firstName: ['', Validators.required],
            lastName: ['', Validators.required],
            email: [{ value: '', disabled: true }, [Validators.required, Validators.email]]
        });

        this.passwordForm = this.fb.group({
            currentPassword: ['', Validators.required],
            newPassword: ['', [Validators.required, Validators.minLength(8)]],
            confirmPassword: ['', Validators.required]
        }, { validators: this.passwordMatchValidator });

        this.appearanceForm = this.fb.group({
            theme: ['light'],
            accentColor: ['teal'],
            sidebarDensity: ['standard']
        });

        this.notificationsForm = this.fb.group({
            emailOrders: [true],
            emailStock: [true],
            pushAlerts: [true]
        });
    }

    updateAppearance(): void {
        if (this.appearanceForm.valid) {
            this.userService.updateAppearance(this.appearanceForm.value).subscribe({
                next: () => {
                    this.appearanceForm.markAsPristine();
                },
                error: (err) => {
                    console.error('Error updating appearance:', err);
                    this.showNotification('error', 'Erreur lors de la sauvegarde de l\'apparence');
                }
            });
        }
    }

    updateNotifications(): void {
        if (this.notificationsForm.valid) {
            this.userService.updateNotifications(this.notificationsForm.value).subscribe({
                next: () => {
                    this.notificationsForm.markAsPristine();
                },
                error: (err) => {
                    console.error('Error updating notifications:', err);
                    this.showNotification('error', 'Erreur lors de la sauvegarde des notifications');
                }
            });
        }
    }


    passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
        const newPassword = control.get('newPassword');
        const confirmPassword = control.get('confirmPassword');

        if (!newPassword || !confirmPassword) {
            return null;
        }

        return newPassword.value === confirmPassword.value ? null : { 'mismatch': true };
    }

    loadUserProfile(): void {
        const token = this.keycloak.getKeycloakInstance().tokenParsed;
        if (token) {
            this.profileForm.patchValue({
                firstName: token['given_name'] || '',
                lastName: token['family_name'] || '',
                email: token['email'] || ''
            });

            const realmAccess = token['realm_access'] as any;
            if (realmAccess && realmAccess.roles) {
                if (realmAccess.roles.includes('ADMIN')) this.userRole = 'Administrateur';
                else if (realmAccess.roles.includes('MAGASINIER')) this.userRole = 'Magasinier';
            }
        }

        this.userService.getCurrentUser().subscribe({
            next: (user) => {
                if (user) {
                    this.appearanceForm.patchValue({
                        theme: user.theme || 'light',
                        accentColor: user.accentColor || 'teal'
                    });
                    this.notificationsForm.patchValue({
                        emailOrders: user.emailOrders,
                        emailStock: user.emailStock,
                        pushAlerts: user.pushAlerts
                    });
                }
            },
            error: (err) => console.error('Error loading user preferences:', err)
        });
    }

    updateProfile(): void {
        if (this.profileForm.valid) {
            const profileData = this.profileForm.value;

            this.userService.updateProfile(profileData).subscribe({
                next: async () => {
                    this.showNotification('success', 'Profil mis à jour avec succès');
                    this.profileForm.markAsPristine();

                    try {
                        await this.keycloak.updateToken(-1);
                        this.loadUserProfile();
                    } catch (error) {
                        console.error('Error refreshing session:', error);
                    }
                },
                error: (err) => {
                    console.error('Error updating profile:', err);
                    this.showNotification('error', 'Erreur lors de la mise à jour du profil');
                }
            });
        }
    }

    updatePassword(): void {
        if (this.passwordForm.valid) {
            const passwordData = {
                newPassword: this.passwordForm.value.newPassword
            };

            this.userService.updatePassword(passwordData).subscribe({
                next: () => {
                    this.showNotification('success', 'Mot de passe modifié avec succès');
                    this.passwordForm.reset();
                    this.passwordForm.markAsPristine();
                },
                error: (err) => {
                    console.error('Error updating password:', err);
                    this.showNotification('error', 'Erreur lors de la modification du mot de passe');
                }
            });
        }
    }

    cancelProfileEdit(): void {
        this.loadUserProfile();
        this.profileForm.markAsPristine();
    }

    cancelPasswordEdit(): void {
        this.passwordForm.reset();
        this.passwordForm.markAsPristine();
    }

    getPasswordStrengthWidth(): string {
        const pwd = this.passwordForm.get('newPassword')?.value || '';
        if (pwd.length === 0) return '0%';
        if (pwd.length < 5) return '25%';
        if (pwd.length < 8) return '50%';
        if (pwd.length < 12) return '75%';
        return '100%';
    }

    getPasswordStrengthColor(): string {
        const pwd = this.passwordForm.get('newPassword')?.value || '';
        if (pwd.length < 8) return '#ef4444';
        if (pwd.length < 12) return '#f59e0b';
        return '#22c55e';
    }

    getPasswordStrengthText(): string {
        const pwd = this.passwordForm.get('newPassword')?.value || '';
        if (pwd.length === 0) return '';
        if (pwd.length < 8) return 'Faible';
        if (pwd.length < 12) return 'Moyen';
        return 'Fort';
    }

    showNotification(type: 'success' | 'error', message: string): void {
        this.notification = { type, message };
        setTimeout(() => {
            this.notification = null;
        }, 5000);
    }
}
