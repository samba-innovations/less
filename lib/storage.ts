import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({
  endpoint:        process.env.MINIO_ENDPOINT ?? 'http://minio:9000',
  region:          'us-east-1',
  // Sem padrão embutido: um fallback aqui vira a credencial de verdade no dia
  // em que a variável faltar em produção — e o valor que estava no lugar era o
  // do compose local, versionado. Como função, a falta estoura na primeira
  // chamada de storage, não no build da imagem (que não recebe essas variáveis).
  credentials: async () => {
    const accessKeyId     = process.env.MINIO_ACCESS_KEY
    const secretAccessKey = process.env.MINIO_SECRET_KEY
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('MINIO_ACCESS_KEY/MINIO_SECRET_KEY não setadas — o armazenamento de arquivos ficou sem credencial')
    }
    return { accessKeyId, secretAccessKey }
  },
  forcePathStyle: true,
})

const BUCKET = process.env.MINIO_BUCKET ?? 'samba-photos'

export async function getPhotoStream(key: string) {
  return s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
}
