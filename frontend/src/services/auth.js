import API from "./api";

export const signupUser = (data) =>
  API.post("/api/auth/signup", data);

export const loginUser = (data) =>
  API.post("/api/auth/login", data);