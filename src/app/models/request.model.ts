export interface PartnerRequest {
  id?: string;
  ownerName: string; // Nom du gérant
  email: string;     // Email (servira pour le login plus tard)
  restaurantName: string;
  phone: string;
  description: string;
  address: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}
