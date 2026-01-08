import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';

import { AttachmentService } from '../../core/attachment.service';
import { NotificationPanelService } from '../../core/notification-panel.service';
import type { Attachment } from '../../core/types';

@Component({
  selector: 'app-attachments',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    RouterModule
  ],
  templateUrl: './attachments.component.html',
  styleUrl: './attachments.component.scss'
})
export class AttachmentsComponent {
  private readonly service = inject(AttachmentService);
  private readonly notify = inject(NotificationPanelService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly attachments = signal<Attachment[]>([]);
  readonly selectedFile = signal<File | null>(null);

  readonly displayedColumns = ['file', 'linked', 'size', 'created', 'actions'];

  readonly filterForm = this.fb.group({
    bom_id: [''],
    purchase_order_id: [''],
    bill_id: ['']
  });

  readonly uploadForm = this.fb.group({
    bom: [''],
    purchase_order: [''],
    bill: ['']
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    const filters = this.filterForm.getRawValue();
    this.service
      .list({
        bom_id: filters.bom_id?.trim(),
        purchase_order_id: filters.purchase_order_id?.trim(),
        bill_id: filters.bill_id?.trim()
      })
      .subscribe({
        next: (resp) => {
          this.attachments.set(resp.results || []);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.notify.errorFrom(err, 'Failed to load attachments');
        }
      });
  }

  applyFilters(): void {
    this.reload();
  }

  clearFilters(): void {
    this.filterForm.reset({ bom_id: '', purchase_order_id: '', bill_id: '' });
    this.reload();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files && input.files.length ? input.files[0] : null);
  }

  upload(): void {
    const file = this.selectedFile();
    if (!file) {
      this.notify.info('Select a file to upload');
      return;
    }
    const payload = this.uploadForm.getRawValue();
    this.service
      .upload({
        file,
        bom: payload.bom ? Number(payload.bom) : undefined,
        purchase_order: payload.purchase_order ? Number(payload.purchase_order) : undefined,
        bill: payload.bill ? Number(payload.bill) : undefined
      })
      .subscribe({
        next: () => {
          this.notify.success('Attachment uploaded');
          this.uploadForm.reset({ bom: '', purchase_order: '', bill: '' });
          this.selectedFile.set(null);
          this.reload();
        },
        error: (err) => this.notify.errorFrom(err, 'Unable to upload attachment')
      });
  }

  remove(attachment: Attachment): void {
    const ok = window.confirm(`Delete attachment "${attachment.file_name || 'file'}"?`);
    if (!ok) return;
    this.service.delete(attachment.id).subscribe({
      next: () => {
        this.notify.success('Attachment deleted');
        this.reload();
      },
      error: (err) => this.notify.errorFrom(err, 'Unable to delete attachment')
    });
  }
}
