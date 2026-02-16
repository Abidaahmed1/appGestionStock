import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="dashboard-landing">
      <div class="welcome-box">
        <h1>Bienvenue sur StockMasters</h1>
        <p>Votre espace de travail est en cours de configuration.</p>
        <div class="status-badge">Module Dashboard en développement</div>
      </div>
    </div>
  `,
    styles: [`
    .dashboard-landing {
      height: 70vh;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.8s ease-out;
    }
    .welcome-box {
      text-align: center;
      padding: 3rem;
      background: white;
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
      max-width: 500px;
    }
    h1 { color: #2c3e50; font-size: 2rem; margin-bottom: 1rem; }
    p { color: #7f8c8d; font-size: 1.1rem; margin-bottom: 2rem; }
    .status-badge {
      display: inline-block;
      padding: 0.5rem 1.5rem;
      background: #f0f7f7;
      color: #3d7a7f;
      border-radius: 50px;
      font-weight: 600;
      font-size: 0.9rem;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class DashboardComponent { }
