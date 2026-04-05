import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DashboardService } from '../../../logistique/services/dashboard.service';
import { DashboardDTO } from '../../../logistique/models/logistique.models';
import { NgApexchartsModule, ChartComponent } from "ng-apexcharts";
import { MagasinierService } from "../../../magasinier/services/magasinier.service";
import { FormsModule } from "@angular/forms";
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { Entreprise } from '../../../admin/models/entreprise.model';
import { UserService } from '../../../shared/services/user.service';
import { Subscription } from 'rxjs';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexTooltip,
  ApexStroke,
  ApexYAxis,
  ApexTitleSubtitle,
  ApexFill,
  ApexLegend
} from "ng-apexcharts";

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
  yaxis: ApexYAxis;
  fill: ApexFill;
  legend: ApexLegend;
  colors: string[];
  title: ApexTitleSubtitle;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  metrics?: DashboardDTO;
  loading = true;
  entreprise: Entreprise | null = null;
  private themeSubscription?: Subscription;
  pieces: any[] = [];
  selectedPieceIds: (string | number)[] = [];
  searchTerm: string = '';
  showDropdown = false;
  get selectedPieceName(): string {
    if (this.selectedPieceIds.length === 0) return 'Toutes les pièces (Global)';
    if (this.selectedPieceIds.length === 1) {
      const p = this.pieces.find(p => p.id == this.selectedPieceIds[0]);
      return p ? `${p.designation}` : '1 pièce sélectionnée';
    }
    return `${this.selectedPieceIds.length} pièces sélectionnées`;
  }

  get currencySymbol(): string {
    return this.entrepriseService.getDeviseSymbol(this.entreprise);
  }

  get filteredPieces() {
    if (!this.searchTerm) return this.pieces;
    const term = this.searchTerm.toLowerCase();
    return this.pieces.filter(p =>
      p.designation.toLowerCase().includes(term) ||
      p.reference.toLowerCase().includes(term)
    );
  }

  public stockChartOptions: Partial<ChartOptions> | any;
  public flowChartOptions: Partial<ChartOptions> | any;
  public statusChartOptions: Partial<ChartOptions> | any;
  public categoryChartOptions: Partial<ChartOptions> | any;
  public topValeurChartOptions: Partial<ChartOptions> | any;

  public totalStockValue: number = 0;

  constructor(
    private dashboardService: DashboardService,
    private pieceService: MagasinierService,
    private entrepriseService: EntrepriseService,
    private userService: UserService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadPieces();
      this.loadMetrics();
      this.loadEntreprise();

      // Listen for theme changes to update charts
      this.themeSubscription = this.userService.userSettings$.subscribe(() => {
        if (this.metrics) {
          this.initCharts();
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe();
  }

  loadPieces() {
    this.pieceService.getPieces().subscribe({
      next: (data) => {
        this.pieces = data;
        if (this.metrics) {
          this.initCharts();
        }
      },
      error: (err) => console.error('Error loading pieces', err)
    });
  }

  loadEntreprise() {
    // Écoute de l'entreprise courante pour les mises à jour en direct
    this.entrepriseService.currentEntreprise$.subscribe((data: Entreprise | null) => {
      if (data) {
        this.entreprise = data;
      }
    });

    // Lancement du chargement initial s'il n'est pas déjà fait
    this.entrepriseService.getCurrentEntreprise().subscribe({
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

  loadMetrics() {
    this.loading = true;
    this.dashboardService.getMetrics(this.selectedPieceIds).subscribe({
      next: (data) => {
        this.metrics = data;
        this.initCharts();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading dashboard metrics', err);
        this.loading = false;
      }
    });
  }

  initCharts() {
    if (!this.metrics) return;

    // Stock Levels Chart
    this.stockChartOptions = {
      series: [
        {
          name: "Stock Actuel",
          data: this.metrics.stockLevels.map(s => s.currentQty)
        },
        {
          name: "Seuil Minimum",
          data: this.metrics.stockLevels.map(s => s.minQty)
        }
      ],
      chart: {
        type: "bar",
        height: 350,
        fontFamily: 'inherit',
        background: 'transparent'
      },
      theme: {
        mode: isPlatformBrowser(this.platformId) && document.body.classList.contains('dark-theme') ? 'dark' : 'light'
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "55%",
          endingShape: "rounded"
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        show: true,
        width: 2,
        colors: ["transparent"]
      },
      xaxis: {
        categories: this.metrics.stockLevels.map(s => {
          const detailStr = this.getTechnicalDetailsString(s.technicalDetails);
          return detailStr ? `${s.designation} | ${detailStr}` : s.designation;
        }),
        labels: {
          rotate: -45,
          trim: true,
          style: {
            fontSize: '10px'
          }
        }
      },
      yaxis: {
        title: {
          text: "Quantité"
        }
      },
      fill: {
        opacity: 1
      },
      tooltip: {
        y: {
          formatter: function (val: any) {
            return val + " unités";
          }
        }
      },
      colors: ["#0D9488", "#f43f5e"]
    };

    this.flowChartOptions = {
      series: [
        {
          name: "Entrées",
          data: this.metrics.movementFlows.map(f => f.entryQty)
        },
        {
          name: "Sorties",
          data: this.metrics.movementFlows.map(f => f.exitQty)
        }
      ],
      chart: {
        type: "area",
        height: 350,
        fontFamily: 'inherit',
        background: 'transparent'
      },
      theme: {
        mode: isPlatformBrowser(this.platformId) && document.body.classList.contains('dark-theme') ? 'dark' : 'light'
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: "smooth",
        width: 3
      },
      xaxis: {
        type: "datetime",
        categories: this.metrics.movementFlows.map(f => f.date)
      },
      tooltip: {
        x: {
          format: "dd/MM/yy"
        }
      },
      colors: ["#0D9488", "#F43F5E"],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.1,
          stops: [0, 90, 100]
        }
      }
    };

    const isBrowser = isPlatformBrowser(this.platformId);
    const isDark = isBrowser && document.body.classList.contains('dark-theme');
    const labelColor = isDark ? '#94a3b8' : '#64748b';

    // 3. Status Donut Chart
    const healthyStock = Math.max(0, this.metrics.totalArticles - this.metrics.lowStockArticles - this.metrics.outOfStockArticles);
    this.statusChartOptions = {
      series: [healthyStock, this.metrics.lowStockArticles, this.metrics.outOfStockArticles],
      chart: {
        type: "donut",
        height: 350,
        fontFamily: 'inherit',
        background: 'transparent'
      },
      theme: {
        mode: isDark ? 'dark' : 'light'
      },
      labels: ['Stock Sain', 'Sous Seuil', 'En Rupture'],
      colors: ['#10b981', '#f59e0b', '#f43f5e'],
      dataLabels: {
        enabled: true,
        formatter: function (val: any) {
          return Math.round(val) + "%";
        }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              name: {
                show: true,
                color: labelColor,
                offsetY: -10
              },
              value: {
                show: true,
                color: isDark ? '#ffffff' : '#0f172a',
                fontSize: '24px',
                fontWeight: 800,
                offsetY: 10,
                formatter: (val: any) => val
              },
              total: {
                show: true,
                showAlways: true,
                label: 'Total Articles',
                color: labelColor,
                formatter: (w: any) => {
                  return w.globals.seriesTotals.reduce((a: any, b: any) => a + b, 0);
                }
              }
            }
          }
        }
      },
      legend: { 
        position: 'bottom',
        labels: {
          colors: labelColor
        }
      }
    };

    // 4. Category Distribution Donut Chart
    const catMap = new Map<string, number>();
    const piecesToCount = this.selectedPieceIds.length > 0 ? this.pieces.filter(p => this.selectedPieceIds.includes(p.id)) : this.pieces;

    piecesToCount.forEach(p => {
      const cat = p.categorie?.nom || 'Non catégorisé';
      catMap.set(cat, (catMap.get(cat) || 0) + 1);
    });

    const categoriesList = Array.from(catMap.keys());
    const countList = Array.from(catMap.values());

    // Dynamic premium colors for categories
    const catColors = ['#0D9488', '#32656A', '#ec4899', '#0ea5e9', '#14b8a6', '#f59e0b', '#f43f5e', '#84cc16', '#64748b'];

    this.categoryChartOptions = {
      series: countList.length > 0 ? countList : [1],
      chart: {
        type: "donut",
        height: 350,
        fontFamily: 'inherit',
        background: 'transparent'
      },
      theme: {
        mode: isDark ? 'dark' : 'light'
      },
      labels: categoriesList.length > 0 ? categoriesList : ['Aucune Donnée'],
      colors: catColors,
      dataLabels: {
        enabled: false
      },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              name: {
                show: true,
                color: labelColor,
                offsetY: -10
              },
              value: {
                show: true,
                color: isDark ? '#ffffff' : '#0f172a',
                fontSize: '24px',
                fontWeight: 800,
                offsetY: 10
              },
              total: {
                show: true,
                label: 'Articles',
                color: labelColor,
                formatter: (w: any) => {
                  return w.globals.seriesTotals.reduce((a: any, b: any) => a + b, 0);
                }
              }
            }
          }
        }
      },
      legend: { 
        position: 'bottom',
        labels: {
          colors: labelColor
        }
      }
    };

    // 5. Market Value (Valorisation) & Top 5 Value Bar Chart
    this.totalStockValue = this.pieces.reduce((sum, p) => sum + ((p.quantite || 0) * (p.prixVente || 0)), 0);

    const sortedByValue = [...this.pieces]
      .map(p => ({
        nom: p.designation,
        valeur: (p.quantite || 0) * (p.prixVente || 0)
      }))
      .filter(p => p.valeur > 0)
      .sort((a, b) => b.valeur - a.valeur)
      .slice(0, 5);

    this.topValeurChartOptions = {
      series: [{ name: "Valeur en Stock", data: sortedByValue.map(x => x.valeur) }],
      chart: {
        type: 'bar',
        height: 350,
        fontFamily: 'inherit',
        background: 'transparent'
      },
      theme: {
        mode: isPlatformBrowser(this.platformId) && document.body.classList.contains('dark-theme') ? 'dark' : 'light'
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          barHeight: '40%'
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => {
          return val.toLocaleString() + ' ' + this.currencySymbol;
        },
        style: {
          colors: ['#fff']
        }
      },
      xaxis: {
        categories: sortedByValue.map(x => x.nom),
        labels: {
          formatter: (val: number) => {
            return val + ' ' + this.currencySymbol;
          }
        }
      },
      tooltip: {
        y: {
          formatter: (val: number) => {
            return val.toLocaleString() + ' ' + this.currencySymbol;
          }
        }
      },
      colors: ['#0D9488'] // Teal accent for value
    };
  }

  getPredictionClass(days: number): string {
    if (days < 7) return 'critical';
    if (days < 15) return 'warning';
    return 'safe';
  }

  getTechnicalDetailsString(details: any): string {
    if (!details) return '';
    return Object.entries(details)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' | ');
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) this.searchTerm = '';
  }

  selectPiece(p: any) {
    if (!p) {
      this.selectedPieceIds = [];
      this.showDropdown = false;
    } else {
      const index = this.selectedPieceIds.indexOf(p.id);
      if (index > -1) {
        this.selectedPieceIds.splice(index, 1);
      } else {
        this.selectedPieceIds.push(p.id);
      }
    }
    this.onPieceChange();
  }

  isPieceSelected(id: number): boolean {
    return this.selectedPieceIds.includes(id);
  }

  onPieceChange() {
    this.loadMetrics();
  }

  getLogoUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('data:image/') || url.startsWith('http')) return url;
    if (url.startsWith('/api/images') || url.startsWith('/uploads')) {
      return `http://localhost:8081${url}`;
    }
    if (url.includes('/remote.php/dav/files/')) {
      const parts = url.split('/');
      return `http://localhost:8081/api/images/${parts[parts.length - 1]}`;
    }
    return url;
  }
}
