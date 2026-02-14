import { JSX } from "solid-js";

interface DividerProps {
  class?: string;
  vertical?: boolean;
}

/**
 * M3 Expressive Divider
 */
export default function Divider(props: DividerProps) {
  return (
    <div 
      class={`
        bg-[var(--color-outline-variant)] 
        ${props.vertical ? 'w-[1px] h-full self-stretch' : 'h-[1px] w-full'}
        ${props.class || ''}
      `}
    />
  );
}
