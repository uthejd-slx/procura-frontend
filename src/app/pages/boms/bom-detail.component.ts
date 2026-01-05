import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from '../../core/auth.service';
import { BomService } from '../../core/bom.service';
import { NotificationPanelService } from '../../core/notification-panel.service';
import { UserDirectoryService } from '../../core/user-directory.service';
import { BomApprovalDialogComponent } from './bom-approval-dialog.component';
import { BomCollaboratorDialogComponent } from './bom-collaborator-dialog.component';
import { BomSignoffDialogComponent } from './bom-signoff-dialog.component';
import type { Bom, BomCollaborator, BomItem, BomTemplate, BomTemplateSchemaField, DirectoryUser } from '../../core/types';

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
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './bom-detail.component.html',
  styleUrl: './bom-detail.component.scss',
})
export class BomDetailComponent {
  private readonly auth = inject(AuthService);
  private readonly bomService = inject(BomService);
  private readonly userDirectory = inject(UserDirectoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationPanelService);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);

  readonly bom = signal<Bom | null>(null);
  readonly template = signal<BomTemplate | null>(null);
  readonly collaborators = signal<BomCollaborator[]>([]);
  readonly loadingCollaborators = signal(false);
  users: DirectoryUser[] = [];

  savingMeta = false;
  savingItem = false;
  savingSignoff = false;
  savingApproval = false;
  savingCancel = false;
  deletingBom = false;
  showAddItem = false;

  readonly itemColumns = ['name', 'qty', 'signoff', 'received'];
  readonly itemSchemaFields = computed(() => {
    const fields = this.template()?.schema?.item_fields || [];
    return this.resolveItemFields(fields);
  });

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

  readonly canDeleteBom = computed(() => {
    const b = this.bom();
    if (!b) return false;
    const userId = this.auth.user$()?.id;
    return !!userId && (b.owner === userId || this.auth.hasRole('admin'));
  });

  readonly approvers = computed(() => this.users.filter((u) => (u.roles || []).includes('approver')));

  metaForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    project: ['']
  });

  itemSchemaForm: FormGroup = this.fb.group({});

  cancelForm = this.fb.group({
    comment: ['']
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
        this.syncTemplateForBom(b);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('tutorial.lastBomId', String(b.id));
        }
      },
      error: () => this.notify.error('Failed to load BOM')
    });
  }

  private syncTemplateForBom(b: Bom): void {
    const templateValue = (b as unknown as { template?: BomTemplate | number | null }).template;
    if (templateValue && typeof templateValue === 'object') {
      this.template.set(templateValue);
      this.itemSchemaForm = this.buildItemSchemaForm(templateValue.schema?.item_fields || []);
      return;
    }
    if (!b.template) {
      this.template.set(null);
      this.itemSchemaForm = this.fb.group({});
      return;
    }
    this.bomService.listTemplates({ page_size: 200 }).subscribe({
      next: (items) => {
        const templates = this.normalizeTemplates(items);
        const match = templates.find((t) => t.id === b.template) || null;
        this.template.set(match);
        this.itemSchemaForm = this.buildItemSchemaForm(this.resolveItemFields(match?.schema?.item_fields || []));
      },
      error: () => {
        this.template.set(null);
        this.itemSchemaForm = this.fb.group({});
      }
    });
  }

  private buildItemSchemaForm(fields: BomTemplateSchemaField[]): FormGroup {
    const controls: Record<string, FormControl<string | boolean | null>> = {};
    fields
      .filter((field) => field && field.key)
      .forEach((field) => {
        const validators = field.key === 'name' ? [Validators.required] : [];
        controls[field.key] = this.fb.control('', { validators });
      });
    return this.fb.group(controls);
  }

  private normalizeTemplates(items: unknown): BomTemplate[] {
    if (Array.isArray(items)) return items;
    if (items && typeof items === 'object' && Array.isArray((items as any).results)) {
      return (items as any).results;
    }
    return [];
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
    if (this.itemSchemaForm.invalid) return;
    this.savingItem = true;
    const itemSchemaData = this.itemSchemaForm.getRawValue() as Record<string, any>;
    const mapped = this.mapSchemaToItem(itemSchemaData);
    if (!mapped.name) {
      this.savingItem = false;
      this.notify.error('Item name is required');
      return;
    }
    const dataPayload = this.extractSchemaExtras(itemSchemaData);
    this.bomService.addItem(b.id, {
      ...mapped,
      data: dataPayload
    } as any).subscribe({
      next: () => {
        this.savingItem = false;
        this.showAddItem = false;
        this.itemSchemaForm.reset({});
        this.reload();
        this.notify.success('Item added');
      },
      error: (err) => {
        this.savingItem = false;
        this.notify.error(err?.error?.detail || 'Failed to add item');
      }
    });
  }

  openCollaboratorDialog(): void {
    if (!this.canManageCollaborators()) return;
    const ref = this.dialog.open(BomCollaboratorDialogComponent, {
      panelClass: ['pt-dialog-panel'],
      width: '420px',
      maxWidth: '92vw',
      data: { users: this.availableCollaborators() },
      autoFocus: false,
      restoreFocus: false
    });
    ref.afterClosed().subscribe((userId: number | undefined) => {
      if (!userId) return;
      this.addCollaborator(userId);
    });
  }

  openSignoffDialog(item: BomItem): void {
    if (!this.canRequestWorkflow()) return;
    const ref = this.dialog.open(BomSignoffDialogComponent, {
      panelClass: ['pt-dialog-panel'],
      width: '480px',
      maxWidth: '94vw',
      data: { item, users: this.users },
      autoFocus: false,
      restoreFocus: false
    });
    ref.afterClosed().subscribe((payload: { assignee_id: number; comment?: string } | undefined) => {
      if (!payload) return;
      this.requestSignoffForItem(item, payload);
    });
  }

  openApprovalDialog(): void {
    if (!this.canRequestWorkflow()) return;
    const ref = this.dialog.open(BomApprovalDialogComponent, {
      panelClass: ['pt-dialog-panel'],
      width: '480px',
      maxWidth: '94vw',
      data: { approvers: this.approvers() },
      autoFocus: false,
      restoreFocus: false
    });
    ref.afterClosed().subscribe((payload: { approver_ids: number[]; comment?: string } | undefined) => {
      if (!payload) return;
      this.requestApproval(payload);
    });
  }

  private requestSignoffForItem(item: BomItem, payload: { assignee_id: number; comment?: string }): void {
    const b = this.bom();
    if (!b || !this.canRequestWorkflow()) return;
    this.savingSignoff = true;
    this.bomService
      .requestSignoff(b.id, {
        assignee_id: payload.assignee_id,
        item_ids: [item.id],
        comment: payload.comment || ''
      })
      .subscribe({
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

  private requestApproval(payload: { approver_ids: number[]; comment?: string }): void {
    const b = this.bom();
    if (!b || !this.canRequestWorkflow()) return;
    if (!payload.approver_ids?.length) return;
    this.savingApproval = true;
    this.bomService.requestProcurementApproval(b.id, { approver_ids: payload.approver_ids, comment: payload.comment || '' }).subscribe({
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

  deleteBom(): void {
    const b = this.bom();
    if (!b || !this.canDeleteBom()) return;
    if (!confirm(`Delete BOM #${b.id}? This cannot be undone.`)) return;
    this.deletingBom = true;
    this.bomService.deleteBom(b.id).subscribe({
      next: () => {
        this.deletingBom = false;
        this.notify.success('BOM deleted');
        this.router.navigateByUrl('/boms');
      },
      error: (err) => {
        this.deletingBom = false;
        this.notify.error(err?.error?.detail || 'Failed to delete BOM');
      }
    });
  }

  addCollaborator(userId: number): void {
    const b = this.bom();
    if (!b || !this.canManageCollaborators()) return;
    this.bomService.addCollaborator(b.id, { user_id: userId }).subscribe({
      next: () => {
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

  fieldType(field: BomTemplateSchemaField): string {
    return (field.type || '').toLowerCase();
  }

  private resolveItemFields(fields: BomTemplateSchemaField[]): BomTemplateSchemaField[] {
    const next = [...fields];
    const hasKey = (key: string) => next.some((f) => f.key === key);
    if (!hasKey('name')) {
      next.unshift({ key: 'name', label: 'Name', type: 'text' });
    }
    if (!hasKey('quantity')) {
      next.push({ key: 'quantity', label: 'Quantity', type: 'number' });
    }
    return next;
  }

  schemaControl(field: BomTemplateSchemaField): FormControl<string | boolean | null> {
    const existing = this.itemSchemaForm.get(field.key) as FormControl<string | boolean | null> | null;
    if (existing) return existing;
    const fallback = this.fb.control('');
    this.itemSchemaForm.addControl(field.key, fallback);
    return fallback;
  }

  private mapSchemaToItem(values: Record<string, any>): Partial<BomItem> & { name: string } {
    const name = values['name'] || values['item_name'] || values['title'] || '';
    const quantity = values['quantity'] || values['qty'] || '1';
    const unitPrice = values['unit_price'] ?? values['price'] ?? '';
    const taxPercent = values['tax_percent'] ?? values['tax'] ?? '';
    return {
      name: name,
      description: values['description'] || values['details'] || '',
      quantity: quantity || '1',
      unit: values['unit'] || values['uom'] || '',
      vendor: values['vendor'] || values['vendor_name'] || '',
      category: values['category'] || '',
      unit_price: unitPrice === '' ? null : String(unitPrice),
      currency: values['currency'] || '',
      tax_percent: taxPercent === '' ? null : String(taxPercent),
      link: values['link'] || values['url'] || '',
      notes: values['notes'] || ''
    };
  }

  private extractSchemaExtras(values: Record<string, any>): Record<string, any> | null {
    const baseKeys = new Set([
      'name',
      'item_name',
      'title',
      'description',
      'details',
      'quantity',
      'qty',
      'unit',
      'uom',
      'vendor',
      'vendor_name',
      'category',
      'unit_price',
      'price',
      'currency',
      'tax_percent',
      'tax',
      'link',
      'url',
      'notes'
    ]);
    const extra: Record<string, any> = {};
    Object.entries(values || {}).forEach(([key, value]) => {
      if (baseKeys.has(key)) return;
      if (value === '' || value === null || typeof value === 'undefined') return;
      extra[key] = value;
    });
    return Object.keys(extra).length ? extra : null;
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
