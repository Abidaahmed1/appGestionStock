export enum TypeChamp {
    TEXT = 'TEXT',
    NUMBER = 'NUMBER',
    BOOLEAN = 'BOOLEAN',
    DATE = 'DATE',
    SELECT = 'SELECT',
    EMAIL = 'EMAIL',
    URL = 'URL',
    TEXTAREA = 'TEXTAREA',
    LISTE = 'LISTE'
}

export interface NumerotationConfig {
    module: string;
    prefix: string;
    numeroDebut: string;
    redemarrer: string;
    automatique?: boolean;
    actif: boolean;
    showMenu?: boolean;
}

export interface Parametre {
    id?: number;
    entreprise?: any;
    nom: string;
    type: TypeChamp;
    obligatoire: boolean;
    variante: boolean;
    options: string[];
    defaultValue?: string;
    description?: string;
    ordre: number;
    actif: boolean;
    numerotationConfigs: NumerotationConfig[];
    _showAddInput?: boolean;
    selected?: boolean; 
}
