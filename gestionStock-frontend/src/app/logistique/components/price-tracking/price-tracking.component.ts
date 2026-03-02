import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LogistiqueService } from '../../services/logistique.service';
import { LigneCommande } from '../../models/logistique.models';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { Entreprise } from '../../../admin/models/entreprise.model';

@Component({
    selector: 'app-price-tracking',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './price-tracking.component.html',
    styleUrl: './price-tracking.component.css'
})
export class PriceTrackingComponent implements OnInit {
    priceStats: any[] = [];
    initialized = false;
    searchTerm = '';
    private logistiqueService = inject(LogistiqueService);
    private platformId = inject(PLATFORM_ID);
    private entrepriseService = inject(EntrepriseService);
    entreprise: Entreprise | null = null;

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.loadStats();
            this.loadEntreprise();
        }
    }

    loadEntreprise() {
        this.entrepriseService.getAllEntreprises().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                    this.entreprise = data[0];
                }
            }
        });
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
                    const trend = prevPrice !== 0 ? ((last - prevPrice) / prevPrice) * 100 : 0;
                    return { pieceName: name, lastPrice: last, avgPrice: avg, trend: Math.round(trend * 10) / 10 };
                });
                this.initialized = true;
            },
            error: () => {
                this.initialized = true;
            }
        });
    }

    get filteredStats() {
        if (!this.searchTerm) return this.priceStats;
        const term = this.searchTerm.toLowerCase();
        return this.priceStats.filter(s => s.pieceName.toLowerCase().includes(term));
    }

    getTrendClass(trend: number): string {
        if (trend > 0) return 'trend-up';
        if (trend < 0) return 'trend-down';
        return 'trend-neutral';
    }
}
