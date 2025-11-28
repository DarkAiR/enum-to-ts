export interface ParseInfo {
    parseFileName: string;                              // File to parsing
    regExp: RegExp;                                     // Main regular expression
    enumName: string;                                   // Name of the main enum for the frontend
    descriptionEnumName?: string;                       // Name of the description class for the frontend (optional)
    comment?: string;                                   // Comment to enum (optional)
    parseDescriptionFunc?: (src: string) => string[];   // Function for custom parsing if it needs (optional)
}
