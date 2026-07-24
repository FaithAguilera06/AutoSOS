import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class StorageService {
  constructor(private readonly supabase: SupabaseService) {}

  private getStorage() {
    return (this.supabase as any)["supabase"]["storage"];
  }

  async uploadAvatar(file: File): Promise<string> {
    const { data: sessionData, error: sessErr } = await this.supabase.getSession();
    if (sessErr) throw sessErr;
    const userId = sessionData.session?.user.id;
    if (!userId) throw new Error('Not authenticated');

    const fileExt = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await this.getStorage()
      .from('autosos')
      .upload(`avatars/${filePath}`, file, { cacheControl: '3600', upsert: true });

    if (uploadError) throw uploadError;

    // get public URL
    const { data } = this.getStorage().from('autosos').getPublicUrl(`avatars/${filePath}`);
    return data.publicUrl as string;
  }
}
