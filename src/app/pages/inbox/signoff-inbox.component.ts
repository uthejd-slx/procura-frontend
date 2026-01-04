import { NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { BomService } from '../../core/bom.service';
import { NotificationPanelService } from '../../core/notification-panel.service';
import type { BomItem } from '../../core/types';

@Component({
  selector: 'app-signoff-inbox',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    RouterModule
  ],
  templateUrl: './signoff-inbox.component.html',
  styleUrl: './signoff-inbox.component.scss',
})
export class SignoffInboxComponent {
  private readonly bomService = inject(BomService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationPanelService);
  private readonly fb = inject(FormBuilder);

  loading = false;
  savingId: number | null = null;
  items: BomItem[] = [];
  displayedColumns = ['item', 'decision'];

  private readonly forms = new Map<number, ReturnType<FormBuilder['group']>>();

  ngOnInit(): void {
    this.reload();
  }

  formFor(itemId: number) {
    const existing = this.forms.get(itemId);
    if (existing) return existing;
    const group = this.fb.group({
      status: ['APPROVED', [Validators.required]],
      comment: ['']
    });
    this.forms.set(itemId, group);
    return group;
  }

  reload(): void {
    this.loading = true;
    const me = this.auth.user$()?.id;
    this.bomService
      .listBomItems({
        signoff_status: 'REQUESTED',
        assignee_id: me || undefined,
        page_size: 200
      })
      .subscribe({
        next: (resp) => {
          this.items = resp.results || [];
        for (const i of this.items) {
          this.formFor(i.id);
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notify.error('Failed to load signoff inbox');
      }
    });
  }

  submit(item: BomItem): void {
    const f = this.formFor(item.id);
    if (f.invalid) return;
    const { status, comment } = f.getRawValue();
    this.savingId = item.id;
    this.bomService.decideSignoff(item.id, { status: status as any, comment: comment || '' }).subscribe({
      next: () => {
        this.savingId = null;
        this.notify.success('Decision submitted');
        this.reload();
      },
      error: (err) => {
        this.savingId = null;
        this.notify.error(err?.error?.detail || 'Failed to submit decision');
      }
    });
  }
}

