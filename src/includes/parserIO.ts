import path from "path";
import {readdir, writeFile} from "fs/promises";

class ParserIO {
    /**
     * Recursively find the path to a file in a specified directory
     */
    static async findFilePath(parseFileName: string, srcPath: string): Promise<string | null> {
        if (!srcPath) {
            throw new Error(`Doesn't specify the source directory ${srcPath}`);
        }
        try {
            const dirEntries = await readdir(path.resolve(srcPath), {withFileTypes: true});
            const files = dirEntries.filter(de => de.isFile());
            const fileIndex = files.findIndex(de => de.name === parseFileName);
            if (fileIndex !== -1) {
                return path.join(srcPath, files[fileIndex].name);
            }

            const dirs = dirEntries.filter(de => de.isDirectory());

            let foundFilePath: string | null = null;
            for (const de of dirs) {
                foundFilePath = await ParserIO.findFilePath(parseFileName, path.join(srcPath, de.name));
                if (foundFilePath !== null) {
                    return foundFilePath;
                }
            }
        } catch (err) {
            console.error(err);
        }
        return null;
    }

    /**
     * Write file
     */
    static async writeFile(
        enunName: string,
        destDir: string,
        fileContent: string
    ) {
        const destPath: string = path.join(path.resolve(destDir), `${enunName}.ts`);
        await writeFile(destPath, fileContent);
    }
}

export {ParserIO};
