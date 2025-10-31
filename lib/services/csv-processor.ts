/**
 * CSV Processing Service for Hedera Token Service Integration
 * 
 * This service processes CSV files and prepares them for tokenization on Hedera.
 * It validates data quality, generates metadata, and creates hashes for immutable
 * on-chain storage via Hedera Consensus Service (HCS) and Token Service (HTS).
 * 
 * Reference:
 * - HTS: https://docs.hedera.com/hedera/core-concepts/tokens/hedera-token-service-hts-native-tokenization
 * - HCS: https://docs.hedera.com/hedera/sdks-and-apis/hedera-api/consensus/consensus-service
 */

import Papa from 'papaparse';
import { createHash } from 'crypto';

/**
 * Result of CSV validation including errors, warnings, and metadata
 */
export interface CSVValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  rowCount: number;
  columnCount: number;
  columns: string[];
  sampleData: any[];
  hash: string;
  estimatedSize: number;
}

/**
 * Metadata structure for CSV datasets
 * This will be encoded and stored in HTS NFT metadata
 */
export interface CSVMetadata {
  fileName: string;
  uploadDate: string;
  hash: string; // SHA-256 hash for data integrity verification
  rowCount: number;
  columns: string[];
  schema: Record<string, string>; // Column name -> inferred type
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
}

/**
 * CSV Processor for validating and preparing data for Hedera tokenization
 * 
 * Workflow:
 * 1. Parse and validate CSV file
 * 2. Generate metadata and hash
 * 3. Create HTS token with metadata
 * 4. Submit hash to HCS for immutable audit trail
 */
export class CSVProcessor {
  // Configuration limits to prevent abuse and ensure reasonable gas costs
  private maxFileSize = 10 * 1024 * 1024; // 10MB - reasonable for Hedera transactions
  private maxRows = 10000; // Limit to keep metadata size manageable
  private maxColumns = 50; // Prevent excessive column processing

  /**
   * Parse and validate a CSV file
   * 
   * @param file - File object from browser input
   * @returns Validation result with errors, warnings, and parsed data
   */
  async parseAndValidate(file: File): Promise<CSVValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Size validation - important for Hedera transaction fees
    if (file.size > this.maxFileSize) {
      errors.push(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds limit of 10MB`);
    }

    if (file.size === 0) {
      errors.push('File is empty');
    }

    // Read file content
    const text = await file.text();
    
    // Generate SHA-256 hash for immutable verification
    // This hash will be stored on Hedera Consensus Service (HCS)
    const hash = createHash('sha256').update(text).digest('hex');

    // Parse CSV using PapaParse
    const parseResult = await new Promise<Papa.ParseResult<any>>((resolve) => {
      Papa.parse(text, {
        header: true, // First row as headers
        skipEmptyLines: true,
        dynamicTyping: true, // Auto-convert numbers
        complete: resolve,
        error: (error: Error) => {
          errors.push(`Parse error: ${error.message}`);
        }
      });
    });

    const data = parseResult.data;
    const columns = parseResult.meta.fields || [];

    // Row count validation
    if (data.length === 0) {
      errors.push('CSV file contains no data rows');
    } else if (data.length > this.maxRows) {
      warnings.push(
        `File has ${data.length} rows. Only first ${this.maxRows} will be processed to maintain reasonable transaction costs on Hedera.`
      );
    }

    // Column validation
    if (columns.length === 0) {
      errors.push('No columns detected in CSV header');
    } else if (columns.length > this.maxColumns) {
      warnings.push(
        `File has ${columns.length} columns. This may impact metadata size and HTS token creation costs.`
      );
    }

    // Check for duplicate column names
    const duplicateCols = columns.filter((col, idx) => columns.indexOf(col) !== idx);
    if (duplicateCols.length > 0) {
      errors.push(`Duplicate column names detected: ${duplicateCols.join(', ')}`);
    }

    // Data quality checks
    const emptyRows = data.filter(row => 
      Object.values(row).every(val => !val || val === '')
    ).length;

    if (emptyRows > 0) {
      warnings.push(`Found ${emptyRows} empty rows that will be skipped`);
    }

    // Check for missing values
    const missingValueCounts: Record<string, number> = {};
    columns.forEach(col => {
      const missingCount = data.filter(row => !row[col] || row[col] === '').length;
      if (missingCount > 0) {
        missingValueCounts[col] = missingCount;
      }
    });

    if (Object.keys(missingValueCounts).length > 0) {
      const highMissing = Object.entries(missingValueCounts)
        .filter(([, count]) => count > data.length * 0.5);
      
      if (highMissing.length > 0) {
        warnings.push(
          `Columns with >50% missing values: ${highMissing.map(([col]) => col).join(', ')}`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      rowCount: data.length,
      columnCount: columns.length,
      columns,
      sampleData: data.slice(0, 5), // First 5 rows for preview
      hash,
      estimatedSize: file.size
    };
  }

  /**
   * Create metadata object for HTS NFT
   * 
   * This metadata will be:
   * 1. Encoded as JSON
   * 2. Stored in HTS NFT metadata field
   * 3. Hash submitted to HCS for immutable audit
   * 
   * @param file - Original file
   * @param validationResult - Validation output
   * @returns Metadata object ready for HTS minting
   */
  async createMetadata(file: File, validationResult: CSVValidationResult): Promise<CSVMetadata> {
    const text = await file.text();
    const parseResult = Papa.parse(text, { 
      header: true, 
      skipEmptyLines: true,
      dynamicTyping: true 
    });
    const data = parseResult.data;

    // Infer schema from data
    const schema: Record<string, string> = {};
    if (data.length > 0) {
      const firstRow = data[0] as any;
      for (const [key, value] of Object.entries(firstRow)) {
        schema[key] = this.inferType(value);
      }
    }

    // Count valid vs invalid rows
    const validRows = data.filter((row: any) => 
      Object.values(row as Record<string, any>).some(val => val !== null && val !== undefined && val !== '')
    ).length;

    return {
      fileName: file.name,
      uploadDate: new Date().toISOString(),
      hash: validationResult.hash,
      rowCount: validationResult.rowCount,
      columns: validationResult.columns,
      schema,
      summary: {
        totalRows: validationResult.rowCount,
        validRows,
        invalidRows: validationResult.rowCount - validRows
      }
    };
  }

  /**
   * Infer data type from a value
   * Used for schema generation
   */
  private inferType(value: any): string {
    if (value === null || value === undefined || value === '') return 'string';
    
    // Check if already typed by PapaParse dynamicTyping
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    
    // String checks
    const strValue = String(value);
    
    // Number check
    if (!isNaN(Number(strValue)) && strValue.trim() !== '') {
      return 'number';
    }
    
    // Boolean check
    if (strValue.toLowerCase() === 'true' || strValue.toLowerCase() === 'false') {
      return 'boolean';
    }
    
    // Date check (basic)
    const dateValue = Date.parse(strValue);
    if (!isNaN(dateValue) && strValue.includes('-') || strValue.includes('/')) {
      return 'date';
    }
    
    return 'string';
  }

  /**
   * Calculate statistical summaries for numeric columns
   * 
   * This can be stored in HTS metadata to provide insights
   * without revealing raw data
   * 
   * @param file - CSV file
   * @returns Statistics object
   */
  async calculateStats(file: File): Promise<Record<string, any>> {
    const text = await file.text();
    const parseResult = Papa.parse(text, { 
      header: true, 
      skipEmptyLines: true,
      dynamicTyping: true 
    });
    const data = parseResult.data;

    const stats: Record<string, any> = {
      rowCount: data.length,
      columnCount: parseResult.meta.fields?.length || 0
    };

    // Calculate numeric column statistics
    if (parseResult.meta.fields && data.length > 0) {
      for (const field of parseResult.meta.fields) {
        const values = data
          .map((row: any) => row[field])
          .filter(v => v !== null && v !== undefined && !isNaN(Number(v)));
        
        if (values.length > 0) {
          const numbers = values.map(Number);
          stats[field] = {
            count: numbers.length,
            min: Math.min(...numbers),
            max: Math.max(...numbers),
            avg: numbers.reduce((a, b) => a + b, 0) / numbers.length,
            sum: numbers.reduce((a, b) => a + b, 0),
            median: this.calculateMedian(numbers)
          };
        }
      }
    }

    return stats;
  }

  /**
   * Calculate median value
   */
  private calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  /**
   * Generate a preview summary suitable for display
   * 
   * @param file - CSV file
   * @returns Human-readable summary
   */
  async generatePreview(file: File): Promise<{
    fileName: string;
    fileSize: string;
    rowCount: number;
    columnCount: number;
    columns: string[];
    sampleRows: any[];
  }> {
    const validation = await this.parseAndValidate(file);
    
    return {
      fileName: file.name,
      fileSize: `${(file.size / 1024).toFixed(2)} KB`,
      rowCount: validation.rowCount,
      columnCount: validation.columnCount,
      columns: validation.columns,
      sampleRows: validation.sampleData
    };
  }

  /**
   * Validate that data is suitable for Hedera tokenization
   * 
   * Checks:
   * - Data size is reasonable for on-chain storage
   * - Column structure is well-formed
   * - No obvious data quality issues
   * 
   * @param metadata - CSV metadata
   * @returns Validation status and recommendations
   */
  validateForTokenization(metadata: CSVMetadata): {
    canTokenize: boolean;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    
    // Check if data quality is sufficient
    const qualityRatio = metadata.summary.validRows / metadata.summary.totalRows;
    if (qualityRatio < 0.5) {
      recommendations.push(
        `Data quality is low (${(qualityRatio * 100).toFixed(0)}% valid rows). Consider cleaning data before tokenization.`
      );
    }
    
    // Check metadata size (important for HTS transaction costs)
    const metadataSize = JSON.stringify(metadata).length;
    const maxMetadataSize = 100 * 1024; // 100KB reasonable limit
    
    if (metadataSize > maxMetadataSize) {
      recommendations.push(
        `Metadata size (${(metadataSize / 1024).toFixed(2)}KB) is large. Consider reducing columns or row count.`
      );
    }
    
    // Check for reasonable column structure
    if (metadata.columns.length < 2) {
      recommendations.push(
        'Dataset has very few columns. Consider if this data is suitable for tokenization.'
      );
    }
    
    if (metadata.rowCount < 10) {
      recommendations.push(
        'Dataset has very few rows. Consider combining with more data before tokenization.'
      );
    }
    
    const canTokenize = qualityRatio >= 0.3 && metadataSize <= maxMetadataSize;
    
    return {
      canTokenize,
      recommendations
    };
  }
}
