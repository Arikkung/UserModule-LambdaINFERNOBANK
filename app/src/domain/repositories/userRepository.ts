import { IUser } from "../interfaces/IUser";

export interface IUserRepository {
  save(user: IUser): Promise<void>;
}