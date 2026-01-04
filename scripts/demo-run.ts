import { cp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { chromium, type Page } from 'playwright';

let apiBase = process.env['API_BASE'] || '';
const APP_BASE = process.env['APP_BASE'] || 'http://localhost:4210';

const DOCS_DIR = path.resolve(process.cwd(), 'docs');
const SCREENSHOT_DIR = path.join(DOCS_DIR, 'screenshots');
const GUIDE_PATH = path.join(DOCS_DIR, 'USAGE_GUIDE.md');

const seedAdmin = { email: 'uthejd@slicktronicx.com', password: '2106534219' };

const demoUsers = {
  admin: {
    email: 'admin.demo@procura.io',
    password: 'ProcuraAdmin!23',
    first_name: 'Demo',
    last_name: 'Admin',
    roles: ['admin']
  },
  procurement: {
    email: 'procurement.demo@procura.io',
    password: 'ProcuraBuy!23',
    first_name: 'Demo',
    last_name: 'Procurement',
    roles: ['procurement']
  },
  approver: {
    email: 'approver.demo@procura.io',
    password: 'ProcuraApprove!23',
    first_name: 'Demo',
    last_name: 'Approver',
    roles: ['approver']
  },
  employee: {
    email: 'employee.demo@procura.io',
    password: 'ProcuraEmployee!23',
    first_name: 'Demo',
    last_name: 'Employee',
    roles: []
  }
};

type TokenResponse = {
  access: string;
  refresh: string;
  user: { id: number; email: string };
};

type CatalogItem = {
  id: number;
  name: string;
  description: string;
  category: string;
  vendor_name: string;
  vendor_url: string;
  currency: string;
  unit_price: string | null;
  tax_percent: string | null;
  data: any;
};

type Bom = {
  id: number;
  title: string;
};

type BomItem = {
  id: number;
  name: string;
};

type PurchaseOrder = {
  id: number;
};

type Asset = {
  id: number;
};

type Partner = {
  id: number;
  name: string;
};

type Transfer = {
  id: number;
};

type Bill = {
  id: number;
};

type ApiUser = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
};

type Paginated<T> = { results?: T[] };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const asList = <T>(resp: Paginated<T> | T[] | undefined): T[] => {
  if (!resp) return [];
  return Array.isArray(resp) ? resp : resp.results || [];
};

async function resolveApiBase() {
  if (apiBase) return apiBase;
  const candidates = ['http://localhost:8080/api', 'http://localhost:8000/api', 'http://localhost:4210/api'];

  for (const candidate of candidates) {
    try {
      const res = await fetch(`${candidate}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });
      if (res.status !== 404) {
        apiBase = candidate;
        return candidate;
      }
    } catch {
      // try next candidate
    }
  }

  throw new Error('Unable to resolve API base. Set API_BASE env var (e.g., http://localhost:8080/api).');
}

async function apiRequest<T>(
  path: string,
  options: { method?: string; token?: string; body?: any; isForm?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`;
  if (options.body && !options.isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${apiBase}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? (options.isForm ? options.body : JSON.stringify(options.body)) : undefined
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${options.method || 'GET'} ${path} failed: ${res.status} ${text}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await res.json()) as T;
  }
  return (await res.text()) as T;
}

async function fetchFirst<T>(path: string, token: string): Promise<T | undefined> {
  const resp = await apiRequest<Paginated<T> | T[]>(path, { token });
  return asList(resp)[0];
}

async function findPartnerIdByName(name: string, token: string): Promise<number | undefined> {
  const resp = await apiRequest<Paginated<Partner> | Partner[]>('/partners/?page_size=200', { token });
  return asList(resp).find((partner) => partner.name.toLowerCase() === name.toLowerCase())?.id;
}

async function apiLogin(email: string, password: string): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/auth/login/', {
    method: 'POST',
    body: { email, password }
  });
}

async function ensureUser(adminToken: string, user: typeof demoUsers[keyof typeof demoUsers]) {
  try {
    await apiRequest('/auth/register/', {
      method: 'POST',
      body: {
        email: user.email,
        password: user.password,
        first_name: user.first_name,
        last_name: user.last_name
      }
    });
  } catch {
    // user may already exist
  }

  const users = await apiRequest<ApiUser[]>('/users/', { token: adminToken });
  const found = users.find((u) => u.email.toLowerCase() === user.email.toLowerCase());
  if (!found) throw new Error(`Unable to find user ${user.email}`);

  await apiRequest(`/admin/users/${found.id}/`, {
    method: 'PATCH',
    token: adminToken,
    body: { roles: user.roles, is_active: true }
  });

  return { id: found.id, email: user.email, password: user.password };
}

async function seedDemoData(tokens: Record<string, TokenResponse>, ids: Record<string, number>) {
  const adminToken = tokens.admin.access;
  const procurementToken = tokens.procurement.access;
  const approverToken = tokens.approver.access;
  const employeeToken = tokens.employee.access;

  const templatesResp = await apiRequest<Paginated<any> | any[]>('/bom-templates/', { token: adminToken });
  const templates = asList(templatesResp);
  const template = templates.find((t) => t.is_global) || templates[0];

  const employeeCatalogResp = await apiRequest<CatalogItem>('/catalog-items/', {
    method: 'POST',
    token: employeeToken,
    body: {
      name: 'USB Flash Drive 128GB',
      description: 'USB 3.2 metal flash drive, 128GB storage.',
      category: 'Storage',
      vendor_name: 'Amazon',
      vendor_url: 'https://www.amazon.com/',
      currency: 'USD',
      unit_price: '12.99',
      tax_percent: '8',
      data: { color: 'silver', warranty_months: 12 }
    }
  });

  const employeeCatalog =
    employeeCatalogResp.id
      ? employeeCatalogResp
      : ((await fetchFirst<CatalogItem>(
          `/catalog-items/?search=${encodeURIComponent('USB Flash Drive 128GB')}&page_size=1`,
          employeeToken
        )) as CatalogItem);

  const procurementCatalogResp = await apiRequest<CatalogItem>('/catalog-items/', {
    method: 'POST',
    token: procurementToken,
    body: {
      name: 'USB-C Hub 7-in-1',
      description: '7-port USB-C hub with HDMI and PD.',
      category: 'Accessories',
      vendor_name: 'Anker',
      vendor_url: 'https://www.anker.com/',
      currency: 'USD',
      unit_price: '39.00',
      tax_percent: '8',
      data: { ports: 7, warranty_months: 18 }
    }
  });

  const procurementCatalog =
    procurementCatalogResp.id
      ? procurementCatalogResp
      : ((await fetchFirst<CatalogItem>(
          `/catalog-items/?search=${encodeURIComponent('USB-C Hub 7-in-1')}&page_size=1`,
          procurementToken
        )) as CatalogItem);

  const bomResp = await apiRequest<Bom>('/boms/', {
    method: 'POST',
    token: employeeToken,
    body: {
      template: template?.id || null,
      title: 'Office accessories request',
      project: 'Workspace refresh',
      data: { department: 'IT', priority: 'Normal' }
    }
  });

  const bomId =
    bomResp.id ??
    (await fetchFirst<Bom>(
      `/boms/?search=${encodeURIComponent('Office accessories request')}&owner_id=${ids.employee}&page_size=1`,
      employeeToken
    ))?.id;

  if (!bomId) {
    throw new Error('Unable to resolve BOM id after creation.');
  }

  const bom: Bom = { id: bomId, title: bomResp.title || 'Office accessories request' };

  const item1 = await apiRequest<BomItem>(`/boms/${bom.id}/items/`, {
    method: 'POST',
    token: employeeToken,
    body: {
      name: employeeCatalog.name,
      description: employeeCatalog.description,
      quantity: '5',
      unit: 'pcs',
      vendor: employeeCatalog.vendor_name,
      category: employeeCatalog.category,
      unit_price: employeeCatalog.unit_price,
      currency: employeeCatalog.currency,
      tax_percent: employeeCatalog.tax_percent,
      link: employeeCatalog.vendor_url,
      notes: 'For new hires',
      data: employeeCatalog.data
    }
  });

  const item2 = await apiRequest<BomItem>(`/boms/${bom.id}/items/`, {
    method: 'POST',
    token: employeeToken,
    body: {
      name: procurementCatalog.name,
      description: procurementCatalog.description,
      quantity: '3',
      unit: 'pcs',
      vendor: procurementCatalog.vendor_name,
      category: procurementCatalog.category,
      unit_price: procurementCatalog.unit_price,
      currency: procurementCatalog.currency,
      tax_percent: procurementCatalog.tax_percent,
      link: procurementCatalog.vendor_url,
      notes: 'Docking accessories',
      data: procurementCatalog.data
    }
  });

  await apiRequest(`/boms/${bom.id}/collaborators/`, {
    method: 'POST',
    token: employeeToken,
    body: { user_id: ids.approver }
  });
  await apiRequest(`/boms/${bom.id}/collaborators/`, {
    method: 'POST',
    token: employeeToken,
    body: { user_id: ids.procurement }
  });

  await apiRequest(`/boms/${bom.id}/request-signoff/`, {
    method: 'POST',
    token: employeeToken,
    body: {
      assignee_id: ids.approver,
      item_ids: [item1.id, item2.id],
      comment: 'Please review items for signoff.'
    }
  });

  await apiRequest(`/bom-items/${item1.id}/signoff/`, {
    method: 'POST',
    token: approverToken,
    body: { status: 'APPROVED', comment: 'Looks good.' }
  });

  await apiRequest(`/bom-items/${item2.id}/signoff/`, {
    method: 'POST',
    token: approverToken,
    body: { status: 'APPROVED', comment: 'Looks good.' }
  });

  await apiRequest(`/boms/${bom.id}/request-procurement-approval/`, {
    method: 'POST',
    token: employeeToken,
    body: {
      approver_ids: [ids.approver],
      comment: 'Requesting approval for this BOM.'
    }
  });

  const approvals = await apiRequest<{ results: Array<{ id: number }> }>(
    `/procurement-approvals/?bom_id=${bom.id}`,
    {
      token: approverToken
    }
  );
  if (approvals.results.length) {
    await apiRequest(`/procurement-approvals/${approvals.results[0]!.id}/decide/`, {
      method: 'POST',
      token: approverToken,
      body: { status: 'APPROVED', comment: 'Approved for procurement.' }
    });
  }

  const bomPendingSignoffResp = await apiRequest<Bom>('/boms/', {
    method: 'POST',
    token: employeeToken,
    body: {
      template: template?.id || null,
      title: 'Keyboard accessories (signoff pending)',
      project: 'Workspace refresh',
      data: { department: 'IT', priority: 'Low' }
    }
  });

  const bomPendingSignoffId =
    bomPendingSignoffResp.id ??
    (await fetchFirst<Bom>(
      `/boms/?search=${encodeURIComponent('Keyboard accessories (signoff pending)')}&owner_id=${ids.employee}&page_size=1`,
      employeeToken
    ))?.id;

  if (bomPendingSignoffId) {
    const pendingItem = await apiRequest<BomItem>(`/boms/${bomPendingSignoffId}/items/`, {
      method: 'POST',
      token: employeeToken,
      body: {
        name: 'Mechanical keyboard',
        description: 'Compact mechanical keyboard.',
        quantity: '2',
        unit: 'pcs',
        vendor: 'Amazon',
        category: 'Accessories',
        unit_price: '79.00',
        currency: 'USD',
        tax_percent: '8',
        link: 'https://www.amazon.com/',
        notes: 'Pending signoff demo',
        data: { color: 'black' }
      }
    });

    await apiRequest(`/boms/${bomPendingSignoffId}/request-signoff/`, {
      method: 'POST',
      token: employeeToken,
      body: {
        assignee_id: ids.approver,
        item_ids: [pendingItem.id],
        comment: 'Please review this item.'
      }
    });
  }

  const bomPendingApprovalResp = await apiRequest<Bom>('/boms/', {
    method: 'POST',
    token: employeeToken,
    body: {
      template: template?.id || null,
      title: 'Office supplies (approval pending)',
      project: 'Workspace refresh',
      data: { department: 'IT', priority: 'Medium' }
    }
  });

  const bomPendingApprovalId =
    bomPendingApprovalResp.id ??
    (await fetchFirst<Bom>(
      `/boms/?search=${encodeURIComponent('Office supplies (approval pending)')}&owner_id=${ids.employee}&page_size=1`,
      employeeToken
    ))?.id;

  if (bomPendingApprovalId) {
    const pendingApprovalItem = await apiRequest<BomItem>(`/boms/${bomPendingApprovalId}/items/`, {
      method: 'POST',
      token: employeeToken,
      body: {
        name: 'Desk organizer set',
        description: 'Metal mesh desk organizer.',
        quantity: '4',
        unit: 'pcs',
        vendor: 'Staples',
        category: 'Office',
        unit_price: '15.00',
        currency: 'USD',
        tax_percent: '8',
        link: 'https://www.staples.com/',
        notes: 'Pending approval demo',
        data: { finish: 'matte' }
      }
    });

    await apiRequest(`/boms/${bomPendingApprovalId}/request-signoff/`, {
      method: 'POST',
      token: employeeToken,
      body: {
        assignee_id: ids.approver,
        item_ids: [pendingApprovalItem.id],
        comment: 'Approve for procurement request.'
      }
    });

    await apiRequest(`/bom-items/${pendingApprovalItem.id}/signoff/`, {
      method: 'POST',
      token: approverToken,
      body: { status: 'APPROVED', comment: 'Approved.' }
    });

    await apiRequest(`/boms/${bomPendingApprovalId}/request-procurement-approval/`, {
      method: 'POST',
      token: employeeToken,
      body: {
        approver_ids: [ids.approver],
        comment: 'Approval pending demo.'
      }
    });
  }

  await apiRequest(`/procurement-actions/${bom.id}/mark-ordered/`, {
    method: 'POST',
    token: procurementToken,
    body: { comment: 'Order placed with vendor.' }
  });

  await apiRequest(`/procurement-actions/${bom.id}/receive/`, {
    method: 'POST',
    token: procurementToken,
    body: {
      lines: [
        { item_id: item1.id, quantity_received: '2' },
        { item_id: item2.id, quantity_received: '1' }
      ],
      comment: 'Partial receipt'
    }
  });

  await apiRequest(`/procurement-actions/${bom.id}/receive/`, {
    method: 'POST',
    token: procurementToken,
    body: {
      lines: [
        { item_id: item1.id, quantity_received: '3' },
        { item_id: item2.id, quantity_received: '2' }
      ],
      comment: 'Final receipt'
    }
  });

  const poResp = await apiRequest<PurchaseOrder>('/purchase-orders/', {
    method: 'POST',
    token: procurementToken,
    body: {
      bom: bom.id,
      vendor_name: 'Amazon',
      currency: 'USD',
      notes: 'Demo purchase order'
    }
  });

  const poId =
    poResp.id ??
    (await fetchFirst<PurchaseOrder>(
      `/purchase-orders/?bom_id=${bom.id}&vendor=Amazon&page_size=1`,
      procurementToken
    ))?.id;

  if (!poId) {
    throw new Error('Unable to resolve Purchase Order id after creation.');
  }

  const po: PurchaseOrder = { id: poId };

  const poItem = await apiRequest<{ id: number }>(`/purchase-orders/${po.id}/items/`, {
    method: 'POST',
    token: procurementToken,
    body: {
      bom_item: item1.id,
      name: item1.name,
      quantity: '2',
      unit: 'pcs',
      vendor: 'Amazon',
      category: 'Storage',
      unit_price: '12.99',
      currency: 'USD'
    }
  });

  await apiRequest(`/purchase-orders/${po.id}/mark-sent/`, {
    method: 'POST',
    token: procurementToken
  });

  await apiRequest(`/purchase-orders/${po.id}/receive/`, {
    method: 'POST',
    token: procurementToken,
    body: { lines: [{ item_id: poItem.id, quantity_received: '1' }] }
  });

  await apiRequest(`/purchase-orders/${po.id}/receive/`, {
    method: 'POST',
    token: procurementToken,
    body: { lines: [{ item_id: poItem.id, quantity_received: '1' }] }
  });

  await sleep(500);
  const assetsResp = await apiRequest<{ results: Asset[] }>('/assets/', { token: procurementToken });
  const assetId = assetsResp.results[0]?.id;

  let partnerResp: { id: number } | undefined;
  try {
    partnerResp = await apiRequest<{ id: number }>('/partners/', {
      method: 'POST',
      token: procurementToken,
      body: {
        name: 'Slicktronix Logistics',
        contact_email: 'logistics@slicktronix.com',
        contact_phone: '+1 555 0100',
        address: '100 Demo Park, Austin TX'
      }
    });
  } catch {
    partnerResp = undefined;
  }

  const partnerId =
    partnerResp?.id ??
    (await findPartnerIdByName('Slicktronix Logistics', procurementToken)) ??
    (await fetchFirst<Partner>(`/partners/?page_size=1`, procurementToken))?.id;

  if (!partnerId) {
    throw new Error('Unable to resolve partner id after creation.');
  }

  const transferResp = await apiRequest<Transfer>('/transfers/', {
    method: 'POST',
    token: procurementToken,
    body: { partner: partnerId, notes: 'Send items to partner' }
  });

  const transferId =
    transferResp.id ?? (await fetchFirst<Transfer>(`/transfers/?page_size=1`, procurementToken))?.id;

  if (!transferId) {
    throw new Error('Unable to resolve transfer id after creation.');
  }

  const transfer: Transfer = { id: transferId };

  if (assetId) {
    await apiRequest(`/transfers/${transfer.id}/items/`, {
      method: 'POST',
      token: procurementToken,
      body: { asset: assetId, quantity: '1', notes: 'Demo transfer line' }
    });
  }

  await apiRequest(`/transfers/${transfer.id}/submit/`, {
    method: 'POST',
    token: procurementToken
  });

  await apiRequest(`/transfers/${transfer.id}/approve/`, {
    method: 'POST',
    token: adminToken
  });

  await apiRequest(`/transfers/${transfer.id}/complete/`, {
    method: 'POST',
    token: procurementToken
  });

  const billResp = await apiRequest<Bill>('/bills/', {
    method: 'POST',
    token: procurementToken,
    body: {
      title: 'Amazon Invoice - Office Accessories',
      vendor_name: 'Amazon',
      amount: '129.99',
      currency: 'USD',
      bom: bom.id,
      notes: 'Invoice for office accessories'
    }
  });

  const billId =
    billResp.id ?? (await fetchFirst<Bill>(`/bills/?bom_id=${bom.id}&vendor=Amazon&page_size=1`, procurementToken))?.id;

  if (!billId) {
    throw new Error('Unable to resolve bill id after creation.');
  }

  const bill: Bill = { id: billId };

  const filePayload = new Blob(['Demo attachment file.'], { type: 'text/plain' });
  const form = new FormData();
  form.append('file', filePayload, 'demo-attachment.txt');
  form.append('bom', String(bom.id));
  await apiRequest('/attachments/', { method: 'POST', token: procurementToken, body: form, isForm: true });

  const billForm = new FormData();
  billForm.append('file', new Blob(['Bill attachment.'], { type: 'text/plain' }), 'bill.txt');
  billForm.append('bill', String(bill.id));
  await apiRequest('/attachments/', { method: 'POST', token: procurementToken, body: billForm, isForm: true });

  await apiRequest('/search/history/', {
    method: 'POST',
    token: employeeToken,
    body: { entity_type: 'BOM', query: 'office', filters: { status: 'APPROVED' } }
  });

  await apiRequest('/feedback/', {
    method: 'POST',
    token: employeeToken,
    body: { category: 'FEATURE', message: 'Loving the catalog quick add!', page_url: '/boms', rating: 5 }
  });

  const feedbackResp = await apiRequest<{ results: Array<{ id: number }> }>('/feedback/', { token: adminToken });
  if (feedbackResp.results.length) {
    await apiRequest(`/feedback/${feedbackResp.results[0]!.id}/`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'IN_REVIEW', admin_note: 'Reviewing demo feedback.' }
    });
  }

  return {
    bomId: bom.id,
    poId: po.id,
    transferId: transfer.id,
    billId: bill.id,
    partnerId,
    catalogEmployeeId: employeeCatalog.id,
    catalogProcurementId: procurementCatalog.id
  };
}

async function loginUI(page: Page, email: string, password: string) {
  await page.goto(`${APP_BASE}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL(`${APP_BASE}/`, { timeout: 15000 });
  await page.waitForTimeout(800);
}

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, name), fullPage: true });
}

async function runScreenshots(
  userCreds: Record<string, { email: string; password: string }>,
  ids: {
    bomId: number;
    poId: number;
    transferId: number;
    billId: number;
    partnerId: number;
    catalogEmployeeId?: number;
    catalogProcurementId?: number;
  }
) {
  const browser = await chromium.launch({ headless: true });

  const captureRole = async (role: string, handler: (page: Page) => Promise<void>) => {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await ctx.newPage();
    if (role === 'employee') {
      await page.goto(`${APP_BASE}/login`, { waitUntil: 'networkidle' });
      await screenshot(page, 'auth-login.png');
      await page.goto(`${APP_BASE}/register`, { waitUntil: 'networkidle' });
      await screenshot(page, 'auth-register.png');
      await page.goto(`${APP_BASE}/reset-password`, { waitUntil: 'networkidle' });
      await screenshot(page, 'auth-reset-request.png');
      await page.goto(`${APP_BASE}/reset-password/confirm?uid=invalid&token=invalid`, { waitUntil: 'networkidle' });
      await screenshot(page, 'auth-reset-confirm.png');
      await page.goto(`${APP_BASE}/activate?uid=invalid&token=invalid`, { waitUntil: 'networkidle' });
      await screenshot(page, 'auth-activate.png');
    }
    await loginUI(page, userCreds[role]!.email, userCreds[role]!.password);
    await handler(page);
    await ctx.close();
  };

  await captureRole('employee', async (page) => {
    await page.goto(`${APP_BASE}/`, { waitUntil: 'networkidle' });
    await screenshot(page, 'home-employee.png');

    await page.goto(`${APP_BASE}/boms`, { waitUntil: 'networkidle' });
    await page.getByLabel('Search').fill('Office accessories request');
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await page.waitForTimeout(1000);
    await screenshot(page, 'boms-list.png');

    await page.goto(`${APP_BASE}/boms/${ids.bomId}`, { waitUntil: 'networkidle' });
    await screenshot(page, 'bom-detail.png');

    await page.getByRole('button', { name: 'Download' }).click();
    await screenshot(page, 'bom-download-menu.png');
    await page.keyboard.press('Escape');

    await page.goto(`${APP_BASE}/boms/new`, { waitUntil: 'networkidle' });
    await screenshot(page, 'bom-create.png');

    await page.goto(`${APP_BASE}/bom-templates`, { waitUntil: 'networkidle' });
    await screenshot(page, 'templates.png');
    const viewButton = page.getByRole('button', { name: 'View' }).first();
    if (await viewButton.count()) {
      await viewButton.click();
      await page.waitForTimeout(500);
      await screenshot(page, 'template-view.png');
      await page.keyboard.press('Escape');
    }

    await page.goto(`${APP_BASE}/catalog`, { waitUntil: 'networkidle' });
    await page.getByPlaceholder('Search').fill('USB Flash Drive 128GB');
    await page.getByRole('button', { name: 'Apply' }).click();
    await page.waitForTimeout(800);
    await screenshot(page, 'catalog.png');

    await page.goto(`${APP_BASE}/search`, { waitUntil: 'networkidle' });
    await screenshot(page, 'search-history.png');

    await page.goto(`${APP_BASE}/audit`, { waitUntil: 'networkidle' });
    await screenshot(page, 'audit-log.png');

    await page.goto(`${APP_BASE}/profile`, { waitUntil: 'networkidle' });
    await screenshot(page, 'profile.png');

    await page.locator('button[aria-label="Notifications"]').first().click();
    await page.waitForTimeout(500);
    await screenshot(page, 'notifications.png');

    await page.goto(`${APP_BASE}/help`, { waitUntil: 'networkidle' });
    await screenshot(page, 'help-guide.png');
  });

  await captureRole('approver', async (page) => {
    await page.goto(`${APP_BASE}/inbox/signoff`, { waitUntil: 'networkidle' });
    await screenshot(page, 'signoff-inbox.png');

    await page.goto(`${APP_BASE}/inbox/approvals`, { waitUntil: 'networkidle' });
    await screenshot(page, 'approvals-inbox.png');
  });

  await captureRole('procurement', async (page) => {
    await page.goto(`${APP_BASE}/procurement`, { waitUntil: 'networkidle' });
    await screenshot(page, 'procurement-actions.png');

    await page.goto(`${APP_BASE}/purchase-orders`, { waitUntil: 'networkidle' });
    await page.locator('form.pt-filters input[placeholder="Vendor"]').fill('Amazon');
    await page.getByRole('button', { name: 'Apply' }).click();
    await page.waitForTimeout(800);
    await screenshot(page, 'purchase-orders.png');
    await page.goto(`${APP_BASE}/purchase-orders/${ids.poId}`, { waitUntil: 'networkidle' });
    await screenshot(page, 'purchase-order-detail.png');

    await page.goto(`${APP_BASE}/assets`, { waitUntil: 'networkidle' });
    await screenshot(page, 'assets.png');

    await page.goto(`${APP_BASE}/partners`, { waitUntil: 'networkidle' });
    await screenshot(page, 'partners.png');

    await page.goto(`${APP_BASE}/transfers`, { waitUntil: 'networkidle' });
    await screenshot(page, 'transfers.png');
    await page.goto(`${APP_BASE}/transfers/${ids.transferId}`, { waitUntil: 'networkidle' });
    await screenshot(page, 'transfer-detail.png');

    await page.goto(`${APP_BASE}/bills`, { waitUntil: 'networkidle' });
    await page.locator('form.pt-filters input[placeholder="Vendor"]').fill('Amazon');
    await page.getByRole('button', { name: 'Apply' }).click();
    await page.waitForTimeout(800);
    await screenshot(page, 'bills.png');
    await page.goto(`${APP_BASE}/bills/${ids.billId}`, { waitUntil: 'networkidle' });
    await screenshot(page, 'bill-detail.png');

    await page.goto(`${APP_BASE}/attachments`, { waitUntil: 'networkidle' });
    await page.locator('form.pt-filters input[placeholder="BOM ID"]').fill(String(ids.bomId));
    await page.getByRole('button', { name: 'Apply' }).click();
    await page.waitForTimeout(800);
    await screenshot(page, 'attachments.png');
  });

  await captureRole('admin', async (page) => {
    await page.goto(`${APP_BASE}/admin/users`, { waitUntil: 'networkidle' });
    await screenshot(page, 'admin-users.png');

    await page.getByRole('button', { name: 'Feedback' }).click();
    await page.waitForTimeout(600);
    await screenshot(page, 'feedback-panel.png');
  });

  await browser.close();
}

async function writeGuide() {
  const content = `# Procura Usage Guide

This guide documents the demo data and screenshots generated by the automation script. Each section walks through a feature step-by-step so it can be used directly in the in-app Help view.

## Demo accounts
- Admin: ${demoUsers.admin.email} / ${demoUsers.admin.password}
- Procurement: ${demoUsers.procurement.email} / ${demoUsers.procurement.password}
- Approver: ${demoUsers.approver.email} / ${demoUsers.approver.password}
- Employee: ${demoUsers.employee.email} / ${demoUsers.employee.password}
_Note: Demo accounts exist only if demo data was seeded._

## Table of contents
1. [Getting started](#getting-started)
2. [Home + navigation](#home--navigation)
3. [BOM workflow](#bom-workflow)
4. [Templates](#templates)
5. [Catalog](#catalog)
6. [Signoff + approvals](#signoff--approvals)
7. [Procurement actions](#procurement-actions)
8. [Purchase orders](#purchase-orders)
9. [Assets](#assets)
10. [Partners + transfers](#partners--transfers)
11. [Bills](#bills)
12. [Attachments](#attachments)
13. [Search history](#search-history)
14. [Audit log](#audit-log)
15. [Notifications](#notifications)
16. [Help guide and tutorial](#help-guide-and-tutorial)
17. [Feedback](#feedback)
18. [Profile + admin](#profile--admin)

## Getting started
### Register a new account
1. Open the registration screen.
2. Enter your email, password, and name.
3. Submit to receive an activation email.

![Register](./screenshots/auth-register.png)

### Activate your account
1. Open the activation link from the email.
2. You will see a success message when activation completes.
3. Return to Login and sign in.

![Activation](./screenshots/auth-activate.png)
_Note: The screenshot uses a placeholder link; with a valid email link the message will show 'Account activated successfully.'_

### Sign in
1. Open the login screen and sign in with one of the demo accounts.
2. Use **Forgot password** if you need to reset credentials.

![Login](./screenshots/auth-login.png)

### Reset password
1. Open the reset request screen and enter your email.
2. Use the email link to open the reset form.
3. Set the new password and log in again.

![Reset request](./screenshots/auth-reset-request.png)
![Reset confirm](./screenshots/auth-reset-confirm.png)

## Home + navigation
1. Use the left nav to jump between modules.
2. The top-right bell shows notification count and opens in-app notifications.
3. The floating Feedback button opens the feedback panel.

![Home](./screenshots/home-employee.png)

## BOM workflow
### 1) List and filter BOMs
1. Open **BOMs** in the nav.
2. Use the search field to filter by title or project.
3. Use status/date filters to narrow results and page controls to navigate.

![BOM list](./screenshots/boms-list.png)

### 2) Create a new BOM
1. Click **New BOM**.
2. Select a template (if available) to auto-generate dynamic fields.
3. Fill out the BOM details and item list, then save.
4. Use **Select from Catalog** to prefill BOM item fields from a saved catalog item.

![Create BOM](./screenshots/bom-create.png)

### 3) BOM detail, collaborators, and export
1. Open a BOM to view items and status.
2. Use **Collaborators** to add/remove editors (they can request approvals).
3. Use **Download** to export PDF/CSV/JSON.
_Note: Collaborators can edit only while the BOM is DRAFT or NEEDS_CHANGES. Collaborators can remove themselves._

![BOM detail](./screenshots/bom-detail.png)
![BOM export](./screenshots/bom-download-menu.png)

## Templates
1. Visit **BOM Templates** to view global and personal templates.
2. Click **View** to open the schema preview with real sample data.
3. Editing a global template creates a personal copy automatically.

![Templates](./screenshots/templates.png)
![Template preview](./screenshots/template-view.png)

## Catalog
1. Open **Catalog** to manage reusable items.
2. Search by keyword, category, or vendor.
3. Use **Edit** to update items or **Delete** to remove them.

![Catalog](./screenshots/catalog.png)

## Signoff + approvals
### Signoff inbox (Approver role)
1. Signoff inbox is for any user assigned as a signoff assignee (any role).
2. Open **Signoff Inbox** to see assigned items.
3. Approve or request changes per item.

![Signoff inbox](./screenshots/signoff-inbox.png)

### Procurement approvals (Approver role)
1. Open **Approvals** to review BOM approvals.
2. Approve or request changes to advance the workflow.
_Note: All approvers must approve; a 'Needs Changes' decision resets the workflow._

![Approvals inbox](./screenshots/approvals-inbox.png)

## Procurement actions
_Note: Visible only to users with the procurement role._
1. Procurement users open **Procurement Actions** to track ordering and receiving.
2. Mark BOMs ordered and receive items as they arrive.

![Procurement actions](./screenshots/procurement-actions.png)

## Purchase orders
_Note: Visible only to users with the procurement role._
1. Open **Purchase Orders** and filter by vendor or BOM ID.
2. Click **View** to open an order and review line items.
3. Use the detail view to record receiving.

![Purchase orders](./screenshots/purchase-orders.png)
![Purchase order detail](./screenshots/purchase-order-detail.png)

## Assets
_Note: Visible only to users with the procurement role._
1. Assets are auto-created when BOM/PO items are fully received.
2. Procurement can edit asset fields as needed.

![Assets](./screenshots/assets.png)

## Partners + transfers
_Note: Visible only to users with the procurement role._
1. Create or manage partners under **Partners**.
2. Use **Transfers** to move assets between partners.
3. Open a transfer to see line items and status updates.

![Partners](./screenshots/partners.png)
![Transfers](./screenshots/transfers.png)
![Transfer detail](./screenshots/transfer-detail.png)

## Bills
_Note: Visible only to users with the procurement role._
1. Open **Bills** and filter by vendor or BOM ID.
2. Use **New bill** to create a bill and link it to a BOM or PO.
3. Open a bill to attach files or update details.

![Bills](./screenshots/bills.png)
![Bill detail](./screenshots/bill-detail.png)

## Attachments
1. Upload files and link them to BOMs, POs, or Bills.
2. Use the list to download or delete attachments.

![Attachments](./screenshots/attachments.png)

## Search history
1. Open **Search History** to review saved queries.
2. This list is scoped to the current user.

![Search history](./screenshots/search-history.png)

## Audit log
1. Open **Audit Log** to see recent workflow events.
2. Filter by BOM, actor, or date range when needed.

![Audit log](./screenshots/audit-log.png)

## Notifications
1. Click the bell icon to open notifications.
2. Mark items read or clear all.
3. Toggle email mirroring in **Profile** if enabled.

![Notifications](./screenshots/notifications.png)

## Help guide and tutorial
1. Open **Help guide** from the user menu or the More menu.
2. Use **Help - Start tutorial** to launch the guided walkthrough.
3. The tutorial adapts to your role and skips missing UI elements.

![Help guide](./screenshots/help-guide.png)

## Feedback
1. Click the **Feedback** button to open the panel.
2. Submit a category, message, and optional rating.
3. Admins can review status updates in the same panel.

![Feedback](./screenshots/feedback-panel.png)

## Profile + admin
1. Update display name, job title, and notification preferences in **Profile**.
2. Admins manage roles and activation in **Admin Users**.

![Profile](./screenshots/profile.png)
![Admin users](./screenshots/admin-users.png)
`;

  await writeFile(GUIDE_PATH, content, 'utf8');
}

async function syncDocsToAssets() {
  const targetDir = path.resolve(process.cwd(), 'src', 'assets', 'docs');
  await mkdir(targetDir, { recursive: true });
  await cp(DOCS_DIR, targetDir, { recursive: true, force: true });
}

async function main() {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  await resolveApiBase();

  const seed = await apiLogin(seedAdmin.email, seedAdmin.password);
  const newAdmin = await ensureUser(seed.access, demoUsers.admin);
  const adminTokens = await apiLogin(newAdmin.email, newAdmin.password);

  const procurementUser = await ensureUser(adminTokens.access, demoUsers.procurement);
  const approverUser = await ensureUser(adminTokens.access, demoUsers.approver);
  const employeeUser = await ensureUser(adminTokens.access, demoUsers.employee);

  const tokens = {
    admin: adminTokens,
    procurement: await apiLogin(procurementUser.email, procurementUser.password),
    approver: await apiLogin(approverUser.email, approverUser.password),
    employee: await apiLogin(employeeUser.email, employeeUser.password)
  };

  const ids = {
    admin: newAdmin.id,
    procurement: procurementUser.id,
    approver: approverUser.id,
    employee: employeeUser.id
  };

  const seeded = await seedDemoData(tokens, ids);
  await sleep(1000);
  await runScreenshots(
    {
      admin: demoUsers.admin,
      procurement: demoUsers.procurement,
      approver: demoUsers.approver,
      employee: demoUsers.employee
    },
    {
      bomId: seeded.bomId,
      poId: seeded.poId,
      transferId: seeded.transferId,
      billId: seeded.billId,
      partnerId: seeded.partnerId,
      catalogEmployeeId: seeded.catalogEmployeeId,
      catalogProcurementId: seeded.catalogProcurementId
    }
  );

  await writeGuide();
  await syncDocsToAssets();
  console.log('Demo data, screenshots, and usage guide generated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
