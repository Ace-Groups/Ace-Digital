import { cn } from "@/lib/utils";

type EmployeeProfilePhotoProps = {
  src: string;
  alt: string;
  className?: string;
  rounded?: "lg" | "xl" | "2xl" | "full";
};

export function EmployeeProfilePhoto({
  src,
  alt,
  className,
  rounded = "xl",
}: EmployeeProfilePhotoProps) {
  const radius =
    rounded === "full"
      ? "rounded-full"
      : rounded === "2xl"
        ? "rounded-2xl"
        : rounded === "xl"
          ? "rounded-xl"
          : "rounded-lg";

  return (
    <img
      src={src}
      alt={alt}
      className={cn("h-full w-full object-cover object-center", radius, className)}
    />
  );
}
