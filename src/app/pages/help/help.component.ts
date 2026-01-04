import { APP_BASE_HREF, NgFor, NgIf } from '@angular/common';
import { Component, inject, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { marked } from 'marked';
import { TutorialService } from '../../core/tutorial.service';

type TocItem = {
  id: string;
  text: string;
  level: number;
};

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [NgIf, NgFor, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './help.component.html',
  styleUrl: './help.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class HelpComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly tutorial = inject(TutorialService);
  private readonly baseHref = inject(APP_BASE_HREF, { optional: true }) ?? '/';

  readonly content = signal<SafeHtml | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly toc = signal<TocItem[]>([]);
  private readonly sources = this.buildSources();

  ngOnInit(): void {
    this.loadGuide(0);
  }

  startTutorial(): void {
    void this.tutorial.start(true);
  }

  scrollTo(id: string, event: Event): void {
    event.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private stripHtml(value: string): string {
    return value.replace(/<[^>]*>/g, '');
  }

  private loadGuide(index: number): void {
    if (index >= this.sources.length) {
      this.loading.set(false);
      this.error.set('Help content is unavailable.');
      return;
    }

    const source = this.sources[index]!;
    const basePath = source.replace(/\/USAGE_GUIDE\.md$/, '');
    this.http.get(source, { responseType: 'text' }).subscribe({
      next: (markdown) => {
        const toc: TocItem[] = [];
        const renderer = new marked.Renderer();
        renderer.heading = (text, level, raw) => {
          const id = this.slugify(raw);
          toc.push({ id, text: this.stripHtml(text), level });
          return `<h${level} id="${id}">${text}</h${level}>`;
        };
        marked.use({ renderer });
        const normalized = markdown.replace(/\.\/screenshots\//g, `${basePath}/screenshots/`);
        const html = marked.parse(normalized, { breaks: true }) as string;
        this.toc.set(toc);
        this.content.set(this.sanitizer.bypassSecurityTrustHtml(html));
        this.loading.set(false);
        this.error.set(null);
      },
      error: () => this.loadGuide(index + 1)
    });
  }

  private buildSources(): string[] {
    const base = this.baseHref.endsWith('/') ? this.baseHref : `${this.baseHref}/`;
    const candidates = [
      `${base}assets/docs/USAGE_GUIDE.md`,
      `${base}docs/USAGE_GUIDE.md`,
      '/assets/docs/USAGE_GUIDE.md',
      '/docs/USAGE_GUIDE.md'
    ];
    return Array.from(new Set(candidates));
  }
}
