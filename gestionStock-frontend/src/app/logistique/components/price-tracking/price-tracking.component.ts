import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { LogistiqueService } from '../../services/logistique.service';
import { LigneCommande } from '../../models/logistique.models';

@Component({
    selector: 'app-price-tracking',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="tracking-container">
        <h1>Suivi des Prix d'Achat</h1>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Pièce</th>
                        <th>Dernier Prix</th>
                        <th>Prix Moyen</th>
                        <th>Evolution</th>
                    </tr>
                </thead>
                <tbody>
                    <tr *ngFor="let stats of priceStats">
                        <td>{{ stats.pieceName }}</td>
                        <td>{{ stats.lastPrice | number:'1.2-2' }} DT</td>
                        <td>{{ stats.avgPrice | number:'1.2-2' }} DT</td>
                        <td>
                            <span [class]="stats.trend >= 0 ? 'trend-up' : 'trend-down'">
                                {{ stats.trend > 0 ? '+' : '' }}{{ stats.trend }}%
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="empty-state" *ngIf="priceStats.length === 0 && initialized">
            <p>Aucune donnée de prix disponible.</p>
        </div>
    </div>
    `,
    styles: [`
        .tracking-container { padding: 2rem; animation: fadeIn 0.5s ease-out; }
        .table-container { background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f8fafc; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; padding: 1rem; text-align: left; }
        td { padding: 1rem; text-align: left; border-bottom: 1px solid #f1f5f9; color: #334155; }
        .trend-up { color: #ef4444; font-weight: 600; }
        .trend-down { color: #10b981; font-weight: 600; }
        .empty-state { text-align: center; padding: 3rem; color: #94a3b8; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    `]
})
export class PriceTrackingComponent implements OnInit {
    priceStats: any[] = [];
    initialized = false;
    private logistiqueService = inject(LogistiqueService);
    private platformId = inject(PLATFORM_ID);

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.loadStats();
        }
    }

    loadStats() {
        this.logistiqueService.getAllCommandesFournisseurs().subscribe({
            next: (commandes) => {
                const tempStats: { [key: string]: number[] } = {};
                commandes.forEach(c => {
                    c.lignes?.forEach(l => {
                        const name = l.piece?.designation || l.piece?.nom || 'Inconnu';
                        if (!tempStats[name]) tempStats[name] = [];
                        if (l.prixAchat != null) tempStats[name].push(l.prixAchat);
                    });
                });

                this.priceStats = Object.keys(tempStats).map(name => {
                    const prices = tempStats[name];
                    const last = prices[prices.length - 1] || 0;
                    const avg = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
                    const prevPrice = prices.length > 1 ? prices[prices.length - 2] : last;
                    const trend = prevPrice !== 0 ? Math.round(((last - prevPrice) / prevPrice) * 100) : 0;
                    return { pieceName: name, lastPrice: last, avgPrice: avg, trend };
                });
                this.initialized = true;
            },
            error: () => {
                this.initialized = true;
            }
        });
    }
}
