import { NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';

import { AuthService } from '../../core/auth.service';
import { NotificationPanelService } from '../../core/notification-panel.service';
import { PartnersService } from '../../core/partners.service';
import type { PartnerCompany } from '../../core/types';

@Component({
  selector: 'app-partners',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule
  ],
  templateUrl: './partners.component.html',
  styleUrl: './partners.component.scss'
})
export class PartnersComponent {
  private readonly service = inject(PartnersService);
  private readonly notify = inject(NotificationPanelService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly partners = signal<PartnerCompany[]>([]);
  readonly selected = signal<PartnerCompany | null>(null);

  readonly isProcurement = computed(() => this.auth.hasRole('procurement'));

  readonly displayedColumns = ['name', 'contact', 'address', 'actions'];

  readonly editorForm = this.fb.group({
    name: ['', Validators.required],
    contact_email: [''],
    contact_phone: [''],
    address: ['']
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.service.list({ page_size: 200 }).subscribe({
      next: (resp) => {
        this.partners.set(resp.results || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.errorFrom(err, 'Failed to load partners');
      }
    });
  }

  edit(partner: PartnerCompany): void {
    this.selected.set(partner);
    this.editorForm.patchValue({
      name: partner.name,
      contact_email: partner.contact_email || '',
      contact_phone: partner.contact_phone || '',
      address: partner.address || ''
    });
  }

  cancelEdit(): void {
    this.selected.set(null);
    this.editorForm.reset({ name: '', contact_email: '', contact_phone: '', address: '' });
  }

  save(): void {
    if (!this.isProcurement()) return;
    if (this.editorForm.invalid) return;
    const raw = this.editorForm.getRawValue();
    const payload = {
      name: raw.name?.trim() || '',
      contact_email: raw.contact_email?.trim() || '',
      contact_phone: raw.contact_phone?.trim() || '',
      address: raw.address?.trim() || ''
    };
    const selected = this.selected();
    const request = selected
      ? this.service.update(selected.id, payload)
      : this.service.create(payload);
    request.subscribe({
      next: () => {
        this.notify.success(selected ? 'Partner updated' : 'Partner created');
        this.cancelEdit();
        this.reload();
      },
      error: (err) => this.notify.errorFrom(err, 'Unable to save partner')
    });
  }

  remove(partner: PartnerCompany): void {
    if (!this.isProcurement()) return;
    const ok = window.confirm(`Delete partner "${partner.name}"?`);
    if (!ok) return;
    this.service.delete(partner.id).subscribe({
      next: () => {
        this.notify.success('Partner deleted');
        this.reload();
      },
      error: (err) => this.notify.errorFrom(err, 'Unable to delete partner')
    });
  }
}
