import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { PLANS } from "@/config/stripe";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { db } from "@/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { getPineconeClient } from "@/lib/pinecone";
import { getUserSubscriptionPlan } from "@/lib/stripe";

export async function PUT(request: Request) {
  const { getUser } = getKindeServerSession();
  const user = getUser();

  if (!user || !user.id) {
    return new Response(
      JSON.stringify({
        message: "An error occurred",
        error: "Unauthorized",
      }),
      {
        status: 401,
      }
    );
  }

  const subscriptionPlan = await getUserSubscriptionPlan();

  const { searchParams } = new URL(request.url);

  const filename = searchParams.get("filename");

  if (!filename) {
    return new Response(
      JSON.stringify({
        message: "An error occurred",
        error: 'Missing query parameter "filename',
      }),
      {
        status: 500,
      }
    );
  }

  const fileMetadata = await db.file.findFirst({
    where: {
      key: user.id + "/" + filename,
    },
  });
  if (!fileMetadata) {
    return new Response(
      JSON.stringify({
        message: "An error occurred",
        error: "Missing file metadata",
      }),
      {
        status: 500,
      }
    );
  }

  try {
    const response = await fetch(fileMetadata?.url!);

    const blob = await response.blob();

    const loader = new PDFLoader(blob);

    const pageLevelDocs = await loader.load();

    const pagesAmt = pageLevelDocs.length;

    const proPlan = PLANS.find((plan) => plan.name === "Pro")!;
    const freePlan = PLANS.find((plan) => plan.name === "Free")!;
    const isProExceeded =
      pagesAmt > proPlan.pagesPerPdf ||
      blob.size > proPlan.sizePerFile * 1024 * 1024;
    const isFreeExceeded =
      pagesAmt > freePlan.pagesPerPdf ||
      blob.size > freePlan.sizePerFile * 1024 * 1024;

    if (isProExceeded) {
      await db.file.update({
        data: {
          uploadStatus: "EXCEED_PRO",
          pagesAmt,
        },
        where: {
          id: fileMetadata.id,
        },
      });
      return new Response(
        JSON.stringify({
          message: "Limit exceeded!",
          error: "File too large",
        }),
        {
          status: 500,
        }
      );
    }

    const pinecone = await getPineconeClient();
    const pineconeIndex = pinecone.Index("docuchatgpt");

    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    await PineconeStore.fromDocuments(pageLevelDocs, embeddings, {
      pineconeIndex,
      namespace: fileMetadata.id,
    });

    if (!subscriptionPlan.isSubscribed && isFreeExceeded) {
      await db.file.update({
        data: {
          uploadStatus: "EXCEED_FREE",
          pagesAmt,
        },
        where: {
          id: fileMetadata.id,
        },
      });
    } else {
      await db.file.update({
        data: {
          uploadStatus: "SUCCESS",
          pagesAmt,
        },
        where: {
          id: fileMetadata.id,
        },
      });
    }
  } catch (err) {
    console.error(err);
    await db.file.update({
      data: {
        uploadStatus: "FAILED",
      },
      where: {
        id: fileMetadata.id,
      },
    });
  }

  return new Response(
    JSON.stringify({
      message: "OK",
    }),
    {
      status: 201,
    }
  );
}
