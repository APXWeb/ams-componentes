import { Suspense } from "react";
import { DemoRhApp } from "@/components/rh/demo-app";
import { PageSkeleton } from "@/components/ui/bits";

export default function RhAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoRhApp>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </DemoRhApp>
  );
}
