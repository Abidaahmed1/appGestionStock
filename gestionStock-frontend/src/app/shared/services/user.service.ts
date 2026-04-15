import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private apiUrl = 'http://localhost:8095/api/users';
    private _userSettingsSource = new BehaviorSubject<{ theme: string; accentColor: string }>({ theme: 'light', accentColor: 'teal' });
    userSettings$ = this._userSettingsSource.asObservable();

    constructor(private http: HttpClient) { }

    getCurrentUser(): Observable<any> {
        return this.http.get(`${this.apiUrl}/me`);
    }

    updateProfile(profileData: { firstName: string; lastName: string; email: string }): Observable<any> {
        return this.http.put(`${this.apiUrl}/profile`, profileData);
    }

    updatePassword(passwordData: { newPassword: string }): Observable<any> {
        return this.http.put(`${this.apiUrl}/password`, passwordData);
    }

    updateAppearance(appearanceData: { theme: string; accentColor: string }): Observable<any> {
        this._userSettingsSource.next(appearanceData);
        return this.http.put(`${this.apiUrl}/appearance`, appearanceData);
    }

    updateNotifications(notificationData: { emailOrders: boolean; emailStock: boolean; pushAlerts: boolean }): Observable<any> {
        return this.http.put(`${this.apiUrl}/notifications`, notificationData);
    }
}
