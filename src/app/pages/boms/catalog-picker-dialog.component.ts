import { NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import type { CatalogItem } from '../../core/types';

interface CatalogPickerData {
  items: CatalogItem[];
}

@Component({
  selector: 'app-catalog-picker-dialog',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  templateUrl: './catalog-picker-dialog.component.html',
  styleUrl: './catalog-picker-dialog.component.scss'
})
export class CatalogPickerDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<CatalogPickerDialogComponent>);
  private readonly data = inject(MAT_DIALOG_DATA) as CatalogPickerData;

  readonly searchControl = new FormControl('');
  readonly items = this.data.items || [];

  close(): void {
    this.dialogRef.close();
  }

  select(item: CatalogItem): void {
    this.dialogRef.close(item);
  }

  filteredItems(): CatalogItem[] {
    const query = (this.searchControl.value || '').trim().toLowerCase();
    if (!query) return this.items;
    return this.items.filter((item) => {
      const haystack = [
        item.name,
        item.description,
        item.category,
        item.vendor_name,
        item.vendor_url
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  trackById(index: number, item: CatalogItem): number {
    return item.id;
  }
}
