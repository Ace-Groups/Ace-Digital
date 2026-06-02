import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { clearChunkReloadGuard, registerChunkRecovery } from "@/lib/chunk-recovery";

registerChunkRecovery();
clearChunkReloadGuard();

createRoot(document.getElementById("root")!).render(<App />);
