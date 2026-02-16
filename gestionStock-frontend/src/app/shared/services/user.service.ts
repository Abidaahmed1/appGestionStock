import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private apiUrl = 'http://localhost:8081/api/users';

    constructor(private http: HttpClient) { }

    updateProfile(profileData: { firstName: string; lastName: string; email: string }): Observable<any> {
        return this.http.put(`${this.apiUrl}/profile`, profileData);
    }

    updatePassword(passwordData: { newPassword: string }): Observable<any> {
        return this.http.put(`${this.apiUrl}/password`, passwordData);
    }
}
