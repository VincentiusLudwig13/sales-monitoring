import axios from 'axios';

export interface User {
  nik: string;
  name: string;
  role: string;
  password?: string;
}

export interface Product {
  id: string;
  name: string;
  quantity: number;
  price: number;
  fresh_amount: number;
  retur_amount: number;
}

export interface OrderItem {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface ReturnItem {
  product_id: string;
  name: string;
  quantity: number;
}

export interface Store {
  id: string;
  name: string;
  lat: number;
  lon: number;
  photo_url: string;
  historicalSales: number;
  historicalRetur: number;
  outstanding: number;
  salesmanId?: string;
}

export interface VisitHistory {
  change_time: string;
  old_order: number;
  new_order: number;
  old_retur: number;
  new_retur: number;
  old_tagihan: number;
  new_tagihan: number;
}

export interface Visit {
  id: string;
  salesmanId: string;
  storeId: string;
  checkInTime: string;
  checkOutTime: string;
  orderAmount: number;
  returAmount: number;
  tagihanAmount: number;
  status: 'pending' | 'validated';
  dueDate: string;
  paymentStatus: string;
  attachment_url?: string;
  items?: OrderItem[];
  returns?: ReturnItem[];
  updated_at?: string;
  history?: VisitHistory[];
  _original?: Visit;
}

export interface AdminStats {
  sales_mtd: number;
  retur_mtd: number;
  total_outstanding: number;
  active_stores: number;
  inactive_stores: number;
  total_stores: number;
}

const api = axios.create({
  baseURL: '/api',
});

export const login = (nik: string, password: string) => api.post<User>('/login', { nik, password });
export const getStats = () => api.get<AdminStats>('/stats/admin');
export const getVisits = () => api.get<Visit[]>('/visits');
export const validateVisit = (visitId: string) => api.post(`/visits/${visitId}/validate`);
export const rejectVisit = (visitId: string) => api.post(`/visits/${visitId}/reject`);
export const deleteVisit = (visitId: string) => api.delete(`/visits/${visitId}`);
export const getStores = () => api.get<Store[]>('/stores');
export const updateStore = (id: string, data: Partial<Store>) => api.put(`/stores/${id}`, data);
export const getUsers = () => api.get<User[]>('/users');
export const addUser = (user: User) => api.post('/users', user);
export const editUser = (nik: string, user: Partial<User>) => api.put(`/users/${nik}`, user);
export const updateVisit = (id: string, data: Partial<Visit>) => api.put(`/visits/${id}`, data);
export const getProducts = () => api.get<Product[]>('/products');
export const addProduct = (product: Product) => api.post('/products', product);
export const editProduct = (id: string, product: Product) => api.put(`/products/${id}`, product);
export const deleteProduct = (id: string) => api.delete(`/products/${id}`);

export default api;
