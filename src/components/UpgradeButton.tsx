"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/app/_trpc/client";

const UpgradeButton = ({ className }: { className?: string }) => {
  const { mutate: createStripeSession } = trpc.createStripeSession.useMutation({
    onSuccess: ({ url }) => {
      window.location.href = url ?? "/dashboard/billing";
    },
  });

  return (
    <Button
      onClick={() => createStripeSession()}
      className={cn("w-full", className)}
    >
      Upgrade now <ArrowRight className="h-5 w-5 ml-1.5" />
    </Button>
  );
};

export default UpgradeButton;
