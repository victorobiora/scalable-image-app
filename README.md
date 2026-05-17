# Scalable Cloud-Native Media Processing Platform

A scalable media-sharing platform built on Microsoft Azure using containerized microservices, asynchronous processing, and managed cloud infrastructure.

The application allows users to upload images, generate thumbnails asynchronously, and interact with media through likes, ratings, and comments.

---

## Cloud-Native Architecture

The platform was designed around modern cloud-native principles:

- Stateless containerized services
- Asynchronous queue-driven processing
- Decoupled microservice architecture
- Independent service scaling
- Managed Azure infrastructure
- Direct-to-cloud uploads using SAS URLs
- Container-first deployment workflow

---

## System Architecture

```text
                +-----------------------------+
                |   Azure Static Website      |
                |        Frontend UI          |
                +-------------+---------------+
                              |
                              v
                +-----------------------------+
                | Azure Container App (API)   |
                |    Node.js / Express API    |
                +------+------+---------------+
                       |      |
                       |      |
                       v      v
          +----------------+  +----------------------+
          | Azure Cosmos DB|  | Azure Queue Storage  |
          +----------------+  +----------+-----------+
                                         |
                                         v
                          +-----------------------------+
                          | Azure Container App Worker  |
                          |  Background Media Processor |
                          +--------------+--------------+
                                         |
                                         v
                              +----------------------+
                              | Azure Blob Storage   |
                              | Media & Thumbnails   |
                              +----------------------+
```

---

## Technology Stack

### Frontend

- HTML
- CSS
- Vanilla JavaScript

### Backend

- Node.js
- Express
- TypeScript

### Cloud Infrastructure

- Azure Container Apps
- Azure Blob Storage
- Azure Queue Storage
- Azure Cosmos DB
- Azure Container Registry
- Azure Static Website Hosting

### DevOps & Containerisation

- Docker
- Docker Compose
- Docker Buildx

---

## Scalability & Design Principles

The application was architected to support scalable cloud workloads through:

- Stateless API containers for horizontal scaling
- Queue-based workload decoupling
- Independent scaling of API and worker services
- Distributed media handling via Blob Storage
- Asynchronous background processing
- Managed infrastructure to minimise operational overhead

This architecture enables the platform to efficiently process media workloads while maintaining service reliability and scalability.

---

## Media Processing Workflow

1. User uploads an image
2. API generates a secure SAS upload URL
3. Image is uploaded directly to Azure Blob Storage
4. Upload event is pushed to Azure Queue Storage
5. Worker container consumes queue messages
6. Thumbnail generation runs asynchronously
7. Processed media metadata is stored in Cosmos DB

---

## Local Development

### Run with Docker Compose

```bash
docker compose up --build
```

---

## Deployment

The platform was deployed to Microsoft Azure using:

- Azure Container Apps
- Azure Container Registry
- Azure Static Website Hosting
- Azure Storage Services

Docker images were built for Azure-compatible environments using:

```bash
docker buildx build --platform linux/amd64
```

---

## Key Cloud Concepts Demonstrated

- Cloud-native application design
- Containerized microservices
- Asynchronous distributed systems
- Managed Azure services
- Event-driven processing
- Decoupled architectures
- Scalable background workers
- Infrastructure abstraction

---

## Author

**Victor Obiora**

