export interface IUser {
  admin: boolean;
  email: string;
  favorites: null | string;
  id: number;
  isActive: boolean;
  isOnline: boolean;
  name: string;
  nickname: string;
  timestamp: number;
}
