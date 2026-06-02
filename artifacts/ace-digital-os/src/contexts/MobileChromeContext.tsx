import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type MobileChromeContextValue = {
  hideBottomNav: boolean;
  setHideBottomNav: (hide: boolean) => void;
  immersivePage: boolean;
  setImmersivePage: (immersive: boolean) => void;
};

const MobileChromeContext = createContext<MobileChromeContextValue | null>(null);

const noop = () => {};

export function MobileChromeProvider({ children }: { children: ReactNode }) {
  const [hideBottomNav, setHideBottomNav] = useState(false);
  const [immersivePage, setImmersivePage] = useState(false);

  const value = useMemo(
    () => ({
      hideBottomNav,
      setHideBottomNav,
      immersivePage,
      setImmersivePage,
    }),
    [hideBottomNav, immersivePage],
  );

  return (
    <MobileChromeContext.Provider value={value}>{children}</MobileChromeContext.Provider>
  );
}

export function useMobileChrome() {
  const ctx = useContext(MobileChromeContext);
  return (
    ctx ?? {
      hideBottomNav: false,
      setHideBottomNav: noop,
      immersivePage: false,
      setImmersivePage: noop,
    }
  );
}

/** Sets mobile chrome flags while mounted; restores on unmount. */
export function useMobileChromeFlags(flags: {
  hideBottomNav?: boolean;
  immersivePage?: boolean;
}) {
  const { setHideBottomNav, setImmersivePage } = useMobileChrome();

  const hide = flags.hideBottomNav ?? false;
  const immersive = flags.immersivePage ?? false;

  useEffect(() => {
    setHideBottomNav(hide);
    setImmersivePage(immersive);
    return () => {
      setHideBottomNav(false);
      setImmersivePage(false);
    };
  }, [hide, immersive, setHideBottomNav, setImmersivePage]);
}
