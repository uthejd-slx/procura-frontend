import { Routes } from '@angular/router';

import { authGuard } from './core/auth.guard';
import { publicOnlyGuard } from './core/public-only.guard';
import { adminGuard, approverGuard, procurementGuard } from './core/role.guard';
import { ActivateComponent } from './pages/activate/activate.component';
import { AdminUsersComponent } from './pages/admin/admin-users.component';
import { AuditEventsComponent } from './pages/audit/audit-events.component';
import { AssetsComponent } from './pages/assets/assets.component';
import { AttachmentsComponent } from './pages/attachments/attachments.component';
import { BomDetailComponent } from './pages/boms/bom-detail.component';
import { BomEventsComponent } from './pages/boms/bom-events.component';
import { BomNewComponent } from './pages/boms/bom-new.component';
import { BomsListComponent } from './pages/boms/boms-list.component';
import { BillDetailComponent } from './pages/bills/bill-detail.component';
import { BillsComponent } from './pages/bills/bills.component';
import { CatalogComponent } from './pages/catalog/catalog.component';
import { HelpComponent } from './pages/help/help.component';
import { HomeComponent } from './pages/home/home.component';
import { ApprovalsInboxComponent } from './pages/inbox/approvals-inbox.component';
import { SignoffInboxComponent } from './pages/inbox/signoff-inbox.component';
import { LoginComponent } from './pages/login/login.component';
import { PartnersComponent } from './pages/partners/partners.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { ProcurementComponent } from './pages/procurement/procurement.component';
import { PurchaseOrderDetailComponent } from './pages/purchase-orders/purchase-order-detail.component';
import { PurchaseOrdersComponent } from './pages/purchase-orders/purchase-orders.component';
import { RegisterComponent } from './pages/register/register.component';
import { ResetConfirmComponent } from './pages/reset-confirm/reset-confirm.component';
import { ResetRequestComponent } from './pages/reset-request/reset-request.component';
import { SearchComponent } from './pages/search/search.component';
import { BomTemplatesComponent } from './pages/templates/bom-templates.component';
import { TransferDetailComponent } from './pages/transfers/transfer-detail.component';
import { TransfersComponent } from './pages/transfers/transfers.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, canActivate: [authGuard] },
  { path: 'boms', component: BomsListComponent, canActivate: [authGuard] },
  { path: 'boms/new', component: BomNewComponent, canActivate: [authGuard] },
  { path: 'boms/:id', component: BomDetailComponent, canActivate: [authGuard] },
  { path: 'boms/:id/events', component: BomEventsComponent, canActivate: [authGuard] },
  { path: 'audit', component: AuditEventsComponent, canActivate: [authGuard] },
  { path: 'assets', component: AssetsComponent, canActivate: [authGuard, procurementGuard] },
  { path: 'partners', component: PartnersComponent, canActivate: [authGuard, procurementGuard] },
  { path: 'transfers', component: TransfersComponent, canActivate: [authGuard, procurementGuard] },
  { path: 'transfers/:id', component: TransferDetailComponent, canActivate: [authGuard, procurementGuard] },
  { path: 'catalog', component: CatalogComponent, canActivate: [authGuard] },
  { path: 'help', component: HelpComponent, canActivate: [authGuard] },
  { path: 'bom-templates', component: BomTemplatesComponent, canActivate: [authGuard] },
  { path: 'inbox/signoff', component: SignoffInboxComponent, canActivate: [authGuard] },
  { path: 'inbox/approvals', component: ApprovalsInboxComponent, canActivate: [authGuard, approverGuard] },
  { path: 'purchase-orders', component: PurchaseOrdersComponent, canActivate: [authGuard, procurementGuard] },
  { path: 'purchase-orders/:id', component: PurchaseOrderDetailComponent, canActivate: [authGuard, procurementGuard] },
  { path: 'attachments', component: AttachmentsComponent, canActivate: [authGuard] },
  { path: 'search', component: SearchComponent, canActivate: [authGuard] },
  { path: 'bills', component: BillsComponent, canActivate: [authGuard, procurementGuard] },
  { path: 'bills/:id', component: BillDetailComponent, canActivate: [authGuard, procurementGuard] },
  { path: 'procurement', component: ProcurementComponent, canActivate: [authGuard, procurementGuard] },
  { path: 'admin/users', component: AdminUsersComponent, canActivate: [authGuard, adminGuard] },
  { path: 'login', component: LoginComponent, canActivate: [publicOnlyGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [publicOnlyGuard] },
  { path: 'activate', component: ActivateComponent },
  { path: 'reset-password', component: ResetRequestComponent },
  { path: 'reset-password/confirm', component: ResetConfirmComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
