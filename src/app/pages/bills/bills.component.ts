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

import { BillsService } from '../../core/bills.service';
import { AuthService } from '../../core/auth.service';
import { NotificationPanelService } from '../../core/notification-panel.service';
import type { Bill, BillStatus } from '../../core/types';

@Component({
  selector: 'app-bills',
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
  templateUrl: './bills.component.html',
  styleUrl: './bills.component.scss'
})
export class BillsComponent {
  private readonly auth = inject(AuthService);
  private readonly service = inject(BillsService);
  private readonly notify = inject(NotificationPanelService);
  private readonly fb = inject(FormBuilder);

  readonly isProcurement = computed(() => this.auth.hasRole('procurement'));
  readonly loading = signal(false);
  readonly bills = signal<Bill[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(25);
  readonly hasNext = signal(false);
  readonly hasPrev = signal(false);

  readonly statuses: BillStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELED'];
  readonly displayedColumns = ['title', 'vendor', 'status', 'amount', 'updated', 'actions'];

  readonly filterForm = this.fb.group({
    status: [[] as BillStatus[]],
    vendor: [''],
    bom_id: [''],
    purchase_order_id: [''],
    created_from: [''],
    created_to: ['']
  });

  readonly createForm = this.fb.group({
    title: ['', Validators.required],
    vendor_name: [''],
    amount: [''],
    currency: [''],
    due_date: [''],
    bom: [''],
    purchase_order: [''],
    notes: ['']
  });

  readonly rangeLabel = computed(() => {
    const total = this.total();
    if (!total) return '0 of 0';
    const start = (this.page() - 1) * this.pageSize() + 1;
    const end = Math.min(this.page() * this.pageSize(), total);
    return `${start}-${end} of ${total}`;
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    const filters = this.filterForm.getRawValue();
    this.service
      .list({
        status: filters.status,
        vendor: filters.vendor?.trim(),
        bom_id: filters.bom_id?.trim(),
        purchase_order_id: filters.purchase_order_id?.trim(),
        created_from: filters.created_from || undefined,
        created_to: filters.created_to || undefined,
        page: this.page(),
        page_size: this.pageSize()
      })
      .subscribe({
        next: (resp) => {
          this.bills.set(resp.results || []);
          this.total.set(resp.count || 0);
          this.hasNext.set(!!resp.next);
          this.hasPrev.set(!!resp.previous);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.notify.error('Failed to load bills');
        }
      });
  }

  applyFilters(): void {
    this.page.set(1);
    this.reload();
  }

  clearFilters(): void {
    this.filterForm.reset({ status: [], vendor: '', bom_id: '', purchase_order_id: '', created_from: '', created_to: '' });
    this.page.set(1);
    this.reload();
  }

  create(): void {
    const raw = this.createForm.getRawValue();
    const payload = {
      title: raw.title?.trim() || '',
      vendor_name: raw.vendor_name?.trim() || '',
      amount: raw.amount ? raw.amount : null,
      currency: raw.currency?.trim() || '',
      due_date: raw.due_date || null,
      bom: raw.bom ? Number(raw.bom) : null,
      purchase_order: raw.purchase_order ? Number(raw.purchase_order) : null,
      notes: raw.notes?.trim() || ''
    };
    this.service.create(payload).subscribe({
      next: () => {
        this.notify.success('Bill created');
        this.createForm.reset({ title: '', vendor_name: '', amount: '', currency: '', due_date: '', bom: '', purchase_order: '', notes: '' });
        this.reload();
      },
      error: () => this.notify.error('Unable to create bill')
    });
  }

  prevPage(): void {
    if (!this.hasPrev()) return;
    this.page.update((p) => Math.max(1, p - 1));
    this.reload();
  }

  nextPage(): void {
    if (!this.hasNext()) return;
    this.page.update((p) => p + 1);
    this.reload();
  }

  updatePageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.reload();
  }
}
