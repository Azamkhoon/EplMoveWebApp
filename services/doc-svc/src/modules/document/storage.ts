import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { config } from "../../config";

/**
 * Storage abstraction: local filesystem in dev, Google Cloud Storage in prod.
 * Keeps doc-svc's logic identical regardless of backend (12-factor).
 */
export interface Storage {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
}

class LocalStorage implements Storage {
  private root = resolve(config.STORAGE_LOCAL_DIR);
  async put(key: string, data: Buffer): Promise<void> {
    const path = join(this.root, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  }
  async get(key: string): Promise<Buffer> {
    return readFile(join(this.root, key));
  }
}

class GcsStorage implements Storage {
  // Lazy import so dev (local driver) doesn't need GCS credentials.
  private bucketName = config.GCS_BUCKET!;
  private async bucket() {
    const { Storage: GCS } = await import("@google-cloud/storage");
    return new GCS().bucket(this.bucketName);
  }
  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    const b = await this.bucket();
    await b.file(key).save(data, { contentType, resumable: false });
  }
  async get(key: string): Promise<Buffer> {
    const b = await this.bucket();
    const [buf] = await b.file(key).download();
    return buf;
  }
}

export function createStorage(): Storage {
  return config.STORAGE_DRIVER === "gcs" ? new GcsStorage() : new LocalStorage();
}
