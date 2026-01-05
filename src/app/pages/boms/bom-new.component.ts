import { NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import type { BomTemplate } from '../../core/types';
import { BomService } from '../../core/bom.service';
import { NotificationPanelService } from '../../core/notification-panel.service';

@Component({
  selector: 'app-bom-new',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './bom-new.component.html',
  styleUrl: './bom-new.component.scss',
})
export class BomNewComponent {
  private readonly bomService = inject(BomService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationPanelService);

  loading = false;
  templates: BomTemplate[] = [];
  draftCapError: string | null = null;
  selectedTemplate: BomTemplate | null = null;

  form = this.fb.group({
    template: [null as number | null],
    title: ['', [Validators.required, Validators.maxLength(200)]],
    project: ['']
  });

  ngOnInit(): void {
    this.bomService.listTemplates({ page_size: 200 }).subscribe({
      next: (t) => {
        this.templates = this.normalizeTemplates(t);
        this.syncSelectedTemplate();
      },
      error: () => {
        // ok to proceed without templates
      }
    });

    this.form.controls.template.valueChanges.subscribe(() => {
      this.syncSelectedTemplate();
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.draftCapError = null;
    const { template, title, project } = this.form.getRawValue();
    this.bomService.createBom({ template, title: title!, project: project || '' }).subscribe({
      next: (resp) => {
        this.loading = false;
        const bom = resp.body;
        const location = resp.headers?.get('location') || resp.headers?.get('Location');
        const idFromHeader = location ? Number(location.split('/').filter(Boolean).pop()) : NaN;
        const bomId = bom?.id || (Number.isFinite(idFromHeader) ? idFromHeader : null);
        if (!bomId) {
          const lookupParams = {
            page_size: 5,
            q: title?.trim() || undefined,
            template_id: template ?? undefined,
            project: project?.trim() || undefined
          };
          this.bomService.listBoms(lookupParams).subscribe({
            next: (list) => {
              const match = (list.results || []).find((b) => b.title === title) || list.results?.[0];
              if (match?.id) {
                this.notify.success('Draft created');
                this.router.navigateByUrl(`/boms/${match.id}`);
                return;
              }
              this.notify.error('Draft created but could not open details');
            },
            error: () => {
              this.notify.error('Draft created but could not open details');
            }
          });
          return;
        }
        this.notify.success('Draft created');
        this.router.navigateByUrl(`/boms/${bomId}`);
      },
      error: (err) => {
        this.loading = false;
        const detail = err?.error?.detail as string | undefined;
        if (detail && detail.toLowerCase().includes('draft limit reached')) {
          this.draftCapError = detail;
          return;
        }
        this.notify.error(detail || 'Failed to create BOM');
      }
    });
  }

  isGlobalTemplate(t: BomTemplate): boolean {
    return !!t.is_global || t.owner === null;
  }

  private normalizeTemplates(items: unknown): BomTemplate[] {
    if (Array.isArray(items)) return items;
    if (items && typeof items === 'object' && Array.isArray((items as any).results)) {
      return (items as any).results;
    }
    return [];
  }

  private syncSelectedTemplate(): void {
    const id = this.form.controls.template.value;
    if (!id) {
      this.selectedTemplate = null;
      return;
    }
    this.selectedTemplate = this.templates.find((t) => t.id === id) || null;
  }
}

