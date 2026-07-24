import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { MechanicDocument } from './models';

@Injectable({ providedIn: 'root' })
export class MechanicDocsService {
  constructor(private readonly supabase: SupabaseService) {}

  private getStorage() {
    return this.supabase.storage();
  }

  async uploadDocument(file: File, docType: string): Promise<MechanicDocument> {
    const { data: sessionData, error: sessErr } = await this.supabase.getSession();
    if (sessErr) {
      console.error('Session error:', sessErr);
      throw sessErr;
    }
    
    const userId = sessionData.session?.user.id;
    if (!userId) {
      console.error('No user ID found in session');
      throw new Error('Not authenticated');
    }

    console.log('Uploading document for user:', userId, 'docType:', docType);

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const name = `${Date.now()}.${ext}`;
    const filePath = `${userId}/${docType}/${name}`;
    const fullPath = `mechanic_docs/${filePath}`;

    console.log('Uploading to path:', fullPath);

    // Upload file to storage
    const { data: uploadData, error: upErr } = await this.getStorage().from('autosos').upload(fullPath, file, {
      cacheControl: '3600',
      upsert: false
    });
    
    if (upErr) {
      console.error('Upload error:', upErr);
      throw upErr;
    }

    console.log('File uploaded successfully:', uploadData);

    // Insert record into database
    const { data, error } = await this.supabase
      .from('mechanic_documents')
      .insert({ 
        user_id: userId, 
        doc_type: docType, 
        file_path: filePath,
        status: 'submitted'
      })
      .select('*')
      .single();
      
    if (error) {
      console.error('Database insert error:', error);
      // Try to clean up the uploaded file if database insert fails
      await this.getStorage().from('autosos').remove([fullPath]);
      throw error;
    }
    
    console.log('Document record created:', data);
    return data as MechanicDocument;
  }

  async listMyDocuments(): Promise<MechanicDocument[]> {
    const { data: sessionData } = await this.supabase.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return [];
    const { data, error } = await this.supabase
      .from('mechanic_documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as MechanicDocument[];
  }

  async deleteDocument(doc: MechanicDocument) {
    const { error: delErr } = await this.getStorage().from('autosos').remove([`mechanic_docs/${doc.file_path}`]);
    if (delErr) throw delErr;
    const { error } = await this.supabase.from('mechanic_documents').delete().eq('id', doc.id);
    if (error) throw error;
  }

  async getSignedUrl(filePath: string, expiresInSeconds = 3600): Promise<string> {
    const { data, error } = await this.getStorage().from('autosos').createSignedUrl(`mechanic_docs/${filePath}`, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl as string;
  }
}
