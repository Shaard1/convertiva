import { CONVERSION_POLICIES, LOGGED_IN_HISTORY_LIMIT } from "@/lib/constants";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { AuthUser } from "@/types/auth";
import {
  ConvertedFile,
  ConversionHistoryItem,
  OutputFormat,
} from "@/types/converter";

const STORAGE_BUCKET = "converted-images";
const SIGNED_URL_SECONDS = 24 * 60 * 60;

type ConversionHistoryRow = {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  output_format: OutputFormat;
  storage_path: string;
  converted_at: string;
  expires_at: string;
};

function sanitizePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function buildStoragePath(user: AuthUser, file: ConvertedFile) {
  const timestamp = new Date(file.convertedAt).getTime();
  return `${user.id}/${timestamp}-${sanitizePathSegment(file.fileName)}`;
}

function mapHistoryRow(row: ConversionHistoryRow, signedUrl: string): ConversionHistoryItem {
  return {
    id: row.id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    size: row.size_bytes,
    outputFormat: row.output_format,
    downloadUrl: signedUrl,
    convertedAt: row.converted_at,
    expiresAt: new Date(row.expires_at).getTime(),
  };
}

export async function loadAuthenticatedConversionHistory(
  user: AuthUser,
): Promise<ConversionHistoryItem[]> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("conversion_history")
    .select(
      "id,file_name,mime_type,size_bytes,output_format,storage_path,converted_at,expires_at",
    )
    .eq("user_id", user.id)
    .gt("expires_at", new Date().toISOString())
    .order("converted_at", { ascending: false })
    .limit(LOGGED_IN_HISTORY_LIMIT);

  if (error || !data) {
    return [];
  }

  const historyItems = await Promise.all(
    (data as ConversionHistoryRow[]).map(async (row) => {
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_URL_SECONDS);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        return null;
      }

      return mapHistoryRow(row, signedUrlData.signedUrl);
    }),
  );

  return historyItems.filter((item): item is ConversionHistoryItem => Boolean(item));
}

export async function saveAuthenticatedConversionHistory(
  user: AuthUser,
  files: ConvertedFile[],
  outputFormat: OutputFormat,
): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase || !files.length) {
    return { error: null };
  }

  const expiresAt = new Date(
    Date.now() + CONVERSION_POLICIES.authenticated.retentionMs,
  ).toISOString();

  try {
    for (const file of files) {
      const storagePath = buildStoragePath(user, file);
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file.blob, {
          contentType: file.mimeType,
          upsert: true,
        });

      if (uploadError) {
        return { error: uploadError.message };
      }

      const { error: insertError } = await supabase.from("conversion_history").insert({
        user_id: user.id,
        file_name: file.fileName,
        mime_type: file.mimeType,
        size_bytes: file.size,
        output_format: outputFormat,
        storage_path: storagePath,
        converted_at: file.convertedAt,
        expires_at: expiresAt,
      });

      if (insertError) {
        return { error: insertError.message };
      }
    }

    return { error: null };
  } catch {
    return { error: "Could not save conversion history." };
  }
}
