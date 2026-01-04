import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { PartnersService } from '../../core/partners.service';
import { TransfersService } from '../../core/transfers.service';
import type { Asset, PartnerCompany, Transfer, TransferItem } from '../../core/types';

@Component({
  selector: 'app-transfer-detail',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule
  ],
  templateUrl: './transfer-detail.component.html',
  styleUrl: './transfer-detail.component.scss'
})
export class TransferDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(TransfersService);
  private readonly assetsService = inject(AssetsService);
  private readonly partnersService = inject(PartnersService);
  private readonly notify = inject(NotificationPanelService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly transfer = signal<Transfer | null>(null);
  readonly partners = signal<PartnerCompany[]>([]);
  readonly assets = signal<Asset[]>([]);

  readonly isProcurement = computed(() => this.auth.hasRole('procurement'));
  readonly isApprover = computed(() => this.auth.hasRole('approver') || this.auth.hasRole('admin'));

  readonly itemColumns = ['asset', 'quantity', 'notes'];

  readonly assetSearch = this.fb.control('');
  readonly addItemForm = this.fb.group({
    asset: ['', Validators.required],
    quantity: ['1', Validators.required],
    notes: ['']
  });

  ngOnInit(): void {
    this.loadPartners();
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (Number.isFinite(id)) this.load(id);
    });
    this.assetSearch.valueChanges.subscribe(() => this.loadAssets());
    this.loadAssets();
  }

  load(id: number): void {
    this.loading.set(true);
    this.service.get(id).subscribe({
      next: (transfer) => {
        this.transfer.set(transfer);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Failed to load transfer');
      }
    });
  }

  loadPartners(): void {
    this.partnersService.list({ page_size: 200 }).subscribe({
      next: (resp) => this.partners.set(resp.results || []),
      error: () => undefined
    });
  }

  loadAssets(): void {
    const term = this.assetSearch.value?.trim();
    this.assetsService.list({ status: ['ACTIVE'], search: term || undefined, page_size: 200 }).subscribe({
      next: (resp) => this.assets.set(resp.results || []),
      error: () => undefined
    });
  }

  partnerName(partnerId: number): string {
    return this.partners().find((p) => p.id === partnerId)?.name || `Partner ${partnerId}`;
  }

  addItem(): void {
    if (!this.isProcurement()) return;
    const transfer = this.transfer();
    if (!transfer || this.addItemForm.invalid) return;
    const raw = this.addItemForm.getRawValue();
    const assetId = Number(raw.asset);
    const qty = Number(raw.quantity);
    if (!Number.isFinite(assetId) || !Number.isFinite(qty) || qty <= 0) {
      this.notify.error('Enter a valid quantity');
      return;
    }
    const asset = this.assets().find((a) => a.id === assetId);
    if (asset && qty > Number(asset.available_quantity)) {
      this.notify.error('Quantity exceeds available asset amount');
      return;
    }
    this.service.addItem(transfer.id, {
      asset: assetId,
      quantity: String(qty),
      notes: raw.notes?.trim() || ''
    }).subscribe({
      next: () => {
        this.notify.success('Transfer item added');
        this.addItemForm.reset({ asset: '', quantity: '1', notes: '' });
        this.load(transfer.id);
        this.loadAssets();
      },
      error: (err) => this.notify.error(err?.error?.detail || 'Unable to add item')
    });
  }

  submit(): void {
    const transfer = this.transfer();
    if (!transfer || !this.isProcurement()) return;
    this.service.submit(transfer.id).subscribe({
      next: (updated) => {
        this.transfer.set(updated);
        this.notify.success('Transfer submitted');
      },
      error: () => this.notify.error('Unable to submit transfer')
    });
  }

  approve(): void {
    const transfer = this.transfer();
    if (!transfer || !this.isApprover()) return;
    this.service.approve(transfer.id).subscribe({
      next: (updated) => {
        this.transfer.set(updated);
        this.notify.success('Transfer approved');
      },
      error: () => this.notify.error('Unable to approve transfer')
    });
  }

  complete(): void {
    const transfer = this.transfer();
    if (!transfer || !this.isProcurement()) return;
    this.service.complete(transfer.id).subscribe({
      next: (updated) => {
        this.transfer.set(updated);
        this.notify.success('Transfer completed');
      },
      error: () => this.notify.error('Unable to complete transfer')
    });
  }

  cancel(): void {
    const transfer = this.transfer();
    if (!transfer || !this.isProcurement()) return;
    this.service.cancel(transfer.id).subscribe({
      next: (updated) => {
        this.transfer.set(updated);
        this.notify.success('Transfer canceled');
      },
      error: () => this.notify.error('Unable to cancel transfer')
    });
  }

  assetLabel(asset: Asset): string {
    const available = asset.available_quantity ? `${asset.available_quantity} ${asset.unit}` : '';
    return `${asset.name} (${available})`;
  }

  itemLabel(item: TransferItem): string {
    return item.asset?.name || `Asset ${item.asset?.id}`;
  }
}
