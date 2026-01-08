import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CatalogService } from '../../core/catalog.service';
import { NotificationPanelService } from '../../core/notification-panel.service';
import type { CatalogItem } from '../../core/types';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule
  ],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.scss'
})
export class CatalogComponent {
  private readonly catalog = inject(CatalogService);
  private readonly notify = inject(NotificationPanelService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly items = signal<CatalogItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(25);
  readonly hasNext = signal(false);
  readonly hasPrev = signal(false);
  readonly selected = signal<CatalogItem | null>(null);

  readonly displayedColumns = ['name', 'vendor', 'category', 'price', 'updated', 'actions'];

  readonly filterForm = this.fb.group({
    search: [''],
    category: [''],
    vendor: ['']
  });

  readonly editorForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    category: [''],
    vendor_name: [''],
    vendor_url: [''],
    currency: [''],
    unit_price: [''],
    tax_percent: [''],
    data_json: ['']
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
    this.catalog
      .list({
        search: filters.search?.trim(),
        category: filters.category?.trim(),
        vendor: filters.vendor?.trim(),
        page: this.page(),
        page_size: this.pageSize()
      })
      .subscribe({
        next: (resp) => {
          this.items.set(resp.results || []);
          this.total.set(resp.count || 0);
          this.hasNext.set(!!resp.next);
          this.hasPrev.set(!!resp.previous);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.notify.errorFrom(err, 'Failed to load catalog items');
        }
      });
  }

  applyFilters(): void {
    this.page.set(1);
    this.reload();
  }

  clearFilters(): void {
    this.filterForm.reset({ search: '', category: '', vendor: '' });
    this.page.set(1);
    this.reload();
  }

  edit(item: CatalogItem): void {
    this.selected.set(item);
    this.editorForm.patchValue({
      name: item.name,
      description: item.description,
      category: item.category,
      vendor_name: item.vendor_name,
      vendor_url: item.vendor_url,
      currency: item.currency,
      unit_price: item.unit_price || '',
      tax_percent: item.tax_percent || '',
      data_json: item.data ? JSON.stringify(item.data, null, 2) : ''
    });
  }

  cancelEdit(): void {
    this.selected.set(null);
    this.editorForm.reset({
      name: '',
      description: '',
      category: '',
      vendor_name: '',
      vendor_url: '',
      currency: '',
      unit_price: '',
      tax_percent: '',
      data_json: ''
    });
  }

  save(): void {
    if (this.editorForm.invalid) return;
    const raw = this.editorForm.getRawValue();
    const rawData = raw.data_json?.trim() || '';
    let parsedData: any = null;
    if (rawData) {
      try {
        parsedData = JSON.parse(rawData);
      } catch {
        this.notify.error('Invalid JSON in data');
        return;
      }
    }
    const payload = {
      name: raw.name?.trim() || '',
      description: raw.description?.trim() || '',
      category: raw.category?.trim() || '',
      vendor_name: raw.vendor_name?.trim() || '',
      vendor_url: raw.vendor_url?.trim() || '',
      currency: raw.currency?.trim() || '',
      unit_price: raw.unit_price ? raw.unit_price : null,
      tax_percent: raw.tax_percent ? raw.tax_percent : null,
      data: parsedData
    };
    const selected = this.selected();
    const request = selected
      ? this.catalog.update(selected.id, payload)
      : this.catalog.create(payload);
    request.subscribe({
      next: () => {
        this.notify.success(selected ? 'Catalog item updated' : 'Catalog item created');
        this.cancelEdit();
        this.reload();
      },
      error: (err) => this.notify.errorFrom(err, 'Unable to save catalog item')
    });
  }

  remove(item: CatalogItem): void {
    const ok = window.confirm(`Delete catalog item "${item.name}"?`);
    if (!ok) return;
    this.catalog.delete(item.id).subscribe({
      next: () => {
        this.notify.success('Catalog item deleted');
        this.reload();
      },
      error: (err) => this.notify.errorFrom(err, 'Failed to delete catalog item')
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
