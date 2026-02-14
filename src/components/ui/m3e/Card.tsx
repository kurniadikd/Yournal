import { JSX } from "solid-js";

interface CardProps {
  variant?: 'filled' | 'elevated' | 'outlined';
  children: JSX.Element;
  class?: string;
  onClick?: () => void;
}

/**
 * M3 Expressive Card
 * 
 * Features:
 * - Extra Large corners
 * - Flat design (Elevated variant uses a darker surface color instead of shadow)
 */
export default function Card(props: CardProps) {
  const variantClasses = {
    filled: "bg-[var(--color-surface-container-highest)]",
    elevated: "bg-[var(--color-surface-container-low)]", // In flat design, "elevated" means a different neutral tone
    outlined: "bg-[var(--color-surface-container)]"
  };

  return (
    <div
      onClick={props.onClick}
      class={`
        relative rounded-[28px] p-6 transition-all duration-200
        ${props.onClick ? 'cursor-pointer active:scale-[0.99]' : ''}
        ${variantClasses[props.variant || 'filled']}
        ${props.class || ''}
      `}
    >
      {props.children}
      
      <Show when={props.onClick}>
        <div class="absolute inset-0 rounded-inherit bg-current opacity-0 hover:opacity-[0.04] active:opacity-[0.08] transition-opacity" />
      </Show>
    </div>
  );
}
