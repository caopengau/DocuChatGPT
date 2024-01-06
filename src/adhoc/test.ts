const { PineconeClient } = require("@pinecone-database/pinecone");
require("dotenv").config();

const cleanNsVectors = async (namespace: string) => {
  const client = new PineconeClient();

  await client.init({
    apiKey: process.env.PINECONE_API_KEY!,
    environment: process.env.PINECONE_ENVIRONMENT!,
  });
  const pineconeIndex = client.Index("docuchatgpt");
  await pineconeIndex.delete1({
    namespace: namespace,
    deleteAll: true,
  });
};
