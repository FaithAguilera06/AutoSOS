import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

export interface ScoreBreakdown {
  distance: number;
  specialization: number;
  rating: number;
  availability: number;
  experience: number;
  responseTime: number;
}

@Component({
  selector: 'app-mechanic-score-display',
  template: `
    <div class="score-display" *ngIf="totalScore !== undefined">
      <div class="score-header">
        <h4 class="score-title">
          <ion-icon name="star" class="score-icon"></ion-icon>
          Match Score: {{ (totalScore * 100) | number:'1.0-0' }}%
        </h4>
        <div class="score-bar">
          <div class="score-fill" [style.width.%]="totalScore * 100"></div>
        </div>
      </div>
      
      <div class="score-breakdown" *ngIf="showBreakdown && scoreBreakdown">
        <div class="breakdown-item" *ngFor="let item of getBreakdownItems()">
          <div class="breakdown-label">
            <ion-icon [name]="getIconForCriteria(item.key)"></ion-icon>
            {{ item.label }}
          </div>
          <div class="breakdown-value">
            <div class="breakdown-bar">
              <div class="breakdown-fill" [style.width.%]="item.value * 100"></div>
            </div>
            <span class="breakdown-percentage">{{ (item.value * 100) | number:'1.0-0' }}%</span>
          </div>
        </div>
      </div>
      
      <div class="score-highlights" *ngIf="scoreBreakdown">
        <div class="highlight-item" *ngIf="scoreBreakdown.specialization >= 0.7">
          <ion-icon name="checkmark-circle" color="success"></ion-icon>
          <span>Specialization Match</span>
        </div>
        <div class="highlight-item" *ngIf="scoreBreakdown.distance >= 0.8">
          <ion-icon name="location" color="success"></ion-icon>
          <span>Close Location</span>
        </div>
        <div class="highlight-item" *ngIf="scoreBreakdown.rating >= 0.8">
          <ion-icon name="star" color="success"></ion-icon>
          <span>High Rating</span>
        </div>
        <div class="highlight-item" *ngIf="scoreBreakdown.availability >= 1.0">
          <ion-icon name="time" color="success"></ion-icon>
          <span>Available Now</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .score-display {
      background: var(--ion-color-light);
      border-radius: 12px;
      padding: 16px;
      margin: 8px 0;
    }

    .score-header {
      margin-bottom: 12px;
    }

    .score-title {
      display: flex;
      align-items: center;
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--ion-color-primary);
    }

    .score-icon {
      margin-right: 8px;
      color: var(--ion-color-warning);
    }

    .score-bar {
      width: 100%;
      height: 8px;
      background: var(--ion-color-light-shade);
      border-radius: 4px;
      overflow: hidden;
    }

    .score-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--ion-color-danger) 0%, var(--ion-color-warning) 50%, var(--ion-color-success) 100%);
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .score-breakdown {
      margin-top: 12px;
    }

    .breakdown-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .breakdown-label {
      display: flex;
      align-items: center;
      font-size: 14px;
      color: var(--ion-color-medium);
      flex: 1;
    }

    .breakdown-label ion-icon {
      margin-right: 6px;
      font-size: 16px;
    }

    .breakdown-value {
      display: flex;
      align-items: center;
      flex: 1;
      margin-left: 12px;
    }

    .breakdown-bar {
      flex: 1;
      height: 4px;
      background: var(--ion-color-light-shade);
      border-radius: 2px;
      overflow: hidden;
      margin-right: 8px;
    }

    .breakdown-fill {
      height: 100%;
      background: var(--ion-color-primary);
      border-radius: 2px;
      transition: width 0.3s ease;
    }

    .breakdown-percentage {
      font-size: 12px;
      font-weight: 600;
      color: var(--ion-color-primary);
      min-width: 35px;
      text-align: right;
    }

    .score-highlights {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--ion-color-light-shade);
    }

    .highlight-item {
      display: flex;
      align-items: center;
      margin-bottom: 4px;
      font-size: 13px;
    }

    .highlight-item ion-icon {
      margin-right: 6px;
      font-size: 16px;
    }

    .highlight-item span {
      color: var(--ion-color-success);
      font-weight: 500;
    }
  `],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class MechanicScoreDisplayComponent {
  @Input() totalScore?: number;
  @Input() scoreBreakdown?: ScoreBreakdown;
  @Input() showBreakdown: boolean = true;

  getBreakdownItems() {
    if (!this.scoreBreakdown) return [];
    
    return [
      { key: 'specialization', label: 'Specialization', value: this.scoreBreakdown.specialization },
      { key: 'distance', label: 'Distance', value: this.scoreBreakdown.distance },
      { key: 'rating', label: 'Rating', value: this.scoreBreakdown.rating },
      { key: 'availability', label: 'Availability', value: this.scoreBreakdown.availability },
      { key: 'experience', label: 'Experience', value: this.scoreBreakdown.experience },
      { key: 'responseTime', label: 'Response Time', value: this.scoreBreakdown.responseTime }
    ];
  }

  getIconForCriteria(criteria: string): string {
    const iconMap: { [key: string]: string } = {
      'specialization': 'construct',
      'distance': 'location',
      'rating': 'star',
      'availability': 'time',
      'experience': 'school',
      'responseTime': 'flash'
    };
    
    return iconMap[criteria] || 'help-circle';
  }
}
