import {
  deleteFile,
  getDownloadUrl,
  getUploadUrl,
  listFiles,
} from "../../../storage/fileStorage";

import { FileDataDTO } from "../../../types";
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
        message: "An error occured",
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
        message: "An error occured",
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
        message: "An error occured",
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

    const { isSubscribed } = subscriptionPlan;

    const isProExceeded =
      pagesAmt > PLANS.find((plan) => plan.name === "Pro")!.pagesPerPdf;
    const isFreeExceeded =
      pagesAmt > PLANS.find((plan) => plan.name === "Free")!.pagesPerPdf;

    if ((isSubscribed && isProExceeded) || (!isSubscribed && isFreeExceeded)) {
      await db.file.update({
        data: {
          uploadStatus: "FAILED",
          pagesAmt,
        },
        where: {
          id: fileMetadata.id,
        },
      });
    }

    // vectorize and index entire document
    const pinecone = await getPineconeClient();
    const pineconeIndex = pinecone.Index("docuchatgpt");

    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    await PineconeStore.fromDocuments(pageLevelDocs, embeddings, {
      pineconeIndex,
      namespace: fileMetadata.id,
    });

    await db.file.update({
      data: {
        uploadStatus: "SUCCESS",
        pagesAmt,
      },
      where: {
        id: fileMetadata.id,
      },
    });
  } catch (err) {
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
