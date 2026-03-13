import { LucideIcon } from 'lucide-react';

export interface Utility {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: LucideIcon;
  path: string;
  featured?: boolean;
}

export interface UtilityCategory {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
}

export interface UtilityResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface BaseUtilityProps {
  className?: string;
}

export interface FormState<T = any> {
  input: T;
  result: UtilityResult | null;
  isLoading: boolean;
}