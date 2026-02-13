import { ExcelParser } from './excelParser.service';
import { DataMapper } from './dataMapper.service';
import { DataValidator } from './dataValidator.service';
import { dbService } from './database.service';
import { Client, Product, UploadProgress, UploadResult, ValidatedData, MappingResult } from '@/types/upload.types';

export class UploadOrchestrator {
  private userId: string;
  private progressCallback?: (progress: UploadProgress) => void;

  constructor(userId: string, progressCallback?: (progress: UploadProgress) => void) {
    this.userId = userId;
    this.progressCallback = progressCallback;
  }

  private updateProgress(stage: UploadProgress['stage'], message: string, progress: number, details?: any) {
    if (this.progressCallback) {
      this.progressCallback({ stage, message, progress, details });
    }
  }

  async processUpload(
    file: File,
    approvedChanges: {
      newClients: number[];
      updatedClients: number[];
      newProducts: string[];
      updatedProducts: string[];
    }
  ): Promise<UploadResult> {
    const startTime = Date.now();
    let batchId = '';
    let backupSnapshotId: string | undefined;

    try {
      this.updateProgress('parsing', 'Leyendo archivo Excel...', 10);
      const parsedData = await ExcelParser.parseFile(file);

      this.updateProgress('parsing', 'Creando registro de batch...', 15);
      batchId = await dbService.createUploadBatch({
        filename: file.name,
        file_size: file.size,
        total_records: parsedData.totalRows,
        uploaded_by: this.userId,
        entity_type: 'mixed'
      });

      this.updateProgress('mapping', 'Mapeando datos a estructura de BD...', 25);
      const mappedData = DataMapper.mapData(parsedData.rows, parsedData.headers);

      if (mappedData.errors.length > 0) {
        throw new Error(`Errores críticos en mapeo: ${mappedData.errors.join('; ')}`);
      }

      this.updateProgress('validating', 'Consultando base de datos...', 40);

      // Solo traer clientes y productos específicos del archivo para evitar límite de 1000 filas
      const uploadedCuits = mappedData.clients.map(c => c.cuit);
      const uploadedCodificaciones = mappedData.products.map(p => p.codificacion);

      const existingClients = await dbService.getClientsByCuits(uploadedCuits);
      const existingProducts = await dbService.getProductsByCodificaciones(uploadedCodificaciones);

      this.updateProgress('validating', 'Validando contra datos existentes...', 50);
      const validatedData = await DataValidator.validateAgainstDatabase(
        mappedData.clients,
        mappedData.products,
        existingClients,
        existingProducts
      );

      const approvedNewClients = validatedData.newClients.filter(c =>
        approvedChanges.newClients.includes(c.cuit)
      );
      const approvedUpdatedClients = validatedData.updatedClients.filter(u =>
        approvedChanges.updatedClients.includes(u.existing.cuit)
      );
      const approvedNewProducts = validatedData.newProducts.filter(p =>
        approvedChanges.newProducts.includes(p.codificacion)
      );
      const approvedUpdatedProducts = validatedData.updatedProducts.filter(u =>
        approvedChanges.updatedProducts.includes(u.existing.codificacion)
      );

      this.updateProgress('backing_up', 'Creando backup de seguridad...', 60);
      backupSnapshotId = await this.createBackup(
        batchId,
        [...approvedUpdatedClients.map(u => u.existing)],
        [...approvedUpdatedProducts.map(u => u.existing)]
      );

      this.updateProgress('applying', 'Aplicando cambios a la base de datos...', 70);

      let insertedClients = 0;
      if (approvedNewClients.length > 0) {
        this.updateProgress('applying', `Insertando ${approvedNewClients.length} nuevos clientes...`, 72);
        insertedClients = await dbService.bulkInsertClients(approvedNewClients, this.userId, batchId);
      }

      let updatedClientsCount = 0;
      for (const update of approvedUpdatedClients) {
        await dbService.updateClient(update.new, this.userId, batchId, update.existing);
        updatedClientsCount++;
        this.updateProgress('applying', `Actualizando clientes (${updatedClientsCount}/${approvedUpdatedClients.length})...`, 75);
      }

      let insertedProducts = 0;
      if (approvedNewProducts.length > 0) {
        this.updateProgress('applying', `Insertando ${approvedNewProducts.length} nuevos productos...`, 80);
        insertedProducts = await dbService.bulkInsertProducts(approvedNewProducts, this.userId, batchId);
      }

      let updatedProductsCount = 0;
      for (const update of approvedUpdatedProducts) {
        await dbService.updateProduct(update.new, this.userId, batchId, update.existing);
        updatedProductsCount++;
        this.updateProgress('applying', `Actualizando productos (${updatedProductsCount}/${approvedUpdatedProducts.length})...`, 85);
      }

      const processingTime = Date.now() - startTime;
      await dbService.completeUploadBatch(batchId, {
        processed_records: parsedData.totalRows,
        new_records: insertedClients + insertedProducts,
        updated_records: updatedClientsCount + updatedProductsCount,
        error_records: mappedData.errors.length,
        processing_time_ms: processingTime
      });

      this.updateProgress('completed', 'Proceso completado exitosamente', 100);

      return {
        success: true,
        batchId,
        backupSnapshotId,
        stats: {
          totalRecords: parsedData.totalRows,
          newClients: insertedClients,
          updatedClients: updatedClientsCount,
          newProducts: insertedProducts,
          updatedProducts: updatedProductsCount,
          errors: mappedData.errors.length,
          warnings: mappedData.warnings.length
        },
        processingTimeMs: processingTime
      };

    } catch (error: any) {
      this.updateProgress('error', `Error: ${error.message}`, 0);

      if (batchId) {
        await dbService.updateUploadBatch(batchId, {
          status: 'failed',
          error_summary: [{ error: error.message, timestamp: new Date() }]
        });
      }

      return {
        success: false,
        batchId,
        backupSnapshotId,
        stats: {
          totalRecords: 0,
          newClients: 0,
          updatedClients: 0,
          newProducts: 0,
          updatedProducts: 0,
          errors: 1,
          warnings: 0
        },
        errors: [error.message],
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  async validateOnly(file: File): Promise<ValidatedData & { mappingResult: MappingResult }> {
    try {
      this.updateProgress('parsing', 'Leyendo archivo Excel...', 20);
      const parsedData = await ExcelParser.parseFile(file);

      this.updateProgress('mapping', 'Mapeando datos...', 40);
      const mappedData = DataMapper.mapData(parsedData.rows, parsedData.headers);

      this.updateProgress('validating', 'Consultando base de datos...', 60);
      const existingClients = await dbService.getAllClients();
      const existingProducts = await dbService.getAllProducts();

      this.updateProgress('validating', 'Validando...', 80);
      const validatedData = await DataValidator.validateAgainstDatabase(
        mappedData.clients,
        mappedData.products,
        existingClients,
        existingProducts
      );

      this.updateProgress('completed', 'Validación completada', 100);

      return {
        ...validatedData,
        mappingResult: mappedData
      };

    } catch (error: any) {
      this.updateProgress('error', `Error: ${error.message}`, 0);
      throw error;
    }
  }

  private async createBackup(
    batchId: string,
    clientsToBackup: Client[],
    productsToBackup: Product[]
  ): Promise<string> {
    const snapshotId = await dbService.createBackupSnapshot(
      batchId,
      'before_processing',
      this.userId,
      {
        reason: 'Backup automático antes de carga masiva',
        timestamp: new Date().toISOString()
      }
    );

    if (clientsToBackup.length > 0) {
      await dbService.backupClients(snapshotId, clientsToBackup);
    }

    if (productsToBackup.length > 0) {
      await dbService.backupProducts(snapshotId, productsToBackup);
    }

    return snapshotId;
  }

  async saveUndoPoint(
    sessionId: string,
    batchId: string,
    actionType: string,
    actionData: any
  ): Promise<void> {
    await dbService.pushUndoAction({
      session_id: sessionId,
      batch_id: batchId,
      action_type: actionType,
      action_data: actionData,
      user_id: this.userId
    });
  }
}
