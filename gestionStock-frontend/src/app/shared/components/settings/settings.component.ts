import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
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
    notification: { type: 'success' | 'error', message: string } | null = null;
    isBrowser: boolean;

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
        }
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

    showNotification(type: 'success' | 'error', message: string): void {
        this.notification = { type, message };
        setTimeout(() => {
            this.notification = null;
        }, 5000);
    }
}
