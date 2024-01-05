import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { FileDataDTO } from "../types";
import config from "../config";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mapGetFilesResponse } from "./fileStorage.mapper";

const s3 = new S3Client({
  region: config.s3.region,
  credentials: config.s3.credentials,
});

export const deleteFile = async ({
  folder,
  filename,
  filenames,
}: {
  folder: string;
  filename?: string;
  filenames?: string[];
}): Promise<{ success: boolean; error?: string }> => {
  let response;

  if (filename) {
    const key = `${folder}/${filename}`;
    response = await s3.send(
      new DeleteObjectCommand({
        Bucket: config.s3.bucketName,
        Key: key,
      })
    );

    const status = response.$metadata.httpStatusCode;
    if (status && status >= 300) {
      return {
        success: false,
        error: `Unexpected status code when delete ${config.s3.bucketName}/${key}: ${status}`,
      };
    }
  } else {
    const keys = filenames?.map((filename) => `${folder}/${filename}`);
    const objectKeys = keys?.map((key) => ({ Key: key }));
    response = await s3.send(
      new DeleteObjectsCommand({
        Bucket: config.s3.bucketName,
        Delete: {
          Objects: objectKeys,
          Quiet: true,
        },
      })
    );
    const status = response.$metadata.httpStatusCode;
    if (status && status >= 300) {
      return {
        success: false,
        error: `Unexpected status code when delete ${config.s3.bucketName}/${filenames}: ${status}`,
      };
    }
  }
  return { success: true };
};

export const listFiles = async ({
  folder,
}: {
  folder: string;
}): Promise<FileDataDTO[]> => {
  const response = await s3.send(
    new ListObjectsCommand({
      Bucket: config.s3.bucketName,
      Prefix: `${folder}/`,
    })
  );
  const status = response.$metadata.httpStatusCode;
  if (status && status >= 300) {
    throw new Error(
      `Unexpected status code when listing ${config.s3.bucketName}/${folder}: ${status}`
    );
  }
  const filesWithoutSignedUrl = mapGetFilesResponse(response);

  return Promise.all(
    filesWithoutSignedUrl.map(async (file) => {
      const url = await getDownloadUrl({
        key: file.id,
      });
      return {
        ...file,
        url,
      };
    })
  );
};

type GetUploadUrlProps = {
  folder: string;
  filename: string;
  acl?: "public-read" | "private";
  options?: { expiresIn?: number };
  operations?: string[];
};

// operations = [ 'white-dots', 'round-edge' ]
// tagging = 'white-dots=1&round-edge=1'
export const makeTaggingHeader = (operations: string[]) => {
  const tagging = operations.map((operation) => `${operation}=1`).join("&");
  return tagging;
};

export const getUploadUrl = async ({
  folder,
  filename,
  acl = "public-read",
  options: { expiresIn = 15 * 60 } = {},
  operations = [],
}: GetUploadUrlProps): Promise<{ signedUrl: string; key: string }> => {
  const key = `${folder}/${filename}`;
  const command = new PutObjectCommand({
    Bucket: config.s3.bucketName,
    Key: key,
    ACL: acl,
    Tagging: (operations && makeTaggingHeader(operations)) || undefined,
  });
  const signedUrl = await getSignedUrl(s3, command, {
    expiresIn,
    // this will work provided the following request will supply the same headers
    unhoistableHeaders: (operations && new Set(["x-amz-tagging"])) || undefined,
  });
  return { signedUrl, key };
};

type GetSignedUrlProps = {
  key: string;
  options?: { expiresIn?: number };
};
export const getDownloadUrl = async ({
  key,
  options: { expiresIn = 15 * 60 } = {},
}: GetSignedUrlProps): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: config.s3.bucketName,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn });
};
