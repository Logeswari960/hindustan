import React from 'react';

// ── Button ────────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type BtnSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const btnVariant: Record<BtnVariant, string> = {
  primary:   'bg-navy-700 text-white hover:bg-navy-800 active:bg-navy-900 focus-visible:ring-navy-600',
  secondary: 'bg-white text-navy-700 border border-neutral-300 hover:bg-neutral-50 hover:border-neutral-400 focus-visible:ring-navy-400',
  ghost:     'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800 focus-visible:ring-neutral-400',
  danger:    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
};

const btnSize: Record<BtnSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-base gap-2 rounded-xl',
};

export function Button({
  variant = 'primary', size = 'md', loading = false,
  icon, iconPosition = 'left', fullWidth = false,
  children, className = '', disabled, ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed select-none',
        btnVariant[variant], btnSize[size],
        fullWidth ? 'w-full' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="shrink-0 flex">{icon}</span>}
          {children}
          {icon && iconPosition === 'right' && <span className="shrink-0 flex">{icon}</span>}
        </>
      )}
    </button>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const badgeStyles: Record<BadgeVariant, string> = {
  default: 'bg-navy-100 text-navy-700',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  danger:  'bg-red-50 text-red-700 border border-red-200',
  info:    'bg-teal-50 text-teal-700 border border-teal-200',
  neutral: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
  purple:  'bg-violet-50 text-violet-700 border border-violet-200',
};

export function Badge({ variant = 'default', children, className = '', dot }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${badgeStyles[variant]} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />}
      {children}
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  as?: 'div' | 'article' | 'section';
}

export function Card({ children, className = '', hover = false, onClick, as: Tag = 'div' }: CardProps) {
  return (
    <Tag
      onClick={onClick}
      className={[
        'bg-white rounded-xl border border-neutral-200 shadow-card',
        hover ? 'hover:shadow-card-md hover:border-neutral-300 transition-all duration-150 cursor-pointer' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </Tag>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  error?: boolean;
}

export function Input({ leftIcon, rightElement, error, className = '', ...props }: InputProps) {
  return (
    <div className="relative flex items-center">
      {leftIcon && (
        <span className="absolute left-3 text-neutral-400 pointer-events-none flex">{leftIcon}</span>
      )}
      <input
        {...props}
        className={[
          'w-full h-9 px-3 text-sm border rounded-lg bg-white transition-shadow',
          'placeholder:text-neutral-400',
          'focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent',
          'disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed',
          error ? 'border-red-400 focus:ring-red-400' : 'border-neutral-300',
          leftIcon ? 'pl-9' : '',
          rightElement ? 'pr-9' : '',
          className,
        ].filter(Boolean).join(' ')}
      />
      {rightElement && (
        <span className="absolute right-3 flex">{rightElement}</span>
      )}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export function Select({ error, className = '', children, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={[
        'w-full h-9 px-3 text-sm border rounded-lg bg-white transition-shadow appearance-none',
        'focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent',
        'disabled:bg-neutral-50 disabled:cursor-not-allowed',
        error ? 'border-red-400' : 'border-neutral-300',
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </select>
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────────
export function Textarea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        'w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white transition-shadow resize-none',
        'placeholder:text-neutral-400',
        'focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent',
        className,
      ].filter(Boolean).join(' ')}
    />
  );
}

// ── FormField ─────────────────────────────────────────────────────────────────
interface FormFieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
}

export function FormField({ label, hint, error, required, children, htmlFor }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
      </label>
      {hint && <p className="text-xs text-neutral-500 leading-relaxed">{hint}</p>}
      {children}
      {error && <p className="text-xs text-red-600 flex items-center gap-1">{error}</p>}
    </div>
  );
}

// ── ProgressBar ───────────────────────────────────────────────────────────────
interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  color?: 'navy' | 'emerald' | 'amber';
  label?: string;
}

const progressColors = {
  navy:    'bg-navy-600',
  emerald: 'bg-emerald-500',
  amber:   'bg-amber-500',
};

export function ProgressBar({ value, max = 100, className = '', color = 'navy', label }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  return (
    <div className={className}>
      <div
        className="h-1.5 bg-neutral-100 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${progressColors[color]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-neutral-100 rounded-lg animate-pulse ${className}`} aria-hidden="true" />;
}

export function SkeletonCard() {
  return (
    <Card className="p-5 space-y-3" aria-hidden="true">
      <div className="flex justify-between items-start">
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-8 w-28 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </Card>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-neutral-800 mb-1.5">{title}</h3>
      <p className="text-sm text-neutral-500 max-w-xs leading-relaxed mb-5">{description}</p>
      {action}
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

const toastStyles = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error:   'bg-red-50 border-red-200 text-red-800',
  info:    'bg-navy-50 border-navy-200 text-navy-800',
};

export function Toast({ message, type = 'info', onClose }: ToastProps) {
  return (
    <div
      role="alert"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-card-lg text-sm font-medium animate-slide-up max-w-sm ${toastStyles[type]}`}
    >
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity ml-1" aria-label="Dismiss">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </button>
    </div>
  );
}

// ── Stepper ───────────────────────────────────────────────────────────────────
interface StepperProps {
  steps: string[];
  current: number;
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center">
        {steps.map((step, i) => (
          <React.Fragment key={step}>
            <li className="flex flex-col items-center">
              <div
                aria-current={i === current ? 'step' : undefined}
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                  i < current  ? 'bg-navy-700 text-white' : '',
                  i === current ? 'bg-navy-700 text-white ring-4 ring-navy-100' : '',
                  i > current  ? 'bg-neutral-100 text-neutral-400' : '',
                ].filter(Boolean).join(' ')}
              >
                {i < current ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : i + 1}
              </div>
              <span className={`mt-1.5 text-xs font-medium hidden sm:block whitespace-nowrap ${i === current ? 'text-navy-700' : 'text-neutral-400'}`}>
                {step}
              </span>
            </li>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-2 mb-5 ${i < current ? 'bg-navy-700' : 'bg-neutral-200'}`} />
            )}
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
interface TabsProps {
  tabs: { label: string; value: string; count?: number }[];
  active: string;
  onChange: (value: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 border-b border-neutral-200" role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={active === tab.value}
          onClick={() => onChange(tab.value)}
          className={[
            'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5',
            active === tab.value
              ? 'border-navy-700 text-navy-700'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300',
          ].join(' ')}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${active === tab.value ? 'bg-navy-100 text-navy-700' : 'bg-neutral-100 text-neutral-500'}`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const modalSizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${modalSizes[size]} animate-slide-up`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <h2 id="modal-title" className="text-base font-semibold text-neutral-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-neutral-100 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
export function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  return (
    <span className="relative group inline-flex">
      {children}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-neutral-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {content}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900" />
      </span>
    </span>
  );
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────
interface BreadcrumbItem { label: string; href?: string }

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 text-sm">
        {items.map((item, i) => (
          <React.Fragment key={item.label}>
            {i > 0 && <span className="text-neutral-300">/</span>}
            {item.href && i < items.length - 1 ? (
              <a href={item.href} className="text-neutral-500 hover:text-neutral-700 transition-colors">{item.label}</a>
            ) : (
              <span className={i === items.length - 1 ? 'text-neutral-800 font-medium' : 'text-neutral-500'}>{item.label}</span>
            )}
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
}
