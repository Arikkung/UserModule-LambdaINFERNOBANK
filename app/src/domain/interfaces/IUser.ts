export interface IUser {
  uuid: string;
  name: string;
  lastName?: string;
  email: string;
  password: string;
  document: string;
  createdAt: string;
  profileImageUrl: string;
}
