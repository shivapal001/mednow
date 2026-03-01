export interface User {
  id: number;
  phone: string;
  name?: string;
  email?: string;
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
  id: number;
  user_id: number;
  image_url: string;
  extracted_data: string;
  created_at: string;
}

export interface Reminder {
  id: number;
  user_id: number;
  medicine_name: string;
  time: string;
  frequency: string;
}

export interface Order {
  id: number;
  user_id: number;
  items: string;
  total_amount: number;
  status: string;
  created_at: string;
}
