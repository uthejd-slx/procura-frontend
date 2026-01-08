import { DatePipe, NgFor, NgIf } from '@angular/common';
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
import type { ProcurementApproval } from '../../core/types';

@Component({
  selector: 'app-approvals-inbox',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
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
  templateUrl: './approvals-inbox.component.html',
  styleUrl: './approvals-inbox.component.scss',
})
export class ApprovalsInboxComponent {
  private readonly bomService = inject(BomService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationPanelService);
  private readonly fb = inject(FormBuilder);

  loading = false;
  savingId: number | null = null;
  approvals: ProcurementApproval[] = [];
  displayedColumns = ['approval', 'decision'];

  private readonly forms = new Map<number, ReturnType<FormBuilder['group']>>();

  ngOnInit(): void {
    this.reload();
  }

  formFor(approvalId: number) {
    const existing = this.forms.get(approvalId);
    if (existing) return existing;
    const group = this.fb.group({
      status: ['APPROVED', [Validators.required]],
      comment: ['']
    });
    this.forms.set(approvalId, group);
    return group;
  }

  reload(): void {
    this.loading = true;
    const me = this.auth.user$()?.id;
    this.bomService
      .listProcurementApprovals({
        status: 'PENDING',
        page_size: 200
      })
      .subscribe({
        next: (resp) => {
          const items = resp.results || [];
          this.approvals = me ? items.filter((a) => a.approver === me) : items;
          for (const a of this.approvals) {
            this.formFor(a.id);
          }
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.notify.errorFrom(err, 'Failed to load approvals inbox');
        }
      });
  }

  submit(approval: ProcurementApproval): void {
    const f = this.formFor(approval.id);
    if (f.invalid) return;
    const { status, comment } = f.getRawValue();
    this.savingId = approval.id;
    this.bomService.decideProcurementApproval(approval.id, { status: status as any, comment: comment || '' }).subscribe({
      next: () => {
        this.savingId = null;
        this.notify.success('Decision submitted');
        this.reload();
      },
      error: (err) => {
        this.savingId = null;
        this.notify.errorFrom(err, 'Failed to submit decision');
      }
    });
  }

  approvalBomId(approval: ProcurementApproval): number | null {
    const raw = approval as unknown as {
      bom?: number | string | null;
      bom_id?: number | string | null;
      request_bom?: number | string | null;
      request_bom_id?: number | string | null;
      request?: { bom?: number | string | null | { id?: number | string | null }; bom_id?: number | string | null; id?: number | string | null } | number | string | null;
    };
    const nestedRequest = raw.request;
    const resolveId = (value: unknown): number | null => {
      if (value === null || typeof value === 'undefined') return null;
      if (typeof value === 'number') return Number.isFinite(value) ? value : null;
      if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      if (typeof value === 'object') {
        const idValue = (value as any).id;
        if (idValue !== undefined) return resolveId(idValue);
      }
      return null;
    };

    const direct =
      raw.bom ??
      raw.bom_id ??
      raw.request_bom ??
      raw.request_bom_id;
    const requestBom =
      typeof nestedRequest === 'object'
        ? (nestedRequest as any)?.bom ?? (nestedRequest as any)?.bom_id
        : null;

    return resolveId(direct) ?? resolveId(requestBom);
  }
}

