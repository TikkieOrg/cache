import { CompressionMethod } from "@actions/cache/lib/internal/constants";
import { exec } from "@actions/exec";
import * as io from "@actions/io";
import { writeFileSync } from "fs";
import * as path from "path";

const ManifestFilename = "manifest.txt";
const CacheFilenameZstd = "cache.tzst";
const CacheFilenameGzip = "cache.tgz";

function getWorkingDirectory(): string {
    return process.env["GITHUB_WORKSPACE"] ?? process.cwd();
}

function getCacheFileName(compressionMethod: CompressionMethod): string {
    return compressionMethod === CompressionMethod.Gzip
        ? CacheFilenameGzip
        : CacheFilenameZstd;
}

function buildDecompressProgram(
    compressionMethod: CompressionMethod
): string | null {
    switch (compressionMethod) {
        case CompressionMethod.Zstd:
            return "zstd -d -T0 --long=30";
        case CompressionMethod.ZstdWithoutLong:
            return "zstd -d -T0";
        default:
            return null;
    }
}

function buildCompressProgram(
    compressionMethod: CompressionMethod,
    compressionLevel: number
): string | null {
    const levelFlag = compressionLevel > 0 ? ` --fast=${compressionLevel}` : "";
    switch (compressionMethod) {
        case CompressionMethod.Zstd:
            return `zstd -T0${levelFlag} --long=30`;
        case CompressionMethod.ZstdWithoutLong:
            return `zstd -T0${levelFlag}`;
        default:
            return null;
    }
}

export async function extractTar(
    archivePath: string,
    compressionMethod: CompressionMethod
): Promise<void> {
    const workingDirectory = getWorkingDirectory();
    await io.mkdirP(workingDirectory);

    const tarPath = await io.which("tar", true);
    const decompressProgram = buildDecompressProgram(compressionMethod);

    if (decompressProgram === null) {
        await exec(
            `"${tarPath}" -xzf "${archivePath}" -P -C "${workingDirectory}"`
        );
        return;
    }

    await exec(
        `"${tarPath}" -xf "${archivePath}" -P -C "${workingDirectory}" --use-compress-program "${decompressProgram}"`
    );
}

export async function createTar(
    archiveFolder: string,
    sourceDirectories: string[],
    compressionMethod: CompressionMethod,
    compressionLevel = 0
): Promise<void> {
    const manifestPath = path.join(archiveFolder, ManifestFilename);
    writeFileSync(manifestPath, sourceDirectories.join("\n"));

    const workingDirectory = getWorkingDirectory();
    const tarPath = await io.which("tar", true);
    const cacheFileName = getCacheFileName(compressionMethod);
    const archivePath = path
        .join(archiveFolder, cacheFileName)
        .replace(/\\/g, "/");
    const compressProgram = buildCompressProgram(
        compressionMethod,
        compressionLevel
    );

    if (compressProgram === null) {
        await exec(
            `"${tarPath}" --posix -czf "${archivePath}" -P -C "${workingDirectory}" --files-from "${manifestPath}"`,
            undefined,
            { cwd: archiveFolder }
        );
        return;
    }

    await exec(
        `"${tarPath}" --posix -cf "${archivePath}" -P -C "${workingDirectory}" --files-from "${manifestPath}" --use-compress-program "${compressProgram}"`,
        undefined,
        { cwd: archiveFolder }
    );
}
