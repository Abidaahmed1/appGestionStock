import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DashboardDTO } from '../models/logistique.models';

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    private apiUrl = `${environment.apiUrl}/dashboard`;

    constructor(private http: HttpClient) { }

    getMetrics(pieceIds?: (number | string)[]): Observable<DashboardDTO> {
        let url = `${this.apiUrl}/metrics`;
        if (pieceIds && pieceIds.length > 0) {
            url += `?pieceIds=${pieceIds.join(',')}`;
        }
        return this.http.get<DashboardDTO>(url);
    }
}
