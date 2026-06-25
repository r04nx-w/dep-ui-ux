# DEP Platform - Features & Usage Guide

## 🎯 Overview

The DEP (Data Exploration & Governance Platform) is a comprehensive data governance solution with:
- **Modal-based workflows** for all CRUD operations
- **Searchable dropdowns** with create-new functionality
- **Customizable views** (Grid, List, Compact) on all data screens
- **Beautiful alert notifications** with color-coded feedback
- **Dark theme optimization** for reduced eye strain
- **Fully responsive design** for desktop, tablet, and mobile

---

## 📋 Key Screens & Features

### 1. **My Data Access**
**Purpose**: View and manage your dataset access permissions

**Features**:
- ✅ **Inline Copy SDK Button**: Copy Python SDK code per dataset
- ✅ **Dynamic Code Generation**: SDK code auto-generated for each dataset
- ✅ **View Modes**: Grid (cards), List (table), Compact (rows)
- ✅ **Status Badges**: Active/Pending/Expired status indicators
- ✅ **Success Alerts**: Confirmation when SDK copied

**View Modes**:
```
Grid View:
┌─────────────────────────────┐
│ Dataset Name    [Status]    │
│ Tables: 3 | Columns: 12/15  │
│ Expires: 90 days            │
│ [Copy SDK] Button           │
└─────────────────────────────┘

List View (Table):
┌────────────┬───────┬─────────┬────────┬─────────┬────────┐
│ Catalog    │ Tbl   │ Columns │ Status │ Expires │ Action │
├────────────┼───────┼─────────┼────────┼─────────┼────────┤
│ dataset_1  │ 3     │ 12/15   │ Active │ 90 days │ [Copy] │
└────────────┴───────┴─────────┴────────┴─────────┴────────┘

Compact View:
[📊 dataset_1] Active  3 tbl • 12/15 col • 90 days   [Copy]
```

**SDK Snippet Example** (dynamically generated):
```python
import dep_sdk
import pandas as pd

# Initialize DEP SDK
dep = dep_sdk.DEP()

# Read the governed dataset
df = dep.read_catalog("corporate_financial_catalog")

# Query specific tables
# data = dep.query("corporate_financial_catalog/customers")

# Display basic info
print(f"Shape: {df.shape}")
print(f"Columns: {df.columns.tolist()}")

# First 5 rows
print(df.head())
```

---

### 2. **Data Sources Hub**
**Purpose**: Connect and manage database connections and data sources

**Features**:
- ✅ **Add Source Modal**: Create new data connections
- ✅ **Edit Modal**: Update existing source details
- ✅ **Delete with Confirmation**: Safe deletion with alert
- ✅ **Test Connection**: Real-time connection testing with visual feedback
- ✅ **View Modes**: Grid, List, Compact views
- ✅ **Status Indicators**: Connected, Testing, Error, Ready

**Add Source Modal Fields**:
```
✓ Source Name (required) - e.g., "sales_oltp"
✓ Source Type (required) - PostgreSQL, MySQL, or CSV
✓ Host Address (for DB) - e.g., "db.example.com"
✓ Port Number (for DB) - Auto-filled based on type
✓ Database Name (for DB) - e.g., "analytics_db"
✓ File Name (for CSV) - e.g., "sales_data.csv"
✓ Description - Markdown support for detailed info
✓ Sensitive Data - Checkbox for PII/sensitive marking
```

**Status Indicators**:
```
🟢 Connected   → Data source is active and tested
🔄 Testing     → Connection test in progress (animated spinner)
🔴 Error       → Connection failed
⚪ Ready       → CSV file ready for import
```

**Modal Actions**:
```
[Test Connection] - Validates database connectivity
[Edit]            - Opens edit modal with pre-filled data
[Delete]          - Shows confirmation alert before deletion
```

---

### 3. **Catalog Explorer**
**Purpose**: Browse available datasets and request access

**Features**:
- ✅ **Request Access Modal**: Comprehensive access request form
- ✅ **Business Justification**: Required text area for explaining need
- ✅ **Duration Selection**: 30/60/90/180/365 days options
- ✅ **Classification Acknowledgment**: Confirm PII/sensitive status
- ✅ **View Modes**: Grid, List, Compact views
- ✅ **Dynamic Actions**: Copy SDK (granted) / Request (rejected) / Awaiting (pending)

**Catalog Status States**:
```
✅ Granted → Can access dataset, shows [Copy SDK] button
⏳ Pending → Awaiting approval, shows "Awaiting Approval" badge
❌ Rejected → Can request access, shows [Request] button
```

**Request Access Modal**:
```
Title: "Request Access"
Description: "Request access to customer_analytics_catalog"

Fields:
1. Catalog Name (read-only)
   └─ Shows the dataset name

2. Business Justification * (required)
   ├─ Textarea input
   ├─ Placeholder: "E.g., Financial analysis for Q3 planning..."
   └─ Min. length validation

3. Duration
   ├─ Dropdown selector
   ├─ Options: 30/60/90/180/365 days
   └─ Default: 90 days

4. Data Classification Level
   ├─ Shows classification (e.g., "Confidential")
   ├─ Acknowledgment checkbox
   └─ Required before submission

Actions:
[Cancel] - Close modal, clear form
[Submit Request] - Send request (disabled until justified)
```

**Success Alert After Submission**:
```
✓ Copied!
Your request for customer_analytics_catalog has been submitted for approval.
[Dismiss]
```

---

### 4. **Searchable Dropdowns** (Everywhere)
**Purpose**: Make selecting options faster and easier

**Features**:
```
Search Box:
🔍 [Type to search...] ← Live filtering as you type

Options List:
├─ Shows matching results
├─ Displays descriptions for context
├─ Highlights on hover
└─ Scrollable if many options

Create New Button:
+ Create New ← Auto-opens appropriate modal
```

**Usage Pattern**:
```
1. Click dropdown to open
2. Type to search options
3. Click option to select OR
4. Click "+ Create New" to add new option
   └─ Opens modal for creation
```

---

### 5. **View Toggle** (On all data screens)
**Purpose**: Switch between different data presentation formats

**Three View Modes**:

```
[Grid] [List] [Compact]
 ↓

GRID VIEW (Default):
┌─────────────────────┐  ┌─────────────────────┐
│ Item 1              │  │ Item 2              │
│ Multiple cards per  │  │ Optimized for mouse │
│ row on desktop      │  │ hover & exploration │
└─────────────────────┘  └─────────────────────┘

LIST VIEW (Detailed):
┌──────────────────────────────────────────────┐
│ Column 1  │ Column 2  │ Column 3  │ Actions │
├──────────┼───────────┼──────────┼─────────┤
│ Value 1  │ Value 2   │ Value 3  │ [Action]│
└──────────┴───────────┴──────────┴─────────┘

COMPACT VIEW (Focused):
[Item 1] Status info • More info  [Action]
[Item 2] Status info • More info  [Action]
```

---

## 🎨 Design Features

### Dark Theme Colors

**Text Colors** (optimized for readability):
```
Primary Text:   #e8e8e8 (High contrast - main headings)
Secondary Text: #a0a0a0 (Medium - body text)
Muted Text:     #808080 (Low - helper text)
Disabled:       #606060 (Very low - disabled state)
```

**Semantic Status Colors**:
```
Success (Active/Approved):   #7cb342 (Bright Green)
Warning (Pending):           #ffb84d (Bright Orange)
Error (Rejected/Blocked):    #ff6b6b (Bright Red)
Info (Neutral):              #64b5f6 (Bright Blue)
Masked/Protected:            #569cd6 (Steel Blue)
```

### Hover Effects
```
Buttons:        Color transition + background change
Cards:          Border highlight + shadow effect
Text:           Color brightening for visibility
Disabled:       Opacity reduction + cursor: not-allowed
```

---

## 🔔 Alert Notifications

**Four Alert Types**:

```
✓ Success (Green)
├─ Icon: ✓ Checkmark
├─ Title: Success-oriented message
├─ Message: Operation result
└─ Auto-dismiss: 3 seconds

✗ Error (Red)
├─ Icon: ! Alert
├─ Title: Error description
├─ Message: What went wrong
└─ Stays visible until dismissed

⚠ Warning (Orange)
├─ Icon: ⚠ Warning
├─ Title: Warning message
├─ Message: Action consequence
└─ Auto-dismiss: 4 seconds

ℹ Info (Blue)
├─ Icon: ℹ Info
├─ Title: Information
├─ Message: Additional details
└─ Auto-dismiss: 5 seconds
```

**Alert Features**:
- Positioned: Bottom-right of screen
- Animation: Slide in from bottom
- Dismiss: Auto (configurable) or manual X button
- Action: Optional button with custom callback

---

## ⌨️ Keyboard Shortcuts

```
Modal Operations:
├─ Escape          → Close modal
├─ Tab             → Navigate form fields
├─ Enter           → Submit form (if focused on button)
└─ Tab + Shift     → Previous field

Dropdown:
├─ Escape          → Close dropdown
├─ Arrow keys      → Navigate options
├─ Enter/Space     → Select option
└─ Ctrl+A          → Search all (in search box)

View Toggle:
├─ G              → Grid view (optional future shortcut)
├─ L              → List view (optional future shortcut)
└─ C              → Compact view (optional future shortcut)
```

---

## 📱 Responsive Breakpoints

```
Desktop (1920px+):
├─ Full sidebar visible
├─ 3-column grid
├─ Full table width
└─ All information visible

Tablet (768px-1024px):
├─ Sidebar visible (narrower)
├─ 2-column grid
├─ Table scrolls horizontally
└─ Touch-friendly buttons

Mobile (375px-667px):
├─ Sidebar hidden (menu icon)
├─ 1-column stacked layout
├─ Modals center and resize
└─ Compact view recommended
```

---

## 🚀 Quick Tips

### For Power Users:
1. **Use Compact View** on mobile for better performance
2. **Copy SDK** button is right there - no need to open separate section
3. **Search dropdowns** support partial matching across descriptions
4. **Create New** from any dropdown to add items without leaving the form

### Best Practices:
1. ✅ Always confirm sensitive data deletions
2. ✅ Check business justification before requesting access
3. ✅ Test connections before adding data sources
4. ✅ Use appropriate descriptions for clarity
5. ✅ Regular review of access permissions

### Workflow Examples:

**Adding a new database**:
```
Connections → [Add Source] → Fill form → [Save] → [Test] ✓
```

**Requesting dataset access**:
```
Catalog Explorer → [Request] → Fill justification → [Submit] ✓ Alert shown
```

**Getting SDK code**:
```
My Data Access → [Copy SDK] ✓ Alert shown → Paste in your code
```

---

## 🔧 Technical Details

**Component Architecture**:
```
pages/
└─ layout
   ├─ sidebar (navigation)
   ├─ topbar (status)
   └─ content
      └─ Screen Component
         ├─ ViewToggle
         ├─ Alert
         ├─ Modal (CRUD forms)
         └─ Data Views (Grid/List/Compact)
```

**State Management Pattern**:
```typescript
// View state
const [viewType, setViewType] = useState<ViewType>('grid')

// Modal state
const [isModal, setIsModal] = useState(false)
const [selectedItem, setSelectedItem] = useState(null)

// Alert state
const [alert, setAlert] = useState({
  isOpen: false,
  type: 'success',
  title: '',
  message: ''
})
```

---

## 📊 Data Flow Diagram

```
User Input
    ↓
[View Toggle/Dropdown/Button]
    ↓
Component State Update
    ↓
Conditional Rendering
    ├─ Modal (if open)
    ├─ Alert (if shown)
    └─ Data View (Grid/List/Compact)
    ↓
User sees result
```

---

## 🎓 Learning Path

**Beginner**:
1. Learn the three view modes
2. Use inline copy buttons
3. Submit access requests

**Intermediate**:
1. Add/edit data sources
2. Test connections
3. Use searchable dropdowns

**Advanced**:
1. Create access requests with justifications
2. Manage multiple data sources
3. Export data and SDKs

---

**Version**: 1.0.0  
**Last Updated**: July 2024  
**Status**: ✅ Complete & Production-Ready
