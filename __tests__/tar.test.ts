import { CompressionMethod } from "@actions/cache/lib/internal/constants";
import * as exec from "@actions/exec";
import * as io from "@actions/io";

import { createTar, extractTar } from "../src/custom/tar";

jest.mock("@actions/exec");
jest.mock("@actions/io");

const mockedExec = jest.mocked(exec.exec);
const mockedWhich = jest.mocked(io.which);

beforeEach(() => {
    jest.clearAllMocks();
    process.env["GITHUB_WORKSPACE"] = "/workspace";
    mockedExec.mockResolvedValue(0);
    mockedWhich.mockResolvedValue("/usr/bin/tar");
});

afterEach(() => {
    delete process.env["GITHUB_WORKSPACE"];
});

test("creates a long-window zstd archive with a positive level", async () => {
    await createTar(
        "/tmp/cache",
        ["/workspace/node_modules"],
        CompressionMethod.Zstd,
        10
    );

    expect(mockedExec).toHaveBeenCalledWith(
        '"/usr/bin/tar" --posix -cf "/tmp/cache/cache.tzst" -P -C "/workspace" --files-from - --use-compress-program "zstd -T0 -10 --long=29"',
        undefined,
        {
            cwd: "/tmp/cache",
            input: Buffer.from("/workspace/node_modules")
        }
    );
});

test("creates a zstd archive in fast mode for a negative level", async () => {
    await createTar(
        "/tmp/cache",
        ["/workspace/node_modules"],
        CompressionMethod.ZstdWithoutLong,
        -5
    );

    expect(mockedExec).toHaveBeenCalledWith(
        '"/usr/bin/tar" --posix -cf "/tmp/cache/cache.tzst" -P -C "/workspace" --files-from - --use-compress-program "zstd -T0 --fast=5"',
        undefined,
        {
            cwd: "/tmp/cache",
            input: Buffer.from("/workspace/node_modules")
        }
    );
});

test("extracts long-window zstd archives with all available threads", async () => {
    await extractTar("/tmp/cache/cache.tzst", CompressionMethod.Zstd);

    expect(mockedExec).toHaveBeenCalledWith(
        '"/usr/bin/tar" -xf "/tmp/cache/cache.tzst" -P -C "/workspace" --use-compress-program "zstd -d -T0 --long=29"'
    );
});
