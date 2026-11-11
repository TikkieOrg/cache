import * as cacheUtils from "@actions/cache/lib/internal/cacheUtils";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

test("resolves and excludes cache paths using glob patterns", async () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cache-paths-"));
    const previousWorkspace = process.env.GITHUB_WORKSPACE;

    try {
        process.env.GITHUB_WORKSPACE = workspace;
        fs.mkdirSync(path.join(workspace, "included"));
        fs.mkdirSync(path.join(workspace, "excluded"));
        fs.writeFileSync(path.join(workspace, "included", "keep.txt"), "");
        fs.writeFileSync(path.join(workspace, "included", "skip.log"), "");
        fs.writeFileSync(path.join(workspace, "excluded", "skip.txt"), "");

        const paths = await cacheUtils.resolvePaths([
            path.join(workspace, "**", "*.txt"),
            `!${path.join(workspace, "excluded", "**")}`
        ]);

        expect(paths).toEqual(["included/keep.txt"]);
    } finally {
        if (previousWorkspace === undefined) {
            delete process.env.GITHUB_WORKSPACE;
        } else {
            process.env.GITHUB_WORKSPACE = previousWorkspace;
        }
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});
