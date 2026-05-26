import { createClient, type SupabaseClientOptions } from "@supabase/supabase-js";
import type { RealtimeClientOptions } from "@supabase/realtime-js";
import { WebSocket } from "ws";

type ServerSupabaseOptions = SupabaseClientOptions<string>;

function nodeMajorVersion(): number | null {
  if (typeof process === "undefined" || !process.versions?.node) {
    return null;
  }
  return parseInt(
    process.versions.node.replace(/^v/, "").split(".")[0],
    10,
  );
}

/** Node 18–21 lack native WebSocket; Supabase Realtime needs `ws` when it connects. */
function realtimeOptionsForNode(): Partial<ServerSupabaseOptions> {
  const major = nodeMajorVersion();
  if (major === null || major >= 22) {
    return {};
  }
  return {
    realtime: {
      transport: WebSocket as unknown as NonNullable<
        RealtimeClientOptions["transport"]
      >,
    },
  };
}

/**
 * Supabase client for Express / Node. Supplies a WebSocket transport on Node &lt; 22
 * so auth/realtime does not throw during API handlers (e.g. payment verify).
 */
export function createServerSupabaseClient(
  supabaseUrl: string,
  supabaseKey: string,
  options: ServerSupabaseOptions = {},
) {
  const { auth: authOverrides, realtime: realtimeOverrides, ...rest } = options;
  const nodeRealtime = realtimeOptionsForNode().realtime;

  return createClient(supabaseUrl, supabaseKey, {
    ...rest,
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      ...authOverrides,
    },
    realtime: {
      ...nodeRealtime,
      ...realtimeOverrides,
    },
  });
}
