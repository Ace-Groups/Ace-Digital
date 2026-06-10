import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./loading-animation.css";

export function LoadingScreen() {
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    const styleSheet = document.createElement("style");
    document.head.appendChild(styleSheet);
    styleRef.current = styleSheet;

    const variance = 300;
    for (let row = 1; row <= 3; row++) {
      for (let col = 1; col <= 3; col++) {
        for (let layer = 1; layer <= 3; layer++) {
          const key = `${row}${col}${layer}`;
          const randomDelay = Math.floor(Math.random() * variance);
          try {
            styleSheet.sheet?.insertRule(
              `.ace-loader .cube[data-cube="${key}"] > .cube-wrap,
               .ace-loader .cube[data-cube="${key}"] > .cube-wrap > [class^="cube-"],
               .ace-loader .cube[data-cube="${key}"] > .cube-wrap > [class^="cube-"]:before,
               .ace-loader .cube[data-cube="${key}"] > .cube-wrap > [class^="cube-"]:after,
               .ace-loader .cube[data-cube="${key}"] > .cube-wrap [class^="shadow-"],
               .ace-loader [class^="shadow-"][data-cube="${key}"]:before,
               .ace-loader .large-shadow[data-cube="${key}"] {
                 animation-delay: ${randomDelay}ms !important;
               }`,
              styleSheet.sheet?.cssRules.length ?? 0
            );
          } catch {}
        }
      }
    }

    return () => {
      if (styleRef.current) {
        document.head.removeChild(styleRef.current);
      }
    };
  }, []);

  return createPortal(
    <div className="ace-loader-screen" role="status" aria-live="polite" aria-label="Loading">
      <div className="ace-loader-content">
        <div className="ace-loader-stage">
          <div className="ace-loader" style={{ perspective: "1000px" }}>
            <div className="cubes">
              {["111","121","131","211","221","231","311","321","331",
                 "112","122","132","212","222","232","312","322","332",
                 "113","123","133","213","223","233","313","323","333"].map((key) => (
                <Cube key={key} id={key} />
              ))}
              <LargeShadows />
            </div>
          </div>
        </div>
        <p className="ace-loader-text">Ace OS v2</p>
      </div>
    </div>,
    document.body,
  );
}

function Cube({ id }: { id: string }) {
  const r = id[0], c = id[1], l = id[2];

  const shadows = {
    "111": ["shadow-z:112"],
    "131": ["shadow-z:132"],
    "211": ["shadow-flip:111", "shadow-y:111", "shadow-z:212"],
    "221": ["shadow-flip:121", "shadow-y:121"],
    "231": ["shadow-flip:131", "shadow-y:131"],
    "311": ["shadow-flip:211", "shadow-y:211", "shadow-z:312"],
    "321": ["shadow-flip:221", "shadow-y:221", "shadow-z:322"],
    "331": ["shadow-flip:231", "shadow-y:231", "shadow-z:332"],
    "212": ["shadow-flip:112", "shadow-y:112"],
    "222": ["shadow-flip:122", "shadow-y:122"],
    "232": ["shadow-flip:132", "shadow-y:132"],
    "312": ["shadow-flip:212", "shadow-y:212"],
    "322": ["shadow-flip:222", "shadow-y:222"],
    "332": ["shadow-flip:232", "shadow-y:232"],
    "113": ["shadow-z:111"],
    "123": ["shadow-z:121"],
    "213": ["shadow-flip:113", "shadow-y:113", "shadow-z:211"],
    "223": ["shadow-y:123", "shadow-z:221"],
    "233": ["shadow-y:133", "shadow-z:231"],
    "313": ["shadow-flip:213", "shadow-y:213", "shadow-z:311"],
    "323": ["shadow-flip:223", "shadow-y:223", "shadow-z:321"],
    "333": ["shadow-flip:233", "shadow-y:233", "shadow-z:331"],
  } as Record<string, string[]>;

  const topShadows = shadows[id] ?? [];

  return (
    <div className="cube" data-cube={id}>
      <div className="cube-wrap">
        <div className="cube-top">
          {topShadows.map((s) => {
            const [cls, dc] = s.split(":");
            return <div key={s} className={cls} data-cube={dc} />;
          })}
        </div>
        <div className="cube-bottom" />
        <div className="cube-front-left" />
        <div className="cube-front-right" />
        <div className="cube-back-left" />
        <div className="cube-back-right" />
      </div>
    </div>
  );
}

function LargeShadows() {
  const ids = ["113","123","133","213","223","233","313","323","333"];
  return (
    <div className="large-shadows">
      {ids.map((id) => (
        <div key={id} className="large-shadow" data-cube={id} />
      ))}
    </div>
  );
}
