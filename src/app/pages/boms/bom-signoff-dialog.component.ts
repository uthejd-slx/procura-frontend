import { NgFor } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import type { BomItem, DirectoryUser } from '../../core/types';

interface SignoffDialogData {
  item: BomItem;
  users: DirectoryUser[];
}

@Component({
  selector: 'app-bom-signoff-dialog',
  standalone: true,
  imports: [
    NgFor,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './bom-signoff-dialog.component.html',
  styleUrl: './bom-signoff-dialog.component.scss'
})
export class BomSignoffDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<BomSignoffDialogComponent>);
  private readonly data = inject(MAT_DIALOG_DATA) as SignoffDialogData;

  readonly item = this.data.item;
  readonly users = this.data.users || [];

  readonly form = new FormGroup({
    assignee_id: new FormControl<number | null>(null, { validators: [Validators.required] }),
    comment: new FormControl('')
  });

  displayUser(user: DirectoryUser): string {
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    return name ? `${name} (${user.email})` : user.email;
  }

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.invalid) return;
    const { assignee_id, comment } = this.form.getRawValue();
    this.dialogRef.close({
      assignee_id: assignee_id!,
      comment: comment || ''
    });
  }
}
