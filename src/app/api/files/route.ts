import {
  deleteFile,
  getDownloadUrl,
  getUploadUrl,
  listFiles,
} from "../../../storage/fileStorage";

import { FileDataDTO } from "../../../types";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { getUserSubscriptionPlan } from "@/lib/stripe";

export async function GET(req: Request) {
  const files = await listFiles({ folder: "default" });

  return new Response(JSON.stringify({ data: { files } }), {
    status: 200,
  });
}

export async function PUT(request: Request) {
  // const { getUser } = getKindeServerSession();
  // const user = getUser();

  // if (!user || !user.id) {
  //   return new Response(
  //     JSON.stringify({
  //       message: "An error occured",
  //       error: "Unauthorized",
  //     }),
  //     {
  //       status: 401,
  //     }
  //   );
  // }

  // const subscriptionPlan = await getUserSubscriptionPlan();

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
  const { signedUrl, key } = await getUploadUrl({
    acl: "private",
    filename,
    folder: "default",
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
  const { searchParams } = new URL(req.url);

  const filename = searchParams.get("filename") || undefined;
  const filenames = searchParams.get("filenames")?.split(",") || undefined;

  const { error } = await deleteFile({
    folder: "default",
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
