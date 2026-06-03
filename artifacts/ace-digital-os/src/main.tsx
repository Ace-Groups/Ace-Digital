import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { configureApiClient } from "@/lib/api-config";
import { clearChunkReloadGuard, registerChunkRecovery } from "@/lib/chunk-recovery";

configureApiClient();
registerChunkRecovery();
clearChunkReloadGuard();

createRoot(document.getElementById("root")!).render(<App />);
