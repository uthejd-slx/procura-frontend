import { NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { AuthService } from '../../core/auth.service';
import { BomService } from '../../core/bom.service';
import { NotificationPanelService } from '../../core/notification-panel.service';
import { TemplateViewComponent } from './template-view.component';
import type { BomTemplate } from '../../core/types';

@Component({
  selector: 'app-bom-templates',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './bom-templates.component.html',
  styleUrl: './bom-templates.component.scss',
})
export class BomTemplatesComponent {
  private readonly auth = inject(AuthService);
  private readonly bomService = inject(BomService);
  private readonly notify = inject(NotificationPanelService);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);

  loading = false;
  creating = false;
  saving = false;
  templates: BomTemplate[] = [];
  showCreate = false;
  editingId: number | null = null;
  deletingId: number | null = null;
  highlightId: number | null = null;

  createForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    bom_fields: this.fb.array([]),
    item_fields: this.fb.array([])
  });

  editForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    bom_fields: this.fb.array([]),
    item_fields: this.fb.array([])
  });

  get globalTemplates(): BomTemplate[] {
    return this.templates.filter((t) => t.is_global || t.owner === null);
  }

  get myTemplates(): BomTemplate[] {
    return this.templates.filter((t) => !t.is_global && t.owner !== null);
  }

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.bomService.listTemplates({ page_size: 200 }).subscribe({
      next: (items) => {
        this.templates = this.normalizeTemplates(items);
        this.loading = false;
        if (this.highlightId) {
          const pending = this.highlightId;
          setTimeout(() => {
            if (this.highlightId === pending) this.highlightId = null;
          }, 6000);
        }
      },
      error: () => {
        this.loading = false;
        this.notify.error('Failed to load templates');
      }
    });
  }

  private normalizeTemplates(items: unknown): BomTemplate[] {
    if (Array.isArray(items)) return items;
    if (items && typeof items === 'object' && Array.isArray((items as any).results)) {
      return (items as any).results;
    }
    return [];
  }

  viewTemplate(t: BomTemplate): void {
    this.dialog.open(TemplateViewComponent, {
      data: t,
      panelClass: 'pt-dialog-panel',
      width: '640px',
      maxWidth: '94vw',
      maxHeight: '84vh',
      autoFocus: false,
      restoreFocus: false
    });
  }

  canEditTemplate(t: BomTemplate): boolean {
    if (t.is_global || t.owner === null) return true;
    const userId = this.auth.user$()?.id;
    return !!userId && (t.owner === userId || this.auth.hasRole('admin'));
  }

  canDeleteTemplate(t: BomTemplate): boolean {
    if (t.is_global || t.owner === null) {
      return this.auth.hasRole('admin');
    }
    const userId = this.auth.user$()?.id;
    return !!userId && (t.owner === userId || this.auth.hasRole('admin'));
  }

  deleteTemplate(t: BomTemplate): void {
    if (!this.canDeleteTemplate(t)) return;
    if (!confirm(`Delete template \"${t.name}\"?`)) return;
    this.deletingId = t.id;
    this.bomService.deleteTemplate(t.id).subscribe({
      next: () => {
        this.deletingId = null;
        if (this.editingId === t.id) this.editingId = null;
        this.notify.success('Template deleted');
        this.reload();
      },
      error: (err) => {
        this.deletingId = null;
        this.notify.error(err?.error?.detail || 'Failed to delete template');
      }
    });
  }

  create(): void {
    if (this.createForm.invalid) return;
    this.creating = true;
    const schema = this.buildSchemaFromForm(this.createForm);
    const { name, description } = this.createForm.getRawValue();
    this.bomService.createTemplate({ name: name!, description: description || '', schema }).subscribe({
      next: () => {
        this.creating = false;
        this.showCreate = false;
        this.createForm.reset({ name: '', description: '' });
        this.clearFormArray(this.createBomFields);
        this.clearFormArray(this.createItemFields);
        this.notify.success('Template created');
        this.reload();
      },
      error: (err) => {
        this.creating = false;
        this.notify.error(err?.error?.detail || 'Failed to create template');
      }
    });
  }

  toggleEdit(id: number): void {
    if (this.editingId === id) {
      this.editingId = null;
      return;
    }
    const t = this.templates.find((x) => x.id === id);
    if (!t) return;
    this.editingId = id;
    this.editForm.reset({
      name: t.name,
      description: t.description || ''
    });
    this.loadSchemaIntoForm(this.editForm, t.schema || {});
  }

  save(t: BomTemplate): void {
    if (!this.canEditTemplate(t)) return;
    if (this.editForm.invalid) return;
    this.saving = true;
    const schema = { ...(t.schema || {}), ...this.buildSchemaFromForm(this.editForm) };
    const { name, description } = this.editForm.getRawValue();
    this.bomService.updateTemplate(t.id, { name: name!, description: description || '', schema }).subscribe({
      next: (updated) => {
        const wasGlobal = t.is_global || t.owner === null;
        const isClone = updated?.id && updated.id !== t.id;
        this.saving = false;
        this.editingId = null;
        if (wasGlobal || isClone) {
          if (updated?.id) this.highlightId = updated.id;
          this.notify.success('Saved as your copy');
        } else {
          this.notify.success('Template updated');
        }
        this.reload();
      },
      error: (err) => {
        this.saving = false;
        this.notify.error(err?.error?.detail || 'Failed to update template');
      }
    });
  }

  get createBomFields(): FormArray {
    return this.createForm.get('bom_fields') as FormArray;
  }

  get createItemFields(): FormArray {
    return this.createForm.get('item_fields') as FormArray;
  }

  get editBomFields(): FormArray {
    return this.editForm.get('bom_fields') as FormArray;
  }

  get editItemFields(): FormArray {
    return this.editForm.get('item_fields') as FormArray;
  }

  addCreateField(kind: 'bom' | 'item'): void {
    const array = kind === 'bom' ? this.createBomFields : this.createItemFields;
    array.push(this.buildFieldGroup());
  }

  removeCreateField(kind: 'bom' | 'item', index: number): void {
    const array = kind === 'bom' ? this.createBomFields : this.createItemFields;
    array.removeAt(index);
  }

  addEditField(kind: 'bom' | 'item'): void {
    const array = kind === 'bom' ? this.editBomFields : this.editItemFields;
    array.push(this.buildFieldGroup());
  }

  removeEditField(kind: 'bom' | 'item', index: number): void {
    const array = kind === 'bom' ? this.editBomFields : this.editItemFields;
    array.removeAt(index);
  }

  private buildFieldGroup(field?: { key?: string; label?: string; type?: string; options?: string[] }) {
    return this.fb.group({
      key: [field?.key || ''],
      label: [field?.label || '', [Validators.required]],
      type: [field?.type || 'text', [Validators.required]],
      options: [(field?.options || []).join(', ')]
    });
  }

  private buildSchemaFromForm(form: typeof this.createForm): any {
    const bomFields = this.extractFields(form.get('bom_fields') as FormArray);
    const itemFields = this.extractFields(form.get('item_fields') as FormArray);
    return {
      version: 1,
      bom_fields: bomFields,
      item_fields: itemFields
    };
  }

  private extractFields(array: FormArray): Array<{ key: string; label: string; type: string; options?: string[] }> {
    const usedKeys = new Set<string>();
    return array.controls
      .map((ctrl, index) => {
        const value = ctrl.getRawValue() as {
          key: string;
          label?: string;
          type: string;
          options?: string;
        };
        const options = (value.options || '')
          .split(',')
          .map((opt) => opt.trim())
          .filter(Boolean);
        const label = value.label?.trim() || '';
        const fallback = value.key?.trim() || `field-${index + 1}`;
        const base = this.slugify(label || fallback);
        const key = this.uniqueKey(base || 'field', usedKeys);
        usedKeys.add(key);
        const field: { key: string; label: string; type: string; options?: string[] } = {
          key,
          label,
          type: value.type
        };
        if (value.type === 'select' && options.length) {
          field.options = options;
        }
        return field;
      })
      .filter((field) => field.key);
  }

  private loadSchemaIntoForm(form: typeof this.editForm, schema: any): void {
    const bomFields = Array.isArray(schema?.bom_fields) ? schema.bom_fields : [];
    const itemFields = Array.isArray(schema?.item_fields) ? schema.item_fields : [];

    this.clearFormArray(form.get('bom_fields') as FormArray);
    this.clearFormArray(form.get('item_fields') as FormArray);

    for (const field of bomFields) {
      (form.get('bom_fields') as FormArray).push(this.buildFieldGroup(field));
    }
    for (const field of itemFields) {
      (form.get('item_fields') as FormArray).push(this.buildFieldGroup(field));
    }
  }

  private clearFormArray(array: FormArray): void {
    while (array.length) {
      array.removeAt(0);
    }
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60);
  }

  private uniqueKey(base: string, used: Set<string>): string {
    let key = base || 'field';
    let suffix = 2;
    while (used.has(key)) {
      key = `${base}-${suffix}`;
      suffix += 1;
    }
    return key;
  }
}

