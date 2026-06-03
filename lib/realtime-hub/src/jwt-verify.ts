import jwt from "jsonwebtoken";
import { getJwtSecret, type AuthPayload } from "./jwt.js";

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, getJwtSecret()) as AuthPayload;
}
