# MongoDB Atlas Vector Search Index Setup

This guide explains how to set up the vector search index in MongoDB Atlas for semantic search functionality.

## ⚠️ IMPORTANT: Include videoId Filter

The vector search index **MUST** include `videoId` as a filterable field to filter results by video.

## Step 1: Create Vector Search Index

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Navigate to your cluster
3. Click on **"Search"** in the left sidebar
4. Click **"Create Search Index"**
5. Select **"JSON Editor"** option
6. **DELETE** any existing `vector_index` if it exists
7. Paste the following **EXACT** configuration:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "videoId"
    }
  ]
}
```

8. Name the index: `vector_index` (exactly this name)
9. Select the database: Your database name (e.g., `videochat`)
10. Select the collection: `chunks`
11. Click **"Next"** and then **"Create Search Index"**

## Step 2: Wait for Index Creation

- The index creation process may take 1-3 minutes
- You can monitor the status in the Atlas UI
- The index status should show as **"Active"** when ready

## Step 3: Verify Index

Run the verification script:

```bash
cd server
npm run verify-vector
```

Or for a specific video:
```bash
node scripts/verify-vector-search.js <videoId>
```

## Important Notes

- **Dimensions**: The embedding model `text-embedding-3-small` produces 1536-dimensional vectors
- **Similarity**: Cosine similarity is used to find the most relevant chunks
- **Index Name**: The index must be named exactly `vector_index` (as referenced in the code)
- **Filter Field**: `videoId` MUST be included as a filter field to enable filtering by video

## Troubleshooting

### Error: "Path 'videoId' needs to be indexed as filter"

**Solution**: Your index is missing the `videoId` filter field. 

1. Delete the existing `vector_index` in Atlas
2. Recreate it using the JSON config above (which includes the `videoId` filter field)
3. Wait for the index to become Active

### Error: "Vector index 'vector_index' does not exist"

- Ensure the index is created and active in MongoDB Atlas
- Verify the index name matches exactly: `vector_index`
- Check that you're using the correct database and collection

### Error: "Invalid dimensions"

- Ensure the embedding dimensions match: 1536
- Verify you're using `text-embedding-3-small` model (or update dimensions if using a different model)

### Vector Search Returns 0 Results

- Ensure chunks have embeddings (run `node server/scripts/generate-embeddings.js`)
- Check that the index status is "Active" (not "Building")
- Try a different question - the video might not cover that topic

### Slow Search Performance

- Ensure the index is fully built (status: Active)
- Consider increasing cluster size for better performance
- Check that embeddings are properly stored in chunks

## Environment Variables

Make sure you have the following environment variables set:

```env
OPENAI_API_KEY=your_openai_api_key
MONGODB_URI=your_mongodb_atlas_connection_string
```

## Testing

After setting up the index:

1. Upload a video
2. Wait for processing to complete (chunks with embeddings will be generated)
3. Run verification: `npm run verify-vector`
4. Open the video player page
5. Click "Chat with Video"
6. Ask a question about the video content

The system will automatically use vector search to find relevant chunks and generate answers!

## Complete Index Configuration

Here's the complete, correct configuration you need:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "videoId"
    }
  ]
}
```

**Key Points:**
- ✅ `type: "vector"` for embeddings
- ✅ `type: "filter"` for videoId (REQUIRED for filtering)
- ✅ `numDimensions: 1536` matches your embedding model
- ✅ `similarity: "cosine"` for semantic similarity

