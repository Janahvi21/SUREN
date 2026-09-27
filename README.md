# SUREN – Smart Urban Resource Exchange Network

> **Connect what is available with what is needed.**

SUREN is a digital resource exchange and coordination platform designed to reduce the wastage of reusable and surplus urban resources by connecting people and organizations that have resources with people and organizations that need them.

## Problem Statement

Urban areas generate large amounts of reusable and surplus resources such as food, books, clothes, furniture, electronics, and other household or community resources. At the same time, NGOs, shelters, schools, communities, families, and individuals may need these resources.

The major problem is not always the lack of resources, but the lack of an organized system to discover, request, allocate, verify, and track available resources.

Currently, resource exchange is often handled through WhatsApp groups, social media posts, phone calls, or multiple disconnected platforms. This creates several problems:

- Available resources are difficult to discover.
- People may not know who currently has the required resource.
- Pickup locations are difficult to coordinate.
- Requests are handled manually.
- Resource quantities are not properly tracked.
- Multiple users may request the same limited resource.
- There is no structured approval or rejection workflow.
- There is limited verification during resource pickup.
- Completed exchanges are difficult to track.
- Organizations have limited visibility into demand and resource usage.
- There is no centralized analytics system to understand resource exchange patterns.

## Proposed Solution

SUREN – Smart Urban Resource Exchange Network provides a structured digital platform for managing the complete lifecycle of an urban resource exchange.

Instead of only displaying available resources, SUREN manages the complete process from resource listing to successful pickup.

The platform connects two primary users:

**Provider:** A person or organization that has a resource available.

**Seeker:** A person or organization looking for a resource.

The complete workflow is:

```text
Provider
   ↓
List Resource
   ↓
Add Address & Location
   ↓
Resource Discovery
   ↓
Seeker Request
   ↓
Provider Approval / Rejection
   ↓
Automatic Quantity Update
   ↓
Transaction Creation
   ↓
QR Pickup Verification
   ↓
Transaction Completion
   ↓
Analytics & Demand Insights
````

---

## What Makes SUREN Different?

SUREN is not simply a platform that centralizes resource listings. Its main innovation is the structured and trackable exchange workflow.

### 1. Address-Based Location Intelligence

Users are not required to manually enter latitude and longitude.

Providers can enter:

* Address
* City
* Pincode
* Landmark

The system uses geocoding and pincode-based location services to identify the location and display it on an interactive map.

The provider can verify the generated location and adjust the map pin when required.

This makes location entry practical for normal users.

### 2. Structured Request Management

Instead of simply contacting a provider through a phone number or message, seekers can submit a formal resource request.

```text
Available Resource
       ↓
Request
       ↓
Provider Review
       ↓
Approve / Reject
```

Each request has a trackable status.

### 3. Inventory-Aware Approval

When a provider approves a request, the system automatically reduces the available resource quantity.

This helps prevent incorrect allocation when multiple seekers request the same resource.

### 4. QR-Based Pickup Verification

Once a request is approved, a transaction is created and a secure QR token can be generated for pickup verification.

The QR can be verified using:

* QR scanner
* Manual token entry

This creates a more controlled handover process.

### 5. End-to-End Transaction Tracking

SUREN tracks the complete exchange lifecycle:

```text
Resource Listed
      ↓
Request Created
      ↓
Request Approved
      ↓
Ready for Pickup
      ↓
Pickup Verified
      ↓
Transaction Completed
```

### 6. Rule-Based Resource Matching

SUREN includes a rule-based matching system that calculates resource relevance using:

| Parameter    | Weight |
| ------------ | -----: |
| Category     |    40% |
| City         |    25% |
| Quantity     |    20% |
| Availability |    15% |

This helps seekers discover resources that are more relevant to their requirements.

### 7. Demand Insights

The platform uses request history to identify demand patterns such as:

* Frequently requested categories
* Demand trends
* Resource availability
* Areas with higher demand

### 8. Sustainability Tracking

SUREN provides quantity-based sustainability estimates to communicate potential reuse impact.

These values are clearly treated as estimates or proxies and are not presented as scientific lifecycle assessments.

---

## Target Users

### Providers

Users or organizations that have resources available for exchange.

Examples:

* Individuals
* Restaurants
* Businesses
* Schools
* NGOs
* Community organizations

### Seekers

Users or organizations that need resources.

Examples:

* Individuals
* Families
* NGOs
* Shelters
* Schools
* Community groups

### Administrators

Administrators manage users, platform activity, and system-level information.

---

## Key Features

### Authentication

* Email/password registration and login
* Password reset
* Provider and Seeker roles
* Protected routes
* Role-based access
* Admin user management
* Profile management

### Resource Management

Providers can:

* Create resources
* Edit resources
* Delete resources
* Update resource status
* Specify quantity and unit
* Select categories
* Upload resource images
* Add address information
* Add pincode
* Add landmark
* Specify pickup information

### Location and Maps

SUREN uses address-first location input instead of requiring users to manually enter coordinates.

Users can search resources using:

* Title
* Category
* Address
* City
* Landmark
* Pincode

The system uses:

* Leaflet
* OpenStreetMap
* Nominatim geocoding
* India Post pincode lookup

Resources with confirmed coordinates are displayed on the interactive map using markers.

### Request Management

Seekers can:

* Browse resources
* Search resources
* Filter resources
* Submit requests
* Specify required quantity
* Add a message
* Track request status

Providers can:

* View incoming requests
* Approve requests
* Reject requests

### Transaction Management

After approval:

```text
Request Approved
      ↓
Inventory Updated
      ↓
Transaction Created
      ↓
Pickup QR Generated
      ↓
QR Verified
      ↓
Transaction Completed
```

### QR Verification

SUREN supports:

* Secure random QR tokens
* QR code generation
* QR scanning
* Manual token verification
* Pickup verification
* Transaction completion

QR codes do not contain personal information.

### Notifications

Users receive notifications for important events such as:

* New requests
* Request approvals
* Request rejections
* Transaction updates
* Pickup-related events

Realtime notifications are supported using Supabase Realtime.

### Analytics

The analytics module provides insights into:

* Resource listings
* Requests
* Successful exchanges
* Resource categories
* Demand patterns
* Sustainability estimates

Charts are displayed using Recharts and data can be exported as CSV.

---

# Technology Stack

## Frontend

### React 19

Used to build the main interactive web application and reusable UI components.

### TypeScript

Used for:

* Type safety
* Data models
* Interfaces
* Safer frontend development

### Vite

Used as the frontend development and production build tool.

### Tailwind CSS

Used for:

* Responsive design
* Layout
* Components
* Styling
* Professional dashboard UI

### React Router

Used for:

* Page navigation
* Protected routes
* Dashboard routing
* Role-based navigation

---

## Backend and Database

### Supabase

Supabase is used as the main backend platform.

### Supabase Authentication

Used for:

* User registration
* Login
* Logout
* Password reset
* Session management

### PostgreSQL

Used as the primary relational database for storing:

* Profiles
* Resources
* Requests
* Transactions
* Notifications
* QR verification records
* Organizations

### Supabase Row Level Security

Used to control access to database records according to user roles and permissions.

### Supabase Storage

Used for storing:

* Resource images
* Profile images
* Other uploaded assets

### Supabase Realtime

Used for real-time updates such as notifications and database changes.

### PostgreSQL Functions / Supabase RPC

Used for important backend workflows such as:

* Creating resource requests
* Reviewing requests
* Approving and rejecting requests
* Updating resource quantities
* Creating transactions
* Maintaining consistent database operations

---

## Maps and Location Technology

### Leaflet

Used to create interactive maps and display resource locations.

### OpenStreetMap

Used as the map data source.

### Nominatim

Used for address-based geocoding.

### India Post Pincode Lookup

Used to assist in identifying Indian locations from pincodes.

---

## Data Visualization

### Recharts

Used to create analytics charts and visualizations for:

* Resource statistics
* Request statistics
* Demand trends
* Category distribution
* Exchange activity

---

## QR Technology

### QRCode React

Used for generating pickup QR codes.

### html5-qrcode

Used for scanning QR codes through the browser.

---

## Development Tools

### Supabase CLI

Used for:

* Database migrations
* Database version control
* Applying schema changes
* Checking migration history

All database changes are maintained in:

```text
supabase/migrations/
```

New database changes are added using new migration files instead of modifying already-applied migrations.

### Oxlint

Used for code quality and static analysis.

### Git and GitHub

Used for:

* Version control
* Source code management
* Collaboration
* Project backup

---

# System Architecture

```text
                         SUREN
                           │
                           ▼
                ┌────────────────────┐
                │ React + TypeScript │
                │    Web Frontend    │
                └─────────┬──────────┘
                          │
             ┌────────────┴────────────┐
             │                         │
             ▼                         ▼
       React Router              Tailwind CSS
             │
             ▼
       ┌──────────────────────────────┐
       │           Supabase           │
       ├──────────────────────────────┤
       │ Authentication               │
       │ PostgreSQL Database          │
       │ Row Level Security           │
       │ Storage                      │
       │ Realtime                     │
       │ PostgreSQL Functions / RPC   │
       └──────────────┬───────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
   Maps & Location            Analytics
          │                       │
 Leaflet + OpenStreetMap      Recharts
 Nominatim
 Pincode Lookup
```

---

# Database Structure

The main database entities are:

```text
Profiles
    │
    ├── Resources
    │       │
    │       └── Requests
    │               │
    │               └── Transactions
    │                       │
    │                       └── QR Verification
    │
    └── Notifications
```

PostgreSQL relationships and Row Level Security are used to manage data access.

---

# Main Application Workflow

## Provider Workflow

```text
Register / Login
       ↓
Provider Dashboard
       ↓
Create Resource
       ↓
Enter Resource Details
       ↓
Enter Address + Pincode
       ↓
Generate Location
       ↓
Verify / Adjust Map Pin
       ↓
Publish Resource
```

## Seeker Workflow

```text
Register / Login
       ↓
Seeker Dashboard
       ↓
Browse / Search Resources
       ↓
View Resource
       ↓
Submit Request
       ↓
Wait for Provider Decision
```

## Exchange Workflow

```text
Seeker Request
       ↓
Provider Review
       ↓
Approve / Reject
       ↓
Inventory Update
       ↓
Transaction Created
       ↓
Pickup QR
       ↓
QR Verification
       ↓
Transaction Completed
```

---

# Useful Routes

After signing in:

```text
/dashboard
/dashboard/resources
/dashboard/requests
/dashboard/transactions
/dashboard/map
/dashboard/analytics
/dashboard/demand
/dashboard/matching
/dashboard/notifications
/dashboard/profile
/dashboard/users
```

The `/dashboard/users` route is available for administrators.

---

# Local Setup

## Requirements

* Node.js 20 or newer
* Git
* A Supabase project
* Supabase CLI access

## Clone the Repository

```powershell
git clone https://github.com/Janahvi21/SUREN.git
cd SUREN
```

## Install Dependencies

```powershell
npm install
```

## Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Never put a Supabase service-role or secret key in the frontend environment.

## Start Development Server

```powershell
npm run dev
```

---

# Database Workflow

SUREN uses version-controlled Supabase migrations.

Create a new migration:

```powershell
npx supabase migration new feature_name
```

Apply migrations:

```powershell
npx supabase db push
```

Check migration status:

```powershell
npx supabase migration list
```

Database changes should never be made by modifying an already-applied migration.

Instead, create a new migration:

```text
npx supabase migration new add_new_feature
```

Then add the SQL to the generated migration file and run:

```text
npx supabase db push
```

---

# Verification

Build the production application:

```powershell
npm run build
```

Run lint:

```powershell
npm run lint
```

## Main Exchange Test

1. Register a Provider account.
2. Register a Seeker account.
3. Provider creates a resource.
4. Enter the resource address and pincode.
5. Generate and verify the map location.
6. Adjust the map pin if required.
7. Save the resource.
8. Seeker searches for the resource.
9. Seeker submits a request.
10. Provider reviews the request.
11. Provider approves the request.
12. Verify that the resource quantity is updated.
13. Open Transactions.
14. Generate the pickup QR.
15. Scan or manually verify the QR token.
16. Complete the transaction.
17. Verify the request, transaction, notification, and analytics data.

---

# Security and Privacy

SUREN follows several security practices:

* Supabase Authentication for user sessions
* Row Level Security for database access
* Role-based authorization
* Protected application routes
* Secure random QR tokens
* No personal information stored inside QR codes
* Service-role keys are never exposed to the frontend
* Latitude and longitude are maintained internally for map functionality
* Resources without confirmed coordinates are not assigned fake map markers

---

# Sustainability Data

SUREN provides sustainability-related insights based on resource exchange quantities.

These values are quantity-based estimates used to communicate potential reuse impact.

They are not intended to represent formal scientific lifecycle assessments.

---

# Future Scope

Future improvements can include:

* English, Marathi, and Hindi multilingual support
* Light and dark mode
* AI-based demand prediction
* Intelligent resource recommendations
* Advanced route optimization
* Trust and rating system
* Provider verification
* NGO and municipal integration
* Mobile application
* Image-based resource classification
* Geographic demand heatmaps
* Duplicate listing detection
* Fraud detection
* Automated notifications
* City-to-city resource coordination
* Advanced sustainability analytics

---

# Vision

SUREN aims to move urban resource sharing from informal coordination to a structured digital exchange system.

The long-term vision is to help cities make better use of resources that already exist but are currently underutilized, while making the exchange process more transparent, trackable, and accessible.

> **SUREN — Connect what is available with what is needed.**

---

## Project Repository

GitHub: [https://github.com/Janahvi21/SUREN](https://github.com/Janahvi21/SUREN)

````

**That's one single copy-paste block.** After pasting it into `README.md`, run:

```powershell
git add README.md
git commit -m "Update SUREN README"
git push
````
