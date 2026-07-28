// Field Types
export type FieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'multiselect'
  | 'section_header'

export interface FormField {
  name: string
  label: string
  type: FieldType
  options?: string[]
  required?: boolean
  conditional?: { field: string; value: unknown } // Only show if another field has this value
  width?: 'full' | 'half' | 'third'
}

export interface SubCategory {
  id: string
  label: string
  fields: FormField[]
}

export interface Category {
  id: string
  label: string
  icon: string // Icon name from Lucide
  subCategories: SubCategory[]
}

// --- SHARED OPTION LISTS (For consistency) ---
const YES_NO = ['Yes', 'No']
const CROP_SIZES = ['Young', 'Medium', 'Mature']
const COVERAGE_RATIO = [
  'Less than 25%',
  'Between 25% – 50%',
  'Between 50% – 75%',
  'Above 75%',
]
const FENCE_MATERIALS = [
  'No Information',
  'Concrete/Cement',
  'Wired',
  'Wood/Grass',
  'Brick/Block',
  'Steel',
  'Natural Stone',
]
const BUILDING_CONDITIONS = ['Poor', 'Fair', 'Good', 'Excellent']
const ROOF_TYPES = ['Double-Pitch', 'Mono-Pitch', 'Versatile', 'Flat roof']
const WALL_MATERIALS = [
  'Clay burnt Bricks',
  'Adobe blocks',
  'Cement blocks',
  'Reinforced concrete',
  'Non-reinforced concrete',
  'Wood and mud',
]
const ROOF_COVERING = [
  'Corrugated Iron Sheets',
  'Versatile Sheets',
  'Tile',
  'Traditional tiles',
  'Reinforced Concrete',
  'Grass',
]
const FLOOR_MATERIALS = ['Mud floor', 'Sand Cement creed', 'Floor tiles', 'Wood', 'Texture']
const PRODUCT_TYPES = [
  'Potatoes/Cassava',
  'Vegetables',
  'Maize/Sorghum/Wheat/Corn',
  'Rice',
  'Banana',
  'Coffee',
  'Tea',
  'Fruits',
  'Other',
]
const PARKING_MATERIALS = [
  'Cabro Blocks',
  'Concrete Pavement',
  'Clay Bricks/Blocks',
  'Natural Stone',
  'Gravel',
  'Missing',
]
const SEWAGE_TYPES = ['Central Sewage System', 'Septic Tank', 'Pit latrines', 'Missing']
const AMENITIES = [
  'Swimming pool',
  'Gym & fitness',
  'Car parking',
  'Garden',
  'Sports pitch (basketball, football, Tennis, any others)',
  'Kids outdoor play equipment',
  'Laundry services',
  'EV Charging Stations',
  'Any other, Please specify',
]
const INDUSTRIAL_INFRA = [
  'Loading Docks & Ramps',
  'Internal Road Networks Murram',
  'Internal Road Networks Tarmac',
  'Backup Generators',
  'Water Treatment Plant',
  'Gas & Fuel Storage',
  'Conveyor & Material handling System',
  'Weighbridge',
]

// --- REUSABLE FIELD GROUPS ---
const BUILDING_BASE_FIELDS: FormField[] = [
  {
    name: 'condition',
    label: 'Building Condition',
    type: 'select',
    options: BUILDING_CONDITIONS,
    width: 'half',
  },
  { name: 'built_area', label: 'Built-up Area (sqm)', type: 'number', width: 'half' },
  {
    name: 'building_type',
    label: 'Building Type',
    type: 'select',
    options: ['Detached building', 'Semi-Detached building', 'Terrace/Row House'],
    width: 'half',
  },
  { name: 'floors', label: 'Number of Floors', type: 'number', width: 'half' },
  { name: 'roof_type', label: 'Roof Type', type: 'select', options: ROOF_TYPES, width: 'half' },
  {
    name: 'roof_material',
    label: 'Roof Covering Material',
    type: 'select',
    options: ROOF_COVERING,
    width: 'half',
  },
  {
    name: 'wall_material',
    label: 'Wall Material',
    type: 'select',
    options: WALL_MATERIALS,
    width: 'half',
  },
  {
    name: 'floor_material',
    label: 'Floor Material',
    type: 'select',
    options: FLOOR_MATERIALS,
    width: 'half',
  },
  {
    name: 'under_construction',
    label: 'Is this building under construction?',
    type: 'radio',
    options: YES_NO,
    width: 'full',
  },
  {
    name: 'construction_year',
    label: 'Year of Construction',
    type: 'number',
    width: 'full',
    conditional: { field: 'under_construction', value: 'No' },
  },
]

const LAND_INFRA_FIELDS: FormField[] = [
  { name: 'has_electricity', label: 'Electricity', type: 'radio', options: YES_NO, width: 'half' },
  { name: 'has_water', label: 'Water', type: 'radio', options: YES_NO, width: 'half' },
  {
    name: 'has_parking',
    label: 'Is there any car parking?',
    type: 'radio',
    options: YES_NO,
    width: 'full',
  },
  {
    name: 'parking_material',
    label: 'Parking Space Material',
    type: 'select',
    options: PARKING_MATERIALS,
    width: 'half',
    conditional: { field: 'has_parking', value: 'Yes' },
  },
  {
    name: 'parking_capacity',
    label: 'No. of Cars on Parking',
    type: 'number',
    width: 'half',
    conditional: { field: 'has_parking', value: 'Yes' },
  },
  { name: 'sewage_type', label: 'Sewage', type: 'select', options: SEWAGE_TYPES, width: 'full' },
  {
    name: 'has_fence',
    label: 'Is there any fence?',
    type: 'radio',
    options: YES_NO,
    width: 'full',
  },
  {
    name: 'fence_material',
    label: 'Fence Material',
    type: 'select',
    options: FENCE_MATERIALS,
    width: 'full',
    conditional: { field: 'has_fence', value: 'Yes' },
  },
]

// --- COMPLETE FORM CONFIGURATION WITH ALL 20 FORMS IN ORIGINAL ORDER ---
export const FORM_CONFIG: Category[] = [
  // 1. FOREST - Form 1
  {
    id: 'forest',
    label: 'Forest',
    icon: 'TreePine',
    subCategories: [
      {
        id: 'forest_plot',
        label: 'Forest Plot',
        fields: [
          {
            name: 'products',
            label: 'Product Type (Choose main three)',
            type: 'multiselect',
            options: PRODUCT_TYPES,
            width: 'full',
          },
          { name: 'crop_size', label: 'Crop Size', type: 'select', options: CROP_SIZES, width: 'half' },
          {
            name: 'coverage',
            label: 'Crop Coverage Ratio',
            type: 'select',
            options: COVERAGE_RATIO,
            width: 'half',
          },
          {
            name: 'has_fence',
            label: 'Is there any fence?',
            type: 'radio',
            options: YES_NO,
            width: 'full',
          },
          {
            name: 'fence_material',
            label: 'Fence Material',
            type: 'select',
            options: FENCE_MATERIALS,
            width: 'full',
            conditional: { field: 'has_fence', value: 'Yes' },
          },
        ],
      },
    ],
  },

  // 2. AGRICULTURE - Forms 2, 3, 4
  {
    id: 'Agricultural',
    label: 'Agricultural',
    icon: 'Tractor',
    subCategories: [
      // Form 2: Agriculture Plot - Seasonal/Perennial Crops
      {
        id: 'seasonal_crops',
        label: 'Farmland for seasonal crops',
        fields: [
          { name: 'seasonal', label: 'Seasonal Crops', type: 'radio', options: YES_NO, width: 'half' },
          {
            name: 'perennial',
            label: 'Perennial Crops',
            type: 'radio',
            options: YES_NO,
            width: 'half',
          },
          {
            name: 'products',
            label: 'Product Type (Choose main three)',
            type: 'multiselect',
            options: PRODUCT_TYPES,
            width: 'full',
          },
          { name: 'crop_size', label: 'Crop Size', type: 'select', options: CROP_SIZES, width: 'half' },
          {
            name: 'coverage',
            label: 'Crop Coverage Ratio',
            type: 'select',
            options: COVERAGE_RATIO,
            width: 'half',
          },
          { name: 'irrigation', label: 'Irrigation', type: 'radio', options: YES_NO, width: 'full' },
          {
            name: 'has_fence',
            label: 'Is there any fence?',
            type: 'radio',
            options: YES_NO,
            width: 'full',
          },
          {
            name: 'fence_material',
            label: 'Fence Material',
            type: 'select',
            options: FENCE_MATERIALS,
            width: 'full',
            conditional: { field: 'has_fence', value: 'Yes' },
          },
        ],
      },
      // Form 3: Farmers Family House
      {
        id: 'family_house',
        label: 'FARMERS FAMILY HOUSE',
        fields: [
          ...BUILDING_BASE_FIELDS,
          {
            name: 'hdr_accom',
            label: 'Accommodation Details',
            type: 'section_header',
            width: 'full',
          },
          {
            name: 'units',
            label: 'Number of Units that can accommodate one family',
            type: 'number',
            width: 'full',
          },
          { name: 'bedrooms', label: 'Bedrooms', type: 'number', width: 'half' },
          { name: 'sitting_rooms', label: 'Sitting rooms', type: 'number', width: 'half' },
          { name: 'bathrooms', label: 'Bathrooms', type: 'number', width: 'half' },
          { name: 'store_rooms', label: 'Store rooms', type: 'number', width: 'half' },
          { name: 'kitchen', label: 'Kitchen', type: 'number', width: 'half' },
          { name: 'other_rooms', label: 'Other rooms', type: 'number', width: 'half' },
        ],
      },
      // Form 4: Other Farm Building (Livestock)
      {
        id: 'farm_building',
        label: 'Other Farm Building (Farm Building for Livestock)',
        fields: [...BUILDING_BASE_FIELDS],
      },
    ],
  },

  // 3. RESIDENTIAL - Forms 5, 6, 7, 8, 9
  {
    id: 'residential',
    label: 'Residential',
    icon: 'Home',
    subCategories: [
      // Form 5: Land for Family House
      {
        id: 'res_plot',
        label: 'Land for family house',
        fields: [...LAND_INFRA_FIELDS],
      },
      // Form 6: Land for Condominium Unit
      {
        id: 'condo_plot',
        label: 'Land for Condominium Unit',
        fields: [
          ...LAND_INFRA_FIELDS,
          {
            name: 'amenities',
            label: 'Existing social amenities',
            type: 'multiselect',
            width: 'full',
            options: AMENITIES,
          },
        ],
      },
      // Form 7: Family House (Building)
      {
        id: 'res_building',
        label: 'FAMILY HOUSE',
        fields: [
          ...BUILDING_BASE_FIELDS,
          {
            name: 'units',
            label: 'Number of Units that can accommodate one family',
            type: 'number',
            width: 'full',
          },
          { name: 'bedrooms', label: 'Bedrooms', type: 'number', width: 'half' },
          { name: 'sitting_rooms', label: 'Sitting rooms', type: 'number', width: 'half' },
          { name: 'bathrooms', label: 'Bathrooms', type: 'number', width: 'half' },
          { name: 'store_rooms', label: 'Store rooms', type: 'number', width: 'half' },
          { name: 'kitchen', label: 'Kitchen', type: 'number', width: 'half' },
          { name: 'other_rooms', label: 'Other rooms', type: 'number', width: 'half' },
        ],
      },
      // Form 8: Condominium Unit
      {
        id: 'condo_unit',
        label: 'Condominium Unit',
        fields: [
          {
            name: 'condition',
            label: 'Building Condition',
            type: 'select',
            options: BUILDING_CONDITIONS,
            width: 'half',
          },
          { name: 'built_area', label: 'Built-up Area (sqm)', type: 'number', width: 'half' },
          {
            name: 'floor_level',
            label: 'Floor on which the unit is located',
            type: 'number',
            width: 'full',
          },
          {
            name: 'hdr_accom',
            label: 'Accommodation of the unit',
            type: 'section_header',
            width: 'full',
          },
          { name: 'bedrooms', label: 'Bedrooms', type: 'number', width: 'half' },
          { name: 'sitting_rooms', label: 'Sitting rooms', type: 'number', width: 'half' },
          { name: 'bathrooms', label: 'Bathrooms', type: 'number', width: 'half' },
          { name: 'store_rooms', label: 'Store rooms', type: 'number', width: 'half' },
          { name: 'kitchen', label: 'Kitchen', type: 'number', width: 'half' },
          { name: 'other_rooms', label: 'Other rooms', type: 'number', width: 'half' },
          {
            name: 'under_construction',
            label: 'Is this building under construction?',
            type: 'radio',
            options: YES_NO,
            width: 'full',
          },
          {
            name: 'construction_year',
            label: 'Year of Construction',
            type: 'number',
            width: 'full',
            conditional: { field: 'under_construction', value: 'No' },
          },
        ],
      },
      // Form 9: Garage (RESIDENTIAL - ADDED)
      {
        id: 'garage',
        label: 'Garage',
        fields: [
          {
            name: 'condition',
            label: 'Building Condition',
            type: 'select',
            options: BUILDING_CONDITIONS,
            width: 'half',
          },
          { name: 'built_area', label: 'Built-up Area (sqm)', type: 'number', width: 'half' },
          {
            name: 'wall_material',
            label: 'Wall Material',
            type: 'select',
            options: WALL_MATERIALS,
            width: 'half',
          },
          {
            name: 'roof_material',
            label: 'Roof Covering Material',
            type: 'select',
            options: ROOF_COVERING,
            width: 'half',
          },
          {
            name: 'floor_material',
            label: 'Floor Material',
            type: 'select',
            options: FLOOR_MATERIALS,
            width: 'half',
          },
          {
            name: 'under_construction',
            label: 'Is this building under construction?',
            type: 'radio',
            options: YES_NO,
            width: 'full',
          },
          {
            name: 'construction_year',
            label: 'Year of Construction',
            type: 'number',
            width: 'full',
            conditional: { field: 'under_construction', value: 'No' },
          },
        ],
      },
    ],
  },

  // 4. COMMERCIAL - Forms 10, 11, 12, 13, 14, 15, 16
  {
    id: 'commercial',
    label: 'Commercial',
    icon: 'Building2',
    subCategories: [
      // Form 10: Commercial Plot
      {
        id: 'com_plot',
        label: 'Land for commercial plot',
        fields: [...LAND_INFRA_FIELDS],
      },
      // Form 11: Land for Apartment Building (COMMERCIAL - ADDED)
      {
        id: 'commercial_apartment_land',
        label: 'Land for Apartment Building',
        fields: [
          ...LAND_INFRA_FIELDS,
          {
            name: 'amenities',
            label: 'Existing social amenities',
            type: 'multiselect',
            width: 'full',
            options: AMENITIES,
          },
        ],
      },
      // Form 12: Office Block
      {
        id: 'office_block',
        label: 'Office Building',
        fields: [
          ...BUILDING_BASE_FIELDS,
          {
            name: 'is_rented',
            label: 'Is this building for rent?',
            type: 'radio',
            options: YES_NO,
            width: 'full',
          },
          {
            name: 'rental_area',
            label: 'Total Rental Area',
            type: 'number',
            width: 'half',
            conditional: { field: 'is_rented', value: 'Yes' },
          },
          {
            name: 'rent_percentage',
            label: 'Percentage of area under rent',
            type: 'number',
            width: 'half',
            conditional: { field: 'is_rented', value: 'Yes' },
          },
          {
            name: 'rent_price',
            label: 'Rent Amount per Sqm per month',
            type: 'number',
            width: 'full',
            conditional: { field: 'is_rented', value: 'Yes' },
          },
        ],
      },
      // Form 13: Petrol Station
      {
        id: 'petrol_station',
        label: 'Petrol Station',
        fields: [
          {
            name: 'condition',
            label: 'Building Condition',
            type: 'select',
            options: BUILDING_CONDITIONS,
            width: 'full',
          },
          { name: 'pumps', label: 'Type and Number of pumps', type: 'text', width: 'half' },
          {
            name: 'tanks',
            label: 'Number and capacity of underground storage tanks',
            type: 'text',
            width: 'half',
          },
          {
            name: 'is_rented',
            label: 'Is this petrol station under rent?',
            type: 'radio',
            options: YES_NO,
            width: 'full',
          },
          {
            name: 'rent_price',
            label: 'Rent Price per month',
            type: 'number',
            width: 'full',
            conditional: { field: 'is_rented', value: 'Yes' },
          },
          {
            name: 'under_construction',
            label: 'Is this building under construction?',
            type: 'radio',
            options: YES_NO,
            width: 'full',
          },
          {
            name: 'construction_year',
            label: 'Year of Construction',
            type: 'number',
            width: 'full',
            conditional: { field: 'under_construction', value: 'No' },
          },
        ],
      },
      // Form 14: Apartment Building (COMMERCIAL - ADDED)
      {
        id: 'apartment_building',
        label: 'Apartment',
        fields: [
          ...BUILDING_BASE_FIELDS,
          { name: 'hdr_units', label: 'Number of Units', type: 'section_header', width: 'full' },
          { name: 'rooms_per_unit', label: 'Number of rooms per unit', type: 'number', width: 'half' },
          { name: 'total_units', label: 'Total number of units', type: 'number', width: 'half' },
          {
            name: 'floor_area_per_unit',
            label: 'Floor area per unit/Sqm',
            type: 'number',
            width: 'half',
          },
          {
            name: 'units_under_rent',
            label: 'Number of units under rent',
            type: 'number',
            width: 'half',
          },
          {
            name: 'monthly_rent_per_unit',
            label: 'Monthly Rent amount per unit',
            type: 'number',
            width: 'full',
          },
        ],
      },
      // Form 15: Mixed Use Building (COMMERCIAL - ADDED)
      {
        id: 'mixed_use_building',
        label: 'Mixed Use Building',
        fields: [
          ...BUILDING_BASE_FIELDS,
          { name: 'hdr_use_types', label: 'Use Type and Area', type: 'section_header', width: 'full' },
          { name: 'residential_area', label: 'Residential Area (sqm)', type: 'number', width: 'half' },
          {
            name: 'residential_rent',
            label: 'Residential Monthly Rent per Sqm',
            type: 'number',
            width: 'half',
          },
          { name: 'commercial_area', label: 'Commercial Area (sqm)', type: 'number', width: 'half' },
          {
            name: 'commercial_rent',
            label: 'Commercial Monthly Rent per Sqm',
            type: 'number',
            width: 'half',
          },
          { name: 'industrial_area', label: 'Industrial Area (sqm)', type: 'number', width: 'half' },
          {
            name: 'industrial_rent',
            label: 'Industrial Monthly Rent per Sqm',
            type: 'number',
            width: 'half',
          },
          { name: 'office_area', label: 'Office Area (sqm)', type: 'number', width: 'half' },
          {
            name: 'office_rent',
            label: 'Office Monthly Rent per Sqm',
            type: 'number',
            width: 'half',
          },
        ],
      },
      // Form 16: Parking Building (COMMERCIAL - ADDED)
      {
        id: 'parking_building',
        label: 'Parking Building',
        fields: [
          ...BUILDING_BASE_FIELDS,
          {
            name: 'car_capacity',
            label: 'Number of cars that can park in the building',
            type: 'number',
            width: 'full',
          },
        ],
      },
    ],
  },

  // 5. INDUSTRIAL - Forms 17, 18
  {
    id: 'industrial',
    label: 'Industrial',
    icon: 'Factory',
    subCategories: [
      // Form 17: Land for Industrial Building
      {
        id: 'ind_plot',
        label: 'Land for industrial building',
        fields: [
          {
            name: 'machinery_included',
            label: 'Is the price paid including machinery or plant equipment?',
            type: 'radio',
            options: YES_NO,
            width: 'full',
          },
          ...LAND_INFRA_FIELDS,
          {
            name: 'infrastructure',
            label: 'Other Existing Infrastructures',
            type: 'multiselect',
            width: 'full',
            options: INDUSTRIAL_INFRA,
          },
        ],
      },
      // Form 18: Industrial Building
      {
        id: 'ind_building',
        label: 'Industrial Building',
        fields: [
          ...BUILDING_BASE_FIELDS,
          {
            name: 'is_rented',
            label: 'Is this building for rent?',
            type: 'radio',
            options: YES_NO,
            width: 'full',
          },
          {
            name: 'rental_area',
            label: 'Total Rental Area',
            type: 'number',
            width: 'half',
            conditional: { field: 'is_rented', value: 'Yes' },
          },
          {
            name: 'rent_price',
            label: 'Rent Amount per Sqm per month',
            type: 'number',
            width: 'half',
            conditional: { field: 'is_rented', value: 'Yes' },
          },
        ],
      },
    ],
  },

  // 6. PUBLIC - Forms 19, 20 (COMPLETELY ADDED - NEW CATEGORY)
  {
    id: 'public',
    label: 'Public',
    icon: 'Landmark',
    subCategories: [
      // Form 19: Land for Public Building
      {
        id: 'public_plot',
        label: 'Land for public building',
        fields: [...LAND_INFRA_FIELDS],
      },
      // Form 20: Public Building
      {
        id: 'public_building',
        label: 'Public Building',
        fields: [
          ...BUILDING_BASE_FIELDS,
          {
            name: 'is_rented',
            label: 'Is this building for rent?',
            type: 'radio',
            options: YES_NO,
            width: 'full',
          },
          {
            name: 'rental_area',
            label: 'Total Rental Area',
            type: 'number',
            width: 'half',
            conditional: { field: 'is_rented', value: 'Yes' },
          },
          {
            name: 'rent_price',
            label: 'Rent Amount per Sqm per month',
            type: 'number',
            width: 'half',
            conditional: { field: 'is_rented', value: 'Yes' },
          },
        ],
      },
    ],
  },
]

/* ------------------------------------------------------------------ *
 *  Helpers used by the listing wizard and the property detail page
 * ------------------------------------------------------------------ */

export const getCategory = (categoryId: string): Category | undefined =>
  FORM_CONFIG.find((c) => c.id === categoryId)

export const getSubCategory = (
  categoryId: string,
  subCategoryId: string,
): SubCategory | undefined =>
  getCategory(categoryId)?.subCategories.find((s) => s.id === subCategoryId)

/** Total number of distinct listing forms available (20). */
export const TOTAL_FORMS = FORM_CONFIG.reduce((n, c) => n + c.subCategories.length, 0)

/**
 * A field is visible when it has no `conditional`, or when the referenced
 * field currently holds the required value.
 */
export const isFieldVisible = (
  field: FormField,
  values: Record<string, unknown>,
): boolean => {
  if (!field.conditional) return true
  return values[field.conditional.field] === field.conditional.value
}
