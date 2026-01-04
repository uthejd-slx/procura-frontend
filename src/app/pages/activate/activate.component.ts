import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

import { AuthService } from '../../core/auth.service';
import { AuthShellComponent } from '../auth-shell/auth-shell.component';

@Component({
  selector: 'app-activate',
  standalone: true,
  imports: [MatButtonModule, RouterLink, NgIf, AuthShellComponent],
  templateUrl: './activate.component.html',
  styleUrl: './activate.component.scss'
})
export class ActivateComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  loading = true;
  message = '...';

  ngOnInit(): void {
    const uid = this.route.snapshot.queryParamMap.get('uid') || '';
    const token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!uid || !token) {
      this.loading = false;
      this.message = 'Invalid activation link.';
      return;
    }
    this.auth.activate(uid, token).subscribe({
      next: () => {
        this.loading = false;
        this.message = 'Account activated successfully. Please log in.';
      },
      error: () => {
        this.loading = false;
        this.message = 'Activation failed (link invalid or expired).';
      }
    });
  }
}

