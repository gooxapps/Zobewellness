export interface ProductVariant {
  id: number;
  product_id: number;
  packaging_size: string;
  weight_grams: number;
  price: number | null;
  promo_price: number | null;
  stock_quantity: number;
  is_available: number;
  sort_order: number;
}

export interface ProductImage {
  id: number;
  product_id: number;
  image_url: string;
  alt_text: string;
  is_primary: number;
  sort_order: number;
}

export interface Product {
  id: number;
  category_id: number;
  category_name?: string;
  category_slug?: string;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  sku: string;
  stock_quantity: number;
  is_available: number;
  is_featured: number;
  is_visible: number;
  seo_title: string;
  seo_description: string;
  image_alt: string;
  sort_order: number;
  variants: ProductVariant[];
  images: ProductImage[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  sort_order: number;
  is_active: number;
  product_count?: number;
}

export interface Testimonial {
  id: number;
  image_url: string;
  caption: string;
  alt_text: string;
  sort_order: number;
  is_active: number;
}

export interface DeliveryZone {
  id: number;
  name: string;
  region_code: string;
  fee: number | null;
  free_threshold: number | null;
  estimated_time: string;
  notes: string;
  is_active: number;
  sort_order: number;
}

export interface DeliverySettings {
  id: number;
  policy_text: string;
  temporary_notice: string;
  is_delivery_available: number;
}

export interface HomepageSection {
  id: number;
  section_key: string;
  label: string;
  title: string;
  subtitle: string;
  body: string;
  cta_primary_label: string;
  cta_secondary_label: string;
  image_url: string;
  secondary_image_url: string;
  extra_json: string;
  is_enabled: number;
  sort_order: number;
}

export interface NavigationItem {
  id: number;
  label: string;
  href: string;
  location: string;
  sort_order: number;
  is_active: number;
}

export interface WebsitePage {
  id: number;
  slug: string;
  title: string;
  hero_title: string;
  hero_subtitle: string;
  body: string;
  extra_json: string;
  image_url: string;
  seo_title: string;
  seo_description: string;
  is_published: number;
}

export interface CartItem {
  productId: number;
  productSlug: string;
  productName: string;
  imageUrl: string;
  variantId: number;
  packagingSize: string;
  unitPrice: number | null;
  quantity: number;
}

export interface StorefrontData {
  settings: Record<string, string>;
  sections: HomepageSection[];
  navigation: NavigationItem[];
  categories: Category[];
  featuredProducts: Product[];
  testimonials: Testimonial[];
  deliveryZones: DeliveryZone[];
  deliverySettings: DeliverySettings;
}
