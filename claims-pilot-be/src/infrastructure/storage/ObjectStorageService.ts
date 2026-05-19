import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, CreateBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../../config";
import { logger } from "../../config/logger";
import { v4 as uuid } from "uuid";

const s3Client = new S3Client({
  region: config.objectStorage.region,
  endpoint: config.objectStorage.endpoint,
  credentials: {
    accessKeyId: config.objectStorage.accessKey,
    secretAccessKey: config.objectStorage.secretKey,
  },
  forcePathStyle: true,
});

export class ObjectStorageService {
  private bucket = config.objectStorage.bucket;

  async ensureBucket(): Promise<void> {
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      logger.info(`Object storage bucket "${this.bucket}" verified`);
    } catch (err: any) {
      if (err.name === "NotFound" || err["$metadata"]?.httpStatusCode === 404) {
        logger.info(`Bucket "${this.bucket}" not found, creating...`);
        await s3Client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        logger.info(`Bucket "${this.bucket}" created`);
      } else {
        logger.error(`Failed to verify bucket "${this.bucket}": ${err.message}`);
        throw err;
      }
    }
  }

  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    claimId: string
  ): Promise<{ key: string; url: string }> {
    const ext = originalName.split(".").pop() || "bin";
    const key = `claims/${claimId}/${uuid()}.${ext}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );

    const url = `${config.objectStorage.endpoint}/${this.bucket}/${key}`;
    logger.info(`Uploaded file: ${key}`);
    return { key, url };
  }

  async deleteFile(key: string): Promise<void> {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
    logger.info(`Deleted file: ${key}`);
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(s3Client, command, { expiresIn });
  }

  async getFileBuffer(key: string): Promise<{ buffer: Buffer; contentType: string }> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const response = await s3Client.send(command);
    const stream = response.Body as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return {
      buffer: Buffer.concat(chunks),
      contentType: response.ContentType || "application/octet-stream",
    };
  }
}
