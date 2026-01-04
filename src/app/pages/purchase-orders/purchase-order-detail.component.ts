import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';

import { AuthService } from '../../core/auth.service';
import { NotificationPanelService } from '../../core/notification-panel.service';
import { PurchaseOrdersService } from '../../core/purchase-orders.service';
import type { PurchaseOrder, PurchaseOrderItem } from '../../core/types';

@Component({
  selector: 'app-purchase-order-detail',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule
  ],
  templateUrl: './purchase-order-detail.component.html',
  styleUrl: './purchase-order-detail.component.scss'
})
export class PurchaseOrderDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(PurchaseOrdersService);
  private readonly notify = inject(NotificationPanelService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly order = signal<PurchaseOrder | null>(null);
  readonly isProcurement = computed(() => this.auth.hasRole('procurement'));

  readonly detailForm = this.fb.group({
    bom: [''],
    po_number: [''],
    vendor_name: [''],
    currency: [''],
    notes: ['']
  });

  readonly addItemForm = this.fb.group({
    bom_item: [''],
    name: ['', Validators.required],
    description: [''],
    quantity: ['1'],
    unit: [''],
    currency: [''],
    unit_price: [''],
    tax_percent: [''],
    vendor: [''],
    category: [''],
    link: [''],
    eta_date: [''],
    notes: ['']
  });

  readonly displayedColumns = ['name', 'qty', 'received', 'eta', 'status'];
  readonly receiveMap: Record<number, string> = {};

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (Number.isFinite(id)) this.load(id);
    });
  }

  load(id: number): void {
    this.loading.set(true);
    this.service.get(id).subscribe({
      next: (po) => {
        this.order.set(po);
        this.detailForm.patchValue({
          bom: po.bom ? String(po.bom) : '',
          po_number: po.po_number || '',
          vendor_name: po.vendor_name || '',
          currency: po.currency || '',
          notes: po.notes || ''
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Failed to load purchase order');
      }
    });
  }

  saveDetails(): void {
    if (!this.isProcurement()) return;
    const po = this.order();
    if (!po) return;
    const raw = this.detailForm.getRawValue();
    const payload = {
      bom: this.toNumberOrNull(raw.bom),
      po_number: raw.po_number?.trim() || '',
      vendor_name: raw.vendor_name?.trim() || '',
      currency: raw.currency?.trim() || '',
      notes: raw.notes?.trim() || ''
    };
    this.service.update(po.id, payload).subscribe({
      next: (updated) => {
        this.order.set(updated);
        this.notify.success('Purchase order updated');
      },
      error: () => this.notify.error('Unable to update purchase order')
    });
  }

  addItem(): void {
    if (!this.isProcurement()) return;
    const po = this.order();
    if (!po || this.addItemForm.invalid) return;
    const raw = this.addItemForm.getRawValue();
    const payload = {
      bom_item: this.toNumberOrNull(raw.bom_item),
      name: raw.name?.trim() || '',
      description: raw.description?.trim() || '',
      quantity: raw.quantity || '1',
      unit: raw.unit?.trim() || '',
      currency: raw.currency?.trim() || '',
      unit_price: raw.unit_price ? raw.unit_price : null,
      tax_percent: raw.tax_percent ? raw.tax_percent : null,
      vendor: raw.vendor?.trim() || '',
      category: raw.category?.trim() || '',
      link: raw.link?.trim() || '',
      eta_date: raw.eta_date || null,
      notes: raw.notes?.trim() || ''
    };
    this.service.addItem(po.id, payload).subscribe({
      next: () => {
        this.notify.success('Line item added');
        this.addItemForm.reset({
          bom_item: '',
          name: '',
          description: '',
          quantity: '1',
          unit: '',
          currency: '',
          unit_price: '',
          tax_percent: '',
          vendor: '',
          category: '',
          link: '',
          eta_date: '',
          notes: ''
        });
        this.load(po.id);
      },
      error: () => this.notify.error('Unable to add line item')
    });
  }

  markSent(): void {
    if (!this.isProcurement()) return;
    const po = this.order();
    if (!po) return;
    this.service.markSent(po.id).subscribe({
      next: (updated) => {
        this.order.set(updated);
        this.notify.success('PO marked as sent');
      },
      error: () => this.notify.error('Unable to mark sent')
    });
  }

  cancelOrder(): void {
    if (!this.isProcurement()) return;
    const po = this.order();
    if (!po) return;
    this.service.cancel(po.id).subscribe({
      next: (updated) => {
        this.order.set(updated);
        this.notify.success('PO canceled');
      },
      error: () => this.notify.error('Unable to cancel PO')
    });
  }

  recordReceipt(): void {
    if (!this.isProcurement()) return;
    const po = this.order();
    if (!po) return;
    const lines = (po.items || [])
      .map((item) => {
        const qty = this.receiveMap[item.id];
        if (!qty) return null;
        return { item_id: item.id, quantity_received: qty };
      })
      .filter((line): line is { item_id: number; quantity_received: string } => !!line);

    if (lines.length === 0) {
      this.notify.info('Enter quantities to receive');
      return;
    }

    this.service.receive(po.id, { lines }).subscribe({
      next: () => {
        this.notify.success('Receipt recorded');
        for (const line of lines) delete this.receiveMap[line.item_id];
        this.load(po.id);
      },
      error: () => this.notify.error('Unable to record receipt')
    });
  }

  itemStatus(item: PurchaseOrderItem): string {
    if (item.is_fully_received) return 'Received';
    if (Number(item.received_quantity || 0) > 0) return 'Partial';
    return 'Open';
  }

  private toNumberOrNull(value: string | null): number | null {
    if (!value) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
}
