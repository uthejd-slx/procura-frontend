import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from './auth.service';
import { BomService } from './bom.service';
import { BillsService } from './bills.service';
import { PurchaseOrdersService } from './purchase-orders.service';
import { TransfersService } from './transfers.service';
import type { AppRole } from './roles';

export type TutorialRoute = string | (() => string | null);

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  selector?: string;
  route?: TutorialRoute;
  roles?: AppRole[];
}

type TutorialContext = {
  bomId?: number;
  purchaseOrderId?: number;
  transferId?: number;
  billId?: number;
};

const STORAGE_KEY = 'tutorial.completed.v1';
const LAST_BOM_KEY = 'tutorial.lastBomId';

@Injectable({ providedIn: 'root' })
export class TutorialService {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly boms = inject(BomService);
  private readonly purchaseOrders = inject(PurchaseOrdersService);
  private readonly transfers = inject(TransfersService);
  private readonly bills = inject(BillsService);

  readonly isActive = signal(false);
  readonly stepIndex = signal(0);
  private readonly context = signal<TutorialContext>({});
  private contextLoaded = false;
  private readonly activeSteps = signal<TutorialStep[]>([]);
  readonly currentStep = computed(() => this.activeSteps()[this.stepIndex()] || null);

  private readonly commonSteps: TutorialStep[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'Your workspace overview with quick actions and widgets.',
      route: '/',
      selector: '[data-tutorial="home-dashboard"]'
    },
    {
      id: 'templates',
      title: 'Templates',
      description: 'Global templates can be edited and saved as your personal copy.',
      route: '/bom-templates',
      selector: '[data-tutorial="global-templates"]'
    }
  ];

  private readonly employeeSteps: TutorialStep[] = [
    {
      id: 'create-bom',
      title: 'Create a BOM',
      description: 'Start a new BOM from the main call-to-action on Home.',
      route: '/',
      selector: '[data-tutorial="new-bom"]',
      roles: ['employee']
    },
    {
      id: 'boms',
      title: 'BOM list',
      description: 'View all BOMs, filter them, and open details.',
      route: '/boms',
      selector: '[data-tutorial="boms-list"]',
      roles: ['employee']
    },
    {
      id: 'new-bom',
      title: 'Dynamic fields',
      description: 'Fill template-specific fields and use Select from Catalog to prefill item details.',
      route: '/boms/new',
      selector: '[data-tutorial="bom-dynamic-fields"]',
      roles: ['employee']
    },
    {
      id: 'bom-detail',
      title: 'Workflow',
      description: 'Edit your BOM, add collaborators (editable only in DRAFT/NEEDS_CHANGES), and request approvals.',
      route: () => this.lastBomRoute() || '/boms',
      selector: '[data-tutorial="bom-workflow"]',
      roles: ['employee']
    },
    {
      id: 'signoff',
      title: 'Signoff inbox',
      description: 'Signoff inbox is for any user assigned as a signoff assignee (any role).',
      route: '/inbox/signoff',
      selector: '[data-tutorial="signoff-inbox"]',
      roles: ['employee']
    },
    {
      id: 'catalog',
      title: 'Catalog',
      description: 'Maintain reusable catalog items for requests and orders.',
      route: '/catalog',
      selector: '[data-tutorial="catalog"]',
      roles: ['employee']
    },
    {
      id: 'attachments',
      title: 'Attachments',
      description: 'Upload and review BOM/PO/Bill attachments.',
      route: '/attachments',
      selector: '[data-tutorial="attachments"]',
      roles: ['employee']
    },
    {
      id: 'search',
      title: 'Search history',
      description: 'Review and log search activity.',
      route: '/search',
      selector: '[data-tutorial="search-history"]',
      roles: ['employee']
    },
    {
      id: 'audit',
      title: 'Audit log',
      description: 'Review workflow activity and audit events.',
      route: '/audit',
      selector: '[data-tutorial="audit-log"]',
      roles: ['employee']
    }
  ];

  private readonly approverSteps: TutorialStep[] = [
    {
      id: 'approvals',
      title: 'Approvals inbox',
      description: 'Approver role only. All approvers must approve; Needs Changes resets the workflow.',
      route: '/inbox/approvals',
      selector: '[data-tutorial="approvals-inbox"]',
      roles: ['approver', 'admin']
    },
    {
      id: 'approvals-action',
      title: 'Approve or request changes',
      description: 'Approve or mark items as needs changes from this action row.',
      route: '/inbox/approvals',
      selector: '[data-tutorial="approvals-action"]',
      roles: ['approver', 'admin']
    }
  ];

  private readonly procurementSteps: TutorialStep[] = [
    {
      id: 'procurement-actions',
      title: 'Procurement actions',
      description: 'Visible only to procurement role. Mark ordered and record received items.',
      route: '/procurement',
      selector: '[data-tutorial="procurement-actions"]',
      roles: ['procurement', 'admin']
    },
    {
      id: 'purchase-orders',
      title: 'Create purchase orders',
      description: 'Visible only to procurement role. Create and manage purchase orders by vendor.',
      route: '/purchase-orders',
      selector: '[data-tutorial="purchase-orders"]',
      roles: ['procurement', 'admin']
    },
    {
      id: 'purchase-order-detail',
      title: 'Purchase order detail',
      description: 'Review line items and record receipts on a specific order.',
      route: () => this.purchaseOrderRoute() || '/purchase-orders',
      selector: '[data-tutorial="purchase-order-detail"]',
      roles: ['procurement', 'admin']
    },
    {
      id: 'assets',
      title: 'Assets',
      description: 'Visible only to procurement role. View assets created from received items.',
      route: '/assets',
      selector: '[data-tutorial="assets"]',
      roles: ['procurement', 'admin']
    },
    {
      id: 'partners',
      title: 'Partners',
      description: 'Visible only to procurement role. Manage partner companies for transfers.',
      route: '/partners',
      selector: '[data-tutorial="partners"]',
      roles: ['procurement', 'admin']
    },
    {
      id: 'transfers',
      title: 'Transfers',
      description: 'Visible only to procurement role. Send assets to partner companies.',
      route: '/transfers',
      selector: '[data-tutorial="transfers"]',
      roles: ['procurement', 'admin']
    },
    {
      id: 'transfer-detail',
      title: 'Transfer detail',
      description: 'Review transfer items, quantities, and status.',
      route: () => this.transferRoute() || '/transfers',
      selector: '[data-tutorial="transfer-detail"]',
      roles: ['procurement', 'admin']
    },
    {
      id: 'bills',
      title: 'Bills',
      description: 'Visible only to procurement role. Upload and manage bills linked to BOMs or POs.',
      route: '/bills',
      selector: '[data-tutorial="bills"]',
      roles: ['procurement', 'admin']
    },
    {
      id: 'bill-detail',
      title: 'Bill detail',
      description: 'Update bill details and manage attachments.',
      route: () => this.billRoute() || '/bills',
      selector: '[data-tutorial="bill-detail"]',
      roles: ['procurement', 'admin']
    }
  ];

  private readonly adminSteps: TutorialStep[] = [
    {
      id: 'admin-users',
      title: 'User roles',
      description: 'Manage roles and activation for your organization.',
      route: '/admin/users',
      selector: '[data-tutorial="admin-users"]',
      roles: ['admin']
    }
  ];

  private readonly endSteps: TutorialStep[] = [
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Check the bell for unread updates and alerts.',
      selector: '[data-tutorial="notifications"]'
    }
  ];

  totalSteps(): number {
    return this.activeSteps().length;
  }

  startIfFirstLogin(): void {
    if (this.isActive()) return;
    if (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true') return;
    this.start(true);
  }

  async start(force = false): Promise<void> {
    if (this.isActive()) return;
    if (!force && typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true') return;
    await this.loadContext();
    this.activeSteps.set(this.filterSteps());
    if (this.activeSteps().length === 0) return;
    this.isActive.set(true);
    this.stepIndex.set(0);
    this.ensureStep(this.activeSteps()[0]);
  }

  next(): void {
    this.goToStep(this.stepIndex() + 1);
  }

  prev(): void {
    this.goToStep(this.stepIndex() - 1);
  }

  skip(): void {
    this.complete();
  }

  finish(): void {
    this.complete();
  }

  private complete(): void {
    this.isActive.set(false);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
  }

  private goToStep(index: number): void {
    if (index < 0) return;
    if (index >= this.activeSteps().length) {
      this.complete();
      return;
    }
    this.stepIndex.set(index);
    this.ensureStep(this.activeSteps()[index]);
  }

  private ensureStep(step: TutorialStep): void {
    const route = this.resolveRoute(step);
    if (route && this.router.url.split('?')[0] !== route) {
      this.router.navigateByUrl(route).finally(() => this.waitForTarget(step));
    } else {
      this.waitForTarget(step);
    }
  }

  private resolveRoute(step: TutorialStep): string | null {
    if (!step.route) return null;
    return typeof step.route === 'function' ? step.route() : step.route;
  }

  private waitForTarget(step: TutorialStep, attempt = 0): void {
    if (!this.isActive()) return;
    if (!step.selector) return;
    const el = typeof document !== 'undefined' ? document.querySelector(step.selector) : null;
    if (el) return;
    if (attempt >= 40) return;
    setTimeout(() => this.waitForTarget(step, attempt + 1), 250);
  }

  private lastBomRoute(): string | null {
    const contextId = this.context().bomId;
    if (contextId) return `/boms/${contextId}`;
    if (typeof localStorage === 'undefined') return null;
    const last = localStorage.getItem(LAST_BOM_KEY);
    if (!last) return null;
    return `/boms/${last}`;
  }

  private purchaseOrderRoute(): string | null {
    const id = this.context().purchaseOrderId;
    return id ? `/purchase-orders/${id}` : null;
  }

  private transferRoute(): string | null {
    const id = this.context().transferId;
    return id ? `/transfers/${id}` : null;
  }

  private billRoute(): string | null {
    const id = this.context().billId;
    return id ? `/bills/${id}` : null;
  }

  private async loadContext(): Promise<void> {
    if (this.contextLoaded) return;
    this.contextLoaded = true;

    const context: TutorialContext = {};

    try {
      const demoBoms = await firstValueFrom(this.boms.listBoms({ search: 'Office accessories request', page_size: 1 }));
      context.bomId = demoBoms.results[0]?.id;
    } catch {
      // ignore
    }

    if (!context.bomId) {
      try {
        const anyBom = await firstValueFrom(this.boms.listBoms({ page_size: 1 }));
        context.bomId = anyBom.results[0]?.id;
      } catch {
        // ignore
      }
    }

    if (context.bomId && typeof localStorage !== 'undefined') {
      localStorage.setItem(LAST_BOM_KEY, String(context.bomId));
    }

    try {
      const orders = await firstValueFrom(this.purchaseOrders.list({ vendor: 'Amazon', page_size: 1 }));
      context.purchaseOrderId = orders.results[0]?.id;
    } catch {
      // ignore
    }

    try {
      const transfers = await firstValueFrom(this.transfers.list({ page_size: 1 }));
      context.transferId = transfers.results[0]?.id;
    } catch {
      // ignore
    }

    try {
      const bills = await firstValueFrom(this.bills.list({ vendor: 'Amazon', page_size: 1 }));
      context.billId = bills.results[0]?.id;
    } catch {
      // ignore
    }

    this.context.set(context);
  }

  private filterSteps(): TutorialStep[] {
    const steps: TutorialStep[] = [];
    const isAdmin = this.auth.hasRole('admin');
    const canApprove = this.auth.hasRole('approver') || isAdmin;
    const canProcure = this.auth.hasRole('procurement') || isAdmin;

    steps.push(...this.commonSteps);
    steps.push(...this.employeeSteps);
    if (canApprove) steps.push(...this.approverSteps);
    if (canProcure) steps.push(...this.procurementSteps);
    if (isAdmin) steps.push(...this.adminSteps);

    const feedbackStep: TutorialStep = isAdmin
      ? {
          id: 'feedback-admin',
          title: 'Feedback admin',
          description: 'Admins can review and update feedback after opening the panel.',
          selector: '[data-tutorial="feedback"]'
        }
      : {
          id: 'feedback',
          title: 'Feedback',
          description: 'Send feedback anytime using the floating button.',
          selector: '[data-tutorial="feedback"]'
        };

    steps.push(...this.endSteps, feedbackStep);

    return steps.filter((step) => {
      if (!step.roles || step.roles.length === 0) return true;
      return step.roles.some((role) => this.auth.hasRole(role));
    });
  }
}
