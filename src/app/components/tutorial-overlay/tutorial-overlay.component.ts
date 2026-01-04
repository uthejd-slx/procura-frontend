import { Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { NgIf, NgStyle } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

import { TutorialService } from '../../core/tutorial.service';

type Rect = { top: number; left: number; width: number; height: number };

@Component({
  selector: 'app-tutorial-overlay',
  standalone: true,
  imports: [NgIf, NgStyle, MatButtonModule, MatIconModule, MatCardModule],
  templateUrl: './tutorial-overlay.component.html',
  styleUrl: './tutorial-overlay.component.scss'
})
export class TutorialOverlayComponent implements OnInit, OnDestroy {
  private readonly tutorial = inject(TutorialService);

  readonly step = computed(() => this.tutorial.currentStep());
  readonly stepIndex = computed(() => this.tutorial.stepIndex() + 1);
  readonly totalSteps = computed(() => this.tutorial.totalSteps());
  readonly isActive = computed(() => this.tutorial.isActive());

  readonly hasTarget = signal(false);
  readonly highlightStyle = signal<Record<string, string>>({});
  readonly popoverStyle = signal<Record<string, string>>({});

  private scrollTarget: HTMLElement | null = null;
  private readonly scrollHandler = () => this.refreshPosition();

  ngOnInit(): void {
    effect(() => {
      if (!this.isActive()) return;
      if (!this.step()) return;
      this.scheduleRefresh();
    });
    setTimeout(() => this.attachScrollListener(), 0);
  }

  ngOnDestroy(): void {
    this.detachScrollListener();
  }

  next(): void {
    this.tutorial.next();
  }

  prev(): void {
    this.tutorial.prev();
  }

  skip(): void {
    this.tutorial.skip();
  }

  finish(): void {
    this.tutorial.finish();
  }

  private attachScrollListener(): void {
    if (typeof document !== 'undefined') {
      this.scrollTarget = document.querySelector('.app-content') as HTMLElement | null;
      if (this.scrollTarget) {
        this.scrollTarget.addEventListener('scroll', this.scrollHandler, { passive: true });
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.scrollHandler, { passive: true });
      window.addEventListener('scroll', this.scrollHandler, { passive: true });
    }
  }

  private detachScrollListener(): void {
    if (this.scrollTarget) {
      this.scrollTarget.removeEventListener('scroll', this.scrollHandler);
      this.scrollTarget = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.scrollHandler);
      window.removeEventListener('scroll', this.scrollHandler);
    }
  }

  private scheduleRefresh(): void {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => this.refreshPosition());
  }

  private refreshPosition(): void {
    if (!this.isActive()) return;
    const step = this.step();
    if (!step) return;
    const selector = step.selector;
    const target = selector && typeof document !== 'undefined' ? (document.querySelector(selector) as HTMLElement | null) : null;
    if (!target) {
      this.hasTarget.set(false);
      this.popoverStyle.set({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      });
      return;
    }

    const rect = target.getBoundingClientRect();
    const padded = this.padRect(rect, 8);
    this.hasTarget.set(true);
    this.highlightStyle.set({
      top: `${Math.max(padded.top, 8)}px`,
      left: `${Math.max(padded.left, 8)}px`,
      width: `${Math.min(padded.width, window.innerWidth - 16)}px`,
      height: `${Math.min(padded.height, window.innerHeight - 16)}px`
    });
    this.popoverStyle.set(this.computePopover(rect));
  }

  private padRect(rect: DOMRect, pad: number): Rect {
    return {
      top: rect.top - pad,
      left: rect.left - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2
    };
  }

  private computePopover(rect: DOMRect): Record<string, string> {
    const popoverWidth = 320;
    const popoverHeight = 200;
    const gap = 12;
    let top = rect.bottom + gap;
    let left = rect.left;

    if (top + popoverHeight > window.innerHeight) {
      top = rect.top - popoverHeight - gap;
    }
    if (top < 12) top = 12;

    if (left + popoverWidth > window.innerWidth) {
      left = window.innerWidth - popoverWidth - 12;
    }
    if (left < 12) left = 12;

    return {
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      transform: 'translate(0, 0)'
    };
  }
}
