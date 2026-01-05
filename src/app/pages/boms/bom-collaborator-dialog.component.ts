import { NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import type { DirectoryUser } from '../../core/types';

interface CollaboratorDialogData {
  users: DirectoryUser[];
}

@Component({
  selector: 'app-bom-collaborator-dialog',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './bom-collaborator-dialog.component.html',
  styleUrl: './bom-collaborator-dialog.component.scss'
})
export class BomCollaboratorDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<BomCollaboratorDialogComponent>);
  private readonly data = inject(MAT_DIALOG_DATA) as CollaboratorDialogData;

  readonly users = this.data.users || [];
  readonly userControl = new FormControl<number | null>(null, { validators: [Validators.required] });

  displayUser(user: DirectoryUser): string {
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    return name ? `${name} (${user.email})` : user.email;
  }

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.userControl.invalid) return;
    this.dialogRef.close(this.userControl.value);
  }
}
