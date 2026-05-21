export interface IUser {
  admin: boolean;
  editionId: number;
  email: string;
  extrasCount?: number;
  favorites: null | string;
  id: number;
  isActive: boolean;
  isOnline: boolean;
  name: string;
  nickname: string;
  timestamp: number;
}
