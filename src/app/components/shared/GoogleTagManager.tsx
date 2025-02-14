import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export const GoogleTagManager = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname && !searchParams) {
      return;
    }
    // Push the new route to dataLayer
    if (window?.dataLayer) {
      window?.dataLayer.push({
        event: "pageview",
        page: pathname + searchParams.toString(),
      });
    }
  }, [pathname, searchParams]);

  return null;
};
