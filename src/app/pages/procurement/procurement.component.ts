import { CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';

import { BomService } from '../../core/bom.service';
import { AuthService } from '../../core/auth.service';
import { NotificationPanelService } from '../../core/notification-panel.service';
import type { Bom, BomItem } from '../../core/types';

@Component({
  selector: 'app-procurement',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    CurrencyPipe,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    RouterModule
  ],
  templateUrl: './procurement.component.html',
  styleUrl: './procurement.component.scss',
})
export class ProcurementComponent {
  private readonly auth = inject(AuthService);
  private readonly bomService = inject(BomService);
  private readonly notify = inject(NotificationPanelService);
  private readonly fb = inject(FormBuilder);

  readonly isProcurement = computed(() => this.auth.hasRole('procurement'));
  loading = false;
  actionId: number | null = null;
  boms: Bom[] = [];
  displayedColumns = ['bom', 'actions'];

  receivingBom: Bom | null = null;
  receiveForm = this.fb.group({});

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loadActionBoms();
  }

  private loadActionBoms(): void {
    this.loading = true;
    this.bomService
      .listBoms({ status: ['APPROVED', 'ORDERED', 'RECEIVING'], page_size: 100 })
      .subscribe({
        next: (resp) => {
          this.boms = resp.results || [];
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.notify.error('Failed to load procurement list');
        }
      });
  }

  markOrdered(b: { id: number }): void {
    this.actionId = b.id;
    this.bomService.markOrdered(b.id, {}).subscribe({
      next: () => {
        this.actionId = null;
        this.notify.success('Marked ordered');
        this.reload();
      },
      error: (err) => {
        this.actionId = null;
        this.notify.error(err?.error?.detail || 'Failed to mark ordered');
      }
    });
  }

  openReceive(b: { id: number }): void {
    this.receivingBom = null;
    this.receiveForm = this.fb.group({});
    this.bomService.getBom(b.id).subscribe({
      next: (full) => {
        this.receivingBom = full;
        const controls: Record<string, any> = {};
        for (const i of full.items) {
          controls[String(i.id)] = [''];
        }
        this.receiveForm = this.fb.group(controls);
      },
      error: () => {
        this.notify.error('Failed to load BOM items');
      }
    });
  }

  closeReceive(): void {
    this.receivingBom = null;
    this.receiveForm = this.fb.group({});
  }

  remaining(i: BomItem): string {
    const qty = Number(i.quantity || 0);
    const rec = Number(i.received_quantity || 0);
    const rem = Math.max(qty - rec, 0);
    return rem.toString();
  }

  submitReceive(): void {
    const b = this.receivingBom;
    if (!b) return;
    const raw = this.receiveForm.getRawValue() as Record<string, string>;
    const lines = Object.entries(raw)
      .map(([item_id, quantity_received]) => ({ item_id: Number(item_id), quantity_received: String(quantity_received || '').trim() }))
      .filter((l) => l.quantity_received && Number(l.quantity_received) > 0);

    if (!lines.length) {
      this.notify.info('Enter at least one received quantity');
      return;
    }

    this.actionId = b.id;
    this.bomService.receive(b.id, { lines }).subscribe({
      next: () => {
        this.actionId = null;
        this.notify.success('Receipt recorded');
        this.closeReceive();
        this.reload();
      },
      error: (err) => {
        this.actionId = null;
        this.notify.error(err?.error?.detail || 'Failed to record receipt');
      }
    });
  }
}
