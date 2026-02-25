export interface Notification {
    id?: number;
    titre: string;
    message: string;
    date: Date;
    lu: boolean;
    type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' | 'RUPTURE_STOCK';
    targetRole: string;
    relatedId?: number;
}
