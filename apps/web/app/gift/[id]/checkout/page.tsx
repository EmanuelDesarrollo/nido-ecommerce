import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { CheckoutView } from "./checkout-view";

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <CheckoutView />
    </Suspense>
  );
}
