import {Readable} from "stream";
import {EOL} from "os";
import {ParseInfo} from "../types";
import {readFile} from "fs/promises";
import {ParserIO} from "./parserIO";
import {ParserContent} from "./parserContent";
import {ParserLog} from "./parserLog";

class Parser {
    static fs = ParserIO;
    static content = ParserContent;
    static log = ParserLog;

    /**
     * Parse files specified by the parseInfos
     * @param parseInfos config of parsing files
     * @param srcPath source path
     * @param destPath destination path
     * @param getEnumsFunc custom function for parse enum from the file
     */
    static async parseEnums(
        parseInfos: ParseInfo[],
        srcPath: string,
        destPath: string,
        getEnumsFunc?: typeof Parser.getEnums,
    ) {
        for (const info of parseInfos) {
            const foundFilePath = await Parser.fs.findFilePath(info.parseFileName, srcPath);
            if (!foundFilePath) {
                throw new Error(`File ${info.parseFileName} is not found`);
            }
            const parsedFileContent: string = (await readFile(foundFilePath)).toString();

            // Парсится java файл и генерируется стринг с enum'ом
            const valueEnum: string = await (getEnumsFunc ?? Parser.getEnums)(
                parsedFileContent,
                info.regExp
            );

            const fileContent: string = Parser.content.createFileContent(
                info.enumName,
                valueEnum,
                Parser.content.createCommentContent(info.comment),
                ''
            );

            await Parser.fs.writeFile(info.enumName, destPath, fileContent);
            Parser.log.successGeneration(info.enumName);
        }
    }

    /**
     * Parse files with descriptions of enums specified by the parseInfos
     * @param parseInfos config of parsing files
     * @param srcPath source path
     * @param destPath destination path
     * @param getEnumsFunc custom function for parse enum from the file
     */
    static async parseEnumsWithDescription(
        parseInfos: ParseInfo[],
        srcPath: string,
        destPath: string,
        getEnumsFunc?: typeof Parser.getEnumsWithDescription,
    ) {
        for (const info of parseInfos) {
            const foundFilePath = await Parser.fs.findFilePath(info.parseFileName, srcPath);
            if (!foundFilePath) {
                throw new Error(`File ${info.parseFileName} is not found`);
            }
            const parsedFileContent: string = (await readFile(foundFilePath)).toString();

            // Парсится java файл и генерируется стринг с enum'ом
            const enums: [string, string] = await (getEnumsFunc ?? Parser.getEnumsWithDescription)(
                parsedFileContent,
                info.regExp,
                info.parseDescriptionFunc
            );
            const valueEnum: string = enums[0];
            const descriptionEnum: string = enums[1];

            const fileContent: string = Parser.content.createFileContent(
                info.enumName,
                valueEnum,
                Parser.content.createCommentContent(info.comment),
                Parser.content.createDescriptionContent(info.descriptionEnumName, descriptionEnum)
            );

            await Parser.fs.writeFile(info.enumName, destPath, fileContent);
            Parser.log.successGeneration(info.enumName);
        }
    }

    /**
     * Generate index.ts
     */
    static async generateIndex(
        parseInfos: ParseInfo[],
        extraEnums: string[],
        destPath: string,
    ) {
        let fileContent: string = `
/**
 * IMPORTANT NOTE!
 * This file is generated automatically
 * Any changes will be overwritten
 */
`;
        for (const info of parseInfos) {
            fileContent += `export * from './${info.enumName}';${EOL}`;
        }
        extraEnums.forEach(enumName => fileContent += `export * from './${enumName}';${EOL}`);

        await Parser.fs.writeFile('index', destPath, fileContent);
        Parser.log.successGeneration('[index.ts]');
    }

    /**
     * Split file content into lines, regardless of the OS they were saved in
     */
    static splitByEOL(content: string, ignoreEmptyLines: boolean = true): string[] {
        const arr: string[] = (content || '').split(/\r\n|\r|\n/);
        return ignoreEmptyLines
            ? arr.filter(line => line !== '')
            : arr;
    }

    /**
     * Extract enums from the file content
     */
    private static async getEnums(fileContent: string, regExp: RegExp): Promise<string> {
        return new Promise(resolve => {
            const readable: Readable = Readable.from(Parser.splitByEOL(fileContent));

            const outputEnum: string[] = [];
            readable.on('data', (line: string) => {
                if (regExp.test(line)) {
                    const regArr: RegExpExecArray = regExp.exec(line);
                    const value: string = regArr[1];
                    outputEnum.push(`    ${value} = '${value}'`);
                }
            });

            readable.on('close', async () => {
                resolve(outputEnum.join(`,${EOL}`));
            });
        });
    }

    /**
     * Extract enums with descriptions from the file content
     */
    private static async getEnumsWithDescription(
        fileContent: string,
        regExp: RegExp,
        parseDescriptionFunc?: (src: string) => string[]
    ): Promise<[string, string]> {
        return new Promise(resolve => {
            const readable: Readable = Readable.from(Parser.splitByEOL(fileContent));

            const lines: [string, string][] = [];
            const descriptionLines: string[] = [];
            readable.on('data', (line: string) => {
                if (regExp.test(line)) {
                    const regArr: RegExpMatchArray = line.match(regExp);

                    // Get the main value "VALUE"
                    const value: string = regArr[1];

                    // parse the description from the rest "(...)"
                    const description: string = parseDescriptionFunc?.(regArr[2])?.[0] ?? regArr[2];

                    lines.push([`    ${value} = '${value}',`, description]);
                    descriptionLines.push(`    ${value} = '${description}',`);
                }
            });

            readable.on('close', async () => {
                // Находим максимальную длину строки, чтобы выровнять комментарии
                const maxLen: number = Math.max(...lines.map((v: [string, string]) => v[0].length));
                const spacesStr: string = ' '.repeat(maxLen);
                resolve([
                    // Выравниваем комментарии
                    lines.map(
                        (v: [string, string]) => `${(v[0] + spacesStr).slice(0, maxLen)} // ${v[1]}`
                    ).join(EOL),
                    descriptionLines.join(EOL)
                ]);
            });
        });
    }
}

export {Parser};
