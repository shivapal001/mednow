export interface User {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  role?: 'user' | 'admin';
  createdAt?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  rating: number;
  fee: number;
  image: string;
  verified: boolean;
  whatsapp?: string;
}

export interface Medicine {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  category: string;
  description: string;
}

export interface CartItem extends Medicine {
  quantity: number;
}

export interface Prescription {
  id: string;
  user_id: string;
  image_url: string;
  extracted_data: string;
  created_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  medicine_name: string;
  time: string;
  frequency: string;
}

export interface Order {
  id: string;
  user_id: string;
  user_name?: string;
  user_phone?: string;
  items: string;
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod: 'cod' | 'online';
  address: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  created_at: string;
}
