import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export enum DocumentType {
  BON_ENTREE = 'BON_ENTREE',
  BON_SORTIE = 'BON_SORTIE',
  BON_RETOUR = 'BON_RETOUR',
  COMMANDE_FOURNISSEUR = 'COMMANDE_FOURNISSEUR',
  INVENTAIRE = 'INVENTAIRE'
}

export interface DocumentDisplaySetting {
  id?: number;
  documentType: DocumentType;
  primaryColor: string;
  secondaryColor: string;
  showLogo: boolean;
  showSignatureMagasinier: boolean;
  showSignatureClient: boolean;
  footerText?: string;
  layout: string;
  fontSize: string;
  showPriceHT: boolean;
  showTVA: boolean;
  showDiscount: boolean;
  visibleVarianteIds: number[];
}

@Injectable({
  providedIn: 'root'
})
export class DocumentConfigService {
  private apiUrl = `${environment.apiUrl}/v1/admin/config/documents`;

  constructor(private http: HttpClient) { }

  getAllSettings(): Observable<DocumentDisplaySetting[]> {
    return this.http.get<DocumentDisplaySetting[]>(this.apiUrl);
  }

  getSettingByType(type: DocumentType): Observable<DocumentDisplaySetting> {
    return this.http.get<DocumentDisplaySetting>(`${this.apiUrl}/${type}`);
  }

  updateSetting(setting: DocumentDisplaySetting): Observable<DocumentDisplaySetting> {
    return this.http.post<DocumentDisplaySetting>(this.apiUrl, setting);
  }
}
