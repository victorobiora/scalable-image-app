import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import { CosmosClient } from "@azure/cosmos";
import { QueueClient } from "@azure/storage-queue";
import sharp from "sharp";

//  Setting up my blob storage
const account = process.env.AZURE_STORAGE_ACCOUNT!;
const key = process.env.AZURE_STORAGE_KEY!;
const originalContainer = process.env.ORIGINAL_CONTAINER!; 
const thumbnailContainer = process.env.THUMBNAIL_CONTAINER!; 

const credential = new StorageSharedKeyCredential(account, key);
const blobServiceClient = new BlobServiceClient(
  `https://${account}.blob.core.windows.net`,
  credential
);

const originalClient = blobServiceClient.getContainerClient(originalContainer);
const thumbClient = blobServiceClient.getContainerClient(thumbnailContainer);

// Setting up Cosmos
const cosmos = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!
});

const images = cosmos
  .database(process.env.COSMOS_DB!)   
  .container(process.env.COSMOS_IMAGES_CONTAINER!); 

//// WEB-QUEUE-WORKER ARCHITECTURE SETUP

// Queue Setup
const queueClient = new QueueClient(
  process.env.MEDIA_STORAGE!,
  "thumb-jobs"
);

// Worker Setup
async function processQueue() {

  const messages = await queueClient.receiveMessages({
    numberOfMessages: 5,
    visibilityTimeout: 60
  });

  for (const msg of messages.receivedMessageItems) {
    try {
      const { blobName } = JSON.parse(
        Buffer.from(msg.messageText!, "base64").toString()
      );

      console.log(`Processing job for ${blobName}`);

      // Download original picture
      const originalBlob = originalClient.getBlockBlobClient(blobName);
      const download = await originalBlob.download();
      const buffer = await streamToBuffer(download.readableStreamBody!);

      // Create thumbnail for the picture
      const thumbnail = await sharp(buffer)
        .resize(300)
        .jpeg({ quality: 70 })
        .toBuffer();

      // Upload thumbnail to thumbnail container
      const thumbBlob = thumbClient.getBlockBlobClient(blobName);
      await thumbBlob.uploadData(thumbnail, {
        blobHTTPHeaders: { blobContentType: "image/jpeg" }
      });

      // Update Cosmos after thumbnail is now ready
      await images.item(blobName, blobName).patch([
        { op: "replace", path: "/thumbnailReady", value: true },
        { op: "add", path: "/thumbUpdatedAt", value: new Date().toISOString() }
      ]);

      // Delete queue message 
      await queueClient.deleteMessage(
        msg.messageId!,
        msg.popReceipt!
      );

      console.log(`Completed job for ${blobName}`);
    } catch (err) {
      console.error("Worker error:", err);
    }
  }
}

// Helper function
function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", d => chunks.push(d));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}


// Define and run the worker.


async function runWorker() {
  console.log("Worker started (queue-based)");

  while (true) {
    await processQueue();
    await new Promise(r => setTimeout(r, 1000)); 
  }
}

runWorker().catch(console.error);

