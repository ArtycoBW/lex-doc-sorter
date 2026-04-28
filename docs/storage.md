# Storage setup

The backend stores uploaded source files through `StorageService`.

Default local mode:

```env
STORAGE_TYPE=local
STORAGE_PATH=./uploads
```

Docker local mode keeps files in the `uploads_data` volume:

```bash
docker compose up --build
```

S3-compatible mode, for example Timeweb Object Storage:

```env
STORAGE_TYPE=s3
S3_ENDPOINT=https://s3.timeweb.cloud
S3_REGION=ru-1
S3_BUCKET=lex-doc-files
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
```

When `STORAGE_TYPE=s3`, uploaded files are written with keys like:

```text
originals/{userId}/{jobId}/{storedFileName}
output/{userId}/{jobId}/{storedFileName}
```

Use local mode for development unless S3 credentials are already configured.
