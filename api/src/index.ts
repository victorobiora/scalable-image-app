import "dotenv/config";
import express, { Request, Response } from "express";
import { requireRole } from "./auth";
import cors from "cors";
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
} from "@azure/storage-blob";
import { CosmosClient } from "@azure/cosmos";
import { v4 as uuid } from "uuid";



const app = express();

// Putting in CORS
app.use(cors({
  origin: "*",
  allowedHeaders: ["Content-Type", "x-api-key"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));

app.options("*", cors());


app.use(express.json());

let mediaCache: any[] | null = null;
let mediaCacheAt = 0;
const CACHE_TTL_MS = 4_000; // 4 seconds
import { QueueClient } from "@azure/storage-queue";

const queueClient = new QueueClient(process.env.MEDIA_STORAGE!, "thumb-jobs");

async function initQueue() {
  await queueClient.createIfNotExists();
}

initQueue().catch(console.error);

// Setting Up My Storage Account
const storageAccount = process.env.AZURE_STORAGE_ACCOUNT!;
const storageKey = process.env.AZURE_STORAGE_KEY!;
const uploadContainer = process.env.AZURE_STORAGE_CONTAINER!; // should be: original-images

const blobCredential = new StorageSharedKeyCredential(
  storageAccount,
  storageKey
);
const blobServiceClient = new BlobServiceClient(
  `https://${storageAccount}.blob.core.windows.net`,
  blobCredential
);

// Setting up Cosmos
const cosmosEndpoint = process.env.COSMOS_ENDPOINT!;
const cosmosKey = process.env.COSMOS_KEY!;
const cosmosDb = process.env.COSMOS_DB || "media";
const cosmosImagesContainer = process.env.COSMOS_IMAGES_CONTAINER || "images";

const cosmos = new CosmosClient({ endpoint: cosmosEndpoint, key: cosmosKey });
const imagesContainer = cosmos
  .database(cosmosDb)
  .container(cosmosImagesContainer);

//  Routes

// Generate SAS URL
app.post(
  "/media/upload-intent",
  requireRole(["creator"]),
  async (_req: Request, res: Response) => {
    const blobName = `${uuid()}.jpg`;

    const containerClient =
      blobServiceClient.getContainerClient(uploadContainer);
    const blobClient = containerClient.getBlockBlobClient(blobName);

    const sasUrl = await blobClient.generateSasUrl({
      permissions: BlobSASPermissions.parse("cw"),
      expiresOn: new Date(Date.now() + 10 * 60 * 1000), 
    });

    res.json({ uploadUrl: sasUrl, blobName });
  }
);

// Confirm upload. store metadata in Cosmos
app.post(
  "/media/confirm",
  requireRole(["creator"]),
  async (req: Request, res: Response) => {

    const { blobName, title, caption, location, people } = req.body as {
      blobName: string;
      title?: string;
      caption?: string;
      location?: string;
      people?: string[];
    };

    if (!blobName) {
      res.status(400).json({ error: "blobName is required" });
      return;
    }

    const originalUrl = `https://${storageAccount}.blob.core.windows.net/original-images/${blobName}`;
    const thumbnailUrl = `https://${storageAccount}.blob.core.windows.net/thumbnail-images/${blobName}`;

    const doc = {
      id: blobName, 
      blobName,
      originalUrl,
      thumbnailUrl,
      thumbnailReady: false,
      title: title ?? "",
      caption: caption ?? "",
      location: location ?? "",
      people: people ?? [],
      likes: 0,
      ratingSum: 0,
      ratingCount: 0,
      averageRating: 0,
      comments: [],
      createdAt: new Date().toISOString(),
    };



    await imagesContainer.items.create(doc);
    mediaCache = null;

    await queueClient.sendMessage(
      Buffer.from(JSON.stringify({ blobName })).toString("base64")
    );

    res.status(201).json(doc);
  }
);

//like
app.post(
  "/media/:id/like",
  requireRole(["consumer", "creator"]),
  async (req: Request, res: Response) => {
    const id = req.params.id;

    await imagesContainer
      .item(id, id)
      .patch([{ op: "incr", path: "/likes", value: 1 }]);

    mediaCache = null;
    res.json({ ok: true });
  }
);

//rating
app.post(
  "/media/:id/rate",
  requireRole(["consumer", "creator"]),
  async (req: Request, res: Response) => {
  
    const id = req.params.id;
    const { rating } = req.body as { rating: number };

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ error: "Rating must be an integer between 1 and 5" });
    }

    await imagesContainer.item(id, id).patch([
      { op: "incr", path: "/ratingSum", value: rating },
      { op: "incr", path: "/ratingCount", value: 1 },
    ]);

    
    const { resource } = await imagesContainer.item(id, id).read();
    const avg = resource.ratingSum / resource.ratingCount;

await imagesContainer.item(id, id).patch([
  { op: "add", path: "/averageRating", value: avg }
]);




    mediaCache = null;
    res.json({ ok: true });
  }
);


//comment

app.post(
  "/media/:id/comment",
  requireRole(["consumer", "creator"]),
  async (req: Request, res: Response) => {
    const id = req.params.id;
    const { text } = req.body as { text: string };

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Comment text is required" });
    }

    const comment = {
      id: uuid(),
      text: text.trim(),
      createdAt: new Date().toISOString()
    };

    await imagesContainer.item(id, id).patch([
      { op: "add", path: "/comments/-", value: comment }
    ]);

    mediaCache = null;
    res.status(201).json(comment);
  }
);


// Feed 
app.get(
  "/media",
  requireRole(["consumer", "creator"]),
  async (_req: Request, res: Response) => {
    const q = { query: "SELECT * FROM c ORDER BY c.createdAt DESC" };

    const now = Date.now();

    if (mediaCache && now - mediaCacheAt < CACHE_TTL_MS) {
      console.log("MEDIA CACHE HIT");
      return res.json(mediaCache);
    }
    console.log("MEDIA CACHE MISS");

    const { resources } = await imagesContainer.items.query(q).fetchAll();

    mediaCache = resources;
    mediaCacheAt = now;

    res.json(resources);
  }
);

//get api key 
app.get("/get-key",
  async (req: Request, res: Response) => {
   
      const { role } = req.query as { role: string };

      console.log(process.env.CREATOR_API_KEY)

      if(role === "creator"){
        return res.json({status: "ok", api_key: process.env.CREATOR_API_KEY})
      }else {
         return res.json({status: "ok", api_key: process.env.CONSUMER_API_KEY})
      }
  })


app.get("/health", requireRole(["consumer", "creator"]), (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(3000, () => {
  console.log("API running on port 3000");
});
