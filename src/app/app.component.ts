import { AsyncPipe, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatIconRegistry } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDividerModule } from '@angular/material/divider';
import { DomSanitizer } from '@angular/platform-browser';
import { filter } from 'rxjs';

import { AuthService } from './core/auth.service';
import { AvatarService } from './core/avatar.service';
import { NotificationsService } from './core/notifications.service';
import { NotificationsDialogService } from './core/notifications-dialog.service';
import { LoadingService } from './core/loading.service';
import { NotificationPanelComponent } from './components/notification-panel/notification-panel.component';
import { NotificationPanelService } from './core/notification-panel.service';
import { FeedbackDialogService } from './core/feedback-dialog.service';
import { TutorialService } from './core/tutorial.service';
import { TutorialOverlayComponent } from './components/tutorial-overlay/tutorial-overlay.component';
import { resolveAppVersion } from './core/api-base-url';
import type { ApiUser } from './core/types';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    AsyncPipe,
    NgIf,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatMenuModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatDividerModule,
    NotificationPanelComponent,
    TutorialOverlayComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationsService);
  private readonly notificationPanel = inject(NotificationPanelService);
  private readonly router = inject(Router);
  private readonly notificationsDialog = inject(NotificationsDialogService);
  private readonly feedbackDialog = inject(FeedbackDialogService);
  private readonly loading = inject(LoadingService);
  private readonly iconRegistry = inject(MatIconRegistry);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly avatarService = inject(AvatarService);
  private readonly tutorial = inject(TutorialService);

  readonly user$ = this.auth.user$;
  readonly isAuthenticated = computed(() => this.auth.isAuthenticated());
  readonly isAdmin = computed(() => this.auth.hasRole('admin'));
  readonly isProcurement = computed(() => this.auth.hasRole('procurement'));
  readonly canProcure = computed(() => this.auth.hasRole('procurement') || this.auth.hasRole('admin'));
  readonly canApprove = computed(() => this.auth.hasRole('approver') || this.auth.hasRole('admin'));
  readonly isAuthRoute = signal(false);
  readonly isLoading = computed(() => this.loading.isLoading());
  readonly unreadCount = computed(() => this.notifications.unreadCount());
  readonly currentYear = new Date().getFullYear();
  readonly appVersion = computed(() => resolveAppVersion());
  readonly userAvatarSrc = computed(() => {
    const user = this.user$();
    if (!user) return '';
    const seed = user.email || String(user.id || '');
    if (!seed) return '';
    return this.avatarService.getAvatar(seed, this.userInitials(user), 64);
  });

  ngOnInit(): void {
    this.registerIcons();
    if (this.auth.isAuthenticated()) {
      this.auth.loadMe().subscribe();
      this.notifications.refreshUnread().subscribe({ error: () => undefined });
    }

    this.updateLayoutForUrl(this.router.url);
    this.router.events.pipe(filter((evt) => evt instanceof NavigationEnd)).subscribe((evt) => {
      this.updateLayoutForUrl((evt as NavigationEnd).urlAfterRedirects);
    });

  }

  private updateLayoutForUrl(url: string): void {
    const path = url.split('?')[0];
    const authPrefixes = ['/login', '/register', '/activate', '/reset-password'];
    const isAuth = authPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
    this.isAuthRoute.set(isAuth);
    if (!isAuth && this.auth.isAuthenticated()) {
      this.notifications.refreshUnread().subscribe({ error: () => undefined });
    }
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('auth-mode', isAuth);
    }
  }

  private registerIcons(): void {
    this.iconRegistry.addSvgIcon(
      'procura_mark',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/procura-mark.svg')
    );

    this.iconRegistry.addSvgIconLiteral(
      'pt_account',
      this.sanitizer.bypassSecurityTrustHtml(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 12a4 4 0 1 0-4-4a4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"/>
        </svg>`
      )
    );

    this.iconRegistry.addSvgIconLiteral(
      'pt_profile',
      this.sanitizer.bypassSecurityTrustHtml(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 12a4 4 0 1 0-4-4a4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"/>
        </svg>`
      )
    );

    this.iconRegistry.addSvgIconLiteral(
      'pt_logout',
      this.sanitizer.bypassSecurityTrustHtml(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path fill="currentColor" d="M16 13v-2H7V8l-5 4l5 4v-3Zm3-10H10a2 2 0 0 0-2 2v4h2V5h9v14h-9v-4H8v4a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z"/>
        </svg>`
      )
    );

    this.iconRegistry.addSvgIconLiteral(
      'pt_home',
      this.sanitizer.bypassSecurityTrustHtml(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 3l9 8h-3v10h-5v-6H11v6H6V11H3z"/>
        </svg>`
      )
    );
  }

  logout(): void {
    this.auth.logout();
    this.notifications.clearUnread();
    this.feedbackDialog.close();
    this.notificationPanel.success('Logged out');
  }

  openNotifications(): void {
    this.notificationsDialog.open();
  }

  openFeedback(): void {
    this.feedbackDialog.open();
  }

  startTutorial(): void {
    this.tutorial.start(true);
  }

  private userInitials(user: ApiUser): string {
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    const source = name || user.email || '';
    if (!source) return 'P';
    const parts = source.replace(/@.*$/, '').split(' ').filter(Boolean);
    return (
      parts
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('') || 'P'
    );
  }
}
