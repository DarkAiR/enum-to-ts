import {ParseResult} from "./ParseResult";

export interface ParseInfo {
    srcFileName: string;                                // File to parsing
    srcDirectory: string;                               // Base directory to find srcFileName
    enumName: string;                                   // Name of the main enum for the frontend
    descriptionEnumName?: string;                       // Name of the description class for the frontend (optional)
    comment?: string;                                   // Comment for the enum (optional)
    parseFunc: (line: string) => ParseResult | null;    // Function for parsing a line
}
