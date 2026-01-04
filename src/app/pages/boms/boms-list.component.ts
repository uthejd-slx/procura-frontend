import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import type { Bom, BomStatus } from '../../core/types';
import { BomService } from '../../core/bom.service';
import { NotificationPanelService } from '../../core/notification-panel.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-boms-list',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatChipsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './boms-list.component.html',
  styleUrl: './boms-list.component.scss',
})
export class BomsListComponent {
  private readonly auth = inject(AuthService);
  private readonly bomService = inject(BomService);
  private readonly notify = inject(NotificationPanelService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly boms = signal<Bom[]>([]);
  readonly page = signal(1);
  readonly pageSize = signal(25);
  readonly total = signal(0);
  readonly hasNext = signal(false);
  readonly hasPrev = signal(false);
  readonly sharedOnly = signal(false);

  readonly displayedColumns = ['title', 'status', 'updated', 'actions'];

  readonly statuses: BomStatus[] = [
    'DRAFT',
    'SIGNOFF_PENDING',
    'APPROVAL_PENDING',
    'APPROVED',
    'NEEDS_CHANGES',
    'ORDERED',
    'RECEIVING',
    'COMPLETED',
    'CANCELED'
  ];

  readonly filterForm = this.fb.group({
    status: [[] as BomStatus[]],
    search: [''],
    project: [''],
    owner_id: [''],
    template_id: [''],
    created_from: [''],
    created_to: [''],
    updated_from: [''],
    updated_to: ['']
  });

  readonly rangeLabel = computed(() => {
    const total = this.total();
    if (!total) return '0 of 0';
    const start = (this.page() - 1) * this.pageSize() + 1;
    const end = Math.min(this.page() * this.pageSize(), total);
    return `${start}-${end} of ${total}`;
  });

  readonly filteredBoms = computed(() => {
    const list = this.boms();
    if (!this.sharedOnly()) return list;
    const userId = this.auth.user$()?.id;
    if (!userId) return [];
    return list.filter((bom) => this.isSharedBom(bom, userId));
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((p) => {
      const statusParam = (p.get('status') || '').toUpperCase();
      const statusList = statusParam ? statusParam.split(',').filter(Boolean) : [];
      this.filterForm.patchValue({ status: statusList as BomStatus[] }, { emitEvent: false });
    });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    const filters = this.filterForm.getRawValue();
    this.bomService
      .listBoms({
        status: filters.status,
        q: filters.search?.trim(),
        project: filters.project?.trim(),
        owner_id: filters.owner_id?.trim(),
        template_id: filters.template_id?.trim(),
        created_from: filters.created_from || undefined,
        created_to: filters.created_to || undefined,
        updated_from: filters.updated_from || undefined,
        updated_to: filters.updated_to || undefined,
        page: this.page(),
        page_size: this.pageSize()
      })
      .subscribe({
        next: (resp) => {
          this.boms.set(resp.results || []);
          this.total.set(resp.count || 0);
          this.hasNext.set(!!resp.next);
          this.hasPrev.set(!!resp.previous);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.notify.error('Failed to load BOMs');
        }
      });
  }

  applyFilters(): void {
    this.page.set(1);
    const status = this.filterForm.controls.status.value || [];
    const statusParam = status.length ? status.join(',') : null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: statusParam || null },
      queryParamsHandling: 'merge'
    });
    this.reload();
  }

  clearFilters(): void {
    this.filterForm.reset({
      status: [],
      search: '',
      project: '',
      owner_id: '',
      template_id: '',
      created_from: '',
      created_to: '',
      updated_from: '',
      updated_to: ''
    });
    this.page.set(1);
    this.sharedOnly.set(false);
    this.applyFilters();
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

  toggleShared(checked: boolean): void {
    this.sharedOnly.set(checked);
  }

  private isSharedBom(bom: Bom, userId: number): boolean {
    const raw = bom as unknown as { collaborators?: number[]; collaborator_ids?: number[]; is_collaborator?: boolean };
    if (raw.is_collaborator) return true;
    const ids = raw.collaborators || raw.collaborator_ids || [];
    return Array.isArray(ids) && ids.map((id) => Number(id)).includes(userId);
  }

}

