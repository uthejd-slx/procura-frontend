import { NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import type { BomTemplate, BomTemplateSchema } from '../../core/types';

type TemplateField = {
  key: string;
  label: string;
  type: string;
  options?: string[];
};

@Component({
  selector: 'app-template-view',
  standalone: true,
  imports: [NgIf, NgFor, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './template-view.component.html',
  styleUrl: './template-view.component.scss'
})
export class TemplateViewComponent {
  private readonly dialogRef = inject(MatDialogRef<TemplateViewComponent>);
  readonly template = inject<BomTemplate>(MAT_DIALOG_DATA);

  get bomFields(): TemplateField[] {
    return (this.template?.schema?.bom_fields as TemplateField[]) || [];
  }

  get itemFields(): TemplateField[] {
    return (this.template?.schema?.item_fields as TemplateField[]) || [];
  }

  private get schema(): BomTemplateSchema | null {
    return (this.template?.schema as BomTemplateSchema) || null;
  }

  bomSampleRow(): string[] {
    if (!this.bomFields.length) return [];
    const schema = this.schema;
    const sampleBom = schema?.sample_bom || {};
    return this.bomFields.map((field) => {
      const formatted = this.formatSample(sampleBom[field.key]);
      return formatted || this.defaultSample(field);
    });
  }

  itemSampleRows(): string[][] {
    if (!this.itemFields.length) return [];
    const schema = this.schema;
    const sampleItems = Array.isArray(schema?.sample_items) ? schema!.sample_items : [];
    if (!sampleItems.length) {
      return [this.itemFields.map((field) => this.defaultSample(field))];
    }

    return sampleItems.map((item) => {
      const data = (item as { data?: Record<string, unknown> }).data ?? (item as Record<string, unknown>);
      return this.itemFields.map((field) => {
        const formatted = this.formatSample(data?.[field.key]);
        return formatted || this.defaultSample(field);
      });
    });
  }

  sampleLink(field: TemplateField, sample: string): string | null {
    if ((field.type || '').toLowerCase() !== 'url') return null;
    const trimmed = (sample || '').trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  private formatSample(value: unknown): string {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private defaultSample(field: TemplateField): string {
    switch ((field.type || '').toLowerCase()) {
      case 'date':
        return '2025-01-31';
      case 'select':
        return field.options?.[0] || 'Option';
      case 'url':
        return 'https://example.com';
      case 'number':
        return '42';
      case 'boolean':
        return 'true';
      case 'textarea':
        return 'Sample notes';
      default:
        return 'Sample text';
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
