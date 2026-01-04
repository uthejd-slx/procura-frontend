export interface ApiUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  roles: string[];
}

export interface TokenResponse {
  access: string;
  refresh: string;
  user?: ApiUser;
}

export interface Profile {
  display_name: string;
  phone_number: string;
  job_title: string;
  avatar_url: string;
  notifications_email_enabled?: boolean;
  updated_at: string;
  roles?: string[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface DirectoryUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  roles: string[];
}

export type NotificationLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface ApiNotification {
  id: number;
  title: string;
  body: string;
  link: string;
  level: NotificationLevel;
  created_at: string;
  read_at: string | null;
  is_read: boolean;
}

export type FeedbackCategory = 'BUG' | 'FEATURE' | 'UX' | 'OTHER';
export type FeedbackStatus = 'NEW' | 'IN_REVIEW' | 'RESOLVED';

export interface Feedback {
  id: number;
  user: number | null;
  category: FeedbackCategory;
  message: string;
  page_url: string;
  rating: number | null;
  status: FeedbackStatus;
  admin_note: string;
  created_at: string;
  updated_at: string;
}

export type BomStatus =
  | 'DRAFT'
  | 'SIGNOFF_PENDING'
  | 'APPROVAL_PENDING'
  | 'APPROVED'
  | 'NEEDS_CHANGES'
  | 'ORDERED'
  | 'RECEIVING'
  | 'COMPLETED'
  | 'CANCELED';

export type BomItemSignoffStatus = 'NONE' | 'REQUESTED' | 'APPROVED' | 'NEEDS_CHANGES' | 'CANCELED';

export interface BomTemplate {
  id: number;
  name: string;
  description: string;
  schema: BomTemplateSchema;
  owner: number | null;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

export interface BomTemplateSchemaField {
  key: string;
  label: string;
  type: string;
  options?: string[];
}

export interface BomTemplateSchema {
  version?: number;
  bom_fields?: BomTemplateSchemaField[];
  item_fields?: BomTemplateSchemaField[];
  sample_bom?: Record<string, unknown>;
  sample_items?: Array<Record<string, unknown> & { data?: Record<string, unknown> }>;
}

export interface BomItem {
  id: number;
  bom: number;
  name: string;
  description: string;
  quantity: string;
  unit: string;
  currency: string;
  unit_price: string | null;
  tax_percent: string | null;
  vendor: string;
  category: string;
  link: string;
  notes: string;
  data: any;
  signoff_assignee: number | null;
  signoff_status: BomItemSignoffStatus;
  signoff_comment: string;
  ordered_at: string | null;
  eta_date: string | null;
  received_quantity: string;
  received_at: string | null;
  is_fully_received: boolean;
  created_at: string;
  updated_at: string;
}

export interface Bom {
  id: number;
  owner: number;
  template: number | null;
  title: string;
  project: string;
  status: BomStatus;
  data: any;
  cancel_comment: string;
  items: BomItem[];
  collaborators?: number[];
  created_at: string;
  updated_at: string;
}

export interface BomCollaborator {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export interface BomEvent {
  id: number;
  bom: number;
  actor: number | null;
  event_type: string;
  message: string;
  data: any;
  created_at: string;
}

export type ProcurementApprovalStatus = 'PENDING' | 'APPROVED' | 'NEEDS_CHANGES';

export interface ProcurementApproval {
  id: number;
  request: number;
  approver: number;
  status: ProcurementApprovalStatus;
  comment: string;
  decided_at: string | null;
}

export interface CatalogItem {
  id: number;
  owner: number;
  name: string;
  description: string;
  category: string;
  vendor_name: string;
  vendor_url: string;
  currency: string;
  unit_price: string | null;
  tax_percent: string | null;
  data: any;
  created_at: string;
  updated_at: string;
}

export type PurchaseOrderStatus = 'DRAFT' | 'SENT' | 'PARTIAL' | 'RECEIVED' | 'CANCELED';

export interface PurchaseOrderItem {
  id: number;
  purchase_order: number;
  bom_item: number | null;
  name: string;
  description: string;
  quantity: string;
  unit: string;
  currency: string;
  unit_price: string | null;
  tax_percent: string | null;
  vendor: string;
  category: string;
  link: string;
  notes: string;
  data: any;
  ordered_at: string | null;
  eta_date: string | null;
  received_quantity: string;
  received_at: string | null;
  is_fully_received: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: number;
  bom: number | null;
  created_by: number | null;
  status: PurchaseOrderStatus;
  po_number: string;
  vendor_name: string;
  currency: string;
  notes: string;
  data: any;
  items: PurchaseOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: number;
  owner: number;
  file: string;
  file_url: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  bom: number | null;
  purchase_order: number | null;
  bill: number | null;
  created_at: string;
}

export type SearchEntityType = 'BOM' | 'CATALOG' | 'PO' | 'OTHER';

export interface SearchHistory {
  id: number;
  entity_type: SearchEntityType;
  query: string;
  filters: any;
  created_at: string;
}

export type AssetStatus = 'ACTIVE' | 'TRANSFERRED' | 'DISPOSED';

export interface Asset {
  id: number;
  source_bom_item: number | null;
  source_po_item: number | null;
  created_by: number | null;
  name: string;
  description: string;
  category: string;
  vendor: string;
  quantity: string;
  transferred_quantity: string;
  available_quantity: string;
  unit: string;
  status: AssetStatus;
  data: any;
  created_at: string;
}

export interface PartnerCompany {
  id: number;
  name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export type TransferStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'COMPLETED' | 'CANCELED';

export interface TransferItem {
  id: number;
  transfer: number;
  asset: Asset;
  quantity: string;
  notes: string;
  created_at: string;
}

export interface Transfer {
  id: number;
  partner: number;
  created_by: number | null;
  status: TransferStatus;
  notes: string;
  approved_by: number | null;
  approved_at: string | null;
  completed_at: string | null;
  items: TransferItem[];
  created_at: string;
  updated_at: string;
}

export type BillStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELED';

export interface Bill {
  id: number;
  title: string;
  vendor_name: string;
  amount: string | null;
  currency: string;
  due_date: string | null;
  status: BillStatus;
  notes: string;
  data: any;
  bom: number | null;
  purchase_order: number | null;
  created_by: number | null;
  approved_by: number | null;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}
