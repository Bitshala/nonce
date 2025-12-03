import React, { type ReactNode } from 'react';

// ==================== TYPES ====================

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export interface InputFieldProps {
  label: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: 'text' | 'email' | 'number' | 'date' | 'password' | 'url';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string | number;
  max?: string | number;
  helperText?: string;
  error?: string;
  className?: string;
}

export interface TextAreaFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  helperText?: string;
  error?: string;
  className?: string;
}

export interface SelectFieldProps {
  label: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ value: string | number; label: string }>;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  error?: string;
  className?: string;
}

export interface CheckboxFieldProps {
  label: string;
  name: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  helperText?: string;
  error?: string;
  className?: string;
}

export interface RadioFieldProps {
  label: string;
  name: string;
  options: Array<{ value: string | number; label: string }>;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  helperText?: string;
  error?: string;
  className?: string;
  direction?: 'horizontal' | 'vertical';
}

export interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

// ==================== MODAL COMPONENT ====================

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className = '',
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-6">
      <div
        className={`bg-zinc-800 rounded-3xl shadow-2xl p-6 md:p-10 ${sizeClasses[size]} w-full max-h-[90vh] overflow-y-auto mx-auto ${className}`}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <h2 className="text-xl md:text-2xl font-bold text-zinc-100">{title}</h2>
          <button
            onClick={onClose}
            className="border-0 bg-transparent text-zinc-400 hover:text-zinc-100 transition-colors -mt-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Description */}
        {description && <p className="text-zinc-400 text-sm mb-8">{description}</p>}

        {/* Content */}
        <div className="space-y-6">{children}</div>

        {/* Footer */}
        {footer && <div className="flex flex-col-reverse md:flex-row md:justify-end gap-3 pt-4 mt-6">{footer}</div>}
      </div>
    </div>
  );
};

// ==================== INPUT COMPONENTS ====================

export const InputField: React.FC<InputFieldProps> = ({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  min,
  max,
  helperText,
  error,
  className = '',
}) => {
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium mb-2 text-zinc-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
        {helperText && <span className="text-zinc-500 text-xs ml-2">({helperText})</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        className="max-w-full h-5 text-white focus:outline-none bg-zinc-900  rounded-lg border-0 p-2"
        style={type === 'date' ? { colorScheme: 'dark' } : undefined}
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
};

export const TextAreaField: React.FC<TextAreaFieldProps> = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  rows = 4,
  helperText,
  error,
  className = '',
}) => {
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium mb-2 text-zinc-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
        {helperText && <span className="text-zinc-500 text-xs ml-2">({helperText})</span>}
      </label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        className="w-full border-0 bg-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed resize-none"
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
};

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
  helperText,
  error,
  className = '',
}) => {
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium mb-2 text-zinc-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
        {helperText && <span className="text-zinc-500 text-xs ml-2">({helperText})</span>}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="w-full border-0 bg-zinc-700 rounded-lg pl-4 pr-10 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgb(161 161 170)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1.25rem] bg-[center_right_0.75rem] bg-no-repeat"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-zinc-700 text-zinc-100">
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
};

export const CheckboxField: React.FC<CheckboxFieldProps> = ({
  label,
  name,
  checked,
  onChange,
  disabled = false,
  helperText,
  error,
  className = '',
}) => {
  return (
    <div className={className}>
      <div className="flex items-center space-x-3">
        <input
          id={name}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="h-5 w-5 text-orange-500 bg-zinc-700 border-0 rounded focus:ring-orange-500 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <label htmlFor={name} className="text-base font-medium text-zinc-200">
          {label}
          {helperText && <span className="text-zinc-500 text-xs ml-2">({helperText})</span>}
        </label>
      </div>
      {error && <p className="text-red-400 text-xs mt-1 ml-8">{error}</p>}
    </div>
  );
};

export const RadioField: React.FC<RadioFieldProps> = ({
  label,
  name,
  options,
  value,
  onChange,
  disabled = false,
  helperText,
  error,
  className = '',
  direction = 'vertical',
}) => {
  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-2 text-zinc-300">
        {label}
        {helperText && <span className="text-zinc-500 text-xs ml-2">({helperText})</span>}
      </label>
      <div className={`${direction === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-3'}`}>
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-3">
            <input
              id={`${name}-${option.value}`}
              name={name}
              type="radio"
              value={option.value}
              checked={value === option.value}
              onChange={onChange}
              disabled={disabled}
              className="h-5 w-5 text-orange-500 bg-zinc-700 border-0 focus:ring-orange-500 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed max-w-full"
            />
            <label htmlFor={`${name}-${option.value}`} className="text-base font-medium text-zinc-200">
              {option.label}
            </label>
          </div>
        ))}
      </div>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
};

// ==================== BUTTON COMPONENT ====================

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  loading = false,
  className = '',
}) => {
  const baseClasses =
    'border-0 font-medium px-8 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-orange-500 hover:bg-orange-600 text-white focus:ring-orange-500',
    secondary: 'bg-transparent hover:bg-zinc-700 text-zinc-300 border border-zinc-600 focus:ring-zinc-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    ghost: 'bg-white/10 hover:bg-white/20 text-zinc-300 focus:ring-zinc-500',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {loading ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
};

// ==================== LAYOUT HELPERS ====================

export const ModalRow: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-12 md:flex-row ${className} max-w-xl`}>
      {React.Children.map(children, (child) => (
        <div className="flex-1">{child}</div>
      ))}
    </div>
  );
};


export const ModalSection: React.FC<{ title?: string; children: ReactNode; className?: string }> = ({
  title,
  children,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {title && <h3 className="text-lg font-semibold text-zinc-200">{title}</h3>}
      {children}
    </div>
  );
};
