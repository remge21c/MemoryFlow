import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email().max(255),
  password: z.string().min(10).max(128),
});

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email().max(255),
});

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(10).max(128),
    confirmPassword: z.string().min(10).max(128),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "새 비밀번호가 일치하지 않습니다.",
    path: ["confirmPassword"],
  });
