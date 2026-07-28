declare global {
  namespace Express {
    interface User {
      userId: number;
    }
  }
}

export {};
