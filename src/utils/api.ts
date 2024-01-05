import { APIFileResponse, APIListFileResponse, FileDataDTO } from "../types";

import { makeTaggingHeader } from "../storage/fileStorage";
import { randomUUID } from "crypto";
import useSWR from "swr";

const fetcher = (info: RequestInfo, init?: RequestInit) =>
  fetch(info, init).then((res) => res.json());

interface SWRResponse<T> {
  error: any;
  data: T;
  loading: boolean;
  mutate: (data: T) => void;
}

export const useFiles = (): SWRResponse<FileDataDTO[]> => {
  const { data, error, mutate } = useSWR<APIListFileResponse>(
    `/api/files`,
    fetcher
  );
  return {
    data: data?.data?.files || [],
    error,
    loading: !data && !error,
    mutate: (files) => mutate({ data: { files }, message: "OK" }, false),
  };
};

export const deleteFile = async ({
  file,
  files,
}: {
  file?: FileDataDTO;
  files?: FileDataDTO[];
}) => {
  let response;
  let error;
  if (file) {
    response = await fetch(`/api/files?filename=${file.filename}`, {
      method: "DELETE",
    });
    error = (await response.json()).error;
  }
  if (files) {
    const filenames = files.map((file) => file.filename).join(",");
    response = await fetch(`/api/files?filenames=${filenames}`, {
      method: "DELETE",
    });
    error = (await response.json()).error;
  }

  if (error) {
    throw new Error(error || "Unexpected response");
  }
};

export const uploadFile = async (
  file: File,
  operations: string[] = []
): Promise<FileDataDTO> => {
  const fileName = file.name;
  const response = await fetch(`/api/files?filename=${fileName}`, {
    method: "PUT",
    body: (operations && JSON.stringify({ operations })) || undefined,
  });
  const { data, error }: APIFileResponse = await response.json();
  if (error || !data) {
    throw new Error(error || "Unexpected response");
  }
  // const taggingHeader = makeTaggingHeader(operations);
  await performS3Upload({
    file,
    url: data.signedUrl,
    // taggingHeader
  });

  await fetch(`/api/embedding?filename=${fileName}`, {
    method: "PUT",
  });
  return { ...data.file, url: data.file.url.split("?")[0] };
};

const performS3Upload = ({
  file,
  url,
  taggingHeader,
}: {
  file: File;
  url: string;
  taggingHeader?: string;
}) =>
  new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", file.type);
    // tagging
    taggingHeader && xhr.setRequestHeader("x-amz-tagging", taggingHeader);
    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve();
      }
    };
    xhr.onerror = () => {
      reject();
    };
    xhr.send(file);
  });
