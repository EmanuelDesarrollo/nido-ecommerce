import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { SignInView } from "./sign-in-view";

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <SignInView />
    </Suspense>
  );
}
