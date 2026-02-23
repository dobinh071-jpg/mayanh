export interface Camera {
  id: number;
  name: string;
  brand: string;
  status: string;
}

export interface Lens {
  id: number;
  name: string;
  brand: string;
  status: string;
}

export interface Rental {
  id: number;
  customer_name: string;
  phone: string;
  rental_date: string;
  pickup_time: string;
  return_date: string;
  return_time: string;
  duration: string;
  rental_fee: number;
  deposit: number;
  paid_amount: number;
  remaining_amount: number;
  payment_method: string;
  return_condition: string;
  notes: string;
  camera_id: number | null;
  lens_id: number | null;
  camera_name?: string;
  lens_name?: string;
}
