# `lancer-client`

**Lancer Upload SDK**

---

## **Overview**

@lancer/upload is the official client-side SDK for handling file uploads with Lancer. It provides efficient session management, chunked file uploads, and upload lifecycle events, making large file uploads seamless and reliable.

---

## **Features**

- **Session Management**: Create upload sessions for large files.
- **Chunked Uploading**: Split and upload files in chunks to handle large files efficiently.
- **Event Hooks**: Customize upload behavior with part and completion callbacks.

---

## **Installation**

Install the SDK via npm:

```bash
npm install lancer-client
```

---

## **Getting Started**

### **1. Initialize the Lancer Uploader**

Create an instance of the `lancer` function with your server URL for managing file upload sessions and chunks.

```typescript
import { lancer } from "lancer-client";

const lancerClient = lancer("<your-server-url>");
```

| Parameter   | Type     | Required | Description              |
|-------------|----------|----------|--------------------------|
| serverUrl   | string   | Yes      | URL of your upload server |

---

### **2. Create an Upload Session**

Use the `createSession` method to start an upload session for a file.

```typescript
const session = await lancerClient.createSession(file, {
  baseChunkSize: 1024 * 1024, // 1MB chunks
  authToken: "<your-auth-token>",
  provider: "AWS", // Storage provider
});
```

| Parameter      | Type     | Required | Description                    |
|----------------|----------|----------|--------------------------------|
| file           | File     | Yes      | File object to be uploaded     |
| baseChunkSize  | number   | Yes      | Size of each file chunk (bytes) |
| authToken      | string   | Yes      | Authorization token            |
| provider       | string   | Yes      | Storage provider name          |

**Response:**

```json
{
  "sessionToken": "abc123",
  "file": {},
  "chunkSize": 1048576,
  "max_chunk": 10
}
```

---

### **3. Upload the File**

Use the `uploadFile` method to upload file chunks.

```typescript
await lancerClient.uploadFile(session, {
  onPartUpload: async (data) => {
    console.log("Chunk uploaded:", data);
    return true; // Continue upload
  },
  onCompeteUpload: async (data) => {
    console.log("Upload completed:", data);
    return true;
  },
});
```

| Parameter        | Type       | Required | Description                        |
|------------------|------------|----------|------------------------------------|
| session          | object     | Yes      | Upload session object              |
| onPartUpload     | function   | Yes      | Callback for each chunk upload     |
| onCompeteUpload  | function   | Yes      | Callback for upload completion     |

**Chunk Upload Response:**

```json
{
  "serverChecksum": "abc123",
  "chunk": 1,
  "remainingChunk": 9,
  "isUploadCompleted": false
}
```

**Final Upload Response:**

```json
{
  "remainingChunk": 0,
  "isUploadCompleted": true,
  "uploadId": 456,
  "file": {}
}
```

---

## **Error Handling**

The SDK throws a `LancerUploadStopError` if an upload is stopped by a callback returning `false`.

```typescript
try {
  await lancerClient.uploadFile(session, uploadOptions);
} catch (error) {
  if (error instanceof LancerUploadStopError) {
    console.error("Upload stopped:", error.message);
  }
}
```

---

## **Security Best Practices**

1. **Protect Your Auth Token**: Store your `authToken` securely in environment variables.
2. **Verify Checksums**: Ensure server verifies chunk checksums.
3. **Limit Upload Size**: Set appropriate file size limits on the server.

---

## **License**

MIT License © 2025 Weekend Dev Labs

