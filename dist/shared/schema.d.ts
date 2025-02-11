declare module '@shared/schema' {
    export interface Product {
      id: number;
      name: string;
      price: number;
      quantity: number;
    }
  
    export interface User {
      id: number;
      name: string;
      isFarmer: boolean;
    }
  
    export interface Order {
      id: number;
      productId: number;
      quantity: number;
      buyerId: number;
      status: string;
    }
  
    export const insertProductSchema: any;
    export const insertOrderSchema: any;
    export const insertUserSchema: any;
  }