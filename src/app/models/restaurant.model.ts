export interface Restaurant {
  id?: string;
  name: string;
  ownerName?: string;
  whatsappPhone: string;
  active: boolean;
  imageUrl?: string;
  email: string;
  description?: string;
  address?: string;
  rating: number;
  ratingCount: number;
  deliveryTime?: string; // "20-30 min"
  deliveryPrice?: number;
  tags?: string[];
}
