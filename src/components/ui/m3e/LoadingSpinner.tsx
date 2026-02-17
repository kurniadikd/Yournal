
import { mergeProps } from "solid-js";
import Progress from "./Progress";

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  class?: string;
}

export default function LoadingSpinner(props: LoadingSpinnerProps) {
  const merged = mergeProps({ size: 'medium' }, props);
  
  return (
    <div class={`flex items-center justify-center ${merged.class || ''}`}>
      <Progress 
        type="circular" 
        size={merged.size as 'small' | 'medium' | 'large'} 
      />
    </div>
  );
}
