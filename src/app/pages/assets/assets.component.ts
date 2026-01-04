import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

import { AssetsService } from '../../core/assets.service';
import { AuthService } from '../../core/auth.service';
import { NotificationPanelService } from '../../core/notification-panel.service';
import type { Asset, AssetStatus } from '../../core/types';

@Component({
  selector: 'app-assets',
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
    MatTableModule
  ],
  templateUrl: './assets.component.html',
  styleUrl: './assets.component.scss'
})
export class AssetsComponent {
  private readonly assets = inject(AssetsService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationPanelService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly items = signal<Asset[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(25);
  readonly hasNext = signal(false);
  readonly hasPrev = signal(false);
  readonly selected = signal<Asset | null>(null);

  readonly isProcurement = computed(() => this.auth.hasRole('procurement'));

  readonly displayedColumns = ['name', 'category', 'vendor', 'quantity', 'available', 'status', 'created', 'actions'];
  readonly statuses: AssetStatus[] = ['ACTIVE', 'TRANSFERRED', 'DISPOSED'];

  readonly filterForm = this.fb.group({
    status: [[] as AssetStatus[]],
    search: [''],
    category: [''],
    vendor: [''],
    bom_id: [''],
    purchase_order_id: ['']
  });

  readonly editorForm = this.fb.group({
    name: [''],
    description: [''],
    category: [''],
    vendor: [''],
    quantity: [''],
    unit: [''],
    status: ['ACTIVE' as AssetStatus]
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
    this.assets
      .list({
        status: filters.status,
        search: filters.search?.trim(),
        category: filters.category?.trim(),
        vendor: filters.vendor?.trim(),
        bom_id: filters.bom_id?.trim(),
        purchase_order_id: filters.purchase_order_id?.trim(),
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
        error: () => {
          this.loading.set(false);
          this.notify.error('Failed to load assets');
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
      category: '',
      vendor: '',
      bom_id: '',
      purchase_order_id: ''
    });
    this.page.set(1);
    this.reload();
  }

  edit(asset: Asset): void {
    this.selected.set(asset);
    this.editorForm.patchValue({
      name: asset.name,
      description: asset.description || '',
      category: asset.category || '',
      vendor: asset.vendor || '',
      quantity: asset.quantity || '',
      unit: asset.unit || '',
      status: asset.status
    });
  }

  cancelEdit(): void {
    this.selected.set(null);
    this.editorForm.reset({
      name: '',
      description: '',
      category: '',
      vendor: '',
      quantity: '',
      unit: '',
      status: 'ACTIVE'
    });
  }

  save(): void {
    if (!this.isProcurement()) return;
    const asset = this.selected();
    if (!asset) return;
    const raw = this.editorForm.getRawValue();
    const payload = {
      name: raw.name?.trim() || '',
      description: raw.description?.trim() || '',
      category: raw.category?.trim() || '',
      vendor: raw.vendor?.trim() || '',
      quantity: raw.quantity || asset.quantity,
      unit: raw.unit?.trim() || '',
      status: raw.status as AssetStatus
    };
    this.assets.update(asset.id, payload).subscribe({
      next: (updated) => {
        this.notify.success('Asset updated');
        this.selected.set(updated);
        this.reload();
      },
      error: () => this.notify.error('Unable to update asset')
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
