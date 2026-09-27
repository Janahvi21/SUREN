# SUREN

Smart Urban Resource Exchange Network is a digital coordination platform for reusable and surplus urban resources.

The platform connects providers and seekers through resource listings, requests, approvals, pickup verification, transaction tracking, maps, analytics, notifications, and rule-based matching.

## Stack

- React 19, TypeScript, Vite
- Tailwind CSS
- React Router
- Supabase Auth, PostgreSQL, Storage, Realtime
- Leaflet and OpenStreetMap
- Recharts
- QRCode React and html5-qrcode
- Oxlint

## Local Setup

Requirements:

- Node.js 20 or newer
- A Supabase project
- Supabase CLI access for the linked project

Install dependencies:

```powershell
npm install
```

Create `.env` from `.env.example`:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Never put a Supabase service-role key in the frontend environment.

Start the app:

```powershell
npm run dev
```

## Database Workflow

Database changes are version-controlled in `supabase/migrations`.

Apply migrations with:

```powershell
npx supabase db push
npx supabase migration list
```

Do not edit already-applied migrations. Add a new uniquely named migration for every schema change.

## Implemented Workflows

### Authentication

- Email/password registration and login
- Provider and seeker roles
- Admin-only user management
- Protected routes
- Password reset
- Profile editing

### Resources

- Provider resource creation, editing, deletion, and status changes
- Resource categories and image uploads
- Address-first location input
- Automatic geocoding using OpenStreetMap Nominatim and India Post pincode lookup
- Draggable map pin adjustment
- Search by title, category, address, city, landmark, and pincode

### Requests and Transactions

- Seeker requests
- Provider approval and rejection
- Atomic inventory reduction
- Transaction creation
- QR token generation and verification
- QR scanner and manual token entry
- Transaction completion
- Notifications for request and transaction events

### Discovery and Reporting

- OpenStreetMap resource map with multiple markers
- Rule-based matching score:
  - Category: 40%
  - City: 25%
  - Quantity: 20%
  - Availability: 15%
- Analytics charts and CSV export
- Demand insights based on real request history
- Sustainability estimates clearly labeled as quantity-based proxies
- Realtime notification bell and notification center

## Useful Routes

After signing in:

- `/dashboard`
- `/dashboard/resources`
- `/dashboard/requests`
- `/dashboard/transactions`
- `/dashboard/map`
- `/dashboard/analytics`
- `/dashboard/demand`
- `/dashboard/matching`
- `/dashboard/notifications`
- `/dashboard/profile`
- `/dashboard/users` for admins

## Verification

Run the production build:

```powershell
npm run build
```

Run lint:

```powershell
npm run lint
```

Test the main exchange flow:

1. Register a provider and a seeker.
2. Provider creates a resource with an address and pincode.
3. Provider clicks **Find Location**, checks the generated pin, adjusts it if needed, and saves.
4. Seeker finds the resource and submits a request.
5. Provider approves the request.
6. Open Transactions and generate a pickup QR.
7. Verify the QR using the scanner or manual token.
8. Complete the transaction.
9. Confirm the resource quantity, request status, transaction status, notification, and analytics values.

## Data and Privacy Notes

- Latitude and longitude are internal map fields and are not shown in normal resource displays.
- Resources without confirmed coordinates are not assigned fake map markers.
- QR codes contain a secure random token, not personal information.
- Supabase Row Level Security controls profile, resource, request, transaction, and notification access.
- Sustainability values are estimates and are not scientific lifecycle assessments.
