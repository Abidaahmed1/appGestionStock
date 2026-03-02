import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NotificationService } from '../../services/notification.service';
import { Notification } from '../../models/notification.model';
import { KeycloakService } from 'keycloak-angular';

@Component({
    selector: 'app-notifications',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './notifications.component.html',
    styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit, OnDestroy {
    notifications: Notification[] = [];
    unreadCount: number = 0;
    showDropdown: boolean = false;
    userRole: string = '';
    private refreshInterval: any;

    constructor(
        private notificationService: NotificationService,
        private keycloak: KeycloakService,
        private cdr: ChangeDetectorRef,
        private ngZone: NgZone,
        @Inject(PLATFORM_ID) private platformId: Object
    ) { }

    async ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            const roles = this.keycloak.getUserRoles();
            const normalize = (r: string) => r.toUpperCase().replace('ROLE_', '').replace(/\s+/g, '_');
            const normalizedRoles = roles.map(normalize);

            if (normalizedRoles.includes('RESPONSABLE_LOGISTIQUE')) this.userRole = 'RESPONSABLE_LOGISTIQUE';
            else if (normalizedRoles.includes('MAGASINIER')) this.userRole = 'MAGASINIER';
            else if (normalizedRoles.includes('AUDITEUR')) this.userRole = 'AUDITEUR';

            this.loadNotifications();

            this.ngZone.runOutsideAngular(() => {
                this.refreshInterval = setInterval(() => {
                    this.ngZone.run(() => {
                        this.loadNotifications();
                    });
                }, 30000);
            });
        }
    }

    ngOnDestroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }

    loadNotifications() {
        this.notificationService.getNotifications().subscribe({
            next: (data: Notification[]) => {
                this.notifications = data;
                this.unreadCount = this.notifications.filter(n => !n.lu).length;
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Error fetching notifications:', err)
        });
    }

    toggleDropdown() {
        this.showDropdown = !this.showDropdown;
        if (this.showDropdown) {
        }
    }

    markAsRead(n: Notification) {
        if (n.id && !n.lu) {
            this.notificationService.markAsRead(n.id).subscribe(() => {
                n.lu = true;
                this.unreadCount = Math.max(0, this.unreadCount - 1);
                this.cdr.detectChanges();
            });
        }
    }

    markAllAsRead() {
        if (this.unreadCount === 0) return;
        this.notificationService.markAllAsRead().subscribe({
            next: () => {
                this.notifications.forEach(n => n.lu = true);
                this.unreadCount = 0;
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Error marking all as read:', err)
        });
    }

    getTypeIcon(type: string): string {
        switch (type) {
            case 'RUPTURE_STOCK': return '🚨';
            case 'WARNING': return '⚠️';
            case 'ERROR': return '❌';
            case 'SUCCESS': return '✅';
            default: return 'ℹ️';
        }
    }
}
