import { CosmosClient } from "@azure/cosmos";

const endpoint = process.env.COSMOS_ENDPOINT!;
const key = process.env.COSMOS_KEY!;
const dbId = process.env.COSMOS_DB!;
const imagesContainerId = process.env.COSMOS_IMAGES_CONTAINER!;

const client = new CosmosClient({ endpoint, key });

export const imagesContainer = client.database(dbId).container(imagesContainerId);
