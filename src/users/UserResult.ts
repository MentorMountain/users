import { User } from "cmpt474-mm-jwt-middleware";

export interface UserResult {
  found: boolean;
  user?: User;
}
