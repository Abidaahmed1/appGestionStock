export enum TypeInventaire {
    TOTAL = 'TOTAL',
    PARTIEL_CATEGORIE = 'PARTIEL_CATEGORIE',
    PARTIEL_ZONE = 'PARTIEL_ZONE'
}

export interface LigneInventaire {
    id: number;
    dateInventaire?: Date;
    ecart: number | null;
    estValide: boolean;
    stockPhysique: number | null;
    stockTheorique: number;
    piece: any;
    commentaire?: string;
    justification?: string;
    statutLigne?: string; // A_SCANNER, EN_ATTENTE_AUDIT, A_RECOMPTER, VALIDE, REFUSE
    responsableLogistique?: any; // Le scanneur
    auditeur?: any; // Celui qui traite la ligne
    tentativePrecedente?: number;
    motifRecomptage?: string;
    historique?: LigneInventaireHistorique[];
}

export interface LigneInventaireHistorique {
    id: number;
    date: Date;
    action: string;
    details: string;
    ancienneValeur: number | null;
    nouvelleValeur: number | null;
    ancienStatut: string;
    nouveauStatut: string;
    utilisateur: any;
}

export interface Inventaire {
    id?: number;
    date: Date;
    nom: string;
    type: TypeInventaire;
    estValide: boolean;
    estTermine: boolean;
    lignes: LigneInventaire[];
    createur?: any;
    responsables?: any[];
}
