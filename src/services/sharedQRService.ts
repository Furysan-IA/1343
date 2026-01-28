import { supabase } from '../lib/supabase';

export interface Product {
  codificacion: string;
  uuid: string;
  producto: string | null;
  marca: string | null;
  modelo: string | null;
  qr_path: string | null;
  qr_link: string | null;
  qr_status: string | null;
  qr_generated_at: string | null;
  shared_qr_from: string | null;
  is_qr_master: boolean;
  cuit: number;
  titular: string | null;
  created_at: string;
}

export interface QRSharingRelationship {
  producto_revision: string;
  nombre_producto_revision: string | null;
  uuid_revision: string;
  producto_original: string;
  nombre_producto_original: string | null;
  uuid_original: string;
  qr_compartido: string | null;
  qr_image_path: string | null;
  estado_qr: string | null;
  qr_generado_en: string | null;
  total_productos_usando_este_qr: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

class SharedQRService {
  /**
   * Detects if a product code is a revision (ends with -R1, -R2, etc.)
   */
  isRevisionCode(codificacion: string): boolean {
    return /-R\d+$/.test(codificacion);
  }

  /**
   * Gets the base product code from a revision code
   * Example: "ABC123-R1" -> "ABC123"
   */
  getBaseProductCode(revisionCode: string): string {
    if (this.isRevisionCode(revisionCode)) {
      return revisionCode.replace(/-R\d+$/, '');
    }
    return revisionCode;
  }

  /**
   * Finds the base product for a revision code
   * Returns the product if it exists and has QR generated
   */
  async findBaseProduct(codificacion: string): Promise<Product | null> {
    try {
      if (!this.isRevisionCode(codificacion)) {
        return null;
      }

      const baseCode = this.getBaseProductCode(codificacion);

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('codificacion', baseCode)
        .maybeSingle();

      if (error) {
        console.error('Error finding base product:', error);
        return null;
      }

      // Check if base product has QR generated
      if (data && data.qr_path && data.qr_link) {
        return data as Product;
      }

      return null;
    } catch (error) {
      console.error('Error in findBaseProduct:', error);
      return null;
    }
  }

  /**
   * Searches for products that have QR generated
   * Useful for selecting a product to share QR from
   */
  async searchProductsWithQR(searchTerm: string, limit: number = 20): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .not('qr_path', 'is', null)
        .not('qr_link', 'is', null)
        .or(`codificacion.ilike.%${searchTerm}%,producto.ilike.%${searchTerm}%,marca.ilike.%${searchTerm}%`)
        .order('codificacion')
        .limit(limit);

      if (error) {
        console.error('Error searching products with QR:', error);
        return [];
      }

      return (data as Product[]) || [];
    } catch (error) {
      console.error('Error in searchProductsWithQR:', error);
      return [];
    }
  }

  /**
   * Gets all products that are reusing the QR from a specific product
   */
  async getProductsUsingThisQR(codificacion: string): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('shared_qr_from', codificacion)
        .order('codificacion');

      if (error) {
        console.error('Error getting products using QR:', error);
        return [];
      }

      return (data as Product[]) || [];
    } catch (error) {
      console.error('Error in getProductsUsingThisQR:', error);
      return [];
    }
  }

  /**
   * Validates that QR sharing is safe
   * Checks for circular references and that source has QR
   */
  async validateQRSharing(
    productCode: string,
    sharedFromCode: string
  ): Promise<ValidationResult> {
    try {
      // Can't share from yourself
      if (productCode === sharedFromCode) {
        return {
          valid: false,
          error: 'Un producto no puede compartir QR consigo mismo',
        };
      }

      // Check if source product exists
      const { data: sourceProduct, error: sourceError } = await supabase
        .from('products')
        .select('codificacion, qr_path, qr_link, shared_qr_from')
        .eq('codificacion', sharedFromCode)
        .maybeSingle();

      if (sourceError || !sourceProduct) {
        return {
          valid: false,
          error: `El producto origen ${sharedFromCode} no existe`,
        };
      }

      // Check if source product has QR generated
      if (!sourceProduct.qr_path || !sourceProduct.qr_link) {
        return {
          valid: false,
          error: `El producto origen ${sharedFromCode} no tiene QR generado`,
        };
      }

      // Check for circular reference
      if (sourceProduct.shared_qr_from) {
        return {
          valid: false,
          error: `El producto origen ${sharedFromCode} ya está compartiendo QR de otro producto. No se permiten referencias encadenadas.`,
        };
      }

      return { valid: true };
    } catch (error) {
      console.error('Error validating QR sharing:', error);
      return {
        valid: false,
        error: 'Error al validar la vinculación de QR',
      };
    }
  }

  /**
   * Links a product to share QR from another product
   */
  async linkProductToSharedQR(
    productCode: string,
    sharedFromCode: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate first
      const validation = await this.validateQRSharing(productCode, sharedFromCode);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Update the product to share QR
      const { error: updateError } = await supabase
        .from('products')
        .update({
          shared_qr_from: sharedFromCode,
          updated_at: new Date().toISOString(),
        })
        .eq('codificacion', productCode);

      if (updateError) {
        console.error('Error linking QR:', updateError);
        return { success: false, error: 'Error al vincular el QR' };
      }

      console.log(`✅ Product ${productCode} now shares QR from ${sharedFromCode}`);
      return { success: true };
    } catch (error) {
      console.error('Error in linkProductToSharedQR:', error);
      return { success: false, error: 'Error inesperado al vincular el QR' };
    }
  }

  /**
   * Unlinks a product from shared QR
   * Returns it to using its own QR
   */
  async unlinkSharedQR(productCode: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error: updateError } = await supabase
        .from('products')
        .update({
          shared_qr_from: null,
          updated_at: new Date().toISOString(),
        })
        .eq('codificacion', productCode);

      if (updateError) {
        console.error('Error unlinking QR:', updateError);
        return { success: false, error: 'Error al desvincular el QR' };
      }

      console.log(`✅ Product ${productCode} now uses its own QR`);
      return { success: true };
    } catch (error) {
      console.error('Error in unlinkSharedQR:', error);
      return { success: false, error: 'Error inesperado al desvincular el QR' };
    }
  }

  /**
   * Gets the effective QR for a product
   * If product shares QR, returns the source product's QR
   * Otherwise returns the product's own QR
   */
  async getEffectiveQR(product: Product): Promise<{
    qr_path: string | null;
    qr_link: string | null;
    qr_status: string | null;
    is_shared: boolean;
    shared_from?: string;
  }> {
    try {
      // If product doesn't share QR, return its own
      if (!product.shared_qr_from) {
        return {
          qr_path: product.qr_path,
          qr_link: product.qr_link,
          qr_status: product.qr_status,
          is_shared: false,
        };
      }

      // Get the source product's QR
      const { data: sourceProduct, error } = await supabase
        .from('products')
        .select('qr_path, qr_link, qr_status, codificacion')
        .eq('codificacion', product.shared_qr_from)
        .maybeSingle();

      if (error || !sourceProduct) {
        console.warn(`Source product ${product.shared_qr_from} not found`);
        return {
          qr_path: product.qr_path,
          qr_link: product.qr_link,
          qr_status: product.qr_status,
          is_shared: false,
        };
      }

      return {
        qr_path: sourceProduct.qr_path,
        qr_link: sourceProduct.qr_link,
        qr_status: sourceProduct.qr_status,
        is_shared: true,
        shared_from: sourceProduct.codificacion,
      };
    } catch (error) {
      console.error('Error getting effective QR:', error);
      return {
        qr_path: product.qr_path,
        qr_link: product.qr_link,
        qr_status: product.qr_status,
        is_shared: false,
      };
    }
  }

  /**
   * Gets all QR sharing relationships
   * Useful for admin/overview screens
   */
  async getAllQRSharingRelationships(): Promise<QRSharingRelationship[]> {
    try {
      const { data, error } = await supabase
        .from('qr_sharing_relationships')
        .select('*')
        .order('producto_original');

      if (error) {
        console.error('Error getting QR relationships:', error);
        return [];
      }

      return (data as QRSharingRelationship[]) || [];
    } catch (error) {
      console.error('Error in getAllQRSharingRelationships:', error);
      return [];
    }
  }
}

export const sharedQRService = new SharedQRService();
