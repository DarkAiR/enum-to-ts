# enum-to-ts

> This project was written to simplify the synchronization of enumerations within a single repository with code in different programming languages.

## Installation

```sh
npm install --save-dev @darkair/enum-to-ts
```

## Usage

The examples below are for a case where the backend is written in Java, and the TypeScript frontend needs to maintain synchronicity of the values used.

### Simple example

```ts
import {ParseInfo, Parser} from "@darkair/enum-to-ts";

const parseInfos: ParseInfo[] = [
    {
        srcFileName: 'SomeType.java',                               // File to parsing
        srcDirectory: "../src/main/java/path/to/head/directory",    // relative path to start folder to recursive find of the source file
        enumName: 'SomeTypeEnum',                                   // TS file name (without extension)
        comment: 'This is a some type',                             // Comment for the enum
        parseFunc: Parser.parseNameValue                            // NAME(VALUE, ...) -> [1: NAME, 2: VALUE]
    }
];

async function generateEnum(): Promise<boolean> {
    try {
        await Parser.parseEnums(
            parseInfos,
            `${__dirname}/../../src/enums`              // relative path to destination folder
        );
    } catch (err) {
        // error handling
        return false;
    }
    return true;
}
```

### Example with index.ts generation

```ts
import {ParseInfo, Parser} from "@darkair/enum-to-ts";

const parseInfos: ParseInfo[] = [
    {
        srcFileName: 'SomeType.java',                               // File to parsing
        srcDirectory: "../src/main/java/path/to/head/directory",    // relative path to start folder to recursive find of the source file
        enumName: 'SomeTypeEnum',                                   // TS file name (without extension)
        comment: 'This is a some type',                             // Comment for the enum
        parseFunc: Parser.parseNameValue                            // NAME(VALUE, ...) -> [1: NAME, 2: VALUE]
    }
];

async function generateEnum(): Promise<boolean> {
    try {
        await Parser.parseEnums(
            parseInfos,
            `${__dirname}/../../src/enums`              // relative path to destination folder
        );

        // Generate an index file if necessary
        // Result "src/enums/index.ts":
        //    export * from "SomeTypeEnum";
        //    export * from "NotGeneratedEnum1";
        //    export * from "NotGeneratedEnum2";
        await Parser.generateIndex(
            parseInfos,
            [
                'NotGeneratedEnum1',                    // Array of extra enums not generated automatically                  
                'NotGeneratedEnum2'
            ],
            `${__dirname}/../../src/enums`,             // relative path to destination folder
        );
    } catch (err) {
        // error handling
        return false;
    }
    return true;
}
```

### Example with custom enum generator

```ts
const parseInfos: ParseInfo[] = [
    {
        srcFileName: 'SomeEnum.java',                               // File to parsing
        srcDirectory: "../src/main/java/path/to/head/directory",    // relative path to start folder to recursive find of the source file
        enumName: 'SomeEnum',                                       // TS file name (without extension)
        comment: 'This is some enums',                              // Comment to put before TS enum
        parseFunc: Parser.parseNameComment                          // NAME("COMMENT", ...) -> [1: NAME, ..., 3: COMMENT]
    }
];

async function generateEnum(): Promise<boolean> {
    try {
        await Parser.parseEnums(
            parseInfos,
            `${__dirname}/../../src/enums`,             // relative path to destination folder
            getEnums                                    // custom function to parse enum
        );
    } catch (err: Error) {
        // error handling
        return false;
    }
    return true;
}

/**
 * This custom function is generate enum with aligned comment for every values
 * Comments are parsed from the Java file by the main regular expression
 */
async function getEnums(fileContent: string, parseFunc: ParseInfo['parseFunc']): Promise<string> {
    return new Promise(resolve => {
        const readable: Readable = Readable.from(Parser.splitByEOL(fileContent));

        const lines: Array<string[]> = [];
        readable.on('data', (line: string) => {
            const res: ParseResult = parseFunc(line);
            if (res) {
                lines.push([`    ${res.name} = '${res.value}',`, res.comment]);
            }
        });

        readable.on('close', async () => {
            // Align the comment
            let maxLen: number = Math.max(...lines.map((v: string[]) => v[0].length));
            maxLen = Math.ceil(maxLen / 4 + 1) * 4;     // +1 to extra spaces
            const spacesStr: string = ' '.repeat(maxLen);
            resolve(
                // Aligning comments
                lines.map(
                    (v: [string, string]) => `${(v[0] + spacesStr).slice(0, maxLen)}// ${v[1]}`
                ).join(EOL)
            );
        });
    });
}
```

### Example: Enum + Description class

```ts
const parseInfos: ParseInfo[] = [
    {
        srcFileName: 'SomeEnum.java',                               // File to parsing
        srcDirectory: "../src/main/java/path/to/head/directory",    // relative path to start folder to recursive find of the source file
        enumName: 'SomeEnum',                                       // TS file name (without extension)
        descriptionEnumName: 'SomeEnumDescription',                 // Name of the description class for the frontend (optional)
        comment: 'This is some enums',                              // Comment to put before TS enum
        parseFunc: Parser.parseNameValueComment                     // NAME(VALUE, "COMMENT", ...) -> [1: NAME, 2: VALUE, ..., 4: COMMENT]
    }
];

/**
 * Result:
 *     export enum SomeEnum {
 *         VALUE1 = "VALUE1",       // Value1 comment 
 *         VALUE2 = "VALUE2",       // Value2 comment 
 *     }
 *     export enum SomeEnumDescription {
 *         VALUE1 = "Value1 comment",
 *         VALUE2 = "Value2 comment",
 *     }
 */
async function generateEnum(): Promise<boolean> {
    try {
        await Parser.parseEnumsWithDescription(
            parseInfos,
            `${__dirname}/../../src/enums`
        );
    } catch (err) {
        console.log(colorize.red(err.message));
        return false;
    }
    return true;
}
```

### Example of custom "parseFunc"

```ts
const parseInfos: ParseInfo[] = [
    {
        srcFileName: 'SomeEnum.java',                               // File to parsing
        srcDirectory: "../src/main/java/path/to/head/directory",    // relative path to start folder to recursive find of the source file
        enumName: 'SomeEnum',                                       // TS file name (without extension)
        parseFunc: (line: string): ParseResult | null => {
            const regExp: RegExp = /([A-Z0-9_]+)\((['"])(.*?)(?<!\\)\2, ([A-Z0-9_]+)\)/;      // NAME("COMMENT", VALUE)
            const regArr: RegExpMatchArray = line.match(regExp);
            return !regArr ? null : {
                name: regArr[1],
                value: regArr[4],
                comment: regArr[3],
            };
        }
    }
];
```


## Documentation

### interface ParseInfo

```ts
export interface ParseInfo {
    srcFileName: string;                                // File to parsing
    srcDirectory: string;                               // Base directory to find srcFileName
    enumName: string;                                   // Name of the main enum for the frontend
    descriptionEnumName?: string;                       // Name of the description class for the frontend (optional)
    comment?: string;                                   // Comment for the enum (optional)
    parseFunc: (line: string) => ParseResult | null;    // Function for parsing a line
}
```


### Parser.parseEnums

Parse files specified by the parseInfos.

```ts
static async parseEnums(
    parseInfos: ParseInfo[],
    destPath: string,
    getEnumsFunc?: typeof Parser.getEnums,
);
```
#### Options
| Parameter    | Description                                                                                                               |
|--------------|---------------------------------------------------------------------------------------------------------------------------|
| parseInfos   | config array of parsing files                                                                                             |
| destPath     | relative path to destination folder                                                                                       |
| getEnumsFunc | custom function for parse enum from the file<br/>`async getEnums(fileContent: string, parseFunc: ParseInfo['parseFunc'])` |


### Parser.parseEnumsWithDescription

Parse files with descriptions of enums specified by the parseInfos.

```ts
static async parseEnumsWithDescription(
    parseInfos: ParseInfo[],
    destPath: string,
    getEnumsFunc?: typeof Parser.getEnumsWithDescription,
);
```
#### Options
| Parameter    | Description                                                                                                               |
|--------------|---------------------------------------------------------------------------------------------------------------------------|
| parseInfos   | config array of parsing files                                                                                             |
| destPath     | relative path to destination folder                                                                                       |
| getEnumsFunc | custom function for parse enum from the file<br/>`async getEnums(fileContent: string, parseFunc: ParseInfo['parseFunc'])` |


### Parser.parseName

Parse NAME -> [1: NAME]

```ts
static parseName(line: string): ParseResult | null;
```
#### Options
| Parameter    | Description             |
|--------------|-------------------------|
| line         | single string from file |


### Parser.parseNameValue

Parse NAME(VALUE) -> [1: NAME, 2: VALUE]

```ts
static parseNameValue(line: string): ParseResult | null;
```
#### Options
| Parameter    | Description             |
|--------------|-------------------------|
| line         | single string from file |


### Parser.parseNameComment

Parse NAME("COMMENT") -> [1: NAME, ..., 3: COMMENT]

```ts
static parseNameComment(line: string): ParseResult | null;
```
#### Options
| Parameter    | Description             |
|--------------|-------------------------|
| line         | single string from file |


### Parser.parseNameValueComment

Parse NAME(VALUE, "COMMENT") -> [1: NAME, 2: VALUE, ..., 4: COMMENT]

```ts
static parseNameValueComment(line: string): ParseResult | null;
```
#### Options
| Parameter    | Description             |
|--------------|-------------------------|
| line         | single string from file |


### Parser.parseNameCommentValue

Parse NAME("COMMENT", VALUE, ...) -> [1: NAME, 2: COMMENT, ..., 4: VALUE]

```ts
static parseNameCommentValue(line: string): ParseResult | null;
```
#### Options
| Parameter    | Description             |
|--------------|-------------------------|
| line         | single string from file |


### Parser.generateIndex

Generate index.ts.

```ts
static async generateIndex(
    parseInfos: ParseInfo[],
    extraEnums: string[],
    destPath: string,
);
```
#### Options
| Parameter  | Description                                                      |
|------------|------------------------------------------------------------------|
| parseInfos | config array of parsing files                                    |
| extraEnums | enumerations that are not generated but exist in the same folder |
| destPath   | relative path to destination folder                              |

### Parser.splitByEOL

Split file content into lines, regardless of the OS they were saved in

```ts
static splitByEOL(
    content: string,
    ignoreEmptyLines: boolean = true
): string[];
```

### Parser.content.createFileContent

Generate general file content

```ts
static createFileContent(
    enumName: string,
    enumContent: string,
    commentContent: string,
    descriptionContent: string
): string;
```

#### Options
| Parameter          | Description                                                                                        |
|--------------------|----------------------------------------------------------------------------------------------------|
| enumName           | enum name                                                                                          |
| enumContent        | string with concatenated enum content like<br/>```VALUE1 = "VALUE1",```<br/>```VALUE2 = "VALUE2``` |
| commentContent     | correct multiline comment content like<br/>```/* comment */```                                     |
| descriptionContent | full content of description enum<br/>```enum DescEnum { ... }```                                   |

### Parser.content.createCommentContent

Generate comment content

```ts
static createCommentContent(
    comment: string
): string;
```

### Parser.content.createDescriptionContent

Generate description content

```ts
static createDescriptionContent(
    descriptionName: string,
    content: string
): string;
```

### Parser.fs.findFilePath

Recursively find the path to a file in a specified directory

```ts
static async findFilePath(
    srcFileName: string,        // MyEnum.java
    srcPath: string             // relative path to source file
): Promise<string | null>;
```

### Parser.fs.findFilePath

Write file

```ts
static async writeFile(
    enunName: string,           // MyEnum
    destDir: string,            // `${__dirname}/../../src/enums`
    fileContent: string
): void;
```

### Parser.log.success

Output a success string.
Format: [✓] {message}

```ts
static success(
    message: string
);
```

### Parser.log.ignored

Output an ignored string.
Format: [-] {message}

```ts
static ignored(
    message: string
);
```

### Parser.log.successGeneration

Output a success string after generation an enum.
Format: [✓] {enumName} has been generated

```ts
static successGeneration(
    enumName: string
);
```

### Parser.log.ignoreGeneration

Оutput that the generation ignored.
Format: [-] Generation of {subject} was ignored

```ts
static ignoreGeneration(
    subject: string
);
```

## Example of custom generation

A complete example of custom parsing and enumeration generation

```ts
for (const info: ParseInfo of parseInfos) {
    const foundFilePath = await Parser.fs.findFilePath(info.srcFileName, "../src/main/java/ru/my/path");
    if (!foundFilePath) {
        throw new Error(`File ${info.srcFileName} is not found`);
    }
    const parsedFileContent: string = (await readFile(foundFilePath)).toString();

    const enums: [string, string] = await getMyEnums(
        parsedFileContent,
        info.parseFunc
    );
    const enumContent: string = enums[0];               // 'VALUE1 = "VALUE1",\nVALUE2 = "VALUE2",'
    const descriptionEnumContent: string = enums[1];    // 'DESC1 = "desc 1",\nDESC2 = "desc 2",'


    const fileContent: string = Parser.content.createFileContent(
        info.enumName,
        enumContent,
        Parser.content.createCommentContent(info.comment),
        Parser.content.createDescriptionContent(info.descriptionEnumName, descriptionEnumContent)
    );

    await Parser.fs.writeFile(info.enumName, `${__dirname}/../../src/enums`, fileContent);
    Parser.log.successGeneration(info.enumName);
}
```

#### Output
```ts
/**
 * comment
 */

enum MyEnum {
    VALUE1 = "VALUE1",
    VALUE2 = "VALUE2",
}

enum DescEnum {
    DESC1 = "desc 1",
    DESC2 = "desc 2",
}
```
