import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({
  endpoint:        process.env.MINIO_ENDPOINT ?? 'http://minio:9000',
  region:          'us-east-1',
  credentials: {
    accessKeyId:     process.env.MINIO_ACCESS_KEY ?? 'samba_app',
    secretAccessKey: process.env.MINIO_SECRET_KEY ?? '',
  },
  forcePathStyle: true,
})

const BUCKET = process.env.MINIO_BUCKET ?? 'samba-photos'

export async function getPhotoStream(key: string) {
  return s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
}
