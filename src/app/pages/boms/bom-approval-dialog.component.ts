import { NgFor } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import type { DirectoryUser } from '../../core/types';

interface ApprovalDialogData {
  approvers: DirectoryUser[];
}

@Component({
  selector: 'app-bom-approval-dialog',
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
  templateUrl: './bom-approval-dialog.component.html',
  styleUrl: './bom-approval-dialog.component.scss'
})
export class BomApprovalDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<BomApprovalDialogComponent>);
  private readonly data = inject(MAT_DIALOG_DATA) as ApprovalDialogData;

  readonly approvers = this.data.approvers || [];

  readonly form = new FormGroup({
    approver_ids: new FormControl<number[]>([]),
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
    const { approver_ids, comment } = this.form.getRawValue();
    if (!approver_ids?.length) return;
    this.dialogRef.close({
      approver_ids,
      comment: comment || ''
    });
  }
}
