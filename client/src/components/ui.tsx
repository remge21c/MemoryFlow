import { cloneElement, isValidElement, useId } from 'react';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  KeyboardEvent,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react';

export function Icon({ name, fill, className = '' }: { name: string; fill?: boolean; className?: string }) {
  return <span className={`material-symbols-outlined ${fill ? 'fill' : ''} ${className}`}>{name}</span>;
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  icon?: string;
};
export function Button({ variant = 'primary', loading, icon, children, className = '', disabled, ...rest }: BtnProps) {
  const base =
    'inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full font-semibold text-body-md transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/60';
  const styles: Record<string, string> = {
    primary: 'bg-primary text-on-primary hover:opacity-90 shadow-card',
    secondary: 'bg-transparent border border-on-surface/40 text-on-surface hover:bg-surface-container',
    ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container',
    danger: 'bg-error text-on-error hover:opacity-90',
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} disabled={disabled || loading} {...rest}>
      {loading ? (
        <span aria-hidden="true" className="inline-block w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : icon ? <Icon name={icon} className="text-[20px]" /> : null}
      {children}
    </button>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  const id = useId();
  const errorId = error ? `${id}-err` : undefined;
  const child = isValidElement<{ id?: string; 'aria-describedby'?: string }>(children)
    ? cloneElement(children, { id, ...(errorId ? { 'aria-describedby': errorId } : {}) })
    : children;
  return (
    <div>
      <label htmlFor={id} className="block text-label-sm text-outline uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {child}
      {error ? (
        <span id={errorId} role="alert" className="block text-label-sm text-error mt-1">
          {error}
        </span>
      ) : null}
    </div>
  );
}

const inputBase =
  'w-full rounded-md border border-outline/30 bg-surface-lowest px-3.5 py-3 text-body-lg text-on-surface placeholder:text-outline/60 focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ''}`} />;
}
export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputBase} resize-none leading-relaxed ${props.className ?? ''}`} />;
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'primary' | 'success' | 'muted' }) {
  const tones: Record<string, string> = {
    neutral: 'bg-secondary-container text-on-secondary-container',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-tertiary/10 text-tertiary',
    muted: 'bg-surface-container text-on-surface-variant',
  };
  return <span className={`inline-flex items-center px-3 py-1 rounded-full text-label-sm font-medium ${tones[tone]}`}>{children}</span>;
}

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const interactiveProps = onClick
    ? {
        role: 'button' as const,
        tabIndex: 0,
        onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        },
      }
    : {};
  return (
    <div
      onClick={onClick}
      {...interactiveProps}
      className={`bg-surface-lowest rounded-lg border border-outline/10 linen-shadow ${onClick ? 'cursor-pointer hover:border-primary/30 hover:bg-surface-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-surface-container ${className}`} />;
}

export function ProjectCardSkeleton() {
  return (
    <div aria-hidden="true" className="p-4 flex items-center gap-4 bg-surface-lowest rounded-lg border border-outline/10">
      <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="w-5 h-5 rounded shrink-0" />
    </div>
  );
}

/** 아이콘 폰트에 의존하지 않는 순수 CSS 원형 스피너 (폰트 로드 전에도 깔끔하게 회전). */
export function Spinner({ className = 'w-8 h-8 border-[3px]' }: { className?: string }) {
  return (
    <div role="status" aria-label="로딩 중" className="flex justify-center py-16 text-outline">
      <span
        aria-hidden="true"
        className={`inline-block rounded-full border-current border-t-transparent animate-spin ${className}`}
      />
    </div>
  );
}

export function EmptyState({ icon, title, hint, action }: { icon: string; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-on-surface-variant">
      <Icon name={icon} className="text-[40px] text-outline/60 mb-3" />
      <p className="text-body-lg font-semibold text-on-surface">{title}</p>
      {hint ? <p className="text-body-md mt-1 text-outline">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-md bg-error-container px-3.5 py-3 text-on-error-container text-body-md">
      <Icon name="error" className="text-[18px] mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-title-sm font-semibold text-on-surface">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
