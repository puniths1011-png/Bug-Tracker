import { apiFetch } from "../config/api";

export const listUsers = () => apiFetch("/users?includePending=true");
