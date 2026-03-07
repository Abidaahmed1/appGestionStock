import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface TraceLog {
    user: string;
    action: string;
    details: string;
    date: Date;
    initials: string;
}

@Injectable({
    providedIn: 'root'
})
export class TraceabilityService {
    private logsSubject = new BehaviorSubject<TraceLog[]>([]);
    logs$ = this.logsSubject.asObservable();

    constructor() {
        const saved = localStorage.getItem('catalog_logs');
        if (saved) {
            this.logsSubject.next(JSON.parse(saved).map((l: any) => ({ ...l, date: new Date(l.date) })));
        }
    }

    logAction(user: string, action: string, details: string) {
        const initials = user.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        const newLog: TraceLog = {
            user,
            action,
            details,
            date: new Date(),
            initials
        };

        const currentLogs = [newLog, ...this.logsSubject.value].slice(0, 50);
        this.logsSubject.next(currentLogs);

        localStorage.setItem('catalog_logs', JSON.stringify(currentLogs));
    }

    getLogs() {
        return this.logsSubject.value;
    }
}
