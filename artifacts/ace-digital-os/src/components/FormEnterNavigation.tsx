import { useEffect } from "react";
import { handleFormEnterKeyDown } from "@/lib/form-enter-navigation";

/** Enter on a field moves focus forward; Enter on the last field submits the form. */
export function FormEnterNavigation() {
  useEffect(() => {
    document.addEventListener("keydown", handleFormEnterKeyDown, true);
    return () => document.removeEventListener("keydown", handleFormEnterKeyDown, true);
  }, []);

  return null;
}
