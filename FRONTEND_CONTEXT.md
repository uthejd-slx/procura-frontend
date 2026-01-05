# Frontend Context (Angular)

This document is the canonical reference for frontend-backend integration during development.

## Project Layout
- Frontend code: `frontend/`
- Angular source: `frontend/src/app/`
  - Core services: `frontend/src/app/core/`
  - Pages: `frontend/src/app/pages/`
  - Each page component now uses separate `.ts`, `.html`, and `.scss` files.

## Local Dev
- Run frontend: `npm run start` (Angular dev server on `http://localhost:4200`)
- API base URL is injected at runtime via `/assets/runtime-config.js`.
  - Default fallback (local): `http://localhost:8001/api`
  - Production uses `.env.prod` `API_BASE_URL` and the nginx entrypoint writes it on container start.
- Runtime config also includes `appVersion` (from `.env.prod` `APP_VERSION`) for the footer.
- Docker image serves the Angular `dist/frontend/browser` output (application builder) via nginx.

## Demo Automation
- `frontend/scripts/demo-run.ts` seeds demo users/data, captures Playwright screenshots, and writes `frontend/docs/USAGE_GUIDE.md`.
- Screenshots are written to `frontend/docs/screenshots/`.
- Run: `npm run demo:run`
- Optional env overrides: `API_BASE` (defaults to auto-detect), `APP_BASE` (default `http://localhost:4210`).

## Routes
- `/` Home (requires auth; unauth redirects to `/login`)
- Home shows quick links to all M1 pages and role-gated areas.
- Notifications are accessed via a toolbar bell icon (dialog; mark read/all-read).
- The bell shows a badge with the unread count from `GET /api/notifications/unread-count/`.
- Feedback is submitted from a floating action button on the bottom-left of the app shell (chat-style panel).
- A guided tutorial overlay is available from the user menu or the sidenav Help icon (manual launch).
- Tutorial steps are role-aware (employee/approver/procurement/admin) and skip missing UI elements.
- Help guide page renders `frontend/docs/USAGE_GUIDE.md` inside the app at `/help` with a sticky table-of-contents sidebar (served from `/assets/docs` with a `/docs` fallback, resolved via base href).
- Tutorial steps attempt to use seeded demo data by resolving known records (BOM/PO/Transfer/Bill) before navigation.
- `/boms` BOM list
- `/boms/new` Create BOM draft (may hit draft limit)
- `/boms/:id` BOM detail (edit when `DRAFT`/`NEEDS_CHANGES`)
- BOM detail includes collaborators (add/remove) via dialog, export downloads (PDF/CSV/JSON), and a delete action for owner/admin.
- BOM detail supports deletion by the owner or an admin (with confirmation).
- Collaborators are loaded via `/api/boms/:id/collaborators/` and managed via add/remove endpoints.
- `/boms/:id/events` BOM audit events (server-filtered via `/api/bom-events/?bom_id=...`)
- `/audit` Audit log with filters + pagination for BOM events
- `/bom-templates` Templates (global + mine)
- `/inbox/signoff` Items assigned to me (signoff)
- `/inbox/approvals` Procurement approvals assigned to me (role-gated: `approver` or `admin`)
- `/procurement` Procurement actions (role-gated: `procurement` or `admin` for access; actions require `procurement`)
- `/admin/users` Admin user management (role-gated: `admin`)
- `/catalog` Catalog items (create/edit personal items; filters for vendor/category/search)
- `/purchase-orders` Purchase orders list (role-gated: `procurement` or `admin` for access; actions require `procurement`)
- `/purchase-orders/:id` Purchase order detail (line items, mark sent/cancel, receive)
- `/attachments` Attachments list + upload (BOM/PO/Bill linked)
- `/search` Search history
- `/assets` Asset list + edit (role-gated: `procurement` or `admin` for access; actions require `procurement`)
- `/partners` Partner companies (role-gated: `procurement` or `admin` for access; actions require `procurement`)
- `/transfers` Transfers list + create (role-gated: `procurement` or `admin` for access; actions require `procurement`)
- `/transfers/:id` Transfer detail (items + workflow actions)
- `/bills` Bills list + create (role-gated: `procurement` or `admin` for access; actions require `procurement`)
- `/bills/:id` Bill detail + attachments
- `/login` Login (JWT)
- `/register` Register (activation email)
- `/activate?uid=...&token=...` Account activation
- `/reset-password` Request password reset
- `/reset-password/confirm?uid=...&token=...` Set new password
- `/profile` Profile page (protected)
- Feedback dialog posts to `/api/feedback/` and lists the current user's feedback; admins can update `status` and `admin_note`.
- BOM workflow actions: UI allows the BOM owner or collaborators to request signoff or procurement approval; approver pickers include only users with the `approver` role; cancel flow is available to the BOM owner or procurement role.
- BOM and PO item forms include the optional `category` field introduced in M5.
- Template UIs include a dialog view for schema details and a preview when selecting a template on `/boms/new`.
- Template detail dialog renders schema fields in a table with sample values.
- Template preview uses `schema.sample_bom` and `schema.sample_items` when provided by the backend seeder.
- Catalog items support an optional JSON `data` field for extra attributes.
- Global templates can be edited by any user (saved as a user-owned copy); delete is admin-only for globals and owner/admin for personal templates.
- Template creation/edit uses a structured field builder UI (BOM fields + item fields) instead of raw JSON.
- Field keys are auto-generated from labels (slugified and de-duplicated).
- BOM list supports filter + pagination (status, search/q, project, owner_id, template_id, created/updated date ranges, page + page_size) plus a client-side “Shared with me” toggle.
- BOM item add renders template-specific item fields (auto-generated controls from the BOM template schema) and maps known fields into the payload.
- Catalog prefill UI in BOM detail is currently hidden; template fields are the only inputs shown for item creation.
- Signoff requests are initiated from each item row (icon button + dialog).
- Procurement approval requests are launched from a dialog in the workflow section.
- Notifications dialog supports filters (read/unread, level, created date range) with pagination.
- Profile includes `notifications_email_enabled` toggle for email mirroring.
- Procurement core UI pages for catalog items, purchase orders, attachments, and search history are implemented.
- Operations UI pages for assets, partner transfers, and bills (no approval workflow) are implemented.
- API throttling (HTTP 429) and upload-size errors (HTTP 413) surface as user notifications via the global error interceptor.

## Auth + Tokens
- Login: `POST /api/auth/login/` returns `{ access, refresh, user }`
- User payloads include computed `roles` (used for role-gated UI like admin/procurement).
- Tokens stored in `localStorage`:
  - `auth.access`
  - `auth.refresh`
- `frontend/src/app/core/auth.interceptor.ts` automatically:
  - adds `Authorization: Bearer <access>` when present
  - refreshes the access token on `401` via `POST /api/auth/token/refresh/` and navigates to `/login` if refresh fails

## Dev-mode Email Links
When the backend runs in `DJANGO_DEBUG=1` and Microsoft Graph fails, responses may include:
- Registration: `activation_link`
- Reset request: `reset_link`
The frontend does not auto-open these links; users are prompted to check email for activation/reset.

## UI Theme
- Material theme uses a lime primary accent (matching `#c9da7a`) and a light red error color (matching `#ffb4ab`) configured in `frontend/src/styles.scss`.
- Default typography uses the Poppins font loaded from `frontend/src/index.html`.
- Auth routes use the split-panel `AuthShellComponent` and hide the global toolbar.
- App toolbar shows a user icon menu (Profile/Logout) when authenticated.
- Notifications open in a Material dialog from the toolbar bell icon (no standalone page route).
- Main app layout renders content inside a centered dark shell card with a left icon-only sidenav; secondary links live under a "More" menu icon; the toolbar is positioned as a floating overlay above the page.
- Branding: app name is `procura` with an SVG mark at `frontend/src/assets/procura-mark.svg` used in the toolbar and auth shell.
- Sidenav icons are rendered as centered "pill" buttons with tooltips; menu items use the same dark card styling with boxed icons.
- A global top progress bar (indeterminate) shows API activity; page-level spinners were removed.
- Global card surface tokens (`--pt-card-radius`, `--pt-card-bg`, `--pt-card-border`) drive consistent rounding and borders across cards, tables, dialogs, and list blocks.
- Material overlays (menus/selects/autocomplete), tooltips, slide toggles, and scrollbars are styled to match the dark-lime theme.
- Snackbars were replaced by a custom pop-up notification panel (bottom-right stack with close icons) to match the UI theme.
- File upload inputs use themed styling for the Choose file button and field.
- Help guide markdown content uses theme styling with responsive images and tables.
