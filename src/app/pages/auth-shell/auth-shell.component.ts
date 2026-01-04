import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { LoadingService } from '../../core/loading.service';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [NgIf, RouterLink, MatIconModule, MatProgressBarModule],
  templateUrl: './auth-shell.component.html',
  styleUrl: './auth-shell.component.scss'
})
export class AuthShellComponent {
  constructor(readonly loading: LoadingService) {}

  @Input() brand = 'procura';
  @Input({ required: true }) headline!: string;
  @Input() subhead?: string;
}
