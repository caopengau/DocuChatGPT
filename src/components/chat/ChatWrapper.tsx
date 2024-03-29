"use client";

import { ChevronLeft, Loader2, XCircle } from "lucide-react";

import { ChatContextProvider } from "./ChatContext";
import ChatInput from "./ChatInput";
import Link from "next/link";
import Messages from "./Messages";
import { PLANS } from "@/config/stripe";
import UpgradeButton from "../UpgradeButton";
import { buttonVariants } from "../ui/button";
import { getUserSubscriptionPlan } from "@/lib/stripe";
import { trpc } from "@/app/_trpc/client";

interface ChatWrapperProps {
  file: any;
  plan: Awaited<ReturnType<typeof getUserSubscriptionPlan>>;
}

const ChatWrapper = ({ file, plan }: ChatWrapperProps) => {
  const { pagesAmt } = file;

  const { data, isLoading } = trpc.getFileUploadStatus.useQuery(
    {
      fileId: file.id,
    },
    {
      refetchInterval: (data) =>
        data?.status === "SUCCESS" ||
        data?.status === "FAILED" ||
        data?.status === "EXCEED_PRO" ||
        data?.status === "EXCEED_FREE"
          ? false
          : 1000,
    }
  );

  if (isLoading)
    return (
      <div className="relative min-h-full bg-zinc-50 flex divide-y divide-zinc-200 flex-col justify-between gap-2">
        <div className="flex-1 flex justify-center items-center flex-col mb-28">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            <h3 className="font-semibold text-xl">Loading...</h3>
            <p className="text-zinc-500 text-sm">
              We&apos;re preparing your PDF.
            </p>
          </div>
        </div>

        <ChatInput isDisabled />
      </div>
    );

  if (data?.status === "PROCESSING")
    return (
      <div className="relative min-h-full bg-zinc-50 flex divide-y divide-zinc-200 flex-col justify-between gap-2">
        <div className="flex-1 flex justify-center items-center flex-col mb-28">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            <h3 className="font-semibold text-xl">Processing PDF...</h3>
            <p className="text-zinc-500 text-sm">This won&apos;t take long.</p>
          </div>
        </div>

        <ChatInput isDisabled />
      </div>
    );
  if (data?.status !== "SUCCESS" && (plan.isSubscribed && pagesAmt > plan.pagesPerPdf!))
    return (
      <div className="relative min-h-full bg-zinc-50 flex divide-y divide-zinc-200 flex-col justify-between gap-2">
        <div className="flex-1 flex justify-center items-center flex-col mb-28">
          <div className="flex flex-col items-center gap-2">
            <XCircle className="h-8 w-8 text-red-500" />
            <h3 className="font-semibold text-xl">Too many pages in PDF</h3>
            <p className="text-zinc-500 text-sm">
              Your{" "}
              <span className="font-medium">
                {plan.isSubscribed ? "Pro" : "Free"}
              </span>{" "}
              plan supports up to{" "}
              {plan.isSubscribed
                ? PLANS.find((p) => p.name === "Pro")?.pagesPerPdf
                : PLANS.find((p) => p.name === "Free")?.pagesPerPdf}{" "}
              pages per PDF up to size of{" "}
              {plan.isSubscribed
                ? PLANS.find((p) => p.name === "Pro")?.sizePerFile
                : PLANS.find((p) => p.name === "Free")?.sizePerFile}{" "}
              MB
            </p>
            {data?.status === "EXCEED_FREE" && (
              <UpgradeButton
                className={buttonVariants({
                  variant: "default",
                  className: "mt-4 w-2/3",
                })}
              />
            )}
            {data?.status === "EXCEED_PRO" && (
              <p className="text-zinc-500 text-sm">
                Please contact us at for a custom plan.
              </p>
            )}

            <Link
              href="/dashboard"
              className={buttonVariants({
                variant: "secondary",
                className: "mt-4 w-2/3",
              })}
            >
              <ChevronLeft className="h-3 w-3 mr-1.5" />
              Back to Dashboard
            </Link>
          </div>
        </div>

        <ChatInput isDisabled />
      </div>
    );

  return (
    <ChatContextProvider fileId={file.id}>
      <div className="relative min-h-full bg-zinc-50 flex divide-y divide-zinc-200 flex-col justify-between gap-2">
        <div className="flex-1 justify-between flex flex-col mb-28">
          <Messages fileId={file.id} />
        </div>

        <ChatInput />
      </div>
    </ChatContextProvider>
  );
};

export default ChatWrapper;
