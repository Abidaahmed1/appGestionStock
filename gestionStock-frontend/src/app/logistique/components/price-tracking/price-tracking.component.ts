import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LogistiqueService } from '../../services/logistique.service';
import { LigneCommande } from '../../models/logistique.models';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { Entreprise } from '../../../admin/models/entreprise.model';

import { NgApexchartsModule } from "ng-apexcharts";

@Component({
    selector: 'app-price-tracking',
    standalone: true,
    imports: [CommonModule, FormsModule, NgApexchartsModule],
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
    selectedPiece: any = null;
    showDropdown = false;
    
    // KPI metrics
    metrics = {
        totalPieces: 0,
        averageIncrease: 0,
        mostExpensivePiece: '',
        priceStability: 0
    };

    public priceTrendChartOptions: any;
    public priceCompareChartOptions: any;
    public detailChartOptions: any;
    public priceDistributionChartOptions: any;

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.loadStats();
            this.loadEntreprise();
        }
    }

    loadEntreprise() {
        this.entrepriseService.getCurrentEntreprise().subscribe({
            next: (data: Entreprise) => {
                this.entreprise = data;
            },
            error: () => {
                this.entrepriseService.getAllEntreprises().subscribe({
                    next: (list: Entreprise[]) => {
                        if (list && list.length > 0) {
                            this.entreprise = list[0];
                        }
                    }
                });
            }
        });
    }

    loadStats() {
        this.logistiqueService.getAllCommandesFournisseurs().subscribe({
            next: (commandes: any[]) => {
                const tempStats: { [key: string]: number[] } = {};
                const timeSeriesData: { [key: string]: { date: string, price: number }[] } = {};

                commandes.sort((a: any, b: any) => new Date(a.dateCmd).getTime() - new Date(b.dateCmd).getTime());

                commandes.forEach((c: any) => {
                    c.lignes?.forEach((l: any) => {
                        const name = l.piece?.designation || l.piece?.nom || 'Inconnu';
                        if (!tempStats[name]) tempStats[name] = [];
                        if (l.prixAchat != null) {
                            tempStats[name].push(l.prixAchat);
                            
                            if (!timeSeriesData[name]) timeSeriesData[name] = [];
                            timeSeriesData[name].push({
                                date: c.dateCmd,
                                price: l.prixAchat
                            });
                        }
                    });
                });

                this.priceStats = Object.keys(tempStats).map(name => {
                    const prices = tempStats[name];
                    const history = timeSeriesData[name] || [];
                    const last = prices[prices.length - 1] || 0;
                    const avg = prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0;
                    const prevPrice = prices.length > 1 ? prices[prices.length - 2] : last;
                    const trend = prevPrice !== 0 ? ((last - prevPrice) / prevPrice) * 100 : 0;
                    
                    return { 
                        pieceName: name, 
                        lastPrice: last, 
                        avgPrice: avg, 
                        trend: Math.round(trend * 10) / 10,
                        history: history
                    };
                });

                if (this.priceStats.length > 0 && !this.selectedPiece) {
                    this.selectedPiece = this.priceStats[0];
                    this.initDetailChart();
                }

                this.calculateMetrics(this.priceStats);
                this.initCharts(tempStats, timeSeriesData);
                this.initialized = true;
            },
            error: () => {
                this.initialized = true;
            }
        });
    }

    toggleDropdown() {
        this.showDropdown = !this.showDropdown;
        if (this.showDropdown) {
            this.searchTerm = '';
        }
    }

    selectPiece(stats: any) {
        this.selectedPiece = stats;
        this.showDropdown = false;
        this.initDetailChart();
    }

    initDetailChart() {
        if (!this.selectedPiece) return;

        this.detailChartOptions = {
            series: [{
                name: this.selectedPiece.pieceName,
                data: this.selectedPiece.history.map((h: any) => ({
                    x: new Date(h.date).getTime(),
                    y: h.price
                }))
            }],
            chart: {
                type: 'area',
                height: 320,
                fontFamily: 'Inter, sans-serif',
                toolbar: { show: false },
                zoom: { enabled: false }
            },
            stroke: { curve: 'smooth', width: 3 },
            xaxis: {
                type: 'datetime',
                labels: { style: { fontSize: '11px' } }
            },
            yaxis: {
                labels: {
                    formatter: (val: number) => val.toFixed(2),
                    style: { fontSize: '11px' }
                }
            },
            colors: ['#3d7a7f'],
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.4,
                    opacityTo: 0.1,
                    stops: [0, 90, 100]
                }
            },
            tooltip: {
                x: { format: 'dd MMM yyyy' },
                y: {
                    formatter: (val: number) => {
                        const symbol = (this.entreprise?.devise?.symbole || 'DT');
                        return val.toFixed(3) + ' ' + symbol;
                    }
                }
            }
        };
    }

    calculateMetrics(stats: any[]) {
        if (stats.length === 0) return;
        
        this.metrics.totalPieces = stats.length;
        
        const increases = stats.filter((s: any) => s.trend > 0);
        this.metrics.averageIncrease = increases.length > 0 
            ? Math.round((increases.reduce((a: number, b: any) => a + b.trend, 0) / increases.length) * 10) / 10 
            : 0;
            
        const mostExpensive = [...stats].sort((a, b) => b.lastPrice - a.lastPrice)[0];
        this.metrics.mostExpensivePiece = mostExpensive ? mostExpensive.pieceName : 'N/A';
        
        const stable = stats.filter(s => Math.abs(s.trend) < 2).length;
        this.metrics.priceStability = Math.round((stable / stats.length) * 100);
    }

    initCharts(tempStats: any, timeSeriesData: any) {
        // Compare Chart: Last vs Average for top 8 pieces
        const sortedForCompare = [...this.priceStats]
            .sort((a, b) => b.lastPrice - a.lastPrice)
            .slice(0, 8);

        this.priceCompareChartOptions = {
            series: [
                {
                    name: "Dernier Prix",
                    data: sortedForCompare.map(s => s.lastPrice)
                },
                {
                    name: "Prix Moyen",
                    data: sortedForCompare.map(s => s.avgPrice)
                }
            ],
            chart: {
                type: "bar",
                height: 350,
                fontFamily: 'Inter, sans-serif',
                toolbar: { show: false }
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    dataLabels: { position: 'top' },
                    borderRadius: 4
                }
            },
            dataLabels: {
                enabled: true,
                offsetX: -6,
                style: { fontSize: '10px', colors: ['#fff'] },
                formatter: (val: any) => val.toFixed(2)
            },
            xaxis: {
                categories: sortedForCompare.map(s => s.pieceName),
                labels: { style: { fontSize: '11px', fontWeight: 500 } }
            },
            legend: { position: 'top', horizontalAlign: 'right' },
            colors: ["#3d7a7f", "#94a3b8"],
            tooltip: {
                y: {
                    formatter: (val: any) => val.toFixed(3) + " " + (this.entreprise?.devise?.symbole || 'DT')
                }
            }
        };

        // Trend Chart: History for top 5 pieces
        const top5Pieces = [...this.priceStats]
            .sort((a, b) => b.lastPrice - a.lastPrice)
            .slice(0, 5)
            .map(s => s.pieceName);

        const series = top5Pieces.map(name => {
            return {
                name: name,
                data: timeSeriesData[name].map((d: any) => ({
                    x: new Date(d.date).getTime(),
                    y: d.price
                }))
            };
        });

        this.priceTrendChartOptions = {
            series: series,
            chart: {
                type: "line",
                height: 350,
                fontFamily: 'Inter, sans-serif',
                zoom: { enabled: false },
                toolbar: { show: false }
            },
            stroke: {
                curve: "smooth",
                width: 3
            },
            markers: {
                size: 4,
                hover: { size: 6 }
            },
            xaxis: {
                type: "datetime",
                labels: {
                    datetimeFormatter: { year: 'yyyy', month: 'MMM', day: 'dd' },
                    style: { fontSize: '11px' }
                }
            },
            yaxis: {
                title: { text: "Prix Unit." },
                labels: { formatter: (val: any) => val.toFixed(2) }
            },
            legend: { position: 'bottom' },
            colors: ["#3d7a7f", "#ea580c", "#db2777", "#16a34a", "#6366f1"],
            tooltip: {
                x: { format: "dd MMM yyyy" },
                y: { formatter: (val: any) => val.toFixed(3) + " " + (this.entreprise?.devise?.symbole || 'DT') }
            }
        };

        // Distribution Chart (Donut): Top 5 by price + "Autres"
        const sortedDesc = [...this.priceStats].sort((a, b) => b.lastPrice - a.lastPrice);
        const top5ForDonut = sortedDesc.slice(0, 5);
        const others = sortedDesc.slice(5);
        
        const donutLabels = top5ForDonut.map(s => s.pieceName);
        const donutSeries = top5ForDonut.map(s => s.lastPrice);
        
        if (others.length > 0) {
            donutLabels.push('Autres');
            const othersSum = others.reduce((sum: number, s: any) => sum + s.lastPrice, 0);
            donutSeries.push(othersSum);
        }

        this.priceDistributionChartOptions = {
            series: donutSeries,
            chart: {
                type: "donut",
                height: 350,
                fontFamily: 'Inter, sans-serif'
            },
            labels: donutLabels,
            colors: ["#3d7a7f", "#ea580c", "#db2777", "#16a34a", "#6366f1", "#94a3b8"],
            plotOptions: {
                pie: {
                    donut: {
                        size: '70%',
                        labels: {
                            show: true,
                            name: { show: true },
                            value: { 
                                show: true,
                                formatter: (val: number) => val.toFixed(2) + " " + (this.entreprise?.devise?.symbole || 'DT')
                            }
                        }
                    }
                }
            },
            legend: { position: 'bottom' },
            tooltip: {
                y: {
                    formatter: (val: number) => val.toFixed(3) + " " + (this.entreprise?.devise?.symbole || 'DT')
                }
            }
        };
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
