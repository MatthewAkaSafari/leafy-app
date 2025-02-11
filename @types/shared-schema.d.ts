declare module '@shared/schema' {
    export interface User {
      id: string;
      name: string;
      email: string;
      createdAt: Date;
      updatedAt: Date;
    }
  
    export interface Product {
      id: string;
      name: string;
      price: number;
      description: string;
      createdAt: Date;
      updatedAt: Date;
    }
  
    export interface Order {
      id: string;
      userId: string;
      productIds: string[];
      totalAmount: number;
      createdAt: Date;
      updatedAt: Date;
    }
  
    // Add more interfaces as needed
  }