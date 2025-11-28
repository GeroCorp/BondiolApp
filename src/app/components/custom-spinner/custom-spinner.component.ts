import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-custom-spinner',
  templateUrl: './custom-spinner.component.html',
  styleUrls: ['./custom-spinner.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class CustomSpinnerComponent {
  @Input() iconPath: string = 'assets/icon/icon-only.png';
  @Input() size: number = 50;
  @Input() message: string = '';
}
