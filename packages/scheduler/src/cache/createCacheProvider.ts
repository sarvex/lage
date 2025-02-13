import type { CacheOptions } from "@lage-run/cache";
import { BackfillCacheProvider, RemoteFallbackCacheProvider, TargetHasher } from "@lage-run/cache";
import type { Logger } from "@lage-run/logger";
import { isRunningFromCI } from "./isRunningFromCI.js";

interface CreateCacheOptions {
  cacheOptions?: CacheOptions;
  logger: Logger;
  root: string;
  skipLocalCache: boolean;
  cliArgs: string[];
}

export function createCache(options: CreateCacheOptions) {
  const { cacheOptions, logger, root, skipLocalCache, cliArgs } = options;

  const hasRemoteCacheConfig =
    !!cacheOptions?.cacheStorageConfig || !!process.env.BACKFILL_CACHE_PROVIDER || !!process.env.BACKFILL_CACHE_PROVIDER_OPTIONS;

  // Create Cache Provider
  const cacheProvider = new RemoteFallbackCacheProvider({
    root,
    logger,
    localCacheProvider:
      skipLocalCache === true
        ? undefined
        : new BackfillCacheProvider({
            logger,
            root,
            cacheOptions: {
              outputGlob: cacheOptions?.outputGlob,
              ...(cacheOptions?.internalCacheFolder && { internalCacheFolder: cacheOptions.internalCacheFolder }),
              ...(cacheOptions?.incrementalCaching && { incrementalCaching: cacheOptions.incrementalCaching }),
            },
          }),
    remoteCacheProvider: hasRemoteCacheConfig ? new BackfillCacheProvider({ logger, root, cacheOptions: cacheOptions ?? {} }) : undefined,
    writeRemoteCache:
      cacheOptions?.writeRemoteCache === true || String(process.env.LAGE_WRITE_CACHE).toLowerCase() === "true" || isRunningFromCI,
  });

  const hasher = new TargetHasher({
    root,
    environmentGlob: cacheOptions?.environmentGlob ?? [],
    cacheKey: cacheOptions?.cacheKey,
    cliArgs,
  });

  return { cacheProvider, hasher };
}
