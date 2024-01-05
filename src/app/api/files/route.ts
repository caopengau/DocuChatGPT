import {
  deleteFile,
  getDownloadUrl,
  getUploadUrl,
  listFiles,
} from "../../../storage/fileStorage";

import { FileDataDTO } from "../../../types";
import { db } from "@/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { getUserSubscriptionPlan } from "@/lib/stripe";

export async function GET(req: Request) {
  const files = await listFiles({ folder: "default" });

  return new Response(JSON.stringify({ data: { files } }), {
    status: 200,
  });
}

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

  const body = await request.json();
  const { operations } = body;

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

  const dbParams = {
    key: user.id + "/" + filename,
    name: filename,
    url: `https://docuchatgpt-bucket.s3.ap-southeast-2.amazonaws.com/${user.id}/${filename}`,
  };

  const isFileExist = await db.file.findFirst({
    where: {
      key: dbParams.key,
    },
  });

  if (isFileExist) return;

  await db.file.create({
    data: {
      key: dbParams.key,
      name: dbParams.name,
      userId: user.id,
      url: dbParams.url,
      uploadStatus: "PROCESSING",
    },
  });

  const { signedUrl, key } = await getUploadUrl({
    acl: "private",
    filename,
    folder: user.id,
    operations: operations || undefined,
  });
  const url = await getDownloadUrl({ key });
  const file: FileDataDTO = {
    url,
    filename,
    modified: new Date().toISOString(),
    id: key,
  };

  return new Response(
    JSON.stringify({
      message: "OK",
      data: { signedUrl, file },
    }),
    {
      status: 201,
    }
  );
}

export async function DELETE(req: Request) {
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

  const { searchParams } = new URL(req.url);

  const filename = searchParams.get("filename") || undefined;
  const filenames = searchParams.get("filenames")?.split(",") || undefined;

  const { error } = await deleteFile({
    folder: `${user.id}`,
    filename,
    filenames,
  });
  if (error) {
    return new Response(
      JSON.stringify({
        message: "An error occured",
      }),
      {
        status: 500,
      }
    );
  }
  return new Response(
    JSON.stringify({
      message: "OK",
    }),
    {
      status: 200,
    }
  );
}
