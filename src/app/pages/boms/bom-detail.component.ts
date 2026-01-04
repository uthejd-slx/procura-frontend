import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

import { AuthService } from '../../core/auth.service';
import { BomService } from '../../core/bom.service';
import { CatalogService } from '../../core/catalog.service';
import { NotificationPanelService } from '../../core/notification-panel.service';
import { UserDirectoryService } from '../../core/user-directory.service';
import { CatalogPickerDialogComponent } from './catalog-picker-dialog.component';
import type { Bom, BomCollaborator, CatalogItem, DirectoryUser } from '../../core/types';

@Component({
  selector: 'app-bom-detail',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatChipsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './bom-detail.component.html',
  styleUrl: './bom-detail.component.scss',
})
export class BomDetailComponent {
  private readonly auth = inject(AuthService);
  private readonly bomService = inject(BomService);
  private readonly catalog = inject(CatalogService);
  private readonly userDirectory = inject(UserDirectoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly notify = inject(NotificationPanelService);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);

  readonly bom = signal<Bom | null>(null);
  readonly collaborators = signal<BomCollaborator[]>([]);
  readonly loadingCollaborators = signal(false);
  readonly selectedCatalog = signal<CatalogItem | null>(null);
  private catalogData: any = null;
  users: DirectoryUser[] = [];

  savingMeta = false;
  savingItem = false;
  savingSignoff = false;
  savingApproval = false;
  savingCancel = false;
  showAddItem = false;

  readonly itemColumns = ['name', 'qty', 'signoff', 'received'];

  readonly editable = computed(() => {
    const b = this.bom();
    if (!b) return false;
    const editableStatus = b.status === 'DRAFT' || b.status === 'NEEDS_CHANGES';
    return editableStatus && (this.isOwner() || this.isCollaborator());
  });

  readonly isOwner = computed(() => {
    const b = this.bom();
    const userId = this.auth.user$()?.id;
    return !!b && !!userId && b.owner === userId;
  });

  readonly isCollaborator = computed(() => {
    const userId = this.auth.user$()?.id;
    if (!userId) return false;
    return this.collaborators().some((c) => c.id === userId);
  });

  readonly canRequestWorkflow = computed(() => this.editable());

  readonly canManageCollaborators = computed(() =>
    this.isOwner() || this.auth.hasRole('procurement') || this.auth.hasRole('admin')
  );

  readonly canCancelFlow = computed(() => {
    const b = this.bom();
    if (!b) return false;
    const userId = this.auth.user$()?.id;
    return !!userId && (b.owner === userId || this.auth.hasRole('procurement'));
  });

  readonly approvers = computed(() => this.users.filter((u) => (u.roles || []).includes('approver')));

  metaForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    project: ['']
  });

  itemForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(300)]],
    description: [''],
    quantity: ['1'],
    unit: [''],
    vendor: [''],
    category: [''],
    unit_price: [''],
    currency: [''],
    tax_percent: [''],
    link: [''],
    notes: ['']
  });

  signoffForm = this.fb.group({
    assignee_id: [null as number | null, [Validators.required]],
    item_ids: [[] as number[]],
    comment: ['']
  });

  approvalForm = this.fb.group({
    approver_ids: [[] as number[]],
    comment: ['']
  });

  cancelForm = this.fb.group({
    comment: ['']
  });

  collabForm = this.fb.group({
    user_id: [null as number | null]
  });

  ngOnInit(): void {
    this.loadUsers();
    this.route.paramMap.subscribe((p) => {
      const id = Number(p.get('id') || 0);
      if (!id) return;
      this.load(id);
      this.loadCollaborators(id);
    });
  }

  displayUser(u: Pick<DirectoryUser, 'first_name' | 'last_name' | 'email'>): string {
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
    return name ? `${name} (${u.email})` : u.email;
  }

  displayName(u: Pick<DirectoryUser, 'first_name' | 'last_name' | 'email'>): string {
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
    return name || u.email;
  }

  reload(): void {
    const id = this.bom()?.id;
    if (!id) return;
    this.load(id);
    this.loadCollaborators(id);
  }

  private load(id: number): void {
    this.bomService.getBom(id).subscribe({
      next: (b) => {
        this.bom.set(b);
        this.metaForm.patchValue({ title: b.title, project: b.project || '' });
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('tutorial.lastBomId', String(b.id));
        }
      },
      error: () => this.notify.error('Failed to load BOM')
    });
  }

  private loadCollaborators(id: number): void {
    this.loadingCollaborators.set(true);
    this.bomService.listCollaborators(id).subscribe({
      next: (list) => {
        this.collaborators.set(list || []);
        this.loadingCollaborators.set(false);
      },
      error: () => {
        this.loadingCollaborators.set(false);
        this.notify.error('Failed to load collaborators');
      }
    });
  }

  private loadUsers(): void {
    this.userDirectory.list().subscribe({
      next: (u) => (this.users = u),
      error: () => {
        // picker can still work without list
      }
    });
  }

  saveMeta(): void {
    const b = this.bom();
    if (!b || !this.editable()) return;
    if (this.metaForm.invalid) return;
    this.savingMeta = true;
    const { title, project } = this.metaForm.getRawValue();
    this.bomService.updateBom(b.id, { title: title!, project: project || '' }).subscribe({
      next: (updated) => {
        this.savingMeta = false;
        this.bom.set(updated);
        this.notify.success('Saved');
      },
      error: (err) => {
        this.savingMeta = false;
        this.notify.error(err?.error?.detail || 'Save failed');
      }
    });
  }

  addItem(): void {
    const b = this.bom();
    if (!b || !this.editable()) return;
    if (this.itemForm.invalid) return;
    this.savingItem = true;
    const payload = this.itemForm.getRawValue();
    this.bomService.addItem(b.id, {
      name: payload.name!,
      description: payload.description || '',
      quantity: payload.quantity || '1',
      unit: payload.unit || '',
      vendor: payload.vendor || '',
      category: payload.category || '',
      unit_price: payload.unit_price || null,
      currency: payload.currency || '',
      tax_percent: payload.tax_percent || null,
      link: payload.link || '',
      notes: payload.notes || '',
      data: this.catalogData || null
    } as any).subscribe({
      next: () => {
        this.savingItem = false;
        this.showAddItem = false;
        this.itemForm.reset({
          name: '',
          description: '',
          quantity: '1',
          unit: '',
          vendor: '',
          category: '',
          unit_price: '',
          currency: '',
          tax_percent: '',
          link: '',
          notes: ''
        });
        this.selectedCatalog.set(null);
        this.catalogData = null;
        this.reload();
        this.notify.success('Item added');
      },
      error: (err) => {
        this.savingItem = false;
        this.notify.error(err?.error?.detail || 'Failed to add item');
      }
    });
  }

  requestSignoff(): void {
    const b = this.bom();
    if (!b || !this.canRequestWorkflow()) return;
    if (this.signoffForm.invalid) return;
    this.savingSignoff = true;
    const { assignee_id, item_ids, comment } = this.signoffForm.getRawValue();
    this.bomService.requestSignoff(b.id, {
      assignee_id: assignee_id!,
      item_ids: item_ids?.length ? item_ids : undefined,
      comment: comment || ''
    }).subscribe({
      next: () => {
        this.savingSignoff = false;
        this.notify.success('Signoff requested');
        this.reload();
      },
      error: (err) => {
        this.savingSignoff = false;
        this.notify.error(err?.error?.detail || 'Failed to request signoff');
      }
    });
  }

  requestApproval(): void {
    const b = this.bom();
    if (!b || !this.canRequestWorkflow()) return;
    const { approver_ids, comment } = this.approvalForm.getRawValue();
    if (!approver_ids?.length) return;
    this.savingApproval = true;
    this.bomService.requestProcurementApproval(b.id, { approver_ids, comment: comment || '' }).subscribe({
      next: () => {
        this.savingApproval = false;
        this.notify.success('Approval requested');
        this.reload();
      },
      error: (err) => {
        this.savingApproval = false;
        this.notify.error(err?.error?.detail || 'Failed to request approval');
      }
    });
  }

  cancelFlow(): void {
    const b = this.bom();
    if (!b || !this.canCancelFlow()) return;
    this.savingCancel = true;
    const { comment } = this.cancelForm.getRawValue();
    this.bomService.cancelFlow(b.id, { comment: comment || '' }).subscribe({
      next: () => {
        this.savingCancel = false;
        this.notify.success('Flow canceled');
        this.reload();
      },
      error: (err) => {
        this.savingCancel = false;
        this.notify.error(err?.error?.detail || 'Cancel failed');
      }
    });
  }

  openCatalogPicker(): void {
    this.showAddItem = true;
    this.catalog.list({ page_size: 200 }).subscribe({
      next: (resp) => {
        const ref = this.dialog.open(CatalogPickerDialogComponent, {
          panelClass: ['pt-dialog-panel'],
          width: '520px',
          maxWidth: '90vw',
          data: { items: resp.results || [] }
        });
        ref.afterClosed().subscribe((item: CatalogItem | undefined) => {
          if (item) this.applyCatalog(item);
        });
      },
      error: () => this.notify.error('Unable to load catalog items')
    });
  }

  applyCatalog(item: CatalogItem): void {
    this.selectedCatalog.set(item);
    this.catalogData = item.data || null;
    const patch: Record<string, any> = {
      name: item.name || '',
      description: item.description || '',
      vendor: item.vendor_name || '',
      category: item.category || '',
      currency: item.currency || '',
      unit_price: item.unit_price || '',
      tax_percent: item.tax_percent || ''
    };
    if (!this.itemForm.controls.link.value && item.vendor_url) {
      patch['link'] = item.vendor_url;
    }
    this.itemForm.patchValue(patch);
  }

  clearCatalogSelection(): void {
    this.selectedCatalog.set(null);
    this.catalogData = null;
  }

  addCollaborator(): void {
    const b = this.bom();
    if (!b || !this.canManageCollaborators()) return;
    const userId = Number(this.collabForm.controls.user_id.value);
    if (!userId) return;
    this.bomService.addCollaborator(b.id, { user_id: userId }).subscribe({
      next: () => {
        this.collabForm.reset({ user_id: null });
        this.notify.success('Collaborator added');
        this.loadCollaborators(b.id);
      },
      error: (err) => {
        this.notify.error(err?.error?.detail || 'Unable to add collaborator');
      }
    });
  }

  removeCollaborator(userId: number): void {
    const b = this.bom();
    if (!b) return;
    const currentId = this.auth.user$()?.id;
    const allow = this.canManageCollaborators() || (!!currentId && currentId === userId);
    if (!allow) return;
    this.bomService.removeCollaborator(b.id, userId).subscribe({
      next: () => {
        this.notify.success('Collaborator removed');
        this.loadCollaborators(b.id);
      },
      error: (err) => {
        this.notify.error(err?.error?.detail || 'Unable to remove collaborator');
      }
    });
  }

  canRemoveCollaborator(userId: number): boolean {
    const currentId = this.auth.user$()?.id;
    if (currentId && currentId === userId) return true;
    return this.canManageCollaborators();
  }

  availableCollaborators(): DirectoryUser[] {
    const taken = new Set(this.collaborators().map((c) => c.id));
    const ownerId = this.bom()?.owner;
    return this.users.filter((u) => !taken.has(u.id) && u.id !== ownerId);
  }

  download(format: 'pdf' | 'csv' | 'json'): void {
    const b = this.bom();
    if (!b) return;
    this.bomService.exportBom(b.id, format).subscribe({
      next: (resp) => {
        const blob = resp.body;
        if (!blob) return;
        const filename = this.getExportFilename(resp.headers?.get('content-disposition'), b.id, format);
        this.triggerDownload(blob, filename);
      },
      error: (err) => {
        this.readExportError(err).then((msg) => this.notify.error(msg));
      }
    });
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  private getExportFilename(header: string | null, id: number, format: string): string {
    if (header) {
      const match = /filename=\"?([^\";]+)\"?/i.exec(header);
      if (match) return match[1];
    }
    return `bom-${id}.${format}`;
  }

  private async readExportError(err: any): Promise<string> {
    const fallback = 'Unable to export BOM';
    if (err?.error instanceof Blob) {
      try {
        const text = await err.error.text();
        if (!text) return fallback;
        try {
          const parsed = JSON.parse(text);
          return parsed.detail || fallback;
        } catch {
          return text;
        }
      } catch {
        return fallback;
      }
    }
    return err?.error?.detail || fallback;
  }
}
