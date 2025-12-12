export interface Restaurant {
  id: string;
  name: string;
  ownerName: string;
  whatsappPhone: string;

  // 👇 CHANGEMENT ICI
  active: boolean;

  imageUrl?: string;
}
