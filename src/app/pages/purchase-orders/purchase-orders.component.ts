import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
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
import { PurchaseOrdersService } from '../../core/purchase-orders.service';
import type { PurchaseOrder, PurchaseOrderStatus } from '../../core/types';

@Component({
  selector: 'app-purchase-orders',
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
  templateUrl: './purchase-orders.component.html',
  styleUrl: './purchase-orders.component.scss'
})
export class PurchaseOrdersComponent {
  private readonly service = inject(PurchaseOrdersService);
  private readonly notify = inject(NotificationPanelService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly orders = signal<PurchaseOrder[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(25);
  readonly hasNext = signal(false);
  readonly hasPrev = signal(false);

  readonly isProcurement = computed(() => this.auth.hasRole('procurement'));

  readonly displayedColumns = ['po_number', 'vendor', 'status', 'updated', 'actions'];

  readonly statuses: PurchaseOrderStatus[] = ['DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELED'];

  readonly filterForm = this.fb.group({
    status: [[] as PurchaseOrderStatus[]],
    search: [''],
    vendor: [''],
    bom_id: [''],
    category: [''],
    created_from: [''],
    created_to: [''],
    updated_from: [''],
    updated_to: ['']
  });

  readonly createForm = this.fb.group({
    bom: [''],
    po_number: [''],
    vendor_name: [''],
    currency: [''],
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
        search: filters.search?.trim(),
        vendor: filters.vendor?.trim(),
        bom_id: filters.bom_id?.trim(),
        category: filters.category?.trim(),
        created_from: filters.created_from || undefined,
        created_to: filters.created_to || undefined,
        updated_from: filters.updated_from || undefined,
        updated_to: filters.updated_to || undefined,
        page: this.page(),
        page_size: this.pageSize()
      })
      .subscribe({
        next: (resp) => {
          this.orders.set(resp.results || []);
          this.total.set(resp.count || 0);
          this.hasNext.set(!!resp.next);
          this.hasPrev.set(!!resp.previous);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.notify.error('Failed to load purchase orders');
        }
      });
  }

  applyFilters(): void {
    this.page.set(1);
    this.reload();
  }

  clearFilters(): void {
    this.filterForm.reset({
      status: [],
      search: '',
      vendor: '',
      bom_id: '',
      category: '',
      created_from: '',
      created_to: '',
      updated_from: '',
      updated_to: ''
    });
    this.page.set(1);
    this.reload();
  }

  create(): void {
    if (!this.isProcurement()) return;
    const raw = this.createForm.getRawValue();
    const payload = {
      bom: this.toNumberOrNull(raw.bom),
      po_number: raw.po_number?.trim() || '',
      vendor_name: raw.vendor_name?.trim() || '',
      currency: raw.currency?.trim() || '',
      notes: raw.notes?.trim() || ''
    };
    this.service.create(payload).subscribe({
      next: () => {
        this.notify.success('Purchase order created');
        this.createForm.reset({ bom: '', po_number: '', vendor_name: '', currency: '', notes: '' });
        this.reload();
      },
      error: () => this.notify.error('Unable to create purchase order')
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

  private toNumberOrNull(value: string | null): number | null {
    if (!value) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
}
