import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { AuthService } from '../../core/auth.service';
import { FeedbackService } from '../../core/feedback.service';
import { NotificationPanelService } from '../../core/notification-panel.service';
import type { Feedback, FeedbackCategory, FeedbackStatus } from '../../core/types';

interface FeedbackDialogData {
  pageUrl: string;
  draft?: {
    category?: FeedbackCategory;
    message?: string;
    rating?: number | string | null;
    page_url?: string;
  };
}

@Component({
  selector: 'app-feedback-dialog',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule
  ],
  templateUrl: './feedback-dialog.component.html',
  styleUrl: './feedback-dialog.component.scss'
})
export class FeedbackDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<FeedbackDialogComponent>);
  private readonly data = inject(MAT_DIALOG_DATA) as FeedbackDialogData;
  private readonly feedbackService = inject(FeedbackService);
  private readonly notify = inject(NotificationPanelService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly isAdmin = computed(() => this.auth.hasRole('admin'));

  readonly categories: FeedbackCategory[] = ['BUG', 'FEATURE', 'UX', 'OTHER'];
  readonly statuses: FeedbackStatus[] = ['NEW', 'IN_REVIEW', 'RESOLVED'];

  readonly createForm = this.fb.group({
    category: [this.data.draft?.category || ('OTHER' as FeedbackCategory), Validators.required],
    message: [this.data.draft?.message || '', [Validators.required, Validators.maxLength(2000)]],
    rating: [this.data.draft?.rating ?? ''],
    page_url: [{ value: this.data.pageUrl || '', disabled: true }]
  });

  readonly loadingList = signal(false);
  readonly feedback = signal<Feedback[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(8);
  readonly hasNext = signal(false);
  readonly hasPrev = signal(false);
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  private rowState = new Map<number, { status: FeedbackStatus; admin_note: string; saving: boolean }>();

  ngOnInit(): void {
    this.loadList();
  }

  submit(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const raw = this.createForm.getRawValue();
    const ratingValue = raw.rating ? Number(raw.rating) : null;
    this.feedbackService
      .create({
        category: raw.category as FeedbackCategory,
        message: raw.message!.trim(),
        rating: ratingValue || null,
        page_url: this.data.pageUrl || ''
      })
      .subscribe({
        next: () => {
          this.notify.success('Feedback sent');
          this.resetForm();
          this.page.set(1);
          this.loadList();
        },
        error: (err) => this.notify.errorFrom(err, 'Unable to send feedback')
      });
  }

  loadList(): void {
    this.loadingList.set(true);
    this.feedbackService
      .list({ page: this.page(), page_size: this.pageSize() })
      .subscribe({
        next: (resp) => {
          this.feedback.set(resp.results || []);
          this.total.set(resp.count || 0);
          this.hasNext.set(!!resp.next);
          this.hasPrev.set(!!resp.previous);
          this.loadingList.set(false);
        },
        error: (err) => {
          this.loadingList.set(false);
          this.notify.errorFrom(err, 'Failed to load feedback');
        }
      });
  }

  prevPage(): void {
    if (!this.hasPrev()) return;
    this.page.update((p) => Math.max(1, p - 1));
    this.loadList();
  }

  nextPage(): void {
    if (!this.hasNext()) return;
    this.page.update((p) => p + 1);
    this.loadList();
  }

  updatePageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.loadList();
  }

  getRowState(item: Feedback) {
    let state = this.rowState.get(item.id);
    if (!state) {
      state = { status: item.status, admin_note: item.admin_note || '', saving: false };
      this.rowState.set(item.id, state);
    }
    return state;
  }

  isDirty(item: Feedback): boolean {
    const state = this.getRowState(item);
    return state.status !== item.status || state.admin_note !== (item.admin_note || '');
  }

  saveAdmin(item: Feedback): void {
    if (!this.isAdmin() || !this.isDirty(item)) return;
    const state = this.getRowState(item);
    state.saving = true;
    this.feedbackService.update(item.id, {
      status: state.status,
      admin_note: state.admin_note
    }).subscribe({
      next: (updated) => {
        state.saving = false;
        const list = this.feedback().map((f) => (f.id === item.id ? updated : f));
        this.feedback.set(list);
        this.notify.success('Feedback updated');
      },
      error: (err) => {
        state.saving = false;
        this.notify.errorFrom(err, 'Unable to update feedback');
      }
    });
  }

  closeAndReset(): void {
    this.resetForm();
    this.dialogRef.close({ reset: true });
  }

  cancel(): void {
    this.resetForm();
    this.dialogRef.close({ reset: true });
  }

  getDraft() {
    const raw = this.createForm.getRawValue();
    return {
      category: raw.category as FeedbackCategory,
      message: raw.message || '',
      rating: raw.rating ?? '',
      page_url: this.data.pageUrl || ''
    };
  }

  private resetForm(): void {
    this.createForm.reset({
      category: 'OTHER',
      message: '',
      rating: '',
      page_url: this.data.pageUrl || ''
    });
    this.createForm.controls.page_url.setValue(this.data.pageUrl || '');
    this.createForm.markAsPristine();
    this.createForm.markAsUntouched();
    this.createForm.updateValueAndValidity();
  }
}
