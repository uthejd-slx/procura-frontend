import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';

import type { DirectoryUser } from '../../core/types';
import { AdminUsersService } from '../../core/admin-users.service';
import { NotificationPanelService } from '../../core/notification-panel.service';

const EDITABLE_ROLES = ['approver', 'procurement', 'admin'] as const;

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent {
  private readonly adminUsers = inject(AdminUsersService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationPanelService);

  loading = false;
  savingId: number | null = null;
  users: DirectoryUser[] = [];
  searchControl = new FormControl<string>('', { nonNullable: true });

  readonly editableRoles = [...EDITABLE_ROLES];
  readonly displayedColumns = ['email', 'roles', 'edit'];

  private readonly forms = new Map<
    number,
    FormGroup<{
      roles: FormControl<string[]>;
      is_active: FormControl<boolean>;
    }>
  >();
  private readonly snapshots = new Map<number, { roles: string[]; is_active: boolean }>();

  ngOnInit(): void {
    this.reload();
  }

  formFor(userId: number) {
    const existing = this.forms.get(userId);
    if (existing) return existing;
    const group = new FormGroup({
      roles: new FormControl<string[]>([], { nonNullable: true }),
      is_active: new FormControl<boolean>(true, { nonNullable: true })
    });
    this.forms.set(userId, group);
    return group;
  }

  reload(): void {
    this.loading = true;
    this.adminUsers.listUsers().subscribe({
      next: (users) => {
        this.users = users;
        for (const u of users) {
          const f = this.formFor(u.id);
          const roles = (u.roles || []).filter((r) => this.editableRoles.includes(r as any));
          const is_active = !!u.is_active;
          f.patchValue({ roles, is_active }, { emitEvent: false });
          f.markAsPristine();
          this.snapshots.set(u.id, {
            roles: [...roles].sort(),
            is_active
          });
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notify.error('Failed to load users');
      }
    });
  }

  save(u: DirectoryUser): void {
    const form = this.formFor(u.id);
    if (!this.hasChanges(u)) return;
    const roles = (form.getRawValue().roles || []).map((r: unknown) => String(r));
    const is_active = !!form.getRawValue().is_active;

    this.savingId = u.id;
    this.adminUsers.updateUser(u.id, { roles, is_active }).subscribe({
      next: () => {
        this.savingId = null;
        this.notify.success('User updated');
        this.reload();
      },
      error: (err) => {
        this.savingId = null;
        const msg = err?.error?.detail || 'Update failed';
        this.notify.error(msg);
      }
    });
  }

  get filteredUsers(): DirectoryUser[] {
    const term = this.searchControl.value.trim().toLowerCase();
    if (!term) return this.users;
    return this.users.filter((u) => u.email.toLowerCase().includes(term));
  }

  hasChanges(u: DirectoryUser): boolean {
    const snapshot = this.snapshots.get(u.id);
    if (!snapshot) return false;
    const form = this.formFor(u.id).getRawValue();
    const roles = (form.roles || []).map((r) => String(r)).sort();
    return snapshot.is_active !== !!form.is_active || roles.join('|') !== snapshot.roles.join('|');
  }
}
