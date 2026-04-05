import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Entreprise } from '../models/entreprise.model';

@Injectable({
    providedIn: 'root'
})
export class EntrepriseService {
    private apiUrl = 'http://localhost:8081/api/entreprises';
    
    private currentEntrepriseSubject = new BehaviorSubject<Entreprise | null>(null);
    public currentEntreprise$ = this.currentEntrepriseSubject.asObservable();

    constructor(private http: HttpClient) { }

    getAllEntreprises(): Observable<Entreprise[]> {
        return this.http.get<Entreprise[]>(this.apiUrl);
    }

    getCurrentEntreprise(): Observable<Entreprise> {
        return this.http.get<Entreprise>(`${this.apiUrl}/current`).pipe(
            tap(data => this.currentEntrepriseSubject.next(data))
        );
    }

    getEntrepriseById(id: number): Observable<Entreprise> {
        return this.http.get<Entreprise>(`${this.apiUrl}/${id}`);
    }

    createEntreprise(entreprise: Entreprise): Observable<Entreprise> {
        return this.http.post<Entreprise>(this.apiUrl, entreprise).pipe(
            tap(data => this.currentEntrepriseSubject.next(data))
        );
    }

    updateEntreprise(id: number, entreprise: Entreprise): Observable<Entreprise> {
        return this.http.put<Entreprise>(`${this.apiUrl}/${id}`, entreprise).pipe(
            tap(data => {
                this.currentEntrepriseSubject.next(data);
            })
        );
    }

    deleteEntreprise(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }

    getAllPays(): Observable<any[]> {
        return this.http.get<any[]>('http://localhost:8081/api/metadata/pays');
    }

    getAllDevises(): Observable<any[]> {
        return this.http.get<any[]>('http://localhost:8081/api/metadata/devises');
    }

    uploadLogo(id: number, file: File): Observable<Entreprise> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<Entreprise>(`${this.apiUrl}/upload-logo/${id}`, formData).pipe(
            tap(data => {
                this.currentEntrepriseSubject.next(data);
            })
        );
    }

    refreshCurrentEntreprise(): void {
        this.getCurrentEntreprise().subscribe();
    }

    getImageUrl(path: string | null | undefined): string {
        if (!path) return '';
        if (path.startsWith('data:') || path.startsWith('http')) return path;
        
        // Base URL for API images 
        const baseUrl = 'http://localhost:8081';
        
        let finalUrl = path;
        if (path.startsWith('/api/images') || path.startsWith('/uploads')) {
            finalUrl = `${baseUrl}${path}`;
        } else if (path.includes('/remote.php/dav/files/')) {
            const parts = path.split('/');
            const filename = parts[parts.length - 1];
            finalUrl = `${baseUrl}/api/images/${filename}`;
        }
        return finalUrl;
    }

    getDeviseSymbol(entreprise: Entreprise | null | undefined): string {
        const devise = entreprise?.devise;
        const symbol = devise?.symbole || '€';
        const code = devise?.code || 'EUR';
        
        // Match any Arabic character in the symbol (\u0600-\u06FF)
        const containsArabic = /[\u0600-\u06FF]/.test(symbol);
        return containsArabic ? code : symbol;
    }
}
