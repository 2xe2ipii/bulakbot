import { type UseFormRegister, type FieldValues, type Path, type FieldErrors } from 'react-hook-form';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface BaseFieldProps<T extends FieldValues> {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  className?: string;
  required?: boolean;
}

interface InputProps<T extends FieldValues> extends BaseFieldProps<T> {
  type?: 'text' | 'number' | 'date' | 'time' | 'textarea';
  placeholder?: string;
  step?: string;
}

interface SelectProps<T extends FieldValues> extends BaseFieldProps<T> {
  options: { value: string; label: string }[];
}

export const FormInput = <T extends FieldValues>({
  label,
  name,
  register,
  errors,
  type = 'text',
  className,
  required,
  placeholder,
  step
}: InputProps<T>) => {
  const error = name.split('.').reduce((obj, key) => obj?.[key], errors as any);
  const errorMessage = error?.message as string | undefined;
  const isNumber = type === 'number';

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={name} className="text-sm font-bold text-gray-700 uppercase tracking-tight">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      {type === 'textarea' ? (
        <textarea
          id={name}
          {...register(name)}
          placeholder={placeholder}
          className={cn(
            "flex min-h-[80px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all",
            errorMessage && "border-red-500 focus:ring-red-500"
          )}
        />
      ) : (
        <input
          id={name}
          type={type}
          step={step}
          {...register(name, { valueAsNumber: isNumber })}
          // THE FIX: Auto-select text on focus so you don't have to delete '0'
          onFocus={(e) => e.target.select()} 
          placeholder={placeholder}
          className={cn(
            "flex h-12 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-base shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50",
            // THE FIX: Hide ugly spinners/arrows
            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            errorMessage && "border-red-500 focus:ring-red-500"
          )}
        />
      )}
      
      {errorMessage && (
        <span className="text-xs font-bold text-red-500 animate-pulse">{errorMessage}</span>
      )}
    </div>
  );
};

export const FormSelect = <T extends FieldValues>({
  label,
  name,
  register,
  errors,
  options,
  className,
  required
}: SelectProps<T>) => {
  const error = name.split('.').reduce((obj, key) => obj?.[key], errors as any);
  const errorMessage = error?.message as string | undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={name} className="text-sm font-bold text-gray-700 uppercase tracking-tight">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <select
          id={name}
          {...register(name)}
          className={cn(
            "flex h-12 w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-2 text-base font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
            errorMessage && "border-red-500 focus:ring-red-500"
          )}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-4 top-4 opacity-50">
          <svg width="12" height="8" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      {errorMessage && (
        <span className="text-xs font-bold text-red-500">{errorMessage}</span>
      )}
    </div>
  );
};