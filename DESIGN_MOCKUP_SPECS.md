# DEP Platform - Design Mockup Specifications
## Data Exploration & Governance Platform - Comprehensive System Design

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

### Core Principles
- **No-Code Approach**: Selection-based interfaces, not typing
- **Modal-First Design**: All major operations via modal dialogs
- **Google Workspace Pattern**: Sharing mechanism similar to Google Docs/Drive
- **Embedded JupyterLab**: Fully integrated notebook environment
- **Comprehensive Logging**: All actions audited for compliance

### User Roles
- **Admin**: System administration, user management, audit logs
- **Data Onboarder**: Connection management, catalog creation, dataset publishing
- **Analyst**: Data exploration, notebook environment, artifact generation

---

## 2. DATA SOURCE MANAGEMENT (Data Onboarder)

### 2.1 Data Source Connection Screen

#### Supported Connections
- PostgreSQL
- MySQL
- CSV File Upload

#### Connection Creation Modal
```
┌─────────────────────────────────────────────────────┐
│ Create New Data Source                              │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Connection Type (Dropdown - Select Only)            │
│ ├─ PostgreSQL  [icon]                              │
│ ├─ MySQL       [icon]                              │
│ └─ CSV Upload  [icon]                              │
│                                                      │
│ [For Database Connections]                         │
│ Host                [auto-populated options]        │
│ Port                [auto-populated options]        │
│ Database Name       [auto-populated options]        │
│ Username            [input]                         │
│ Password            [secure input]                  │
│                                                      │
│ Connection String   [paste field]                   │
│ [Test Connection Button]                           │
│                                                      │
│ [Status: Testing...] ✓ Connection Successful        │
│                                                      │
│ [Save Connection] [Cancel]                         │
└─────────────────────────────────────────────────────┘
```

#### Features
- **Connection String Auto-Fill**: Paste connection string → auto-populate remaining fields
- **Test Connection**: Real-time feedback with status indicator
- **Connection Storage**: Securely stored after successful test
- **Metadata Auto-Fetch**: On success, fetch and display available schemas/tables
- **CSV Upload Alternative**: 
  - Drag-and-drop file upload
  - Auto-detect delimiter
  - Preview first N rows
  - Store as connection for reuse

---

## 3. RESOURCE CATALOG CREATION (Data Onboarder)

### 3.1 Data Source Metadata Explorer

#### Tree Structure View
```
Data Sources (Collapsible Tree)
├─ my-postgres-db
│  ├─ public (schema)
│  │  ├─ customers [Table]
│  │  │  ├─ id (INT) - Primary Key
│  │  │  ├─ name (VARCHAR) - Customer full name
│  │  │  ├─ email (VARCHAR) - Contact email
│  │  │  ├─ phone (VARCHAR) - Contact number
│  │  │  ├─ country (VARCHAR) - Customer location
│  │  │  ├─ signup_date (DATE) - Registration date
│  │  │  └─ status (ENUM) - Active/Inactive
│  │  └─ orders [Table]
│  │     ├─ id (INT) - Order ID
│  │     ├─ customer_id (INT) - FK
│  │     └─ order_value (DECIMAL) - Amount
│  │
│  └─ reporting (schema)
│     └─ customer_summary [View]
│
├─ csv-upload-2024
│  ├─ sales_data.csv [File]
│  │  ├─ region (TEXT)
│  │  ├─ sales (DECIMAL)
│  │  └─ date (DATE)
```

**Features**:
- Fully collapsible/expandable nodes
- Column-level metadata display (Type, Description, Constraints)
- Inferred data types from source
- Owner information per resource
- Last modified timestamp
- Column statistics (nullable, unique values, etc.)

### 3.2 Resource Catalog Creation Modal

#### Step 1: Basic Information
```
┌──────────────────────────────────────────────────────┐
│ Create Resource Catalog                              │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Step 1 of 4: Basic Information                      │
│                                                      │
│ Catalog Name             [input field]               │
│ Description              [textarea - 500 chars]      │
│                                                      │
│ Data Source (Dropdown)   [my-postgres-db ▼]         │
│ Schema Selection         [public ▼]                 │
│                                                      │
│ Owner                    [current user - readonly]   │
│ Classification           [Confidential ▼]           │
│ ├─ Public                                            │
│ ├─ Internal                                          │
│ ├─ Confidential                                      │
│ └─ Restricted                                        │
│                                                      │
│ Retention Policy         [30 days ▼]                │
│ ├─ 7 days                                            │
│ ├─ 30 days                                           │
│ ├─ 90 days                                           │
│ ├─ 1 year                                            │
│ └─ Indefinite                                        │
│                                                      │
│ [Back] [Next →]                                     │
└──────────────────────────────────────────────────────┘
```

#### Step 2: Dataset Selection
```
┌──────────────────────────────────────────────────────┐
│ Create Resource Catalog                              │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Step 2 of 4: Select Datasets                        │
│                                                      │
│ Available Tables/Views (Search enabled)              │
│ ┌──────────────────────────────────────────────────┐│
│ │ ☐ customers                                      ││
│ │   10M rows | Text search: customer_id, name, .. ││
│ │                                                  ││
│ │ ☐ orders                                        ││
│ │   5M rows | Text search: order_id, customer_id..││
│ │                                                  ││
│ │ ☐ customer_summary (View)                       ││
│ │   Derived from: customers, orders               ││
│ │                                                  ││
│ │ ☐ transactions                                  ││
│ │   20M rows | Text search: tx_id, amount, status ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ Selected: 2 datasets                                 │
│                                                      │
│ [Back] [Next →]                                     │
└──────────────────────────────────────────────────────┘
```

#### Step 3: Column Configuration
```
┌──────────────────────────────────────────────────────┐
│ Create Resource Catalog                              │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Step 3 of 4: Configure Columns                      │
│                                                      │
│ Dataset: customers (Select all columns by default)   │
│                                                      │
│ Search columns: [search input]                       │
│                                                      │
│ ☑ id (INT)                                           │
│   Description: [auto-fetched or editable]           │
│   PII Level: [None ▼]                               │
│                                                      │
│ ☑ name (VARCHAR)                                     │
│   Description: Customer full name                   │
│   PII Level: [High ▼]                               │
│                                                      │
│ ☑ email (VARCHAR)                                    │
│   Description: Contact email address                │
│   PII Level: [High ▼]                               │
│                                                      │
│ ☑ phone (VARCHAR)                                    │
│   Description: Contact phone number                 │
│   PII Level: [High ▼]                               │
│                                                      │
│ ☐ internal_notes (TEXT)                             │
│   Description: [hidden]                             │
│   PII Level: [Critical ▼]                           │
│                                                      │
│ [Back] [Next →]                                     │
└──────────────────────────────────────────────────────┘
```

#### Step 4: Data Dictionary & Governance
```
┌──────────────────────────────────────────────────────┐
│ Create Resource Catalog                              │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Step 4 of 4: Data Dictionary & Governance            │
│                                                      │
│ Business Description                                │
│ [textarea] This catalog contains customer profile   │
│ and transactional data for analysis...              │
│                                                      │
│ Data Quality Metrics                                 │
│ ☑ Enable profiling on data load                     │
│ ☑ Track completeness %                              │
│ ☑ Track uniqueness %                                │
│                                                      │
│ Governance Tags                                      │
│ [Multi-select dropdown]                              │
│ ├─ GDPR                                              │
│ ├─ CCPA                                              │
│ ├─ PII                                               │
│ ├─ PHI                                               │
│ └─ Financial                                         │
│                                                      │
│ Team Access                                          │
│ Data Steward: [Search & Select]                      │
│ Data Owner: [Search & Select]                        │
│ Analysts: [Search & Multi-select]                    │
│                                                      │
│ [Back] [Create Catalog]                             │
└──────────────────────────────────────────────────────┘
```

---

## 4. GRANULAR ACL MANAGEMENT (Data Onboarder)

### 4.1 ACL Builder - Modal Based No-Code Approach

#### Main ACL Modal
```
┌─────────────────────────────────────────────────────────┐
│ Create Data Access Policy                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Policy Name                [input field]                │
│ Description                [textarea]                   │
│                                                         │
│ SELECT TARGET                                           │
│ ├─ Analysts Team          [☑ Selected]                 │
│ ├─ Finance Team           [☐]                          │
│ ├─ Marketing Team         [☐]                          │
│ └─ Individual Users       [Search dropdown]            │
│                                                         │
│ SELECT CATALOG                                          │
│ [corporate_financial_catalog ▼]                        │
│                                                         │
│ ─────────────────────────────────────────────────────   │
│ COLUMN-LEVEL GOVERNANCE                                 │
│ ─────────────────────────────────────────────────────   │
│                                                         │
│ Search columns: [search]                                │
│                                                         │
│ ✓ id              → [No Action ▼]                      │
│ ✓ name            → [Mask ▼]        [mask options]    │
│ ✓ email           → [Block ▼]                          │
│ ✓ phone           → [Mask ▼]        [hash/format]     │
│ ✓ salary          → [Redact ▼]                         │
│ ✓ country         → [No Action ▼]                      │
│                                                         │
│ ─────────────────────────────────────────────────────   │
│ ROW-LEVEL FILTERS                                       │
│ ─────────────────────────────────────────────────────   │
│                                                         │
│ Logic Operator: [AND ▼] [OR ▼]                         │
│                                                         │
│ Filter 1: [country] [EQUALS ▼] ["US" ▼]  [× Remove]  │
│ Filter 2: [sales_region] [IN ▼] [Select >] [× Remove] │
│ Filter 3: [order_value] [> ▼] [1000] [× Remove]       │
│                                                         │
│ [+ Add Another Filter]                                  │
│                                                         │
│ ─────────────────────────────────────────────────────   │
│ ACCESS DURATION                                         │
│ ─────────────────────────────────────────────────────   │
│                                                         │
│ Duration: [30 days ▼]                                  │
│ ├─ 1 day                                                │
│ ├─ 7 days                                               │
│ ├─ 30 days                                              │
│ ├─ 90 days                                              │
│ ├─ 1 year                                               │
│ └─ Indefinite                                           │
│                                                         │
│ Expiration: [Auto-calculated date]                      │
│                                                         │
│ ─────────────────────────────────────────────────────   │
│ PREVIEW & DEPLOY                                        │
│ ─────────────────────────────────────────────────────   │
│                                                         │
│ [Preview Sample Data] [Test Configuration]            │
│                                                         │
│ [Cancel] [Save as Draft] [Deploy Policy]              │
└─────────────────────────────────────────────────────────┘
```

### 4.2 ACL Template & Management

#### Pre-built ACL Templates
- **Read-Only**: Full read access, no modifications
- **Finance Restricted**: All columns except salary/SSN
- **Marketing Standard**: Only public demographic data
- **Executive Dashboard**: Aggregated data only, no row details

#### ACL List & Management
```
┌─────────────────────────────────────────────────────────┐
│ Data Access Policies                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [+ New Policy] [View Templates] [Import Policy]        │
│                                                         │
│ Active Policies:                                        │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Policy Name: Analysts - Finance Catalog             ││
│ │ Target: Analysts Team (12 members)                  ││
│ │ Catalog: corporate_financial_catalog                ││
│ │ Status: ✓ Active                                     ││
│ │ Created: 2024-07-20 by Admin                        ││
│ │ Expires: 2024-10-20                                 ││
│ │                                                     ││
│ │ Columns: 18 total | 12 blocked/masked              ││
│ │ Row Filters: 3 rules (country=US AND region IN...) ││
│ │                                                     ││
│ │ [Edit] [Duplicate] [History] [Revoke]              ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Policy Name: Marketing - Aggregated Views           ││
│ │ Target: Marketing Team (8 members)                  ││
│ │ Status: ✓ Active                                     ││
│ │ [Edit] [Duplicate] [History] [Revoke]              ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Pending Approvals:                                      │
│ │ Finance Team - Read Access Request                   │
│ │ [Approve] [Reject]                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 5. PROJECT MANAGEMENT & NOTEBOOKS

### 5.1 Create New Project Modal

```
┌────────────────────────────────────────────────────┐
│ Create New Project                                 │
├────────────────────────────────────────────────────┤
│                                                    │
│ Project Name*               [input field]          │
│ Description                 [textarea]             │
│                                                    │
│ Privacy Level               [Private ▼]           │
│ ├─ Private (Only invited members)                 │
│ ├─ Internal (Org visible)                         │
│ └─ Public (Read-only link sharing)                │
│                                                    │
│ Team Members                                       │
│ [Search & Add Team Members]                       │
│                                                    │
│ Added Members:                                     │
│ │ ☑ You                      [Owner ▼]            │
│ │ ☑ Maria Chen                [Editor ▼]          │
│ │ ☑ John Doe                  [Viewer ▼]          │
│                                                    │
│ Roles Available:                                   │
│ ├─ Owner (Full control)                           │
│ ├─ Editor (Create/edit notebooks)                 │
│ └─ Viewer (View-only access)                      │
│                                                    │
│ [Create Project] [Cancel]                         │
└────────────────────────────────────────────────────┘
```

### 5.2 Project Workspace Layout

```
Project: Q4 Financial Analysis
├─ Team (3 members) [Show Members Modal]
│  ├─ You [Owner]
│  ├─ Maria Chen [Editor]
│  └─ John Doe [Viewer]
│
├─ Notebooks (5)
│  ├─ Analysis_Q4.ipynb
│  │  Version: v3 (Current - Editing)
│  │  Modified: 2024-07-20 14:35
│  │  [Open] [Versions] [Share]
│  │
│  ├─ Forecasting_v2.ipynb
│  │  Version: v2 (Published)
│  │  [Open] [Rollback] [Share]
│  │
│  └─ [+ New Notebook]
│
├─ Shared Settings
│ [Configure Access] [Share Project]
│
└─ Project Settings
  [Edit] [Archive] [Delete]
```

### 5.3 Notebook Version Control & Sharing

#### Version History
```
Notebook: Analysis_Q4.ipynb

Version Timeline:
v3 (Current)    2024-07-20 14:35   [by You] Editing
  ├─ Changes: Updated calculations
  ├─ Status: Draft
  └─ [Rollback] [Commit] [Promote]

v2 (Published)  2024-07-19 09:20   [by Maria Chen] Published
  ├─ Changes: Added summary statistics
  ├─ Shared with: Finance Team (5), John Doe
  └─ [Rollback] [View]

v1              2024-07-18 16:45   [by You] Initial
  └─ [Rollback] [View]
```

#### Share Notebook Modal (Google Workspace Style)
```
┌──────────────────────────────────────────────────────┐
│ Share Notebook                                       │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Notebook: Analysis_Q4.ipynb                         │
│                                                      │
│ Share with:                                          │
│ [Search users or teams...]                          │
│                                                      │
│ Add People/Teams:                                    │
│ ┌──────────────────────────────────────────────────┐│
│ │ Suggestions:                                     ││
│ │ ├─ Finance Team (12 members)  [Can edit ▼]      ││
│ │ ├─ Maria Chen                 [Can comment ▼]   ││
│ │ ├─ john.doe@company.com       [Can view ▼]      ││
│ │ └─ Manager (Distribution)     [Can edit ▼]      ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ Current Access:                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ Finance Team (12)        [Can edit]     [×]      ││
│ │   Shared on 2024-07-19 by You                    ││
│ │                                                  ││
│ │ Maria Chen               [Can comment] [×]      ││
│ │   Shared on 2024-07-20 by You                    ││
│ │                                                  ││
│ │ john.doe@company.com     [Can view]     [×]     ││
│ │   Shared on 2024-07-20 by Admin                  ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ Get Link: [Create Shareable Link]                   │
│ Link created: https://dep.internal/share/n9k2e...   │
│ ├─ Expiration: 30 days                              │
│ ├─ Access: View only                                │
│ └─ [Copy] [Settings]                                │
│                                                      │
│ [Send] [Close]                                      │
└──────────────────────────────────────────────────────┘
```

---

## 6. EMBEDDED JUPYTERLAB INTERFACE

### 6.1 Integrated Notebook Environment

```
DEP Platform Header
────────────────────────────────────────────────────

Project: Q4 Financial Analysis | Notebook: Analysis_Q4.ipynb | Status: Editing

[Save] [Versions] [Share] [Comment] [Global Search]

────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────┐
│                                                     │
│  [Sidebar: File explorer, Kernels, Git]           │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ # Q4 Financial Analysis                      │  │
│  │                                              │  │
│  │ import dep_sdk                               │  │
│  │ df = dep_sdk.read_catalog("fin_catalog")     │  │
│  │ print(df.head())                             │  │
│  │                                              │  │
│  │ [Output]                                     │  │
│  │ 5 rows × 18 columns                          │  │
│  │ (Column-level access enforced)               │  │
│  │                                              │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  Full JupyterLab interface embedded                │
│  - Code execution with DEP SDK pre-loaded         │
│  - Access controlled per analyst's ACL            │
│  - Auto-completion with visible columns           │
│  - Terminal access (if permitted)                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 6.2 DEP SDK Integration
- Pre-installed `dep_sdk` package
- Auto-completion showing accessible datasets
- Column restrictions automatically applied
- Row-level filters transparent in queries
- Cell-level masking applied to output

---

## 7. ARTIFACT MANAGEMENT (Analyst View)

### 7.1 Artifacts Screen with Google Workspace-style Sharing

```
┌─────────────────────────────────────────────────────┐
│ My Artifacts                                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [Upload] [Search]  [View: Grid] [List] [Compact]  │
│                                                     │
│ Q4_Sales_Analysis.csv                              │
│ ├─ Project: Q4 Financial Analysis                 │
│ ├─ Created: 2024-07-20 14:35 (by you)             │
│ ├─ Type: CSV (2.4 MB)                             │
│ ├─ Source Notebook: Analysis_Q4.ipynb v3          │
│ ├─ Tags: [quarterly] [sales] [draft]              │
│ │                                                  │
│ ├─ [Preview] [Download] [Convert to Dataset]      │
│ │           [Share] [More]                         │
│ │                                                  │
│ └─ Shared with: (3)                                │
│    ├─ Maria Chen      Can view    Shared: Jul 20  │
│    ├─ Finance Team    Can edit    Shared: Jul 19  │
│    └─ john.doe...     Can comment Shared: Jul 20  │
│       [Manage Access ▼] [Revoke]                   │
│                                                     │
│                                                     │
│ Customer_Segmentation_v2.png                       │
│ ├─ Project: Customer Analytics                    │
│ ├─ Created: 2024-07-18 09:15                      │
│ ├─ Type: PNG (1.1 MB)                             │
│ ├─ [Preview] [Download] [Share]                   │
│ └─ Shared with: (0) [+ Share]                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 7.2 Share Artifact Modal (Google Workspace Pattern)

```
┌──────────────────────────────────────────────────────┐
│ Share Artifact                                       │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Artifact: Q4_Sales_Analysis.csv                     │
│                                                      │
│ Add people or teams:                                │
│ [Search users, teams, or emails...]                │
│                                                      │
│ Suggestions:                                         │
│ ├─ Finance Team (12 members)    [Select role ▼]    │
│ ├─ Maria Chen                   [Select role ▼]    │
│ ├─ Analytics Group              [Select role ▼]    │
│ └─ your-manager@company.com    [Select role ▼]    │
│                                                      │
│ Access Roles:                                        │
│ ├─ Can view (View-only)                             │
│ ├─ Can comment (View + Comments)                    │
│ └─ Can edit (Full access)                           │
│                                                      │
│ Current Sharing:                                     │
│ ┌──────────────────────────────────────────────────┐│
│ │ Maria Chen                [Can view ▼]  [× Remove]││
│ │   Shared on: 2024-07-20 14:35           [Revoke] ││
│ │   Can download: Yes                               ││
│ │                                                  ││
│ │ Finance Team (12 members) [Can edit ▼]  [× Remove]││
│ │   Shared on: 2024-07-19 09:20                    ││
│ │   Can download: Yes                               ││
│ │   Members: Sarah, John, Mike, Elena...            ││
│ │                                                  ││
│ │ john.doe@company.com      [Can comment][× Remove]││
│ │   Shared on: 2024-07-20 12:00                    ││
│ │   Can download: No                                ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ Get Link:                                            │
│ ├─ Link: https://dep.internal/share/a7k3m...       │
│ ├─ Expires: Never                                   │
│ ├─ Access: View only                                │
│ └─ [Change settings] [Copy] [Revoke link]          │
│                                                      │
│ [Share] [Cancel]                                    │
└──────────────────────────────────────────────────────┘
```

### 7.3 Artifact Preview Modal

```
┌──────────────────────────────────────────────────────┐
│ Q4_Sales_Analysis.csv                               │
├──────────────────────────────────────────────────────┤
│                                                      │
│ ← [Back] | Shared with: 3 people | [Download] ...  │
│                                                      │
│ Preview (First 100 rows):                            │
│ ┌──────────────────────────────────────────────────┐│
│ │ region  │ sales      │ date       │ forecast     ││
│ ├─────────┼────────────┼────────────┼──────────────┤│
│ │ North   │ $125,450   │ 2024-Q4    │ $130,000     ││
│ │ South   │ $98,230    │ 2024-Q4    │ $95,000      ││
│ │ East    │ $145,600   │ 2024-Q4    │ $150,000     ││
│ │ West    │ $112,340   │ 2024-Q4    │ $115,000     ││
│ │ Central │ $87,560    │ 2024-Q4    │ $90,000      ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ Total Rows: 1,250                                   │
│ File Size: 2.4 MB                                   │
│ Format: CSV                                          │
│                                                      │
│ Metadata:                                            │
│ ├─ Created: 2024-07-20 14:35                        │
│ ├─ Created by: You (analyst@company.com)            │
│ ├─ Source Notebook: Analysis_Q4.ipynb v3            │
│ ├─ Project: Q4 Financial Analysis                   │
│ └─ Tags: quarterly, sales, draft                    │
│                                                      │
│ [Download] [Convert to Dataset] [Delete] [Share]   │
└──────────────────────────────────────────────────────┘
```

---

## 8. CSV TO DATASET CONVERSION (Analyst → Data Onboarder Workflow)

### 8.1 Convert to Dataset Action

```
┌──────────────────────────────────────────────────────┐
│ Convert Artifact to Dataset                          │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Artifact: Q4_Sales_Analysis.csv                     │
│                                                      │
│ Dataset Name*           [input: q4_sales_data]      │
│ Description             [textarea]                  │
│                                                      │
│ Column Configuration:                                │
│ ┌──────────────────────────────────────────────────┐│
│ │ Search columns...                                ││
│ │                                                  ││
│ │ ☑ region (TEXT)                                  ││
│ │   PII Level: None ▼                              ││
│ │   Description: Sales region                      ││
│ │                                                  ││
│ │ ☑ sales (DECIMAL)                                ││
│ │   PII Level: None ▼                              ││
│ │   Description: Sales amount in USD                ││
│ │                                                  ││
│ │ ☑ date (DATE)                                    ││
│ │   PII Level: None ▼                              ││
│ │                                                  ││
│ │ ☑ forecast (DECIMAL)                             ││
│ │   PII Level: None ▼                              ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ Requested Approval From: [Data Onboarder - readonly]│
│ Reason for Dataset:     [textarea]                  │
│                                                      │
│ [Submit for Approval] [Save as Draft] [Cancel]     │
│                                                      │
│ Status: Pending Approval ⏳                          │
│ Submitted: 2024-07-20 14:35                         │
│ Awaiting: Data Onboarder Review                     │
└──────────────────────────────────────────────────────┘
```

### 8.2 Data Onboarder Approval Interface

```
Pending Dataset Conversions:

┌──────────────────────────────────────────────────────┐
│ Q4_Sales_Analysis.csv → q4_sales_data                │
│ Requested by: analyst@company.com                   │
│ Date: 2024-07-20 14:35                              │
│ Reason: Quarterly performance tracking              │
│                                                      │
│ CSV Preview:                                         │
│ [region | sales | date | forecast] - 1,250 rows    │
│                                                      │
│ [Review Details] [Approve] [Reject with comment]   │
└──────────────────────────────────────────────────────┘
```

---

## 9. ANALYST DATA ACCESS & EXPLORATION

### 9.1 My Data Access Screen

```
┌─────────────────────────────────────────────────────┐
│ My Data Access                                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Your accessible datasets (4):                       │
│                                                     │
│ corporate_financial_catalog                         │
│ ├─ Status: ✓ Active                                │
│ ├─ Tables: 3 (customers, orders, transactions)    │
│ ├─ Accessible Columns: 12/18                       │
│ ├─ Row Filters: country = 'US' AND ...             │
│ ├─ Expires: 2024-10-20                             │
│ │                                                  │
│ ├─ [View Metadata] [Copy SDK] [Query Data]        │
│ │                                                  │
│ └─ Code Snippet (Click to Copy):                   │
│    ```python                                        │
│    import dep_sdk                                   │
│    dep = dep_sdk.DEP()                             │
│    # Restricted access enforced                    │
│    df = dep.read_catalog("corporate_financial..") │
│    print(df.head())                                │
│    ```                                              │
│                                                     │
│ sales_metrics_catalog                               │
│ ├─ Status: ⏳ Pending Approval                      │
│ ├─ Requested: 2024-07-20                           │
│ ├─ [View Request] [Cancel Request]                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 9.2 Metadata Explorer Modal

```
┌──────────────────────────────────────────────────────┐
│ Dataset Metadata Explorer                            │
├──────────────────────────────────────────────────────┤
│                                                      │
│ corporate_financial_catalog / customers              │
│                                                      │
│ ← Collapsible Tree:                                  │
│ ├─ customers [Table]                                │
│ │  ├─ id [INT] ✓                                    │
│ │  │  └─ PK, Not null, Indexed                      │
│ │  ├─ name [VARCHAR(255)] ✓                         │
│ │  │  └─ Not null, Customer full name               │
│ │  ├─ email [VARCHAR(255)] 🔒 MASKED                │
│ │  │  └─ Not null, Hidden for you                   │
│ │  ├─ phone [VARCHAR(20)] 🔒 BLOCKED               │
│ │  │  └─ Not accessible                             │
│ │  ├─ signup_date [DATE] ✓                          │
│ │  └─ country [VARCHAR] ✓                           │
│ │     └─ Filtered: Only 'US' visible                │
│ │                                                   │
│ │ Table Statistics:                                  │
│ │ ├─ Total Rows: 1M (Filtered: 500K)               │
│ │ ├─ Columns: 18 (Visible: 12)                      │
│ │ ├─ Data Size: 450 MB                              │
│ │ └─ Last Updated: 2024-07-20 02:15 UTC            │
│                                                      │
│ Column Details (Click to expand):                   │
│ │                                                   │
│ │ name (VARCHAR)                                    │
│ │ ├─ Type: VARCHAR(255)                             │
│ │ ├─ Nullable: No                                   │
│ │ ├─ Sample Values:                                 │
│ │ │  - John Smith                                   │
│ │ │  - Sarah Johnson                                │
│ │ │  - Michael Brown                                │
│ │ ├─ Unique Values: 995,432                         │
│ │ ├─ Null Count: 0                                  │
│ │ └─ Access Level: Full                             │
│                                                      │
│ [Copy DEP SDK Code] [Query Builder] [Close]         │
└──────────────────────────────────────────────────────┘
```

---

## 10. AUDIT LOGGING & COMPLIANCE

### 10.1 Admin Audit Log Dashboard

```
┌────────────────────────────────────────────────────────┐
│ Audit Logs                                             │
├────────────────────────────────────────────────────────┤
│                                                        │
│ [Filter by Date] [User] [Action] [Resource]           │
│ [Export to CSV] [Search]                              │
│                                                        │
│ 2024-07-20 14:35 | analyst@company.com | Access       │
│ Opened dataset: corporate_financial_catalog           │
│ 500 rows retrieved, 12 cols visible                    │
│ Row filters applied: country='US' AND...              │
│ Column masking: 3 columns masked                       │
│                                                        │
│ 2024-07-20 14:20 | onboarder@company.com | Create     │
│ Created ACL Policy: Analysts - Finance Catalog        │
│ Target: Analysts Team (12 members)                    │
│ Catalog: corporate_financial_catalog                  │
│ Status: Deployed                                       │
│                                                        │
│ 2024-07-20 13:50 | analyst@company.com | Create       │
│ Generated Artifact: Q4_Sales_Analysis.csv             │
│ Source: Analysis_Q4.ipynb (notebook)                  │
│ Shared with: Finance Team, Maria Chen                 │
│                                                        │
│ 2024-07-20 12:30 | admin@company.com | Modify        │
│ Updated User Role: john.doe → Data Onboarder         │
│ Previous: Analyst                                      │
│ Reason: Promotion                                      │
│                                                        │
│ 2024-07-19 09:15 | onboarder@company.com | Create     │
│ Created Resource Catalog: corporate_financial_catalog │
│ Data Source: my-postgres-db                           │
│ Datasets: 5 tables selected                           │
│ Status: Published                                      │
│                                                        │
│ [Previous] [Next] [Export all logs]                   │
└────────────────────────────────────────────────────────┘
```

---

## 11. USER MANAGEMENT (Admin Role)

### 11.1 User Management Screen

```
┌────────────────────────────────────────────────────────┐
│ User Management                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│ [+ Add User] [Import Users] [Search]                  │
│                                                        │
│ Active Users (24):                                     │
│                                                        │
│ ┌──────────────────────────────────────────────────┐ │
│ │ Email             │ Name        │ Role   │ Status│ │
│ ├───────────────────┼─────────────┼────────┼───────┤ │
│ │ admin@company.com │ Admin User  │ Admin  │ ✓    │ │
│ │ onboarder@...     │ Data Team   │ Data   │ ✓    │ │
│ │ analyst@company   │ Analytics   │ Analyst│ ✓    │ │
│ │ john.doe@...      │ John Doe    │ Analyst│ ✓    │ │
│ │ maria.chen@...    │ Maria Chen  │ Analyst│ ✓    │ │
│ │ [more...]         │             │        │      │ │
│ │                   │             │        │      │ │
│ │ [Edit] [Disable]  │             │        │      │ │
│ └──────────────────────────────────────────────────┘ │
│                                                        │
│ Pending Invitations (3):                              │
│ sarah.smith@company.com - Data Onboarder - Invited   │
│ michael.jones@company.com - Analyst - Invited        │
│ [Resend] [Cancel]                                     │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 11.2 Add User Modal

```
┌────────────────────────────────────────────────────────┐
│ Add New User                                           │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Email Address*          [input@company.com]           │
│ Full Name*              [input]                       │
│                                                        │
│ Role*                   [Select Role ▼]               │
│ ├─ Admin                                              │
│ │  └─ Full system access, user management            │
│ ├─ Data Onboarder                                     │
│ │  └─ Create catalogs, manage connections, ACLs      │
│ └─ Analyst                                            │
│    └─ Data exploration, notebook environment          │
│                                                        │
│ Department              [Research & Analytics]        │
│ Manager                 [Select user...]              │
│                                                        │
│ Permissions (Optional):                                │
│ ☑ Can create projects                                 │
│ ☑ Can invite others                                   │
│ ☐ Can manage billing                                  │
│                                                        │
│ Send Invitation Email   [Yes ▼]                       │
│                                                        │
│ [Create User] [Cancel]                                │
└────────────────────────────────────────────────────────┘
```

---

## 12. DESIGN SYSTEM & INTERACTION PATTERNS

### 12.1 Modal-First Architecture
- All CRUD operations via modals
- Multi-step modals for complex workflows
- Scrollable content with fixed headers/footers
- Validation before submission

### 12.2 Color Palette (Dark Theme)
```
Primary:     #007acc (Blue)        - CTAs, Focus states
Success:     #6a9955 (Green)       - Approved, Active
Warning:     #ce9178 (Orange)      - Pending, Caution
Danger:      #f44747 (Red)         - Blocked, Delete
Info:        #569cd6 (Light Blue)  - Information
Text:        #e8e8e8 (Primary)     - Main text
Secondary:   #a0a0a0 (Gray)        - Secondary text
Muted:       #808080 (Dark Gray)   - Disabled, timestamps
Background:  #181818 (Very Dark)   - Page bg
Card:        #1e1e1e (Dark)        - Card bg
Border:      #2b2b2b (Border)      - Borders
```

### 12.3 Typography
- **Headers**: Bold, 18-24px
- **Subheaders**: Semibold, 14-16px
- **Body**: Regular, 13-14px
- **Small**: Regular, 12px
- **Code**: Monospace, 12px

### 12.4 No-Code Interaction Patterns
- **Select-Only Inputs**: Dropdowns with auto-complete
- **Multi-Select**: Pills with remove option
- **Tree Navigation**: Collapsible hierarchies
- **Live Preview**: Real-time policy preview
- **Smart Defaults**: Pre-populated common choices

---

## 13. FEATURE MATRIX BY ROLE

### Admin
✓ User management (CRUD)
✓ System configuration
✓ Audit log access
✓ Create Data Onboarders
✓ System statistics

### Data Onboarder
✓ Manage data sources (connections)
✓ Create resource catalogs
✓ Manage ACL policies
✓ Approve dataset conversions
✓ Review access requests
✓ Configure column/row/cell-level governance
✓ Manage user teams

### Analyst
✓ Explore accessible datasets
✓ Create projects & notebooks
✓ Generate artifacts
✓ Share notebooks & artifacts (Google Workspace style)
✓ Request dataset access
✓ Convert CSV artifacts to datasets
✓ View audit trails (own activity)
✓ Manage account settings

---

## 14. FUTURE ENHANCEMENTS
- Real-time collaboration in notebooks
- Advanced query builder UI
- Data profiling & quality metrics dashboard
- ML-based access recommendation
- Multi-cloud data source support
- Workflow automation & scheduling
- Advanced reporting & dashboards
- SAML/SSO integration
- Data lineage visualization
