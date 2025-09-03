#!/bin/bash
# MinIO S3 File Inspector

echo "🔹 MinIO S3 File Inspector"
echo "=========================="

MINIO_URL="http://localhost:9000"
BUCKET_NAME="ai-chatbot-files"

echo "🪣 Creating bucket '$BUCKET_NAME'..."
curl -X PUT "$MINIO_URL/$BUCKET_NAME" 2>/dev/null
echo ""

echo "📤 Uploading test file..."
echo "Test content from MinIO script $(date)" | curl -X PUT "$MINIO_URL/$BUCKET_NAME/test/minio_upload.txt" \
     -H "Content-Type: text/plain" \
     -d @- 2>/dev/null
echo "✅ Test file uploaded"
echo ""

echo "📁 Listing files in bucket '$BUCKET_NAME':"
curl -s "$MINIO_URL/$BUCKET_NAME?list-type=2" | grep -o '<Key>[^<]*</Key>' | sed 's/<Key>//g' | sed 's/<\/Key>//g' 2>/dev/null || echo "No files found"
echo ""

echo "🔗 MinIO Access URLs:"
echo "   🎨 Web Console: http://localhost:9001 (minioadmin/minioadmin)"
echo "   📁 API Base: http://localhost:9000/ai-chatbot-files/"
echo "   📄 Files: curl 'http://localhost:9000/ai-chatbot-files/path/to/file.txt'"
echo ""

echo "📄 Example - downloading test file:"
curl -s "$MINIO_URL/$BUCKET_NAME/test/minio_upload.txt" 2>/dev/null || echo "File not found"
echo ""

echo "💡 Tip: Open http://localhost:9001 in browser for MinIO web interface!"
