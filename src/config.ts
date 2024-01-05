// All those env variables should be set

const config = {
  s3: {
    region: process.env.S3_UPLOAD_REGION as string,
    bucketName: process.env.S3_UPLOAD_BUCKET as string,
    endpointUrl: `https://s3.${process.env.S3_UPLOAD_REGION}.amazonaws.com/${process.env.S3_UPLOAD_BUCKET}`,
    credentials: {
      // Note: if you're on Vercel, you cannot add `AWS_ACCESS_KEY_ID`,
      // see https://vercel.com/docs/platform/limits#reserved-variables
      accessKeyId: process.env.S3_UPLOAD_KEY as string,
      secretAccessKey: process.env.S3_UPLOAD_SECRET as string
    }
  }
};

export default config;
