import { PineconeClient } from "@pinecone-database/pinecone";

export const getPineconeClient = async () => {
  const client = new PineconeClient();

  await client.init({
    apiKey: process.env.PINECONE_API_KEY!,
    environment: process.env.PINECONE_ENVIRONMENT!,
  });

  return client;
};

export const deletePineconeEmbeddingByNamespace = async (namespace: string) => {
  const pinecone = await getPineconeClient();
  const pineconeIndex = pinecone.Index("docuchatgpt");
  await pineconeIndex.delete1({
    namespace: namespace,
    deleteAll: true,
  });
};
