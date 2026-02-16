import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserRepresentation, RoleRepresentation } from '../models/admin.models';

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private apiUrl = 'http://localhost:8081/api/admin/users';

    constructor(private http: HttpClient) { }

    getAllUsers(): Observable<UserRepresentation[]> {
        return this.http.get<UserRepresentation[]>(this.apiUrl);
    }

    createUser(user: UserRepresentation): Observable<any> {
        return this.http.post(this.apiUrl, user);
    }

    updateUser(id: string, user: UserRepresentation): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}`, user);
    }

    deleteUser(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }

    getUserRoles(id: string): Observable<RoleRepresentation[]> {
        return this.http.get<RoleRepresentation[]>(`${this.apiUrl}/${id}/roles`);
    }

    assignRole(id: string, roleName: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/${id}/roles/${roleName}`, {});
    }

    removeRole(id: string, roleName: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}/roles/${roleName}`);
    }

    toggleUserStatus(id: string, enabled: boolean): Observable<any> {
        return this.http.post(`${this.apiUrl}/${id}/toggle-status?enabled=${enabled}`, {});
    }

    resetUserPassword(id: string, newPassword: string): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}/reset-password`, { newPassword });
    }
}
