import { NgIf } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { AuthService } from '../../core/auth.service';
import { NotificationPanelService } from '../../core/notification-panel.service';
import { AuthShellComponent } from '../auth-shell/auth-shell.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    NgIf,
    ReactiveFormsModule,
    RouterLink,
    AuthShellComponent,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationPanelService);
  private readonly destroyRef = inject(DestroyRef);

  loading = false;
  hidePassword = true;
  hideConfirmPassword = true;
  form = this.fb.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), RegisterComponent.numericOnlyValidator]],
      confirmPassword: ['', [Validators.required]]
    },
    {
      validators: [RegisterComponent.passwordsMatchValidator]
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

  ngOnInit(): void {
    this.form.controls.password.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const errors = this.form.controls.password.errors;
      if (errors && errors['server']) {
        const { server, ...rest } = errors;
        this.form.controls.password.setErrors(Object.keys(rest).length ? rest : null);
      }
    });
  }

  private extractPasswordError(err: any): string | null {
    const passwordError = err?.error?.password;
    if (Array.isArray(passwordError) && passwordError.length) return String(passwordError[0]);
    if (typeof passwordError === 'string') return passwordError;
    return null;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    const { email, password } = this.form.getRawValue();
    this.auth.register({ email: email!, password: password! }).subscribe({
      next: (resp: any) => {
        this.loading = false;
        const msg = 'Account created successfully. Please check your email to activate your account.';
        this.notify.success(msg);
        this.router.navigateByUrl('/login');
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
        const msg = passwordMsg || err?.error?.detail || 'Registration failed';
        this.notify.error(msg);
      }
    });
  }
}
