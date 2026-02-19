import { Component, JSX } from "solid-js";

interface LogoIconProps extends JSX.SvgSVGAttributes<SVGSVGElement> {
  size?: number | string;
  fill?: string;
}

const LogoIcon: Component<LogoIconProps> = (props) => {
  return (
    <svg 
      id="b536ba52-b03c-4fb1-80e9-b1ba69c87388" 
      data-name="Layer 1" 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 398 398"
      width={props.size || "100%"}
      height={props.size || "100%"}
      fill={props.fill || "var(--color-primary)"}
      {...props}
    >
      <circle cx="73.2" cy="324.8" r="73.2"/>
      <circle cx="199" cy="199" r="73.2"/>
      <circle cx="324.8" cy="73.2" r="73.2"/>
      <rect x="221.4" y="299.1" width="251.1" height="146.37" transform="translate(-272.5 144.1) rotate(-45)"/>
      <circle cx="73.2" cy="73.2" r="73.2"/>
      <circle cx="199" cy="199" r="73.2"/>
      <rect x="147.3" y="299" width="250.8" height="146.37" transform="translate(232.2 -294.2) rotate(45)"/>
    </svg>
  );
};

export default LogoIcon;
