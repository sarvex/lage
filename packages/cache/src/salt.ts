import { hash } from "glob-hasher";
import { hashStrings } from "./hashStrings.js";
import fg from "fast-glob";

interface MemoizedEnvHashes {
  [key: string]: string[];
}

let envHashes: MemoizedEnvHashes = {};

// A promise to guarantee the getEnvHashes is done one at a time
let oneAtATime: Promise<any> = Promise.resolve();

export function _testResetEnvHash() {
  envHashes = {};
}

export async function salt(environmentGlobFiles: string[], command: string, repoRoot: string, customKey = ""): Promise<string> {
  const envHash = await getEnvHash(environmentGlobFiles, repoRoot);
  return hashStrings([...envHash, command, customKey]);
}

function envHashKey(environmentGlobFiles: string[]) {
  return environmentGlobFiles.sort().join("|");
}

async function getEnvHash(environmentGlobFiles: string[], repoRoot: string): Promise<string[]> {
  const key = envHashKey(environmentGlobFiles);

  // We want to make sure that we only call getEnvHashOneAtTime one at a time
  // to avoid having many concurrent calls to read files again and again
  oneAtATime = oneAtATime.then(async () => {
    // we may already have it by time we get to here
    if (envHashes[key]) {
      return envHashes[key];
    }

    return getEnvHashOneAtTime(environmentGlobFiles, repoRoot);
  });

  return oneAtATime;
}

async function getEnvHashOneAtTime(environmentGlobFiles: string[], root: string) {
  const key = envHashKey(environmentGlobFiles);
  if (environmentGlobFiles.length === 0) {
    envHashes[key] = [];
    return envHashes[key];
  }

  const files = await fg(environmentGlobFiles, { cwd: root });
  const fileFashes = hash(files, { cwd: root }) ?? {};

  envHashes[key] = Object.values(fileFashes);

  return envHashes[key];
}
