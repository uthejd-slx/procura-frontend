import { NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { AuthService } from '../../core/auth.service';
import { NotificationPanelService } from '../../core/notification-panel.service';
import { AuthShellComponent } from '../auth-shell/auth-shell.component';

@Component({
  selector: 'app-reset-request',
  standalone: true,
  imports: [
    NgIf,
    ReactiveFormsModule,
    RouterLink,
    AuthShellComponent,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './reset-request.component.html',
  styleUrl: './reset-request.component.scss'
})
export class ResetRequestComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationPanelService);

  loading = false;
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    const { email } = this.form.getRawValue();
    this.auth.requestPasswordReset(email!).subscribe({
      next: (resp: any) => {
        this.loading = false;
        const resetLink = resp?.reset_link as string | undefined;
        const msg = resetLink ? 'Reset link returned (DEV mode).' : 'If the email exists, a reset link was sent.';
        this.notify.success(msg);
        if (resetLink) window.open(resetLink, '_blank');
      },
      error: (err) => {
        this.loading = false;
        this.notify.errorFrom(err, 'Request failed');
      }
    });
  }
}

