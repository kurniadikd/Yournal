import { createSignal, createMemo } from "solid-js";
import { appStore } from "../stores/appStore";
import logoIcon from "../assets/yournal_logo.svg";
import logoName from "../assets/yournal_text.svg";
import TopAppBar from "./ui/m3e/TopAppBar";
import IconButton from "./ui/m3e/IconButton";

const Header = () => {
  const [logoPressed, setLogoPressed] = createSignal(false);
  const [mouseX, setMouseX] = createSignal(0);
  const [mouseY, setMouseY] = createSignal(0);
  const [elementRect, setElementRect] = createSignal<DOMRect | null>(null);
  const [isOutside, setIsOutside] = createSignal(true);
  
  let logoRef: HTMLDivElement | undefined;

  const handleMouseMove = (e: MouseEvent) => {
    if (!logoRef) return;
    const rect = logoRef.getBoundingClientRect();
    setElementRect(rect);
    setMouseX(e.clientX - rect.left);
    setMouseY(e.clientY - rect.top);
    setIsOutside(false);
  };

  const handleMouseLeave = () => {
    setIsOutside(true);
    setLogoPressed(false);
  };

  const logo3DStyle = createMemo(() => {
    const MAX_ROTATION = 10;
    const rect = elementRect();
    
    if (isOutside() || !logoPressed() || !rect) {
      return {
        transform: 'rotateX(0deg) rotateY(0deg) scale(1) translateZ(0px)',
        transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      };
    }

    const x = (mouseX() - rect.width / 2) / (rect.width / 2);
    const y = (mouseY() - rect.height / 2) / (rect.height / 2);

    const rotateY = x * MAX_ROTATION;
    const rotateX = -y * MAX_ROTATION;

    return {
      transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(0.95) translateZ(-10px)`,
      transition: 'transform 0.1s ease-out',
    };
  });

  return (
    <TopAppBar
      title={
        <div 
          ref={logoRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onMouseDown={() => setLogoPressed(true)}
          onMouseUp={() => setLogoPressed(false)}
          class="cursor-pointer flex items-center gap-3 py-1 ml-2"
          style={{ 
            "transform-style": "preserve-3d",
            ...logo3DStyle() 
          }}
        >
          <img src={logoIcon} class="h-8 w-auto filter" alt="Logo" />
          <img src={logoName} class="h-4 w-auto" style={{ filter: "var(--theme-logo-filter)" }} alt="Yournal" />
        </div>
      }
      actions={
        <IconButton
          variant="standard"
          onClick={() => appStore.openPengaturan()}
        >
          settings
        </IconButton>
      }
    />
  );
};

export default Header;
