import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import clamscan from 'clamscan';

export interface FileUploadResult {
  id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  checksum: string;
  isClean: boolean;
  isDuplicate: boolean;
  uploadedAt: Date;
}

export interface ScanResult {
  isClean: boolean;
  threats?: string[];
  scanTime: number;
}

export class FileService {
  private readonly uploadDir: string;
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];
  private clamAV: any = null;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10); // 10MB default
    this.allowedMimeTypes = [
      'text/plain',
      'text/markdown',
      'application/json',
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/zip',
      'application/x-zip-compressed'
    ];
    
    this.initializeClamAV();
    this.ensureUploadDirectory();
  }

  private async initializeClamAV(): Promise<void> {
    try {
      // Initialize ClamAV scanner
      this.clamAV = await clamscan.createScanner({
        removeInfected: false, // Don't automatically remove infected files
        quarantineInfected: false, // Don't quarantine infected files
        scanLog: null, // Don't log scan results to file
        debugMode: process.env.NODE_ENV === 'development',
        clamscan: {
          path: process.env.CLAMSCAN_PATH || '/usr/bin/clamscan',
          scanArchives: true,
          active: process.env.VIRUS_SCANNING_ENABLED === 'true'
        },
        clamdscan: {
          socket: process.env.CLAMD_SOCKET || '/var/run/clamav/clamd.ctl',
          host: process.env.CLAMD_HOST || 'localhost',
          port: parseInt(process.env.CLAMD_PORT || '3310', 10),
          active: process.env.VIRUS_SCANNING_ENABLED === 'true'
        }
      });

      logger.info('ClamAV scanner initialized successfully');
    } catch (error) {
      logger.warn('Failed to initialize ClamAV scanner:', error);
      // Continue without virus scanning if ClamAV is not available
    }
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      logger.info(`Upload directory ensured: ${this.uploadDir}`);
    } catch (error) {
      logger.error('Failed to create upload directory:', error);
      throw new Error('Failed to initialize file upload service');
    }
  }

  async calculateChecksum(filePath: string): Promise<string> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const hash = createHash('sha256');
      hash.update(fileBuffer);
      return hash.digest('hex');
    } catch (error) {
      logger.error('Failed to calculate file checksum:', error);
      throw new Error('Failed to calculate file checksum');
    }
  }

  async scanFile(filePath: string): Promise<ScanResult> {
    const startTime = Date.now();
    
    try {
      if (!this.clamAV) {
        logger.warn('Virus scanning not available, skipping scan');
        return {
          isClean: true,
          scanTime: Date.now() - startTime
        };
      }

      const scanResult = await this.clamAV.scanFile(filePath);
      const scanTime = Date.now() - startTime;

      logger.info('File scan completed', {
        filePath,
        isClean: scanResult.isInfected === false,
        scanTime,
        threats: scanResult.viruses
      });

      return {
        isClean: scanResult.isInfected === false,
        threats: scanResult.viruses || [],
        scanTime
      };
    } catch (error) {
      logger.error('File scanning failed:', error);
      // In case of scan failure, assume file is not clean for safety
      return {
        isClean: false,
        threats: ['Scan failed'],
        scanTime: Date.now() - startTime
      };
    }
  }

  validateFile(file: Express.Multer.File): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File size exceeds maximum allowed size of ${this.maxFileSize} bytes`);
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed`);
    }

    // Check file name
    if (!file.originalname || file.originalname.length === 0) {
      errors.push('File name is required');
    }

    // Check for potentially dangerous file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (dangerousExtensions.includes(fileExtension)) {
      errors.push(`File extension ${fileExtension} is not allowed`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async processUpload(file: Express.Multer.File): Promise<FileUploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
      }

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExtension}`;
      const filePath = path.join(this.uploadDir, fileName);

      // Save file to disk
      await fs.writeFile(filePath, file.buffer);

      // Calculate checksum
      const checksum = await this.calculateChecksum(filePath);

      // Scan for viruses
      const scanResult = await this.scanFile(filePath);

      // If file is infected, remove it and throw error
      if (!scanResult.isClean) {
        await fs.unlink(filePath).catch(() => {}); // Ignore errors when cleaning up
        throw new Error(`File is infected: ${scanResult.threats?.join(', ')}`);
      }

      const result: FileUploadResult = {
        id: checksum, // Use checksum as ID for deduplication
        originalName: file.originalname,
        fileName,
        filePath,
        mimeType: file.mimetype,
        size: file.size,
        checksum,
        isClean: scanResult.isClean,
        isDuplicate: false, // This would be determined by checking database
        uploadedAt: new Date()
      };

      logger.info('File uploaded successfully', {
        originalName: file.originalname,
        fileName,
        size: file.size,
        checksum,
        scanTime: scanResult.scanTime
      });

      return result;
    } catch (error) {
      logger.error('File upload failed:', error);
      throw error;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      logger.info('File deleted successfully', { filePath });
    } catch (error) {
      logger.error('Failed to delete file:', error);
      throw new Error('Failed to delete file');
    }
  }

  async getFileInfo(filePath: string): Promise<{
    exists: boolean;
    size?: number;
    mtime?: Date;
    checksum?: string;
  }> {
    try {
      const stats = await fs.stat(filePath);
      const checksum = await this.calculateChecksum(filePath);
      
      return {
        exists: true,
        size: stats.size,
        mtime: stats.mtime,
        checksum
      };
    } catch (error) {
      return { exists: false };
    }
  }

  async cleanupOldFiles(maxAgeInDays: number = 30): Promise<number> {
    try {
      const files = await fs.readdir(this.uploadDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);
      
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      logger.info(`Cleanup completed: ${deletedCount} files deleted`);
      return deletedCount;
    } catch (error) {
      logger.error('File cleanup failed:', error);
      throw new Error('File cleanup failed');
    }
  }
}

export const fileService = new FileService(); 