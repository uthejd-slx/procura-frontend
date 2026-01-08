import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { SafeUrl } from '@angular/platform-browser';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { AuthService } from '../../core/auth.service';
import { AvatarService } from '../../core/avatar.service';
import { NotificationPanelService } from '../../core/notification-panel.service';
import { ProfileService } from '../../core/profile.service';
import type { Profile } from '../../core/types';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    NgIf,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent {
  private readonly auth = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationPanelService);
  private readonly avatarService = inject(AvatarService);

  loading = false;
  form = this.fb.group({
    display_name: [''],
    phone_number: [''],
    job_title: [''],
    avatar_url: [''],
    notifications_email_enabled: [false]
  });

  get displayName(): string {
    const name = this.rawName;
    return name || 'Your name';
  }

  get jobTitle(): string {
    return (this.form.controls.job_title.value || '').trim();
  }

  get avatarUrl(): string {
    return (this.form.controls.avatar_url.value || '').trim();
  }

  get avatarSrc(): SafeUrl | string {
    if (this.avatarUrl) return this.avatarUrl;
    const seed = this.avatarSeed;
    if (!seed) return '';
    return this.avatarService.getAvatar(seed, this.initials);
  }

  get initials(): string {
    const name = this.rawName || this.userEmail || '';
    if (!name) return 'P';
    const parts = name
      .replace(/@.*$/, '')
      .split(' ')
      .filter(Boolean);
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'P';
  }

  ngOnInit(): void {
    this.profileService.getMe().subscribe({
      next: (profile) =>
        this.form.patchValue({
          ...profile,
          notifications_email_enabled: !!profile.notifications_email_enabled
        }),
      error: (err) => this.notify.errorFrom(err, 'Failed to load profile')
    });
  }

  save(): void {
    this.loading = true;
    const payload = this.form.getRawValue() as Partial<Profile>;
    this.profileService.updateMe(payload).subscribe({
      next: () => {
        this.loading = false;
        this.notify.success('Profile updated');
      },
      error: (err) => {
        this.loading = false;
        this.notify.errorFrom(err, 'Failed to update profile');
      }
    });
  }

  private get rawName(): string {
    return (this.form.controls.display_name.value || '').trim();
  }

  private get userEmail(): string {
    return this.auth.user$()?.email || '';
  }

  private get avatarSeed(): string {
    const user = this.auth.user$();
    return user?.email || String(user?.id || '') || this.rawName;
  }
}

