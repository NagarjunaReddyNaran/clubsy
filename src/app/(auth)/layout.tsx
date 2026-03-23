import { Suspense } from "react";
import { Footer } from "@/components/layout/footer";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Suspense>
        <div className="flex-1">{children}</div>
      </Suspense>
      <Footer />
    </div>
  );
}
