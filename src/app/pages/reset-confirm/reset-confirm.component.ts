import { NgIf } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { AuthService } from '../../core/auth.service';
import { NotificationPanelService } from '../../core/notification-panel.service';
import { AuthShellComponent } from '../auth-shell/auth-shell.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-reset-confirm',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NgIf,
    AuthShellComponent,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './reset-confirm.component.html',
  styleUrl: './reset-confirm.component.scss'
})
export class ResetConfirmComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationPanelService);
  private readonly destroyRef = inject(DestroyRef);

  loading = false;
  linkValid = false;
  uid = '';
  token = '';
  hidePassword = true;
  hideConfirmPassword = true;

  form = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(8), ResetConfirmComponent.numericOnlyValidator]],
      confirmPassword: ['', [Validators.required]]
    },
    {
      validators: [ResetConfirmComponent.passwordsMatchValidator]
    }
  );

  private static passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value as string | null;
    const confirmPassword = control.get('confirmPassword')?.value as string | null;
    if (!password || !confirmPassword) return null;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  private static numericOnlyValidator(control: AbstractControl): ValidationErrors | null {
    const value = (control.value as string | null) ?? '';
    if (!value) return null;
    return /^\d+$/.test(value) ? { numericOnly: true } : null;
  }

  private extractPasswordError(err: any): string | null {
    const passwordError = err?.error?.password;
    if (Array.isArray(passwordError) && passwordError.length) return String(passwordError[0]);
    if (typeof passwordError === 'string') return passwordError;
    return null;
  }

  ngOnInit(): void {
    this.uid = this.route.snapshot.queryParamMap.get('uid') || '';
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.uid || !this.token) return;

    this.auth.validateReset(this.uid, this.token).subscribe({
      next: () => (this.linkValid = true),
      error: () => (this.linkValid = false)
    });

    this.form.controls.password.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const errors = this.form.controls.password.errors;
      if (errors && errors['server']) {
        const { server, ...rest } = errors;
        this.form.controls.password.setErrors(Object.keys(rest).length ? rest : null);
      }
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    const password = this.form.getRawValue().password!;
    this.auth.confirmReset(this.uid, this.token, password).subscribe({
      next: () => {
        this.loading = false;
        this.notify.success('Password updated');
        this.linkValid = false;
      },
      error: (err) => {
        this.loading = false;
        const passwordMsg = this.extractPasswordError(err);
        if (passwordMsg) {
          this.form.controls.password.setErrors({
            ...(this.form.controls.password.errors || {}),
            server: passwordMsg
          });
        }
        const msg = passwordMsg || err?.error?.detail || 'Reset failed';
        this.notify.error(msg);
      }
    });
  }
}

