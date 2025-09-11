const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CreateBucketCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const { createServiceError } = require('../utils/errorHelpers');
const { NODE_ENV, AWS_S3_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME, USE_MINIO, MINIO_ENDPOINT } = require('../config/env');

/**
 * S3 Service for File Storage
 */

// S3 Client Configuration
const createS3Client = () => {
  // Use MinIO when USE_MINIO is true, regardless of NODE_ENV
  const isMinIO = USE_MINIO === true;
  
  const config = {
    region: AWS_S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID || 'minioadmin',
      secretAccessKey: AWS_SECRET_ACCESS_KEY || 'minioadmin'
    }
  };
  console.log("🚀 ~ createS3Client ~ config:", config)

  // MinIO configuration for development
  if (isMinIO) {
    config.endpoint = MINIO_ENDPOINT || 'http://minio:9000';
    config.forcePathStyle = true;
    console.log('🔹 Using MinIO S3 storage');
  }
  // Production AWS S3
  else {
    console.log('☁️  Using AWS S3 storage');
  }

  return new S3Client(config);
};

let s3Client = null;
const BUCKET_NAME = AWS_S3_BUCKET_NAME || 'ai-chatbot-files';

// Lazy initialization of S3 client
const getS3Client = () => {
  if (!s3Client) {
    s3Client = createS3Client();
  }
  return s3Client;
};

/**
 * Initialize S3 bucket (for MinIO)
 */
const initializeBucket = async () => {
  const isMinIO = USE_MINIO === true;
  
  if (!isMinIO) {
    return; // Skip for real AWS
  }

  try {
    // Check if bucket exists
    await getS3Client().send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    console.log(`✅ S3 bucket '${BUCKET_NAME}' already exists`);
  } catch (error) {
    if (error.name === 'NotFound') {
      // Create bucket
      try {
        await getS3Client().send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
        console.log(`✅ S3 bucket '${BUCKET_NAME}' created successfully`);
      } catch (createError) {
        console.error(`❌ Failed to create S3 bucket:`, createError.message);
      }
    } else {
      console.error(`❌ Error checking S3 bucket:`, error.message);
    }
  }
};

/**
 * Generate S3 key for file storage
 */
const generateS3Key = (agentId, filename, fileHash) => {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `ai-chatbot-files/${agentId}_${timestamp}_${fileHash.substring(0, 8)}_${sanitizedFilename}`;
};

/**
 * Upload buffer to S3
 */
const uploadBuffer = async (buffer, s3Key, contentType, metadata = {}) => {
  try {
    console.log(`☁️  Uploading to S3: ${s3Key} (${buffer.length} bytes)`);

    const isMinIO = USE_MINIO === true;

    // For development without MinIO, simulate upload
    if (!isMinIO && NODE_ENV === 'development') {
      console.log(`🔧 Dev mode: Simulating S3 upload for ${s3Key}`);
      
      const s3Url = `https://${BUCKET_NAME}.s3.${AWS_S3_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        success: true,
        s3Key,
        s3Url,
        etag: `"${crypto.createHash('md5').update(buffer).digest('hex')}"`,
        size: buffer.length
      };
    }

    // Ensure bucket exists (for MinIO)
    if (isMinIO) {
      await initializeBucket();
    }

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
      Metadata: {
        uploadedAt: new Date().toISOString(),
        ...metadata
      }
    });

    const result = await getS3Client().send(command);
    
    // Different URL format for MinIO vs AWS
    const s3Url = isMinIO 
      ? `http://localhost:9000/${BUCKET_NAME}/${s3Key}`
      : `https://${BUCKET_NAME}.s3.${AWS_S3_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
    
    console.log(`✅ S3 upload successful: ${s3Key}`);
    
    return {
      success: true,
      s3Key,
      s3Url,
      etag: result.ETag,
      size: buffer.length
    };

  } catch (error) {
    console.error(`❌ S3 upload failed for ${s3Key}:`, error.message);
    throw createServiceError(`S3 upload failed: ${error.message}`, 'S3');
  }
};

/**
 * Upload stream to S3 (for real-time streaming)
 */
const uploadStream = async (stream, s3Key, contentType, metadata = {}) => {
  try {
    console.log(`🌊 Streaming to S3: ${s3Key}`);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: stream,
      ContentType: contentType,
      Metadata: {
        uploadedAt: new Date().toISOString(),
        ...metadata
      }
    });

    const result = await getS3Client().send(command);
    
    const s3Url = `https://${BUCKET_NAME}.s3.${AWS_S3_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
    
    console.log(`✅ S3 stream upload successful: ${s3Key}`);
    
    return {
      success: true,
      s3Key,
      s3Url,
      etag: result.ETag
    };

  } catch (error) {
    console.error(`❌ S3 stream upload failed for ${s3Key}:`, error.message);
    throw createServiceError(`S3 stream upload failed: ${error.message}`, 'S3');
  }
};

/**
 * Download file from S3 as buffer
 */
const downloadBuffer = async (s3Key) => {
  try {
    console.log(`⬇️  Downloading from S3: ${s3Key}`);

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });

    const result = await getS3Client().send(command);
    
    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of result.Body) {
      chunks.push(chunk);
    }
    
    const buffer = Buffer.concat(chunks);
    
    console.log(`✅ S3 download successful: ${s3Key} (${buffer.length} bytes)`);
    
    return buffer;

  } catch (error) {
    console.error(`❌ S3 download failed for ${s3Key}:`, error.message);
    throw createServiceError(`S3 download failed: ${error.message}`, 'S3');
  }
};

/**
 * Get S3 object stream (for efficient processing)
 */
const getStream = async (s3Key) => {
  try {
    console.log(`🌊 Getting S3 stream: ${s3Key}`);

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });

    const result = await getS3Client().send(command);
    
    return result.Body;

  } catch (error) {
    console.error(`❌ S3 stream failed for ${s3Key}:`, error.message);
    throw createServiceError(`S3 stream failed: ${error.message}`, 'S3');
  }
};

/**
 * Delete file from S3
 */
const deleteFile = async (s3Key) => {
  try {
    console.log(`🗑️  Deleting from S3: ${s3Key}`);

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });

    await getS3Client().send(command);
    
    console.log(`✅ S3 delete successful: ${s3Key}`);
    
    return { success: true, s3Key };

  } catch (error) {
    console.error(`❌ S3 delete failed for ${s3Key}:`, error.message);
    throw createServiceError(`S3 delete failed: ${error.message}`, 'S3');
  }
};

/**
 * Generate presigned URL for temporary access
 */
const generatePresignedUrl = async (s3Key, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    
    return {
      presignedUrl,
      expiresIn,
      expiresAt: new Date(Date.now() + expiresIn * 1000)
    };

  } catch (error) {
    console.error(`❌ Presigned URL generation failed for ${s3Key}:`, error.message);
    throw createServiceError(`Presigned URL generation failed: ${error.message}`, 'S3');
  }
};

/**
 * Check if file exists in S3
 */
const fileExists = async (s3Key) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });

    await getS3Client().send(command);
    return true;

  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return false;
    }
    throw createServiceError(`S3 file check failed: ${error.message}`, 'S3');
  }
};

/**
 * Get file metadata from S3
 */
const getFileMetadata = async (s3Key) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });

    const result = await getS3Client().send(command);
    
    return {
      contentType: result.ContentType,
      contentLength: result.ContentLength,
      etag: result.ETag,
      lastModified: result.LastModified,
      metadata: result.Metadata
    };

  } catch (error) {
    console.error(`❌ S3 metadata failed for ${s3Key}:`, error.message);
    throw createServiceError(`S3 metadata failed: ${error.message}`, 'S3');
  }
};

/**
 * Stream to buffer utility
 */
const streamToBuffer = async (stream) => {
  const chunks = [];
  
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

module.exports = {
  uploadBuffer,
  uploadStream,
  downloadBuffer,
  getStream,
  deleteFile,
  generatePresignedUrl,
  fileExists,
  getFileMetadata,
  generateS3Key,
  streamToBuffer,
  initializeBucket,
  BUCKET_NAME
};
