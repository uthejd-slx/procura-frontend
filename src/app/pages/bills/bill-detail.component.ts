import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';

import { AttachmentService } from '../../core/attachment.service';
import { AuthService } from '../../core/auth.service';
import { BillsService } from '../../core/bills.service';
import { NotificationPanelService } from '../../core/notification-panel.service';
import type { Attachment, Bill } from '../../core/types';

@Component({
  selector: 'app-bill-detail',
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
    MatButtonModule,
    MatIconModule,
    MatTableModule
  ],
  templateUrl: './bill-detail.component.html',
  styleUrl: './bill-detail.component.scss'
})
export class BillDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(BillsService);
  private readonly attachmentsService = inject(AttachmentService);
  private readonly notify = inject(NotificationPanelService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly bill = signal<Bill | null>(null);
  readonly attachments = signal<Attachment[]>([]);
  readonly selectedFile = signal<File | null>(null);

  readonly displayedColumns = ['file', 'size', 'created', 'actions'];

  readonly canEdit = computed(() => {
    const bill = this.bill();
    const userId = this.auth.user$()?.id;
    if (!bill || !userId) return false;
    const editable = bill.status === 'DRAFT' || bill.status === 'REJECTED';
    if (!editable) return false;
    return bill.created_by === userId || this.auth.hasRole('procurement');
  });

  readonly detailForm = this.fb.group({
    title: [''],
    vendor_name: [''],
    amount: [''],
    currency: [''],
    due_date: [''],
    bom: [''],
    purchase_order: [''],
    notes: ['']
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (Number.isFinite(id)) this.load(id);
    });
  }

  load(id: number): void {
    this.loading.set(true);
    this.service.get(id).subscribe({
      next: (bill) => {
        this.bill.set(bill);
        this.detailForm.patchValue({
          title: bill.title || '',
          vendor_name: bill.vendor_name || '',
          amount: bill.amount || '',
          currency: bill.currency || '',
          due_date: bill.due_date || '',
          bom: bill.bom ? String(bill.bom) : '',
          purchase_order: bill.purchase_order ? String(bill.purchase_order) : '',
          notes: bill.notes || ''
        });
        this.loading.set(false);
        this.loadAttachments(id);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Failed to load bill');
      }
    });
  }

  loadAttachments(billId: number): void {
    this.attachmentsService.list({ bill_id: billId, page_size: 200 }).subscribe({
      next: (resp) => this.attachments.set(resp.results || []),
      error: () => undefined
    });
  }

  save(): void {
    const bill = this.bill();
    if (!bill || !this.canEdit()) return;
    const raw = this.detailForm.getRawValue();
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
    this.service.update(bill.id, payload).subscribe({
      next: (updated) => {
        this.bill.set(updated);
        this.notify.success('Bill updated');
      },
      error: (err) => this.notify.error(err?.error?.detail || 'Unable to update bill')
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files && input.files.length ? input.files[0] : null);
  }

  upload(): void {
    const bill = this.bill();
    const file = this.selectedFile();
    if (!bill || !file) {
      this.notify.info('Select a file to upload');
      return;
    }
    this.attachmentsService.upload({ file, bill: bill.id }).subscribe({
      next: () => {
        this.notify.success('Attachment uploaded');
        this.selectedFile.set(null);
        this.loadAttachments(bill.id);
      },
      error: (err) => this.notify.error(err?.error?.detail || 'Unable to upload attachment')
    });
  }

  removeAttachment(item: Attachment): void {
    const ok = window.confirm(`Delete attachment "${item.file_name || 'file'}"?`);
    if (!ok) return;
    this.attachmentsService.delete(item.id).subscribe({
      next: () => {
        this.notify.success('Attachment deleted');
        const bill = this.bill();
        if (bill) this.loadAttachments(bill.id);
      },
      error: () => this.notify.error('Unable to delete attachment')
    });
  }
}
