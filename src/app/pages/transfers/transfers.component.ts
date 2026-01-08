import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

import { AuthService } from '../../core/auth.service';
import { NotificationPanelService } from '../../core/notification-panel.service';
import { PartnersService } from '../../core/partners.service';
import { TransfersService } from '../../core/transfers.service';
import type { PartnerCompany, Transfer, TransferStatus } from '../../core/types';

@Component({
  selector: 'app-transfers',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule
  ],
  templateUrl: './transfers.component.html',
  styleUrl: './transfers.component.scss'
})
export class TransfersComponent {
  private readonly service = inject(TransfersService);
  private readonly partnersService = inject(PartnersService);
  private readonly notify = inject(NotificationPanelService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly transfers = signal<Transfer[]>([]);
  readonly partners = signal<PartnerCompany[]>([]);

  readonly isProcurement = computed(() => this.auth.hasRole('procurement'));

  readonly statuses: TransferStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'COMPLETED', 'CANCELED'];
  readonly displayedColumns = ['partner', 'status', 'updated', 'actions'];

  readonly filterForm = this.fb.group({
    status: [[] as TransferStatus[]]
  });

  readonly createForm = this.fb.group({
    partner: ['', Validators.required],
    notes: ['']
  });

  ngOnInit(): void {
    this.loadPartners();
    this.reload();
  }

  loadPartners(): void {
    this.partnersService.list({ page_size: 200 }).subscribe({
      next: (resp) => this.partners.set(resp.results || []),
      error: () => undefined
    });
  }

  reload(): void {
    this.loading.set(true);
    const filters = this.filterForm.getRawValue();
    this.service.list({ status: filters.status }).subscribe({
      next: (resp) => {
        this.transfers.set(resp.results || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.errorFrom(err, 'Failed to load transfers');
      }
    });
  }

  applyFilters(): void {
    this.reload();
  }

  clearFilters(): void {
    this.filterForm.reset({ status: [] });
    this.reload();
  }

  create(): void {
    if (!this.isProcurement()) return;
    if (this.createForm.invalid) return;
    const raw = this.createForm.getRawValue();
    const partnerId = Number(raw.partner);
    if (!Number.isFinite(partnerId)) return;
    this.service.create({ partner: partnerId, notes: raw.notes?.trim() || '' }).subscribe({
      next: () => {
        this.notify.success('Transfer created');
        this.createForm.reset({ partner: '', notes: '' });
        this.reload();
      },
      error: (err) => this.notify.errorFrom(err, 'Unable to create transfer')
    });
  }

  partnerName(partnerId: number): string {
    return this.partners().find((p) => p.id === partnerId)?.name || `Partner ${partnerId}`;
  }
}
