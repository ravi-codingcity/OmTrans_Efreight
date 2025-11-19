# Import/Export Quotation Form Component

## Overview
A comprehensive, production-ready React component for creating and managing import/export quotations. Built with React hooks, Tailwind CSS, and Lucide React icons.

## File Location
`src/components/ImportExportQuotationForm.jsx`

## Features

### 1. Basic Information Section
- **Quotation No** - Unique quotation identifier (required)
- **Quotation Date** - Date field for quotation creation
- **Type** - Dropdown selection (Contract/Spot)
- **Status** - Dropdown selection (Active/Inactive)
- **Location** - Location information
- **To Email** - Recipient email address
- **Valid From/To** - Validity period date fields

### 2. Party Information Section
- **Owner** - Quotation owner/creator
- **Customer** - Customer name
- **Address** - Full customer address (textarea)
- **Salesman** - Associated salesman
- **Attention** - Attention to (recipient name)
- **Agent** - Agent details
- **Transporter** - Transporter information

### 3. Header & Footer Section
- **Header** - Custom header content for the quotation
- **Footer** - Custom footer content for the quotation

### 4. Cargo Type Tabs
Interactive tab selection with 7 cargo types:
- FCL (Full Container Load)
- LCL (Less than Container Load)
- AIR
- LAND
- LTL (Less Than Truckload)
- FTL (Full Truck Load)
- Others

### 5. Route Segment Table (Dynamic)
Fully editable table with the following columns:
- **No** - Auto-numbered row identifier
- **Country POR** - Country of Port of Receipt
- **POL** - Port of Loading
- **Country POD** - Country of Port of Delivery
- **POD** - Port of Delivery
- **FDC** - First Drop Charge
- **TOS** - Type of Service
- **Service** - Service type
- **Carrier** - Shipping carrier
- **Status** - Route status
- **Remarks** - Additional remarks
- **Booking** - Checkbox for booking confirmation
- **Action** - Remove row button

**Features:**
- Add Segment button to dynamically add new rows
- Remove individual row functionality
- Auto-renumbering when rows are deleted
- Hover effects for better UX

### 6. Commodity Section
- **Commodity Description** - Textarea for detailed commodity information
- **GR Weight** - Gross weight in kilograms
- **Volume** - Volume in cubic meters (CBM)
- **Party** - Optional party information

### 7. Charge Details Table (Dynamic)
Comprehensive charge management with the following columns:
- **Charge Code** - Unique charge identifier
- **Charge Name** - Description of the charge
- **Charge Flag** - Classification flag
- **PP/CC** - Prepaid or Collect (Dropdown)
- **Currency** - Currency selection (INR, USD, EUR, GBP, AED - default INR)
- **Unit Code** - Unit of measurement
- **Amount Per Unit** - Price per unit
- **Cost Per Unit** - Cost calculation per unit
- **Min Cost** - Minimum cost threshold
- **Amount** - Total amount
- **Action** - Remove row button

**Features:**
- Add Charge button for dynamic row addition
- Remove individual charge rows
- Currency dropdown with common currencies
- PP/CC selector for payment terms
- Numeric input validation for all price fields

### 8. Action Buttons
- **Copy JSON** - Copies entire form data as formatted JSON to clipboard
- **Export/Save** - Downloads form data as a JSON file with timestamp

## State Management

The component uses React `useState` hooks to manage:

1. **formData** - Main form fields
2. **routeSegments** - Array of route segment rows
3. **commodity** - Commodity information
4. **chargeDetails** - Array of charge detail rows

## Styling

### Responsive Design
- Mobile-first approach using Tailwind CSS
- Grid layouts that adapt from 1 column (mobile) to 2-4 columns (desktop)
- Overflow scrolling for tables on smaller screens
- Flexible button layouts

### Visual Hierarchy
- Gradient header with blue color scheme
- Section headers with bottom borders
- Input focus states with ring effects
- Hover states for interactive elements
- Color-coded buttons (Blue for primary, Green for add, Red for delete)

## Dependencies

```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "lucide-react": "latest",
  "tailwindcss": "^3.4.18"
}
```

## Usage

### Basic Implementation
```jsx
import ImportExportQuotationForm from './components/ImportExportQuotationForm';

function App() {
  return <ImportExportQuotationForm />;
}

export default App;
```

### Accessing Form Data
The form data structure when copied/exported:

```json
{
  "formData": {
    "quotationNo": "QT-001",
    "qtnDate": "2025-11-14",
    "type": "Contract",
    "cargoType": "FCL",
    ...
  },
  "routeSegments": [
    {
      "no": 1,
      "countryPOR": "USA",
      "pol": "New York",
      ...
    }
  ],
  "commodity": {
    "description": "Electronics",
    "grWeight": "5000",
    "volume": "10.5",
    "party": "ABC Corp"
  },
  "chargeDetails": [
    {
      "chargeCode": "CHARG001",
      "chargeName": "Freight Charge",
      "currency": "INR",
      ...
    }
  ]
}
```

## Key Functions

### Form Handlers
- `handleFormChange(e)` - Updates main form fields
- `handleCommodityChange(e)` - Updates commodity section

### Route Segment Methods
- `addRouteSegment()` - Adds new segment row
- `removeRouteSegment(id)` - Removes specific segment
- `handleRouteSegmentChange(id, field, value)` - Updates segment field

### Charge Details Methods
- `addChargeDetail()` - Adds new charge row
- `removeChargeDetail(id)` - Removes specific charge
- `handleChargeChange(id, field, value)` - Updates charge field

### Export Methods
- `copyJSON()` - Copies data to clipboard
- `exportJSON()` - Downloads JSON file

## Browser Compatibility
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## Accessibility Features
- Semantic HTML input elements
- Focus indicators on all interactive elements
- Proper label associations
- Color-coded buttons with text labels
- Clear error states

## Production Ready
✅ Clean, readable code with proper organization
✅ Full Tailwind CSS styling with responsive design
✅ Comprehensive state management
✅ Error prevention through input types
✅ Optimized performance with React hooks
✅ Icons from Lucide React library
✅ Builds successfully without warnings
✅ Complete form validation ready for extension

## Future Enhancements
- Form validation schema (Yup/Zod)
- API integration for saving quotations
- Pre-fill with customer/vendor data
- Print functionality
- PDF export
- Calculation automation for charges
- Multi-language support
- Dark mode theme
- Undo/Redo functionality
